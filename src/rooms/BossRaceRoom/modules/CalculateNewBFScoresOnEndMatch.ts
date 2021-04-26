import { Client } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { BossRaceRoom } from "../../BossRaceRoom";
import { PlayerBattlefieldScores }
  from "../../../dataobjects/PlayerBattlefieldScores";
import MatchmakingConfig from "../../../dataobjects/LiveJSON/MatchmakingConfig";
import "../../../utils/number-augmentations";
import "../../../utils/ArrayUtils";
import { CrossRoomEventEmitter }
  from "../../../dataobjects/CrossRoomEventEmitter";
import { last } from "../../../utils/ArrayUtils";
import { bossRaceRoomLogger } from "../BossRaceRoom";

export class CalculateNewBFScoresOnEndMatch extends RoomModule<BossRaceRoom> {

  attach(room: BossRaceRoom) {
    super.attach(room);
    this.room.events.on('endmatch', this.calculateScores);
  }

  remove() {
    super.remove();
    this.room.events.off('endmatch', this.calculateScores);
  }

  calculateScores = (results: [string, 'win' | 'lose', number][]) => results
    .forEach(p => {
      bossRaceRoomLogger.info(`room ${this.room.roomId}: ${this.room.state.Players.get(p[0]).Name} result: ${p[1]}, score: ${this.room.state.Players.get(p[0]).Score}, old bf score: ${this.room.state.Players.get(p[0]).BattlefieldScore}`);
      let newBFScore = MatchmakingConfig.JSONObj.BattlefieldScorePerMatch
        .multiply(p[1] == 'win' ? 1 : -1);
      newBFScore = (newBFScore
        - MatchmakingConfig.JSONObj.BattlefieldScoreGainRandomRange)
        .randomBetween(newBFScore
          + MatchmakingConfig.JSONObj.BattlefieldScoreGainRandomRange)
        .plus(this.room.state.Players.get(p[0]).BattlefieldScore)
        .floor();
      newBFScore = newBFScore.clamp(
        MatchmakingConfig.JSONObj.Ranks[0].BattlefieldScoreRange.Min,
        last(MatchmakingConfig.JSONObj.Ranks).BattlefieldScoreRange.Max);
      this.room.state.Players.get(p[0]).BattlefieldScore = newBFScore;
      bossRaceRoomLogger.info(`new score: ${this.room.state.Players.get(p[0]).BattlefieldScore}`);
      if ([...this.room.realPlayers.keys()].filter(id => id == p[0]).length > 0) {
        let thisPlayerID = this.room.realPlayers.get(p[0]);
        PlayerBattlefieldScores.set(thisPlayerID, newBFScore);
        CrossRoomEventEmitter.emit('newbfscore', thisPlayerID, newBFScore);
      }
    });
}