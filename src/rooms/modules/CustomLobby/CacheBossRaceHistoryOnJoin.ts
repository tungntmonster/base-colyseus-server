import { Client } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { CustomLobbyRoom } from "../../CustomLobbyRoom";
import * as mysql2 from "mysql2/promise";
import { ProfileServerConnector } from "../../../ProfileServerConnector";
import { LogError, NoOps } from "../../../CommonUtils";
import * as BossRaceHistory from "../../../dataobjects/BossRaceHistory";

export class CacheBossRaceHistoryOnJoin extends RoomModule<CustomLobbyRoom> {
  attach(room: CustomLobbyRoom) {
    super.attach(room);
    this.room.events.on('join', this.cacheHistory);
  };

  remove() {
    super.remove();
    this.room.events.off('join', this.cacheHistory);
  };

  cacheHistory = async (client: Client, options?: any, auth?: any) => {
    const playerID = <number>client.userData['PlayerID'];
    if (BossRaceHistory.CachedPlayers.has(playerID)) return;
    const historyQuery = <[mysql2.RowDataPacket[], mysql2.FieldPacket[]]>
      await ProfileServerConnector.ConnectionPool.query(`SELECT *
        FROM player_pvp_history
        WHERE player_id = ${playerID} AND mode = 'BossRace'
        ORDER BY created_at DESC`)
        .catch(LogError);
    BossRaceHistory.Matches.set(playerID,
      historyQuery[0].map(r => <BossRaceHistory.MatchResult>{
        score: <number>r['score'],
        result: <string>r['result'],
        createdAt: new Date(r['created_at'])
      }));
    BossRaceHistory.CachedPlayers.add(playerID);
  }
}