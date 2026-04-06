# lichess-mcp

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that connects Claude to [Lichess](https://lichess.org). Play chess, analyze positions, solve puzzles, manage challenges, and explore stats — all from Claude.

## Installation

### Claude Desktop

Add the following to your Claude Desktop config:

**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "lichess-mcp": {
      "command": "npx",
      "args": ["-y", "lichess-mcp"]
    }
  }
}
```

Restart Claude Desktop after saving.

### Claude Code

```bash
claude mcp add lichess-mcp -- npx -y lichess-mcp
```

## Authentication

After installation, ask Claude to **"start Lichess auth"**. A browser window will open for you to authorize the app with your Lichess account. Your token is cached locally at `~/.lichess-mcp-auth/token.json` and reused automatically on future sessions.

## Tools

### Auth
| Tool | Description |
|------|-------------|
| `lichess_auth_start` | Begin OAuth login — opens a browser window |
| `lichess_auth_status` | Check if you're logged in |

### Account & Users
| Tool | Description |
|------|-------------|
| `lichess_get_my_profile` | Your ratings and account stats |
| `lichess_get_user` | Any player's public profile |
| `lichess_get_my_games` | Your recent game history (filter by color, rated/casual) |
| `lichess_get_rating_history` | Rating history over time for any player |
| `lichess_get_crosstable` | Head-to-head record between two players |
| `lichess_get_leaderboard` | Top players by time control (bullet, blitz, rapid, etc.) |

### Challenges
| Tool | Description |
|------|-------------|
| `lichess_list_challenges` | List your incoming and outgoing challenges |
| `lichess_accept_challenge` | Accept an incoming challenge |
| `lichess_decline_challenge` | Decline a challenge (with optional reason) |
| `lichess_cancel_challenge` | Cancel a challenge you sent |
| `lichess_create_challenge` | Challenge a specific player |
| `lichess_challenge_ai` | Play against Stockfish AI (levels 1–8) |

### Games
| Tool | Description |
|------|-------------|
| `lichess_get_ongoing_games` | List your active games |
| `lichess_make_move` | Play a move (UCI notation, e.g. `e2e4`) |
| `lichess_stream_game` | Get live board state for a game |
| `lichess_stream_events` | Stream incoming events (challenges, game starts) |
| `lichess_abort` | Abort a game in its early moves |
| `lichess_resign` | Resign a game |
| `lichess_offer_draw` | Offer, accept, or decline a draw |
| `lichess_takeback` | Request, accept, or decline a takeback |
| `lichess_send_chat` | Send a chat message in a game |

### Puzzles & Analysis
| Tool | Description |
|------|-------------|
| `lichess_get_daily_puzzle` | Today's Lichess puzzle |
| `lichess_get_puzzle` | A specific puzzle by ID |
| `lichess_get_next_puzzle` | Your next recommended puzzle |
| `lichess_get_puzzle_activity` | Your recent puzzle history and results |
| `lichess_cloud_eval` | Stockfish cloud evaluation for a FEN position |

## Example prompts

- *"What's my current blitz rating?"*
- *"Show me my last 5 games as white"*
- *"Challenge @DrNykterstein to a 5+3 rated game"*
- *"Start a game against Stockfish level 5, 10 minutes, I'll play white"*
- *"List my incoming challenges"*
- *"Accept challenge abc123"*
- *"What's the head-to-head record between Magnus and Hikaru?"*
- *"Show me the top 10 bullet players"*
- *"What's today's puzzle?"*
- *"Get my next puzzle"*
- *"Show my puzzle activity for the last 50 attempts"*
- *"What's the best move in this position: `rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1`"*
- *"Resign my current game"*
- *"Send 'good luck' to my opponent in game xyz"*

## Requirements

- Node.js 18+
- A [Lichess](https://lichess.org) account

## License

MIT
