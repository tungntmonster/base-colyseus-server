import { Client } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { CustomLobbyRoom, customLobbyRoomLogger } from "../../CustomLobbyRoom/CustomLobbyRoom";
import * as BossRaceHistory from "../../../dataobjects/BossRaceHistory";
import { getConnection } from "typeorm";
import {  PlayerPvpHistoryEntity } from "../../../entity/PlayerPvpHistory";
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
    if (BossRaceHistory.CachedPlayers.has(playerID))
      return;
    
    
    try {
      const histories = await getConnection().getRepository(PlayerPvpHistoryEntity).find({
        where: {
          playerId: playerID,
          mode: 'BossRace'
        },
        order: {
          createdAt: 'DESC'
        }
      })

      if(histories) {
        let result = histories.map(history=>{
          return {
            score: history.score,
            result: history.result,
            createdAt: history.createdAt
          }
        })
        BossRaceHistory.Matches.set(playerID, result)
        BossRaceHistory.CachedPlayers.add(playerID);
      }
    } catch (err) {
      customLobbyRoomLogger.error(err);
    }

    // const historyQuery = <[mysql2.RowDataPacket[], mysql2.FieldPacket[]]>
    //   await ProfileServerConnector.ConnectionPool.query(`SELECT *
    //     FROM player_pvp_history
    //     WHERE player_id = ${playerID} AND mode = 'BossRace'
    //     ORDER BY created_at DESC`)
    //     .catch(e => customLobbyRoomLogger.error(e));
    
    // BossRaceHistory.Matches.set(playerID,
    //   historyQuery[0].map(r => <BossRaceHistory.MatchResult>{
    //     score: <number>r['score'],
    //     result: <string>r['result'],
    //     createdAt: new Date(r['created_at'])
    //   }));
    
    // BossRaceHistory.CachedPlayers.add(playerID);
  }
}