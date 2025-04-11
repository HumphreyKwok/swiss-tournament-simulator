export interface PlayerData {
  name: string;
  points: number;
  wins: number;
  losses: number;
  ties: number;
  opponents: string[];
}

export interface MatchResult {
  round: number;
  player1: string;
  player2: string;
  winner: string | "tie" | "bye";
}

export interface TournamentState {
  players: PlayerData[];
  currentRound: number;
  totalRounds: number;
  pairings: [PlayerData, PlayerData][];
  results: MatchResult[];
}

export type OMWRating = "偏弱" | "正常" | "偏強" | "高手" | "地獄";

export interface PlayerStanding extends PlayerData {
  rank: number;
  omwValue: number;
  omwRating: OMWRating;
}
