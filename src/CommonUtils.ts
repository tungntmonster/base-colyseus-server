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

function LogError(...args: any[]) { console.log(args[0]); }

function DeepClone<T>(obj: any): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

function AddNumber(a: number, b: number): number { return a + b; }

export { timeout, generateRandomString, NoOps, LogError, DeepClone, AddNumber };