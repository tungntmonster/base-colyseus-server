import { Client } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { BossRaceRoom } from "../../BossRaceRoom";

export class GenerateClientUserData extends RoomModule<BossRaceRoom> {
  attach(room: BossRaceRoom) {
    super.attach(room);
    this.room.events.on('join', this.generateUserData);
  }

  remove() {
    super.remove();
    this.room.events.off('join', this.generateUserData);
  }

  generateUserData = (client: Client, options?: any, auth?: any) =>
    client.userData = {
      type: 'human',
      id: <number>options['PlayerID'],
      hasTimedOut: false
    };
}