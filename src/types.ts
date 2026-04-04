export interface LichessUser {
  id: string;
  username: string;
  title?: string;
  online?: boolean;
  playing?: string;
  count?: {
    all: number;
    rated: number;
    win: number;
    loss: number;
    draw: number;
  };
  perfs?: Record<string, {
    games: number;
    rating: number;
    rd: number;
    prog: number;
  }>;
  createdAt?: number;
  seenAt?: number;
  url?: string;
}

export interface LichessGame {
  fullId?: string;
  gameId: string;
  fen: string;
  color: "white" | "black";
  lastMove?: string;
  source?: string;
  variant?: { key: string; name: string };
  speed?: string;
  perf?: string;
  rated?: boolean;
  hasMoved?: boolean;
  opponent?: { id: string; username: string; rating?: number };
  isMyTurn?: boolean;
  secondsLeft?: number;
}

export interface LichessGameFull {
  id: string;
  rated: boolean;
  variant: string;
  speed: string;
  perf: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  players: {
    white: { user?: LichessUser; rating?: number };
    black: { user?: LichessUser; rating?: number };
  };
  moves: string;
  clock?: { initial: number; increment: number };
  winner?: "white" | "black";
}

export interface LichessChallenge {
  id: string;
  url: string;
  status: string;
  challenger: { id: string; name: string; rating: number };
  destUser?: { id: string; name: string; rating: number };
  variant: { key: string; name: string };
  rated: boolean;
  speed: string;
  timeControl: { type: string; limit?: number; increment?: number };
  color: string;
}

export interface LichessCloudEval {
  fen: string;
  knodes: number;
  depth: number;
  pvs: Array<{
    moves: string;
    cp?: number;
    mate?: number;
  }>;
}

export interface LichessPuzzle {
  game: { id: string; pgn: string };
  puzzle: {
    id: string;
    rating: number;
    plays: number;
    initialPly: number;
    solution: string[];
    themes: string[];
  };
}

export interface BoardGameState {
  type: "gameState" | "gameFull";
  moves?: string;
  wtime?: number;
  btime?: number;
  winc?: number;
  binc?: number;
  status?: string;
  winner?: string;
}

export interface BoardGameFull {
  type: "gameFull";
  id: string;
  rated: boolean;
  variant: { key: string; name: string };
  speed: string;
  white: { id: string; name: string; rating: number };
  black: { id: string; name: string; rating: number };
  state: BoardGameState;
}

export interface TokenData {
  access_token: string;
  token_type: string;
  expires_at: number;
}
