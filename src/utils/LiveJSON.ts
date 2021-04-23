import fse from "fs-extra";
import chokidar from "chokidar";
import { EventEmitter } from "events";
import TypedEventEmitter from "typed-emitter";

interface LiveJSONEvents<T> {
  reloaded: (obj: T) => void
}

export class LiveJSON<T> {
  JSONObj: T = null;
  watcher: chokidar.FSWatcher;
  events = new EventEmitter() as TypedEventEmitter<LiveJSONEvents<T>>;

  refresh = (p: string) => {
    let fileContent = fse.readFileSync(p, 'utf8');
    try {
      let parsedObj = JSON.parse(fileContent);
      this.JSONObj = parsedObj;
    } catch (e) { };
    this.JSONObj = fse.readJSONSync(p);
    this.events.emit('reloaded', this.JSONObj);
  }

  static Make<T>(path: string, options?: chokidar.WatchOptions): LiveJSON<T> {
    let newObj = new LiveJSON<T>();
    newObj.refresh(path);
    newObj.watcher = chokidar.watch(path, options);
    newObj.watcher.on('change', newObj.refresh);
    newObj.watcher.on('change', p => console.log(`changed file ${p}`));
    return newObj;
  }
}