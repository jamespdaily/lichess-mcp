#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { initAuth } from "./auth.js";
import { authStart, authStatus, getMyProfile, getUser, getMyGames, getRatingHistory, getCrosstable, getLeaderboard } from "./tools/account.js";
import { getOngoingGames, createChallenge, makeMove, streamGame, resign, offerDraw, abortGame, takeback, sendChat, streamEvents } from "./tools/games.js";
import { cloudEval, getDailyPuzzle, getPuzzle, getNextPuzzle, getPuzzleActivity } from "./tools/analysis.js";
import { listChallenges, acceptChallenge, declineChallenge, cancelChallenge, challengeAi } from "./tools/challenges.js";

const server = new Server(
  { name: "lichess-mcp", version: "1.1.0" },
  { capabilities: { tools: {} } }
);

// --- Tool definitions ---

const TOOLS = [
  // Auth
  {
    name: "lichess_auth_start",
    description: "Start the Lichess OAuth login flow. Opens a browser for authorization. Use this to connect, sign in, or authenticate your Lichess chess account.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "lichess_auth_status",
    description: "Check if you are authenticated with Lichess and return account info. Use this to verify login status or confirm which Lichess chess account is connected.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  // Account
  {
    name: "lichess_get_my_profile",
    description: "Get your Lichess account profile, ratings, and stats. Returns your chess rating, username, and performance across bullet, blitz, rapid, and classical time controls.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "lichess_get_user",
    description: "Get a Lichess user's public chess profile, ratings, and stats by username. Look up any player on Lichess.",
    inputSchema: {
      type: "object" as const,
      properties: {
        username: { type: "string", description: "Lichess username" },
      },
      required: ["username"],
    },
  },
  {
    name: "lichess_get_my_games",
    description: "Fetch your recent chess games from Lichess. Returns game history including moves, result, opponent, time control, and opening. Filter by color (white/black) or rated/casual.",
    inputSchema: {
      type: "object" as const,
      properties: {
        max: { type: "number", description: "Number of games (default 10, max 100)", minimum: 1, maximum: 100 },
        color: { type: "string", enum: ["white", "black"], description: "Filter by color played" },
        rated: { type: "boolean", description: "Filter to rated or casual games" },
      },
    },
  },
  // Games
  {
    name: "lichess_get_ongoing_games",
    description: "Get your currently active or in-progress chess games on Lichess. Lists all games you are currently playing, including board position and whose turn it is.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "lichess_create_challenge",
    description: "Challenge a Lichess player to a chess game. Send a game invite with custom time control (bullet, blitz, rapid, classical, correspondence), color choice, and rated or casual.",
    inputSchema: {
      type: "object" as const,
      properties: {
        username: { type: "string", description: "Lichess username to challenge" },
        clockLimit: { type: "number", description: "Clock time in minutes (0 for correspondence)", minimum: 0 },
        clockIncrement: { type: "number", description: "Clock increment in seconds", minimum: 0 },
        color: { type: "string", enum: ["random", "white", "black"], default: "random" },
        rated: { type: "boolean", default: false },
      },
      required: ["username", "clockLimit", "clockIncrement"],
    },
  },
  {
    name: "lichess_make_move",
    description: "Play a chess move in an active Lichess game using UCI notation (e.g. e2e4, d7d5, e7e8q for promotion). Submit your move during a live game.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gameId: { type: "string", description: "Lichess game ID" },
        move: { type: "string", description: "Move in UCI format (e.g. e2e4 or e7e8q)" },
      },
      required: ["gameId", "move"],
    },
  },
  {
    name: "lichess_stream_game",
    description: "Stream the live board state, moves, and game events for an ongoing Lichess chess game. Get real-time updates including position, clocks, and chat.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gameId: { type: "string", description: "Lichess game ID" },
      },
      required: ["gameId"],
    },
  },
  {
    name: "lichess_resign",
    description: "Resign and forfeit an active Lichess chess game. Concedes the game to your opponent.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gameId: { type: "string", description: "Lichess game ID" },
      },
      required: ["gameId"],
    },
  },
  {
    name: "lichess_offer_draw",
    description: "Offer, accept, or decline a draw in an active Lichess chess game. Propose a draw to your opponent or respond to their draw offer.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gameId: { type: "string", description: "Lichess game ID" },
        accept: { type: "boolean", description: "true to offer/accept, false to decline" },
      },
      required: ["gameId", "accept"],
    },
  },
  // Analysis
  {
    name: "lichess_cloud_eval",
    description: "Get Lichess cloud engine evaluation for a chess position in FEN notation. Returns the best move, score, and top lines from Stockfish cloud analysis.",
    inputSchema: {
      type: "object" as const,
      properties: {
        fen: { type: "string", description: "Position in FEN notation" },
        multiPV: { type: "number", description: "Number of best lines (1-5)", minimum: 1, maximum: 5 },
      },
      required: ["fen"],
    },
  },
  {
    name: "lichess_get_daily_puzzle",
    description: "Get today's Lichess daily chess puzzle. Returns the position, solution, and puzzle metadata for the puzzle of the day.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "lichess_get_puzzle",
    description: "Get a specific Lichess chess puzzle by ID. Returns the board position, moves, theme, and difficulty rating for the puzzle.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Puzzle ID" },
      },
      required: ["id"],
    },
  },
  // Challenge management
  {
    name: "lichess_list_challenges",
    description: "List your incoming and outgoing chess challenges on Lichess. See pending game invites you have received or sent.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "lichess_accept_challenge",
    description: "Accept an incoming chess challenge on Lichess. Start the game with the challenger.",
    inputSchema: {
      type: "object" as const,
      properties: {
        challengeId: { type: "string", description: "Challenge ID to accept" },
      },
      required: ["challengeId"],
    },
  },
  {
    name: "lichess_decline_challenge",
    description: "Decline an incoming chess challenge on Lichess. Optionally provide a reason.",
    inputSchema: {
      type: "object" as const,
      properties: {
        challengeId: { type: "string", description: "Challenge ID to decline" },
        reason: {
          type: "string",
          enum: ["generic", "later", "tooFast", "tooSlow", "timeControl", "rated", "casual", "standard", "variant", "noBot", "onlyBot"],
          description: "Reason for declining (default: generic)",
        },
      },
      required: ["challengeId"],
    },
  },
  {
    name: "lichess_cancel_challenge",
    description: "Cancel an outgoing chess challenge you sent on Lichess.",
    inputSchema: {
      type: "object" as const,
      properties: {
        challengeId: { type: "string", description: "Challenge ID to cancel" },
      },
      required: ["challengeId"],
    },
  },
  {
    name: "lichess_challenge_ai",
    description: "Challenge the Lichess AI (Stockfish) to a chess game. Choose difficulty level 1–8, time control, color, and variant.",
    inputSchema: {
      type: "object" as const,
      properties: {
        level: { type: "number", description: "Stockfish difficulty level (1=easiest, 8=hardest)", minimum: 1, maximum: 8 },
        clockLimit: { type: "number", description: "Clock time in minutes", minimum: 0 },
        clockIncrement: { type: "number", description: "Clock increment in seconds", minimum: 0 },
        color: { type: "string", enum: ["random", "white", "black"], description: "Your color (default: random)" },
        variant: { type: "string", description: "Game variant (default: standard)", enum: ["standard", "chess960", "crazyhouse", "antichess", "atomic", "horde", "kingOfTheHill", "racingKings", "threeCheck"] },
      },
      required: ["level", "clockLimit", "clockIncrement"],
    },
  },
  // Gameplay extensions
  {
    name: "lichess_abort",
    description: "Abort an active Lichess chess game before it has started properly. Only works in the first few moves.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gameId: { type: "string", description: "Lichess game ID" },
      },
      required: ["gameId"],
    },
  },
  {
    name: "lichess_takeback",
    description: "Request, accept, or decline a takeback (undo last move) in an active Lichess chess game.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gameId: { type: "string", description: "Lichess game ID" },
        accept: { type: "boolean", description: "true to request/accept a takeback, false to decline" },
      },
      required: ["gameId", "accept"],
    },
  },
  {
    name: "lichess_send_chat",
    description: "Send a chat message in an active Lichess chess game, to the player or spectator chat room.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gameId: { type: "string", description: "Lichess game ID" },
        text: { type: "string", description: "Message to send" },
        room: { type: "string", enum: ["player", "spectator"], description: "Chat room to send to (default: player)" },
      },
      required: ["gameId", "text"],
    },
  },
  {
    name: "lichess_stream_events",
    description: "Stream incoming Lichess events such as game starts, incoming challenges, and correspondence game moves.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  // Puzzles & analysis
  {
    name: "lichess_get_next_puzzle",
    description: "Get your next recommended Lichess chess puzzle based on your puzzle rating and history.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "lichess_get_puzzle_activity",
    description: "Get your Lichess puzzle activity history — recent puzzles you attempted, results, ratings, and themes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        max: { type: "number", description: "Number of recent puzzle attempts to return (default 50, max 200)", minimum: 1, maximum: 200 },
      },
    },
  },
  // Users & stats
  {
    name: "lichess_get_rating_history",
    description: "Get the chess rating history over time for a Lichess player across all time controls (bullet, blitz, rapid, classical, etc.).",
    inputSchema: {
      type: "object" as const,
      properties: {
        username: { type: "string", description: "Lichess username" },
      },
      required: ["username"],
    },
  },
  {
    name: "lichess_get_crosstable",
    description: "Get the head-to-head record between two Lichess players. Shows total games and score for each player.",
    inputSchema: {
      type: "object" as const,
      properties: {
        user1: { type: "string", description: "First Lichess username" },
        user2: { type: "string", description: "Second Lichess username" },
      },
      required: ["user1", "user2"],
    },
  },
  {
    name: "lichess_get_leaderboard",
    description: "Get the Lichess leaderboard — top players by rating for a specific time control (bullet, blitz, rapid, classical, chess960, etc.).",
    inputSchema: {
      type: "object" as const,
      properties: {
        nb: { type: "number", description: "Number of players to return (default 10, max 200)", minimum: 1, maximum: 200 },
        perfType: {
          type: "string",
          enum: ["ultraBullet", "bullet", "blitz", "rapid", "classical", "chess960", "crazyhouse", "antichess", "atomic", "horde", "kingOfTheHill", "racingKings", "threeCheck"],
          description: "Time control / variant leaderboard (default: blitz)",
        },
      },
    },
  },
];

// --- Request handlers ---

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      // Auth
      case "lichess_auth_start":
        result = await authStart();
        break;
      case "lichess_auth_status":
        result = await authStatus();
        break;

      // Account
      case "lichess_get_my_profile":
        result = await getMyProfile();
        break;
      case "lichess_get_user":
        result = await getUser(args?.username as string);
        break;
      case "lichess_get_my_games":
        result = await getMyGames(
          (args?.max as number) ?? 10,
          args?.color as string | undefined,
          args?.rated as boolean | undefined
        );
        break;

      // Games
      case "lichess_get_ongoing_games":
        result = await getOngoingGames();
        break;
      case "lichess_create_challenge":
        result = await createChallenge(
          args?.username as string,
          args?.clockLimit as number,
          args?.clockIncrement as number,
          (args?.color as string) ?? "random",
          (args?.rated as boolean) ?? false
        );
        break;
      case "lichess_make_move":
        result = await makeMove(args?.gameId as string, args?.move as string);
        break;
      case "lichess_stream_game":
        result = await streamGame(args?.gameId as string);
        break;
      case "lichess_resign":
        result = await resign(args?.gameId as string);
        break;
      case "lichess_offer_draw":
        result = await offerDraw(args?.gameId as string, args?.accept as boolean);
        break;

      // Analysis
      case "lichess_cloud_eval":
        result = await cloudEval(args?.fen as string, (args?.multiPV as number) ?? 1);
        break;
      case "lichess_get_daily_puzzle":
        result = await getDailyPuzzle();
        break;
      case "lichess_get_puzzle":
        result = await getPuzzle(args?.id as string);
        break;

      // Challenge management
      case "lichess_list_challenges":
        result = await listChallenges();
        break;
      case "lichess_accept_challenge":
        result = await acceptChallenge(args?.challengeId as string);
        break;
      case "lichess_decline_challenge":
        result = await declineChallenge(
          args?.challengeId as string,
          (args?.reason as string) ?? "generic"
        );
        break;
      case "lichess_cancel_challenge":
        result = await cancelChallenge(args?.challengeId as string);
        break;
      case "lichess_challenge_ai":
        result = await challengeAi(
          args?.level as number,
          args?.clockLimit as number,
          args?.clockIncrement as number,
          (args?.color as string) ?? "random",
          (args?.variant as string) ?? "standard"
        );
        break;

      // Gameplay extensions
      case "lichess_abort":
        result = await abortGame(args?.gameId as string);
        break;
      case "lichess_takeback":
        result = await takeback(args?.gameId as string, args?.accept as boolean);
        break;
      case "lichess_send_chat":
        result = await sendChat(
          args?.gameId as string,
          args?.text as string,
          (args?.room as string) ?? "player"
        );
        break;
      case "lichess_stream_events":
        result = await streamEvents();
        break;

      // Puzzles & analysis
      case "lichess_get_next_puzzle":
        result = await getNextPuzzle();
        break;
      case "lichess_get_puzzle_activity":
        result = await getPuzzleActivity((args?.max as number) ?? 50);
        break;

      // Users & stats
      case "lichess_get_rating_history":
        result = await getRatingHistory(args?.username as string);
        break;
      case "lichess_get_crosstable":
        result = await getCrosstable(args?.user1 as string, args?.user2 as string);
        break;
      case "lichess_get_leaderboard":
        result = await getLeaderboard(
          (args?.nb as number) ?? 10,
          (args?.perfType as string) ?? "blitz"
        );
        break;

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    return { content: [{ type: "text", text: result }] };
  } catch (err) {
    if (err instanceof McpError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// --- Main ---

async function main(): Promise<void> {
  console.error("[lichess-mcp] Starting server...");
  await initAuth();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[lichess-mcp] Server running on stdio");
}

main().catch((err) => {
  console.error("[lichess-mcp] Fatal error:", err);
  process.exit(1);
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
