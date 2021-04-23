import { Client } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { CustomLobbyRoom } from "../../CustomLobbyRoom";
import * as mysql2 from "mysql2/promise";
import { ProfileServerConnector } from "../../../ProfileServerConnector";
import { LogError, NoOps } from "../../../CommonUtils";
import { PlayerBattlefieldScores }
  from "../../../dataobjects/PlayerBattlefieldScores";
import { CrossRoomEventEmitter }
  from "../../../dataobjects/CrossRoomEventEmitter";

export class GetBattlefieldScoreOnJoin extends RoomModule<CustomLobbyRoom> {
  attach(room: CustomLobbyRoom) {
    super.attach(room);
    // this.room.events.on('join', this.getBFScore);
    CrossRoomEventEmitter.on('newbfscore', this.sendBFScoreToClient);
  };

  remove() {
    super.remove();
    this.room.events.off('join', this.getBFScore);
    CrossRoomEventEmitter.off('newbfscore', this.sendBFScoreToClient);
  };

  getBFScoreAsync = async (client: Client, options?: any, auth?: any) => {
    const playerID = client.userData['PlayerID'];
    console.log(`getting score for ${playerID}`);
    const scoreQuery = <[mysql2.RowDataPacket[], mysql2.FieldPacket[]]>
      await ProfileServerConnector.ConnectionPool.query(`SELECT *
        FROM player_pvp
        WHERE player_id = ${playerID}`)
        .catch(LogError);
    let bfscore = 0;
    if (scoreQuery[0].length > 0) bfscore = scoreQuery[0][0]['battlefield_score'];
    else {
      console.log(`creating score for ${playerID}`);
      ProfileServerConnector.ConnectionPool.execute(`INSERT INTO
      player_pvp(player_id, battlefield_score)
      VALUES(${playerID}, ${bfscore})`).catch(LogError);
    }
    PlayerBattlefieldScores.set(playerID, bfscore);
    CrossRoomEventEmitter.emit('newbfscore', playerID, bfscore);
  };

  getBFScore = (client: Client, options?: any, auth?: any) =>
    this.getBFScoreAsync(client, options, auth).catch(NoOps);

  sendBFScoreToClient = (playerID: number, bfscore: number) => {
    console.log(`flag FetchBattlefieldScore`);
    this.room.clients.find(c => c.userData['PlayerID'] == playerID)
      ?.send('FetchBattlefieldScore', bfscore.toString());
  }
}