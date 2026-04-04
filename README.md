# lichess-mcp

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that connects Claude to [Lichess](https://lichess.org). Play chess, analyze positions, solve puzzles, and manage your games — all from Claude.

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

### Account
| Tool | Description |
|------|-------------|
| `lichess_get_my_profile` | Your ratings and account stats |
| `lichess_get_user` | Any player's public profile |
| `lichess_get_my_games` | Your recent game history |

### Games
| Tool | Description |
|------|-------------|
| `lichess_get_ongoing_games` | List your active games |
| `lichess_create_challenge` | Challenge a player to a game |
| `lichess_make_move` | Play a move (UCI notation, e.g. `e2e4`) |
| `lichess_stream_game` | Get live board state for a game |
| `lichess_resign` | Resign a game |
| `lichess_offer_draw` | Offer, accept, or decline a draw |

### Puzzles & Analysis
| Tool | Description |
|------|-------------|
| `lichess_get_daily_puzzle` | Today's Lichess puzzle |
| `lichess_get_puzzle` | A specific puzzle by ID |
| `lichess_cloud_eval` | Stockfish cloud evaluation for a FEN position |

## Example prompts

- *"What's my current blitz rating?"*
- *"Show me my last 5 games as white"*
- *"Challenge @DrNykterstein to a 5+3 rated game"*
- *"What's the best move in this position: `rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1`"*
- *"Get today's puzzle"*
- *"Resign my current game"*

## Requirements

- Node.js 18+
- A [Lichess](https://lichess.org) account

## License

MIT
