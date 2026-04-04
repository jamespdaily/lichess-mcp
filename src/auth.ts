import { createHash, randomBytes } from "node:crypto";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import open from "open";
import { api } from "./api.js";
import type { TokenData } from "./types.js";

const CLIENT_ID = "lichess-mcp";
const REDIRECT_PORT = 6274;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const AUTH_DIR = join(homedir(), ".lichess-mcp-auth");
const TOKEN_FILE = join(AUTH_DIR, "token.json");
const SCOPES = "board:play challenge:read challenge:write puzzle:read";

function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function saveToken(token: TokenData): Promise<void> {
  if (!existsSync(AUTH_DIR)) {
    await mkdir(AUTH_DIR, { recursive: true });
  }
  await writeFile(TOKEN_FILE, JSON.stringify(token, null, 2));
  console.error("[lichess-mcp] Token saved to", TOKEN_FILE);
}

export async function loadToken(): Promise<TokenData | null> {
  try {
    const data = await readFile(TOKEN_FILE, "utf-8");
    const token: TokenData = JSON.parse(data);
    if (Date.now() >= token.expires_at) {
      console.error("[lichess-mcp] Cached token expired");
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export async function validateToken(): Promise<boolean> {
  if (!api.isAuthenticated()) return false;
  try {
    const res = await api.get("/api/account");
    return res !== null;
  } catch {
    return false;
  }
}

async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<TokenData> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
  });

  const res = await fetch("https://lichess.org/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
  };

  return {
    access_token: data.access_token,
    token_type: data.token_type,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

export function startOAuthFlow(): Promise<TokenData> {
  return new Promise((resolve, reject) => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = randomBytes(16).toString("hex");

    const server = createServer(
      async (req: IncomingMessage, res: ServerResponse) => {
        try {
          const url = new URL(req.url || "/", `http://localhost:${REDIRECT_PORT}`);

          if (url.pathname !== "/callback") {
            res.writeHead(404);
            res.end("Not found");
            return;
          }

          const code = url.searchParams.get("code");
          const returnedState = url.searchParams.get("state");

          if (!code) {
            res.writeHead(400);
            res.end("Missing authorization code");
            reject(new Error("Missing authorization code"));
            server.close();
            return;
          }

          if (returnedState !== state) {
            res.writeHead(400);
            res.end("State mismatch — possible CSRF attack");
            reject(new Error("OAuth state mismatch"));
            server.close();
            return;
          }

          const token = await exchangeCodeForToken(code, codeVerifier);
          await saveToken(token);
          api.setToken(token);

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            "<html><body><h1>Lichess MCP authorized!</h1><p>You can close this tab.</p></body></html>"
          );

          server.close();
          resolve(token);
        } catch (err) {
          res.writeHead(500);
          res.end("Authorization failed");
          server.close();
          reject(err);
        }
      }
    );

    server.listen(REDIRECT_PORT, () => {
      const authUrl =
        `https://lichess.org/oauth?` +
        `response_type=code&` +
        `client_id=${encodeURIComponent(CLIENT_ID)}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `scope=${encodeURIComponent(SCOPES)}&` +
        `code_challenge=${codeChallenge}&` +
        `code_challenge_method=S256&` +
        `state=${state}`;

      console.error("[lichess-mcp] Opening browser for OAuth...");
      console.error("[lichess-mcp] Auth URL:", authUrl);
      open(authUrl).catch(() => {
        console.error(
          "[lichess-mcp] Could not open browser. Visit this URL manually:",
          authUrl
        );
      });
    });

    server.on("error", (err: Error) => {
      reject(new Error(`OAuth callback server error: ${err.message}`));
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("OAuth flow timed out after 5 minutes"));
    }, 5 * 60 * 1000);
  });
}

export async function initAuth(): Promise<void> {
  const token = await loadToken();
  if (token) {
    api.setToken(token);
    const valid = await validateToken();
    if (valid) {
      console.error("[lichess-mcp] Loaded cached token — authenticated");
    } else {
      console.error("[lichess-mcp] Cached token invalid — need re-auth");
      api.setToken(null);
    }
  } else {
    console.error("[lichess-mcp] No cached token — use lichess_auth_start to login");
  }
}
