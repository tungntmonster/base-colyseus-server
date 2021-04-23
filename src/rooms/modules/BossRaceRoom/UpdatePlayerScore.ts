import { Client } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { BossRaceRoom } from "../../BossRaceRoom";

export class UpdatePlayerScore extends RoomModule<BossRaceRoom> {

  attach(room: BossRaceRoom) {
    super.attach(room);
    this.room.events.on('score', this.updateScore);
    this.room.events.once('endmatch', () => this.room.events.off('score', this.updateScore));
  }

  remove() {
    super.remove();
    this.room.events.off('score', this.updateScore);
  }

  updateScore = (sessionId: string, score: number) => {
    this.room.state.Players.get(sessionId).Score = score;
  }
}