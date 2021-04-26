import { RoomModule } from "../../BaseRoom";
import { BossRaceRoom, bossRaceRoomLogger } from "../../BossRaceRoom";
import { getConnection } from "typeorm";
import { PlayerPvpEntity } from "../../../entity/PlayerPvp";
import {  PlayerPvpHistoryEntity } from "../../../entity/PlayerPvpHistory";
import "../../../utils/number-augmentations";
import { CrossRoomEventEmitter } from "../../../dataobjects/CrossRoomEventEmitter";
import * as BossRaceHistory from "../../../dataobjects/BossRaceHistory";

export class PostMatchResultsOnEnd extends RoomModule<BossRaceRoom> {

  attach(room: BossRaceRoom) {
    super.attach(room);
    this.room.events.on('endmatch', this.postResultAsync);
    CrossRoomEventEmitter.on('newbfscore', this.updateBFScores);
  }

  remove() {
    super.remove();
    this.room.events.off('endmatch', this.postResultAsync);
    CrossRoomEventEmitter.off('newbfscore', this.updateBFScores);
  }

  // postResults = (results: [string, 'win' | 'lose', number][]) => results
  //   .filter(p => this.room.clientMappings.has(p[0]))
  //   .forEach(p => {
  //     let thisPlayerID = this.room.clientMappings.get(p[0]).userData['id'];
  //     let now = new Date();
  //     ProfileServerConnector.ConnectionPool.execute(`INSERT INTO
  //       player_pvp_history(player_id, mode, score, result, created_at)
  //       VALUES(${thisPlayerID}, 'BossRace', ${p[2]}, '${p[1]}',
  //         '${now.toISOString()}')`)
  //       .catch(e => bossRaceRoomLogger.error(e));
        
  //     BossRaceHistory.Matches.get(thisPlayerID).unshift(<BossRaceHistory.MatchResult>{
  //         score: p[2],
  //         result: p[1],
  //         createdAt: now
  //       });
  //   });

  

  postResultAsync = async (results: [string, 'win' | 'lose', number][]) => {
    try {
      const updateResult = results.map(result =>  {

        if(this.room.clientMappings.has(result[0])){
          let now = new Date();
          let playerID = this.room.clientMappings.get(result[0]).userData['id'];
          let newResult = new PlayerPvpHistoryEntity()
          newResult.playerId = playerID
          newResult.mode = 'BossRace'
          newResult.score = result[2]
          newResult.result = result[1]
          newResult.createdAt = now


          BossRaceHistory.Matches.get(playerID).unshift({
            score: result[2],
            result: result[1],
            createdAt: now
          });
  
          return getConnection().getRepository(PlayerPvpHistoryEntity).save(newResult)
        }
        
      })
  
      await Promise.all(updateResult)
    } catch (err) {
      bossRaceRoomLogger.error(err)
    }
  }

  updateBFScores = async (playerID: number, bfscore: number) => {
    try {

      let playerPvp = await getConnection().getRepository(PlayerPvpEntity).findOne({
        where: {
          playerId: playerID
        }
      })

      if(playerID) {
        playerPvp.battlefieldScore = bfscore
        playerPvp.updatedAt = new Date();
        await getConnection().getRepository(PlayerPvpEntity).save(playerPvp)
      }
    } catch (err) {
      bossRaceRoomLogger.error(err)
    }


    // ProfileServerConnector
    // .ConnectionPool.execute(`UPDATE player_pvp
    //   SET battlefield_score = ${bfscore}
    //   WHERE player_id = ${playerID}`).catch(e => bossRaceRoomLogger.error(e));
  }
}