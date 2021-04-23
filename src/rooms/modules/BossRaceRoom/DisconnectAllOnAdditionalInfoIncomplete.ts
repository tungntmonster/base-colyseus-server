import { Client } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { BossRaceRoom } from "../../BossRaceRoom";

export class DisconnectAllOnAdditionalInfoIncomplete
  extends RoomModule<BossRaceRoom> {
  sentClients = new Set<string>();

  attach(room: BossRaceRoom) {
    super.attach(room);
    this.room.events.on('broadcast', this.countAdditionalInfoSent);
    this.room.events.on('leave', this.checkAllAdditionalInfoSent);
    this.room.events.once('startmatch', this.deregister);
  }

  remove() {
    super.remove();
    this.deregister();
  }

  deregister = () => {
    this.room.events.off('broadcast', this.countAdditionalInfoSent);
    this.room.events.off('leave', this.checkAllAdditionalInfoSent);
  }

  countAdditionalInfoSent = (messageType: string,
    message: any,
    source?: Client) => {
    if (messageType != 'PlayerAdditionalInfo') return;
    this.sentClients.add(source.sessionId);
  }

  checkAllAdditionalInfoSent = (client: Client) => {
    let realClients = [...this.room.realPlayers.keys()];
    if (realClients.some(sid => !this.sentClients.has(sid)))
      this.room.clients.forEach(c => c.leave(3999));
  }
}