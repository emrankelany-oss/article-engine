# Article Engine

Autonomous article generation engine for [Claude Code](https://claude.ai/claude-code). Generates full standalone HTML article pages from minimal input by adapting to any website's design system.

## Features

- **4-agent pipeline** — project analysis, multi-round research, article architecture, HTML generation
- **193 structural blueprints** — style-stripped component registry adapted at runtime
- **Domain integrity enforcement** — locks topic domain, prevents drift with banned pattern detection
- **Portable Gemini integration** — 7-strategy fallback chain, works without Gemini
- **Project-agnostic adaptation** — auto-detects any project's design system (3 modes)
- **Section-level editing** — browser-based edit UI via bridge server + clipboard fallback
- **Graceful degradation** — works without Gemini, Supabase, or bridge server

## Quick Start

1. **Install the plugin** in Claude Code (available on the plugin marketplace)
2. **Start the bridge server** (optional, for section editing):
   ```bash
   npm run bridge
   ```
3. **Generate an article**:
   ```
   write an article about [any topic]
   ```

## Architecture

```
Topic Input → project-analyzer → research-engine → article-architect → draft-writer → HTML Output
                                                                                         ↓
                                                                              Bridge Server (edit UI)
```

| Component | Description |
|-----------|-------------|
| `skills/article-engine/SKILL.md` | Pipeline orchestrator (22 steps) |
| `agents/project-analyzer.md` | Detects project shell, components, design tokens |
| `agents/research-engine.md` | 6-round research via Gemini MCP + web search |
| `agents/article-architect.md` | Concept generation + structural architecture |
| `agents/draft-writer.md` | HTML rendering with TOC, trust layer, edit UI |
| `bridge/server.js` | Local HTTP server for section editing + auth |
| `bridge/supabase-client.js` | Zero-dependency Supabase REST client |
| `config/` | Engine config, blueprints, banned patterns |

## Bridge Server

The bridge server provides auth-gated section editing at `http://127.0.0.1:19847`.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BRIDGE_PORT` | `19847` | Bridge server port |
| `SUPABASE_URL` | *(embedded)* | Supabase project URL |
| `SUPABASE_ANON_KEY` | *(embedded)* | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Service role key (admin endpoints) |

Copy `.env.example` to `.env` and fill in values for custom Supabase projects.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check |
| POST | `/auth/signup` | None | Create account |
| POST | `/auth/login` | None | Sign in |
| GET | `/auth/verify` | Bearer | Verify token |
| GET | `/admin/users` | Admin | List users |
| POST | `/admin/approve` | Admin | Approve user |
| POST | `/admin/revoke` | Admin | Revoke access |
| POST | `/admin/delete` | Admin | Delete user |
| POST | `/admin/add-user` | Admin | Create user (admin) |
| GET | `/admin/usage` | Admin | Usage logs |
| POST | `/apply-edit` | Bearer | Apply section edit |

## Development

```bash
npm install          # Install dev dependencies
npm test             # Run tests
npm run test:watch   # Watch mode
npm run lint         # Run ESLint
npm run format       # Run Prettier
npm run bridge       # Start bridge server
```

## License

MIT
