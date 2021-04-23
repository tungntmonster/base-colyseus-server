const last = (arr: any[] ,indexFromLast: number = 0) =>  {
  return arr[arr.length - 1 - indexFromLast];
}

const zip = <T, T2, TR>(arr: T[], target: T2[],selector: (e1: T, e2: T2) => TR) => {
    return arr.slice(0, Math.min(arr.length, target.length))
      .map((value, index) => selector(value, target[index]));
}
  
const shuffleKnuth = (arr: any[]) => {
    let result = [...arr];
    let currentIndex = result.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = result[currentIndex];
      result[currentIndex] = result[randomIndex];
      result[randomIndex] = temporaryValue;
    }

    return result;
}

const padLeft = <T>(arr: [], length: number, padValue: T) => {
    return [...new Array(length - arr.length).fill(padValue), ...arr];
} 

const padRight = (arr: any[], length: number, padValue: any) => {
    return [...arr , ...new Array(length - arr.length).fill(padValue)];
} 

const randomElement = (arr: []) => {
    return arr[Math.floor(Math.random() * arr.length)];
}


const weightedRandomBy = (arr: any[], weightSelector: (e: any) => number) => {
    return arr[weightedRandomIdxBy(arr, weightSelector)];
}

const weightedRandomIdxBy = (arr: any[], weightSelector: (e: any) => number)=> {
    const weights = arr.map(weightSelector);
    const weightThresholds = weights
      .map((v, i) => weights.slice(0, i).reduce(AddNumber, 0) + v);
    const roll = Math.random() * weights.reduce(AddNumber, 0);
    return weightThresholds.findIndex(w => w > roll);
}


const AddNumber= (a: number, b: number): number =>  a + b; 

export {
    last,
    zip,
    padLeft,
    padRight,
    shuffleKnuth,
    randomElement,
    weightedRandomBy,
    weightedRandomIdxBy
}