import { Client, Delayed } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { BossRaceRoom } from "../../BossRaceRoom";
import MatchmakingConfig from "../../../dataobjects/LiveJSON/MatchmakingConfig";
import { bossRaceRoomLogger } from "../BossRaceRoom";

export class EndMatchOnPlayerInactivity extends RoomModule<BossRaceRoom> {
  inactivityWaits = new Map<string, Delayed>();

  attach(room: BossRaceRoom) {
    super.attach(room);
    this.room.events.on('playerpauseapp', this.waitForInactivity);
    this.room.events.on('playerresumeapp', this.resumeActivity);
    this.room.events.once('endmatch', this.deregister)
  }

  remove() {
    super.remove();
    this.deregister();
  }

  deregister = () => {
    this.room.events.off('playerpauseapp', this.waitForInactivity);
    this.room.events.off('playerresumeapp', this.resumeActivity);
    [...this.inactivityWaits.values()].forEach(w => w.clear());
  }

  waitForInactivity = (client: Client) => {
    let wait = this.room.clock.setTimeout(() => {
      this.inactivityWaits.forEach(d => d.clear());
      this.room.broadcast('PlayerInactive', client.sessionId);
      const otherSessionId = [...this.room.state.Players.keys()]
        .find(k => k != client.sessionId);
      bossRaceRoomLogger.info(`${this.room.roomId} end with player inactive`);
      this.room.events.emit('endmatch',
        [[client.sessionId,
          'lose',
        this.room.state.Players.get(client.sessionId).Score],
        [otherSessionId,
          'win',
          this.room.state.Players.get(otherSessionId).Score]])
      this.room.events.off('playerpauseapp', this.waitForInactivity);
      this.room.events.off('playerresumeapp', this.resumeActivity);
    }, MatchmakingConfig.JSONObj.ToleratedPlayerInactivitySeconds * 1000);
    this.inactivityWaits.set(client.sessionId, wait);
  }

  resumeActivity = (client: Client) => this.inactivityWaits
    .get(client.sessionId)
    .clear();
}