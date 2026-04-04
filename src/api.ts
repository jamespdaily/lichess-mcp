import { TokenData } from "./types.js";

const BASE_URL = "https://lichess.org";

export class LichessApi {
  private token: TokenData | null = null;

  setToken(token: TokenData | null): void {
    this.token = token;
  }

  getToken(): TokenData | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    if (!this.token) return false;
    if (Date.now() >= this.token.expires_at) return false;
    return true;
  }

  private headers(accept = "application/json"): Record<string, string> {
    const h: Record<string, string> = { Accept: accept };
    if (this.token) {
      h["Authorization"] = `Bearer ${this.token.access_token}`;
    }
    return h;
  }

  async get(path: string, accept = "application/json"): Promise<unknown> {
    const url = `${BASE_URL}${path}`;
    console.error(`[lichess-mcp] GET ${path}`);
    let res = await fetch(url, { headers: this.headers(accept) });

    if (res.status === 429) {
      console.error("[lichess-mcp] Rate limited, waiting 60s...");
      await new Promise((r) => setTimeout(r, 60000));
      res = await fetch(url, { headers: this.headers(accept) });
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Lichess API error ${res.status}: ${body}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return res.json();
    }
    if (contentType.includes("application/x-ndjson")) {
      const text = await res.text();
      const lines = text.trim().split("\n").filter(Boolean);
      return lines.map((line) => JSON.parse(line));
    }
    return res.text();
  }

  async post(
    path: string,
    body?: Record<string, string> | URLSearchParams,
    accept = "application/json"
  ): Promise<unknown> {
    const url = `${BASE_URL}${path}`;
    console.error(`[lichess-mcp] POST ${path}`);

    const headers: Record<string, string> = {
      ...this.headers(accept),
    };

    let fetchBody: string | undefined;
    if (body) {
      if (body instanceof URLSearchParams) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        fetchBody = body.toString();
      } else {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        fetchBody = new URLSearchParams(body).toString();
      }
    }

    let res = await fetch(url, { method: "POST", headers, body: fetchBody });

    if (res.status === 429) {
      console.error("[lichess-mcp] Rate limited, waiting 60s...");
      await new Promise((r) => setTimeout(r, 60000));
      res = await fetch(url, { method: "POST", headers, body: fetchBody });
    }

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Lichess API error ${res.status}: ${errBody}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return res.json();
    }
    return res.text();
  }

  async getNdjsonStream(path: string): Promise<unknown[]> {
    const url = `${BASE_URL}${path}`;
    console.error(`[lichess-mcp] GET (ndjson) ${path}`);
    const res = await fetch(url, {
      headers: this.headers("application/x-ndjson"),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Lichess API error ${res.status}: ${body}`);
    }

    const text = await res.text();
    if (!text.trim()) return [];
    return text
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
}

export const api = new LichessApi();
