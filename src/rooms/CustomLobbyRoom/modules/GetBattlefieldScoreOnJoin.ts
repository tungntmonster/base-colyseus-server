import { Client } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { CustomLobbyRoom, customLobbyRoomLogger } from "../../CustomLobbyRoom/CustomLobbyRoom";
import { NoOps } from "../../../utils/CommonUtils";
import { PlayerBattlefieldScores }
  from "../../../dataobjects/PlayerBattlefieldScores";
import { CrossRoomEventEmitter }
  from "../../../dataobjects/CrossRoomEventEmitter";
import { getConnection } from "typeorm";
import { PlayerPvpEntity } from "../../../entity/PlayerPvp";

export class GetBattlefieldScoreOnJoin extends RoomModule<CustomLobbyRoom> {
  attach(room: CustomLobbyRoom) {
    super.attach(room);
    this.room.events.on('join', this.getBFScore);
    CrossRoomEventEmitter.on('newbfscore', this.sendBFScoreToClient);
  };

  remove() {
    super.remove();
    this.room.events.off('join', this.getBFScore);
    CrossRoomEventEmitter.off('newbfscore', this.sendBFScoreToClient);
  };

  getBFScoreAsync = async (client: Client, options?: any, auth?: any) => {
    const playerID = client.userData['PlayerID'];
    customLobbyRoomLogger.info(`getting score for ${playerID}`);

    try {
      let bfscore = 0;
      const playerPvp = await getConnection().getRepository(PlayerPvpEntity).findOne({
        where: {
          playerId: playerID
        }
      })

      if(playerPvp) {
        bfscore = playerPvp.battlefieldScore
      } else {
        customLobbyRoomLogger.info(`creating score for ${playerID}`);
        const newPlayerPvp = new PlayerPvpEntity();
        newPlayerPvp.playerId = playerID
        newPlayerPvp.battlefieldScore = bfscore
        await getConnection().getRepository(PlayerPvpEntity).save(newPlayerPvp);
      }

      PlayerBattlefieldScores.set(playerID, bfscore);
      CrossRoomEventEmitter.emit('newbfscore', playerID, bfscore);

    } catch (err) {
      customLobbyRoomLogger.error(err)
    }

    // const scoreQuery = <[mysql2.RowDataPacket[], mysql2.FieldPacket[]]>
    //   await ProfileServerConnector.ConnectionPool.query(`SELECT *
    //     FROM player_pvp
    //     WHERE player_id = ${playerID}`)
    //     .catch(e => customLobbyRoomLogger.error(e));
    


    // if (scoreQuery[0].length > 0) bfscore = scoreQuery[0][0]['battlefield_score'];
    // else {
    //   ProfileServerConnector.ConnectionPool.execute(`INSERT INTO
    //   player_pvp(player_id, battlefield_score)
    //   VALUES(${playerID}, ${bfscore})`).catch(e => customLobbyRoomLogger.error(e));
    // }
    // PlayerBattlefieldScores.set(playerID, bfscore);
    // CrossRoomEventEmitter.emit('newbfscore', playerID, bfscore);
  };

  getBFScore = (client: Client, options?: any, auth?: any) =>
    this.getBFScoreAsync(client, options, auth).catch(NoOps);

  sendBFScoreToClient = (playerID: number, bfscore: number) => {
    customLobbyRoomLogger.info(`flag FetchBattlefieldScore`);
    this.room.clients.find(c => c.userData['PlayerID'] == playerID)
      ?.send('FetchBattlefieldScore', bfscore.toString());
  }
}