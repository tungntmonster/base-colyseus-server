import { Schema, MapSchema, type } from "@colyseus/schema";

export class PlayerInfo extends Schema {
  @type('string')
  Name: string;
  @type('float64')
  Score: number;
  @type('int32')
  LivesRemaining: number;
  @type('int32')
  BattlefieldScore: number;
}

export class PlayingRoomState extends Schema {
  @type({ map: PlayerInfo })
  Players = new MapSchema<PlayerInfo>();
}

import { Client } from "colyseus";
import "../number-augmentations";
import { BaseRoom } from "./BaseRoom";
import { LogError } from "../CommonUtils";
import { RoomDirtyConditions, SelectBossRandomlyOnEnoughPlayers, GenerateClientUserData, DisconnectAllOnAdditionalInfoIncomplete, BossRaceBot, UpdatePlayerScore, UpdatePlayerLives, StartMatchOnAllPlayersReady, EndMatchConditions, BroadcastOnEndMatch, CalculateNewBFScoresOnEndMatch, EndMatchOnPlayerInactivity, PostMatchResultsOnEnd } from "./modules/BossRaceRoom";


declare module "./BaseRoom" {
  interface RoomEvents {
    score: (sessionId: string, score: number) => void,
    lives: (sessionId: string, lives: number) => void,
    playerready: (sessionId: string) => void,
    startmatch: () => void,
    botstart: () => void,
    addplayer: (item?: PlayerInfo, key?: string) => void,
    playerliveschange: (sessionId: string, lives: number) => void,
    endmatch: (results: [string, 'win' | 'lose', number][]) => void,
    playertimeout: (client: Client) => void,
    surrender: (client: Client) => void,
    playerpauseapp: (client: Client) => void,
    playerresumeapp: (client: Client) => void,
    phase: (state: 'start' | 'end') => void
  }
}

export class BossRaceRoom extends BaseRoom<PlayingRoomState> {
  realPlayers = new Map<string, number>();
  dirty = false;
  forcedBotMatch = false;

  async onCreate(options: any) {
    this.forcedBotMatch = <boolean>options['ForcedBot'];
    if (this.forcedBotMatch) await this.lock();
    this.setState(new PlayingRoomState());
    this.maxClients = 2;
    this.setPatchRate(200);
    this.setMetadata({ AverageBFScore: 0 });
    super.onCreate(options);

    this.events.on('addplayer', this.recalculateAvgBFScore);
    this.onMessage('score',
      (c, m) => this.events.emit('score', c.sessionId, parseFloat(m)));
    this.onMessage('lives',
      (c, m) => {
        console.log(`${this.roomId}: ${this.state.Players.get(c.sessionId).Name} lives: ${m}`);
        this.events.emit('lives', c.sessionId, parseInt(m));
      });
    this.onMessage('PlayerReady',
      (c, m) => this.events.emit('playerready', c.sessionId));
    this.onMessage('PlayerTimeOut',
      (c, m) => {
        console.log(`${this.roomId}: ${this.state.Players.get(c.sessionId).Name} timed out`);
        this.events.emit('playertimeout', c);
      });
    this.onMessage('PlayerAdditionalInfo', (c, m) => {
      console.log(`client ${c.sessionId} sent additional info`);
      this.events.emit('broadcast', 'PlayerAdditionalInfo', m, c);
    });
    this.onMessage('Surrender', (c, m) => this.events.emit('surrender', c));
    this.onMessage('StartPause', (c, m) => {
      console.log(`${c.sessionId} sent StartPause`);
      this.events.emit('playerpauseapp', c);
    });
    this.onMessage('EndPause', (c, m) => {
      console.log(`${c.sessionId} sent EndPause`);
      this.events.emit('playerresumeapp', c);
    });
    this.onMessage('PhaseStart', (c, m) => this.events.emit('phase', 'start'));
    this.onMessage('PhaseEnd', (c, m) => this.events.emit('phase', 'end'));

    new RoomDirtyConditions('RoomDirtyConditions').attach(this);
    new SelectBossRandomlyOnEnoughPlayers('SelectBoss').attach(this);
    new GenerateClientUserData('GenerateClientUserData').attach(this);
    new DisconnectAllOnAdditionalInfoIncomplete(
      'DisconnectAllOnAdditionalInfoIncomplete').attach(this);
    new BossRaceBot('BossRaceBot').attach(this);
    new UpdatePlayerScore('UpdatePlayerScore').attach(this);
    new UpdatePlayerLives('UpdatePlayerLives').attach(this);
    new StartMatchOnAllPlayersReady('StartCountdown').attach(this);
    new EndMatchConditions('EndMatchConditions').attach(this);
    new BroadcastOnEndMatch('BroadcastOnEndMatch').attach(this);
    new CalculateNewBFScoresOnEndMatch('CalculateNewBFScores').attach(this);
    new EndMatchOnPlayerInactivity('EndMatchOnPlayerInactivity').attach(this);
    new PostMatchResultsOnEnd('PostMatchResultsOnEnd').attach(this);
  }

  async onJoin(client: Client, options?: any, auth?: any) {
    console.log(`${client.sessionId} joined ${this.roomId}, client number: ${this.clients.length}, options: ${JSON.stringify(options)}`);
    this.realPlayers.set(client.sessionId, options['PlayerID']);
    await this.addPlayerState(client.sessionId, options);
    super.onJoin(client, options, auth);
  }

  onLeave(client: Client, consented?: boolean) {
    super.onLeave(client, consented);
    this.broadcast('PlayerLeave', client.sessionId);
    console.log(`${client.sessionId} left ${this.roomId}, client number: ${this.clients.length}, room locked? ${this.locked}`);
  }

  async addPlayerState(sessionId: string, options: any) {
    const newPlayerInfo = new PlayerInfo();
    newPlayerInfo.Name = <string>options['PlayerName'];
    newPlayerInfo.Score = 0;
    newPlayerInfo.LivesRemaining = <number>options['StartingLives'];
    newPlayerInfo.BattlefieldScore = <number>options['BattlefieldScore'];
    this.state.Players.set(sessionId, newPlayerInfo);
    if (this.state.Players.size == this.maxClients) await this.lock();
    this.events.emit('addplayer', newPlayerInfo, sessionId);
  }

  recalculateAvgBFScore = () => this.setMetadata({
    AverageBFScore: [...this.state.Players.values()]
      .reduce((p, c) => p + c.BattlefieldScore, 0)
      .multiply(1 / this.state.Players.size)
      .floor()
  }).catch(LogError);
}