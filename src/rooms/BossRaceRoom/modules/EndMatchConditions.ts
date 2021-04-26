import { Client } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { BossRaceRoom } from "../../BossRaceRoom";
import { bossRaceRoomLogger } from "../BossRaceRoom";

export class EndMatchConditions extends RoomModule<BossRaceRoom> {
  attach(room: BossRaceRoom) {
    super.attach(room);
    this.room.events.on('playerliveschange',
      this.endWhenDeadPlayerHasLowerScore);
    this.room.events.on('score', this.endWhenScoreExceedDeadPlayer);
    this.room.events.once('startmatch', () => {
      this.room.events.once('leave', this.endWithPlayerLoseLeft);
      this.room.events.once('surrender', this.endWithPlayerLoseSurrender);
      this.room.events.once('endmatch', this.deregister);
    });
    this.room.events.on('playertimeout', this.endWhenAllPlayersTimeout);
  }

  remove() {
    super.remove();
    this.deregister();
  }

  deregister = () => {
    this.room.events.off('playerliveschange',
      this.endWhenDeadPlayerHasLowerScore);
    this.room.events.off('score', this.endWhenScoreExceedDeadPlayer);
    this.room.events.off('leave', this.endWithPlayerLoseLeft);
    this.room.events.off('surrender', this.endWithPlayerLoseSurrender);
    this.room.events.off('playertimeout', this.endWhenAllPlayersTimeout);
  }

  endWhenDeadPlayerHasLowerScore = (sessionId: string, lives: number) => {
    const playerInfos = [...this.room.state.Players];
    if (playerInfos.some(p => p[1].LivesRemaining > 0)) return;
    const otherPlayer = playerInfos.find(p => p[0] != sessionId);
    const deadPlayer = playerInfos.find(p => p[0] == sessionId);
    bossRaceRoomLogger.info(`${this.room.roomId} end with dead player has lower score`);
    if (deadPlayer[1].Score < otherPlayer[1].Score) this.room.events
      .emit('endmatch',
        [[deadPlayer[0], 'lose', deadPlayer[1].Score],
        [otherPlayer[0], 'win', otherPlayer[1].Score]]);
    else if (deadPlayer[1].Score == otherPlayer[1].Score) this.room.events
      .emit('endmatch', [[deadPlayer[0], 'lose', deadPlayer[1].Score],
      [otherPlayer[0], 'win', otherPlayer[1].Score]]);
  }

  endWhenScoreExceedDeadPlayer = (sessionId: string, score: number) => {
    const otherSessionId = [...this.room.state.Players.keys()]
      .find(k => k != sessionId);
    const otherPlayerInfo = this.room.state.Players.get(otherSessionId);
    if (otherPlayerInfo == null) return;
    if (otherPlayerInfo.LivesRemaining > 0) return;
    if (score > otherPlayerInfo.Score) {
      bossRaceRoomLogger.info(`${this.room.roomId} end with remaining player has higher score than dead player`);
      this.room.events.emit('endmatch',
        [[sessionId, 'win', this.room.state.Players.get(sessionId).Score],
        [otherSessionId, 'lose', otherPlayerInfo.Score]]);
    }
  }

  endWithPlayerLoseSurrender = (client: Client) => this
    .endWithPlayerLose(client, 'surrender');

  endWithPlayerLoseLeft = (client: Client) => this
    .endWithPlayerLose(client, 'left');

  endWithPlayerLose = (client: Client, reason: string) => {
    const otherSessionId = [...this.room.state.Players.keys()]
      .find(k => k != client.sessionId);
    bossRaceRoomLogger.info(`${this.room.roomId} end with player ${reason}`);
    this.room.events.emit('endmatch',
      [[client.sessionId,
        'lose',
      this.room.state.Players.get(client.sessionId).Score],
      [otherSessionId,
        'win',
        this.room.state.Players.get(otherSessionId).Score]]);
  }

  endWhenAllPlayersTimeout = (client: Client) => {
    client.userData['hasTimedOut'] = true;
    if (this.room.clients.some(c => !c.userData['hasTimedOut'])) return;
    bossRaceRoomLogger.info(`${this.room.roomId} end with players timed out`);
    const playerInfos = [...this.room.state.Players];
    const winner = playerInfos.reduce(
      (p, c) => p[1].Score > c[1].Score ? p : c);
    const loser = playerInfos.reduce(
      (p, c) => p[1].Score < c[1].Score ? p : c);
    this.room.events.emit('endmatch',
      [[winner[0], 'win', winner[1].Score],
      [loser[0], 'lose', loser[1].Score]]);
  }
}