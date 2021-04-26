import { Client } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { BossRaceRoom } from "../../BossRaceRoom";
import "../../../utils/number-augmentations";
import { CrossRoomEventEmitter }
  from "../../../dataobjects/CrossRoomEventEmitter";
import * as BossRaceHistory from "../../../dataobjects/BossRaceHistory";
import { ProfileServerConnector } from "../../../ProfileServerConnector";
import { bossRaceRoomLogger } from "../BossRaceRoom";

export class PostMatchResultsOnEnd extends RoomModule<BossRaceRoom> {

  attach(room: BossRaceRoom) {
    super.attach(room);
    this.room.events.on('endmatch', this.postResults);
    CrossRoomEventEmitter.on('newbfscore', this.updateBFScores);
  }

  remove() {
    super.remove();
    this.room.events.off('endmatch', this.postResults);
    CrossRoomEventEmitter.off('newbfscore', this.updateBFScores);
  }

  postResults = (results: [string, 'win' | 'lose', number][]) => results
    .filter(p => this.room.clientMappings.has(p[0]))
    .forEach(p => {
      let thisPlayerID = this.room.clientMappings.get(p[0]).userData['id'];
      let now = new Date();
      ProfileServerConnector.ConnectionPool.execute(`INSERT INTO
        player_pvp_history(player_id, mode, score, result, created_at)
        VALUES(${thisPlayerID}, 'BossRace', ${p[2]}, '${p[1]}',
          '${now.toISOString()}')`)
        .catch(e => bossRaceRoomLogger.error(e));
        
      BossRaceHistory.Matches.get(thisPlayerID)
        .unshift(<BossRaceHistory.MatchResult>{
          score: p[2],
          result: p[1],
          createdAt: now
        });
    });

  updateBFScores = (playerID: number, bfscore: number) => ProfileServerConnector
    .ConnectionPool.execute(`UPDATE player_pvp
      SET battlefield_score = ${bfscore}
      WHERE player_id = ${playerID}`).catch(e => bossRaceRoomLogger.error(e));
}