import { api } from "../api.js";
import type { LichessCloudEval, LichessPuzzle } from "../types.js";

export async function cloudEval(
  fen: string,
  multiPv: number = 1
): Promise<string> {
  const params = new URLSearchParams({
    fen,
    multiPv: String(multiPv),
  });
  const data = (await api.get(
    `/api/cloud-eval?${params.toString()}`
  )) as LichessCloudEval;

  const lines = data.pvs.map((pv, i) => {
    const score = pv.mate !== undefined
      ? `Mate in ${pv.mate}`
      : `${((pv.cp ?? 0) / 100).toFixed(2)} pawns`;
    return `Line ${i + 1}: ${score} — ${pv.moves}`;
  });

  return JSON.stringify(
    {
      fen: data.fen,
      depth: data.depth,
      knodes: data.knodes,
      evaluation: lines,
      raw: data.pvs,
    },
    null,
    2
  );
}

export async function getDailyPuzzle(): Promise<string> {
  const data = (await api.get("/api/puzzle/daily")) as LichessPuzzle;

  return JSON.stringify(
    {
      id: data.puzzle.id,
      rating: data.puzzle.rating,
      plays: data.puzzle.plays,
      themes: data.puzzle.themes,
      solution: data.puzzle.solution,
      initialPly: data.puzzle.initialPly,
      gameUrl: `https://lichess.org/${data.game.id}`,
      pgn: data.game.pgn,
    },
    null,
    2
  );
}

export async function getPuzzle(id: string): Promise<string> {
  const data = (await api.get(`/api/puzzle/${id}`)) as LichessPuzzle;

  return JSON.stringify(
    {
      id: data.puzzle.id,
      rating: data.puzzle.rating,
      plays: data.puzzle.plays,
      themes: data.puzzle.themes,
      solution: data.puzzle.solution,
      initialPly: data.puzzle.initialPly,
      gameUrl: `https://lichess.org/${data.game.id}`,
      pgn: data.game.pgn,
    },
    null,
    2
  );
}
