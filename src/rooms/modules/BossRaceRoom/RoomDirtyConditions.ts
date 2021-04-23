import { Client } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { BossRaceRoom } from "../../BossRaceRoom";

export class RoomDirtyConditions extends RoomModule<BossRaceRoom> {

  attach(room: BossRaceRoom) {
    super.attach(room);
    this.room.events.once('leave', this.markRoomDirty);
    this.room.events.on('join', this.disconnectPlayerOnJoinDirtyRoom);
    this.room.events.once('startmatch', this.deregister);
  }

  remove() {
    super.remove();
    this.deregister();
  }

  deregister = () => {
    this.room.events.off('leave', this.markRoomDirty);
    this.room.events.off('join', this.disconnectPlayerOnJoinDirtyRoom);
  }

  markRoomDirty = () => this.room.dirty = true;

  disconnectPlayerOnJoinDirtyRoom = (client: Client) => {
    if (!this.room.dirty) return;
    console.log(`${this.room.roomId}: client ${client.sessionId} joined a dirty room, leaving with code 4002`);
    setTimeout(() => client.leave(4002), 1000);
  }
}