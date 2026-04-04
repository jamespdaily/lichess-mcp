import { api } from "../api.js";
import type { LichessGame, LichessChallenge } from "../types.js";

export async function getOngoingGames(): Promise<string> {
  if (!api.isAuthenticated()) {
    return "Not authenticated. Use lichess_auth_start to login.";
  }
  const data = (await api.get("/api/account/playing")) as {
    nowPlaying: LichessGame[];
  };
  if (!data.nowPlaying || data.nowPlaying.length === 0) {
    return "No ongoing games.";
  }
  return JSON.stringify(data.nowPlaying, null, 2);
}

export async function createChallenge(
  username: string,
  clockLimit: number,
  clockIncrement: number,
  color: string = "random",
  rated: boolean = false
): Promise<string> {
  if (!api.isAuthenticated()) {
    return "Not authenticated. Use lichess_auth_start to login.";
  }
  const params: Record<string, string> = {
    "clock.limit": String(clockLimit * 60), // convert minutes to seconds
    "clock.increment": String(clockIncrement),
    color,
    rated: String(rated),
  };

  const data = (await api.post(
    `/api/challenge/${username}`,
    params
  )) as { challenge: LichessChallenge };

  return JSON.stringify(
    {
      id: data.challenge.id,
      url: data.challenge.url,
      status: data.challenge.status,
      variant: data.challenge.variant.name,
      speed: data.challenge.speed,
      rated: data.challenge.rated,
    },
    null,
    2
  );
}

export async function makeMove(
  gameId: string,
  move: string
): Promise<string> {
  if (!api.isAuthenticated()) {
    return "Not authenticated. Use lichess_auth_start to login.";
  }
  const result = await api.post(`/api/board/game/${gameId}/move/${move}`);
  return JSON.stringify(result, null, 2);
}

export async function streamGame(gameId: string): Promise<string> {
  if (!api.isAuthenticated()) {
    return "Not authenticated. Use lichess_auth_start to login.";
  }
  const events = await api.getNdjsonStream(
    `/api/board/game/stream/${gameId}`
  );

  if (events.length === 0) {
    return "No game data received.";
  }

  return JSON.stringify(events, null, 2);
}

export async function resign(gameId: string): Promise<string> {
  if (!api.isAuthenticated()) {
    return "Not authenticated. Use lichess_auth_start to login.";
  }
  await api.post(`/api/board/game/${gameId}/resign`);
  return `Resigned game ${gameId}.`;
}

export async function offerDraw(
  gameId: string,
  accept: boolean
): Promise<string> {
  if (!api.isAuthenticated()) {
    return "Not authenticated. Use lichess_auth_start to login.";
  }
  const yesNo = accept ? "yes" : "no";
  await api.post(`/api/board/game/${gameId}/draw/${yesNo}`);
  return accept
    ? `Draw offered/accepted for game ${gameId}.`
    : `Draw declined for game ${gameId}.`;
}
