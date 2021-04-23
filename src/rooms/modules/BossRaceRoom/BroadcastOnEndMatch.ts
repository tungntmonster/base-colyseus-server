import { Client } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { BossRaceRoom } from "../../BossRaceRoom";

export class BroadcastOnEndMatch extends RoomModule<BossRaceRoom> {

  attach(room: BossRaceRoom) {
    super.attach(room);
    this.room.events.on('endmatch', this.broadcastResults);
  }

  remove() {
    super.remove();
    this.room.events.off('endmatch', this.broadcastResults);
  }

  broadcastResults = (results: [string, 'win' | 'lose', number][]) => {
    this.room.broadcast('EndMatch', JSON.stringify(results));
  }
}