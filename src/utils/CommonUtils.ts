import * as util from "util";
import "./number-augmentations";

const timeout = util.promisify(setTimeout);

function generateRandomString(allowedCharacters: string,
  length: number): string {
  return [...Array(10).keys()].map(_ => {
    let randomIndex = Math.random().multiply(allowedCharacters.length).floor();
    return allowedCharacters.charAt(randomIndex);
  })
    .reduce((p, c) => p + c, '');
}

function NoOps(...args: any[]) { }


function DeepClone<T>(obj: any): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export { timeout, generateRandomString, NoOps, DeepClone };