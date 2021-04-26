import { Client } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { CustomLobbyRoom } from "../CustomLobbyRoom";
import MatchmakingConfig from "../../../dataobjects/LiveJSON/MatchmakingConfig"

export class SendBossRaceBFRanksOnJoin extends RoomModule<CustomLobbyRoom> {
  duplicatePlayerIDCloseCode = 4001;

  attach(room: CustomLobbyRoom) {
    super.attach(room);
    this.room.events.on('join', this.sendRankInfo);
  }

  remove() {
    super.remove();
    this.room.events.off('join', this.sendRankInfo);
  }

  sendRankInfo = (client: Client, options: any) => client.send('BossRaceRanks',
    JSON.stringify(MatchmakingConfig.JSONObj.Ranks));
}