import { api } from "../api.js";
import type { LichessChallenge, ChallengeList } from "../types.js";

export async function listChallenges(): Promise<string> {
  if (!api.isAuthenticated()) {
    return "Not authenticated. Use lichess_auth_start to login.";
  }
  const data = (await api.get("/api/challenge")) as ChallengeList;
  return JSON.stringify(
    {
      incoming: data.in ?? [],
      outgoing: data.out ?? [],
    },
    null,
    2
  );
}

export async function acceptChallenge(challengeId: string): Promise<string> {
  if (!api.isAuthenticated()) {
    return "Not authenticated. Use lichess_auth_start to login.";
  }
  await api.post(`/api/challenge/${challengeId}/accept`);
  return `Challenge ${challengeId} accepted.`;
}

export async function declineChallenge(
  challengeId: string,
  reason: string = "generic"
): Promise<string> {
  if (!api.isAuthenticated()) {
    return "Not authenticated. Use lichess_auth_start to login.";
  }
  await api.post(`/api/challenge/${challengeId}/decline`, { reason });
  return `Challenge ${challengeId} declined.`;
}

export async function cancelChallenge(challengeId: string): Promise<string> {
  if (!api.isAuthenticated()) {
    return "Not authenticated. Use lichess_auth_start to login.";
  }
  await api.post(`/api/challenge/${challengeId}/cancel`);
  return `Challenge ${challengeId} cancelled.`;
}

export async function challengeAi(
  level: number,
  clockLimit: number,
  clockIncrement: number,
  color: string = "random",
  variant: string = "standard"
): Promise<string> {
  if (!api.isAuthenticated()) {
    return "Not authenticated. Use lichess_auth_start to login.";
  }
  const params: Record<string, string> = {
    level: String(level),
    "clock.limit": String(clockLimit * 60), // convert minutes to seconds
    "clock.increment": String(clockIncrement),
    color,
    variant,
  };
  const data = (await api.post("/api/challenge/ai", params)) as {
    id: string;
    color: string;
    speed: string;
    variant: { key: string; name: string };
  };
  return JSON.stringify(
    {
      gameId: data.id,
      color: data.color,
      speed: data.speed,
      variant: data.variant?.name,
      url: `https://lichess.org/${data.id}`,
    },
    null,
    2
  );
}
