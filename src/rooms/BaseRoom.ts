import { Room, Client } from "colyseus";
import { EventEmitter } from "events";
import TypedEventEmitter from "typed-emitter";

interface RoomEvents {
  join: (client: Client, options?: any, auth?: any) => void,
  leave: (client: Client, consented?: boolean) => void,
  dispose: () => void,
  broadcast: (messageType: string, message: any, source?: Client) => void
}

class BaseRoom<TS = any, TM = any> extends Room<TS, TM> {
  events = new EventEmitter() as TypedEventEmitter<RoomEvents>;
  clientMappings = new Map<string, Client>();
  modules = new Map<string, RoomModule<BaseRoom>>();

  onCreate(options: any) {
    this.events.setMaxListeners(50);
    this.events.on('broadcast', (messageType, message, source) => this
      .broadcast(messageType, message, { except: source }));
  }

  onJoin(client: Client, options?: any, auth?: any): void | Promise<any> {
    this.clientMappings.set(client.sessionId, client);
    this.events.emit('join', client, options, auth);
  }

  onLeave(client: Client, consented?: boolean): void | Promise<any> {
    this.events.emit('leave', client, consented);
    this.clientMappings.delete(client.sessionId);
  }

  onDispose(): void | Promise<any> {
    this.events.emit('dispose');
    this.modules.forEach(m => m.remove());
  }
}

class RoomModule<T extends BaseRoom = BaseRoom> {
  room: T;
  #identifier: string;
  get identifier() { return this.#identifier; }

  constructor(identifier: string) { this.#identifier = identifier; }

  attach(room: T) {
    room.modules.set(this.#identifier, this);
    this.room = room;
  }

  remove() { this.room.modules.delete(this.#identifier); }
}

export { RoomEvents, BaseRoom, RoomModule };