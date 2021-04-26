import { RoomModule } from "../../BaseRoom";
import { BossRaceRoom } from "../../BossRaceRoom";
import MatchmakingConfig from "../../../dataobjects/LiveJSON/MatchmakingConfig";
import { timeout, NoOps } from "../../../utils/CommonUtils"

export class StartMatchOnAllPlayersReady extends RoomModule<BossRaceRoom> {
  #currentCountdown: number;

  attach(room: BossRaceRoom) {
    super.attach(room);
    this.#currentCountdown = this.room.maxClients;
    this.room.events.on('playerready', this.startCountdown);
  }

  remove() {
    super.remove();
    this.room.events.off('playerready', this.startCountdown);
  }

  startCountdown = (sessionId: string) => {
    --this.#currentCountdown;
    if (this.#currentCountdown > 0) return;
    this.room.events.emit('startmatch');
    // this.room.broadcast('StartCountdown',
    //   MatchmakingConfig.CountdownToStartMatch.toString());
    timeout(MatchmakingConfig.JSONObj.IntroLength * 1000)
      .then(_ => this.room.events.emit('botstart')).catch(NoOps);
  }
}