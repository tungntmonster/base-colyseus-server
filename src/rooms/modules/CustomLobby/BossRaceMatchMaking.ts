import { Client, matchMaker } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { CustomLobbyRoom } from "../../CustomLobbyRoom";
import { LogError, timeout } from "../../../CommonUtils";
import MatchmakingConfig from "../../../dataobjects/LiveJSON/MatchmakingConfig";
import { PlayerBattlefieldScores }
  from "../../../dataobjects/PlayerBattlefieldScores";
import "../../../number-augmentations";
import { RoomListingData } from "colyseus/lib/matchmaker/drivers/Driver";
import * as BossRaceHistory from "../../../dataobjects/BossRaceHistory";
import BotGenerationConfig
  from "../../../dataobjects/LiveJSON/BotGenerationConfig";

export class BossRaceMatchMaking extends RoomModule<CustomLobbyRoom> {
  attach(room: CustomLobbyRoom) {
    super.attach(room);
    this.room.events.on('matchmake', this.findOrCreateRoom);
  }

  remove() {
    super.remove();
    this.room.events.off('matchmake', this.findOrCreateRoom);
  }

  findOrCreateRoom = (client: Client, options: any) => {
    if (options['Mode'] != 'BossRace') return;
    this.findOrCreateRoomAsync(client, options).catch(LogError);
  }

  findOrCreateRoomAsync = async (client: Client, options: any) => {
    const playerID = <number>client.userData['PlayerID'];
    while (!BossRaceHistory.CachedPlayers.has(playerID)) await timeout(1000);
    let allRooms = await matchMaker.query({
      locked: false,
      private: false,
      name: options['Mode']
    });
    const bfScoreToMatch = PlayerBattlefieldScores.get(playerID);
    console.log(`matchmaking PlayerID: ${playerID}, bfScoreToMatch: ${bfScoreToMatch}`);
    const scoreRange = BossRaceMatchMaking.getMatchmadeScore(bfScoreToMatch);
    const diffToCurrentClient = (d: RoomListingData<any>) =>
      bfScoreToMatch.difference(d.metadata['AverageBFScore'] as number)
    const matchingRooms = allRooms.filter(r =>
      (r.metadata['AverageBFScore'] as number).inRangeInclusive(scoreRange))
      .sort((a, b) => diffToCurrentClient(a) - diffToCurrentClient(b));
    let roomListing;
    if (matchingRooms.length == 0) roomListing =
      await matchMaker.createRoom('BossRace',
        {
          ForcedBot: BossRaceHistory.Matches.get(playerID).length
            <= BotGenerationConfig.JSONObj.MatchCountToQualifyRealPlayers
        });
    else roomListing = matchingRooms[0];

    let reservation = await matchMaker.reserveSeatFor(roomListing, options);
    client.send('BossRaceRoom', JSON.stringify(reservation));
  }

  static getMatchmadeScore(scoreToMatch: number): [number, number] {
    const rankToMatch = MatchmakingConfig.JSONObj.Ranks
      .find(r => r.BattlefieldScoreRange.Min <= scoreToMatch
        && r.BattlefieldScoreRange.Max >= scoreToMatch);
    if (rankToMatch == null) {
      var maxRank = MatchmakingConfig.JSONObj.Ranks[MatchmakingConfig.JSONObj.Ranks.length - 1];
      return [maxRank.BattlefieldScoreRange.Min,
        maxRank.BattlefieldScoreRange.Max];
    }
    return MatchmakingConfig.JSONObj.Ranks
      .filter(r => rankToMatch.Number >= r.Number - 1
        && rankToMatch.Number <= r.Number + 1)
      .reduce<[number, number]>((p, c) => [
        Math.min(p[0], c.BattlefieldScoreRange.Min),
        Math.max(p[1], c.BattlefieldScoreRange.Max)],
        [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]);
  }
}