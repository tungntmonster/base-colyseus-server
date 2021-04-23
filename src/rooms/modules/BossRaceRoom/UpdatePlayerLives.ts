import { Client } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { BossRaceRoom } from "../../BossRaceRoom";

export class UpdatePlayerLives extends RoomModule<BossRaceRoom> {

  attach(room: BossRaceRoom) {
    super.attach(room);
    this.room.events.on('lives', this.updateLives);
  }

  remove() {
    super.remove();
    this.room.events.off('lives', this.updateLives);
  }

  updateLives = (sessionId: string, lives: number) => {
    this.room.state.Players.get(sessionId).LivesRemaining = lives;
    this.room.events.emit('playerliveschange', sessionId, lives);
  }
}