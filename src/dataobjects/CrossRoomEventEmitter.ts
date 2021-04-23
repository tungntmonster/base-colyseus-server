import { EventEmitter } from "events";
import TypedEventEmitter from "typed-emitter";

interface CrossRoomEvents {
  newbfscore: (playerID: number, bfscore: number) => void
}

const CrossRoomEventEmitter
  = new EventEmitter() as TypedEventEmitter<CrossRoomEvents>;

export { CrossRoomEventEmitter };