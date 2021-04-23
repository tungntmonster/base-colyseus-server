import { Schema, type } from "@colyseus/schema";
import * as http from "http";

export class LobbyRoomState extends Schema {
  @type('string')
  Dummy: string;
}

import { Client, Delayed } from "colyseus";
import { BaseRoom } from "./BaseRoom";
import { GetBattlefieldScoreOnJoin, BossRaceMatchMaking, EnsureUniquePlayerID, SendBossRaceBFRanksOnJoin, CacheBossRaceHistoryOnJoin }
  from "./modules/CustomLobby"
import { NoOps } from "../CommonUtils";

declare module "./BaseRoom" {
  interface RoomEvents {
    matchmake: (client: Client, options: any) => void,
    kickduplicates: (client: Client) => void
  }
}

export class CustomLobbyRoom extends BaseRoom<LobbyRoomState> {
  graceWindowWaits = new Map<number, Delayed>();

  onCreate(options: any) {
    this.setState(new LobbyRoomState());
    this.setPatchRate(1000);

    this.onMessage('Matchmake', (c, m) => this.events.emit('matchmake', c, m));
    this.onMessage('KickDuplicates', (c, m) => this.events.emit('kickduplicates', c))

    new EnsureUniquePlayerID('EnsureUniquePlayerID').attach(this);
    new GetBattlefieldScoreOnJoin('GetBattleFieldScore').attach(this);
    new BossRaceMatchMaking('BossRaceMatchMaking').attach(this);
    new SendBossRaceBFRanksOnJoin('SendBossRaceBFRanksOnJoin').attach(this);
    new CacheBossRaceHistoryOnJoin('CacheBossRaceHistoryOnJoin').attach(this);
  }

  async onJoin(client: Client, options: any, auth: any) {
    console.log(`${client.sessionId} joined ${this.roomId}, client number: ${this.clients.length}, options: ${JSON.stringify(options)}`);
    client.userData = options;
    super.onJoin(client, options, auth);
    this.onMessage('*', (client, t, message) => console.log(`${t}  ${message}`))
  }

  async onLeave(client: Client, consented?: boolean) {
    super.onLeave(client, consented);
    console.log(`${client.sessionId} left ${this.roomId}, client number: ${this.clients.length}, consented? ${consented}`);
    this.graceWindowWaits.get(client.userData['PlayerID']).clear();
    this.graceWindowWaits.delete(client.userData['PlayerID'] as number);
  }

  onAuth(client: Client, options: any, request?: http.IncomingMessage) {
    if (!(options as Object).hasOwnProperty('PlayerID')) return false;
    let playerID = options['PlayerID'] as number;
    if (!this.graceWindowWaits.has(playerID)) {
      this.graceWindowWaits.set(playerID,
        this.clock.setTimeout(NoOps, 10 * 1000));
      return true;
    }
    return !this.graceWindowWaits.get(playerID).active;
  }

  async onDispose() {
    super.onDispose();
  }
}