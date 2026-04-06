import { api } from "../api.js";
import { startOAuthFlow } from "../auth.js";
import type { LichessUser, LichessGame, RatingHistory, Crosstable, Leaderboard } from "../types.js";

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

export async function getRatingHistory(username: string): Promise<string> {
  const data = (await api.get(
    `/api/user/${username}/rating-history`
  )) as RatingHistory[];

  // Filter to time controls that have games and format the points
  const filtered = data
    .filter((tc) => tc.points.length > 0)
    .map((tc) => ({
      timeControl: tc.name,
      games: tc.points.length,
      current: tc.points[tc.points.length - 1][3],
      history: tc.points.map((p) => ({
        date: `${p[0]}-${String(p[1] + 1).padStart(2, "0")}-${String(p[2]).padStart(2, "0")}`,
        rating: p[3],
      })),
    }));

  return JSON.stringify(filtered, null, 2);
}

export async function getCrosstable(
  user1: string,
  user2: string
): Promise<string> {
  const data = (await api.get(
    `/api/crosstable/${user1}/${user2}`
  )) as Crosstable;

  return JSON.stringify(
    {
      scores: data.users,
      totalGames: data.nbGames,
    },
    null,
    2
  );
}

export async function getLeaderboard(
  nb: number = 10,
  perfType: string = "blitz"
): Promise<string> {
  const data = (await api.get(
    `/api/player/top/${nb}/${perfType}`
  )) as Leaderboard;

  return JSON.stringify(
    data.users.map((u, i) => ({
      rank: i + 1,
      username: u.username,
      title: u.title,
      rating: u.perfs?.[perfType]?.rating,
      progress: u.perfs?.[perfType]?.progress,
    })),
    null,
    2
  );
}
