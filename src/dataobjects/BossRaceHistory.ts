export type MatchResult = {
  score: number,
  result: 'win' | 'lose',
  createdAt: Date
};

export const Matches = new Map<number, MatchResult[]>();

export const CachedPlayers = new Set<number>();