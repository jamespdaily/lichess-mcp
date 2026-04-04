import { api } from "../api.js";
import { startOAuthFlow } from "../auth.js";
import type { LichessUser, LichessGame } from "../types.js";

export async function authStart(): Promise<string> {
  try {
    const token = await startOAuthFlow();
    return `Authenticated successfully! Token expires at ${new Date(token.expires_at).toISOString()}`;
  } catch (err) {
    return `OAuth flow failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function authStatus(): Promise<string> {
  if (!api.isAuthenticated()) {
    return "Not authenticated. Use lichess_auth_start to login.";
  }
  try {
    const user = (await api.get("/api/account")) as LichessUser;
    return JSON.stringify(
      {
        authenticated: true,
        username: user.username,
        title: user.title || null,
        url: `https://lichess.org/@/${user.username}`,
        gamesPlayed: user.count?.all ?? 0,
      },
      null,
      2
    );
  } catch {
    return "Token present but validation failed. Try lichess_auth_start to re-authenticate.";
  }
}

export async function getMyProfile(): Promise<string> {
  if (!api.isAuthenticated()) {
    return "Not authenticated. Use lichess_auth_start to login.";
  }
  const user = (await api.get("/api/account")) as LichessUser;
  return JSON.stringify(user, null, 2);
}

export async function getUser(username: string): Promise<string> {
  const user = (await api.get(`/api/user/${username}`)) as LichessUser;
  return JSON.stringify(user, null, 2);
}

export async function getMyGames(
  max = 10,
  color?: string,
  rated?: boolean
): Promise<string> {
  if (!api.isAuthenticated()) {
    return "Not authenticated. Use lichess_auth_start to login.";
  }
  const account = (await api.get("/api/account")) as LichessUser;
  const params = new URLSearchParams();
  params.set("max", String(max));
  if (color) params.set("color", color);
  if (rated !== undefined) params.set("rated", String(rated));

  const games = (await api.get(
    `/api/games/user/${account.username}?${params.toString()}`,
    "application/x-ndjson"
  )) as LichessGame[];

  return JSON.stringify(games, null, 2);
}
