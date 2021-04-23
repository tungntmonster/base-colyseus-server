export { };

declare global {
  interface Number {
    plus(r: number): number;
    multiply(r: number): number;
    pow(r: number): number;
    floor(): number;
    ceil(): number;
    randomBetween(r: number): number;
    difference(r: number): number;
    inRange(range: [number, number]): boolean;
    inRangeInclusive(range: [number, number]): boolean;
    clamp(min: number, max: number): number;
    noise(ratio: number): number;
    noiseRange(range: number): number;
    randomWithinFloored(count: number,
      minDistance: number,
      startingArray?: number[]): number[];
  }
}

if (!Number.prototype.plus)
  Number.prototype.plus = function (r: number): number {
    return this.valueOf() + r;
  }

if (!Number.prototype.multiply)
  Number.prototype.multiply = function (r: number): number {
    return this.valueOf() * r;
  }

if (!Number.prototype.pow)
  Number.prototype.pow = function (r: number): number {
    return Math.pow(this.valueOf(), r);
  }

if (!Number.prototype.floor)
  Number.prototype.floor = function (): number {
    return Math.floor(this.valueOf());
  }

if (!Number.prototype.ceil)
  Number.prototype.ceil = function (): number {
    return Math.ceil(this.valueOf());
  }

if (!Number.prototype.randomBetween)
  Number.prototype.randomBetween = function (r: number): number {
    const min = Math.min(this.valueOf(), r);
    const max = Math.max(this.valueOf(), r);
    return Math.random().multiply(max - min) + min;
  }

if (!Number.prototype.difference)
  Number.prototype.difference = function (r: number): number {
    return Math.abs(this.valueOf() - r);
  }

if (!Number.prototype.inRange)
  Number.prototype.inRange = function (range: [number, number]): boolean {
    return this.valueOf() >= range[0] && this.valueOf() < range[1];
  }

if (!Number.prototype.inRangeInclusive)
  Number.prototype.inRangeInclusive = function (
    range: [number, number]): boolean {
    return this.valueOf() >= range[0] && this.valueOf() <= range[1];
  }

if (!Number.prototype.clamp)
  Number.prototype.clamp = function (min: number, max: number): number {
    let res = this.valueOf();
    res = Math.max(res, min);
    res = Math.min(res, max);
    return res
  }

if (!Number.prototype.noise)
  Number.prototype.noise = function (ratio: number): number {
    return this.valueOf().noiseRange(this.valueOf() * ratio);
  }

if (!Number.prototype.noiseRange)
  Number.prototype.noiseRange = function (range: number): number {
    return (this.valueOf() - range).randomBetween(this.valueOf() + range);
  }

if (!Number.prototype.randomWithinFloored)
  Number.prototype.randomWithinFloored = function (count: number,
    minDistance: number = 0,
    startingArray: number[] = []) {
    let results = [...startingArray];
    let lastResultOrDefault = () => results.length > 0 ? results[results.length - 1] : 0;
    let rangeCeiling = () => (count - 1 - results.length).multiply(minDistance)
      .multiply(-1)
      .plus(this.valueOf());
    while (results.length < count) results.push(lastResultOrDefault()
      .plus(minDistance)
      .randomBetween(rangeCeiling())
      .floor());
    return results.slice(0, count);
  }