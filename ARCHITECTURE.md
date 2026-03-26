# Architecture — Article Engine v4.7.0

## System Overview

Article Engine is a Claude Code plugin that generates standalone HTML articles by adapting to any website's design system. It consists of a 4-agent pipeline orchestrated by a skill file, a local HTTP bridge server for section editing, and a Supabase backend for auth and usage tracking.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Claude Code CLI                               │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    SKILL.md (Orchestrator)                    │   │
│  │              22-step pipeline, ~800+ lines                    │   │
│  │                                                               │   │
│  │  Step 0-2: Preflight ──► Step 3-8: Project Analysis          │   │
│  │  Step 9: Research    ──► Step 10-11: Architecture             │   │
│  │  Step 12-15: Images  ──► Step 16-22: Write + Deliver         │   │
│  └──────────┬───────────────────┬──────────────────┬────────────┘   │
│             │                   │                  │                  │
│  ┌──────────▼────┐  ┌──────────▼────┐  ┌─────────▼─────────┐       │
│  │  project-     │  │  research-    │  │  article-         │       │
│  │  analyzer.md  │  │  engine.md    │  │  architect.md     │       │
│  │  (Steps 3-8)  │  │  (Step 9)    │  │  (Steps 10-11)   │       │
│  └───────────────┘  └──────┬───────┘  └──────────────────┘       │
│                            │                                        │
│  ┌─────────────────┐       │          ┌───────────────────┐        │
│  │  draft-writer.md│       │          │  config/           │        │
│  │  (Steps 16-17)  │       │          │  ├ engine-config   │        │
│  └─────────────────┘       │          │  ├ banned-patterns │        │
│                            │          │  └ component-reg   │        │
│                     ┌──────▼──────┐   │    (193 blueprints)│        │
│                     │  Gemini MCP │   └───────────────────┘        │
│                     │  (research) │                                  │
│                     └─────────────┘                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Bridge Server (Node.js)                            │
│                    http://127.0.0.1:19847                            │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  Auth (3)    │  │  Admin (6)   │  │  Edit (1)                │   │
│  │  signup      │  │  users       │  │  apply-edit              │   │
│  │  login       │  │  approve     │  │  → spawns claude -p      │   │
│  │  verify      │  │  revoke      │  │  → mutex (1 at a time)   │   │
│  │             │  │  delete      │  │  → 10min timeout         │   │
│  │             │  │  add-user    │  └──────────────────────────┘   │
│  │             │  │  usage       │                                  │
│  └──────┬──────┘  └──────┬──────┘                                  │
│         │                │                                          │
│  ┌──────▼────────────────▼──────┐                                  │
│  │    supabase-client.js         │                                  │
│  │    Zero-dep REST client       │                                  │
│  │    (fetch only, no npm deps)  │                                  │
│  └──────────────┬───────────────┘                                  │
│                 │                                                    │
└─────────────────┼────────────────────────────────────────────────────┘
                  │
           ┌──────▼──────┐
           │   Supabase   │
           │  (Cloud DB)  │
           │              │
           │  Tables:     │
           │  - auth.users│
           │  - subscript.│
           │  - usage_logs│
           └─────────────┘
```

## Components

### 1. Skill Orchestrator (`skills/article-engine/SKILL.md`)

The main entry point. An ~800-line markdown file that defines a 22-step pipeline for article generation. Claude Code reads this as a skill and follows the steps sequentially.

**Pipeline stages:**

| Stage | Steps | Agent | Output |
|-------|-------|-------|--------|
| Preflight | 0, 0.1, 0.5 | Inline | Setup gate, CLI check, quota check |
| Project Analysis | 3-8 | project-analyzer | Project Intelligence Report |
| Research | 9 | research-engine | Research Report (6 rounds) |
| Architecture | 10-11 | article-architect | 5 concepts → selected architecture |
| Image Planning | 12-15 | Inline | 4-6 image prompts + generation |
| Writing | 16-17 | draft-writer | Final HTML with TOC, edit UI |
| Delivery | 18-22 | Inline | File output, blueprint history |

### 2. Agents (`agents/`)

Four markdown agent definitions dispatched by the orchestrator:

| Agent | File | Purpose |
|-------|------|---------|
| Project Analyzer | `agents/project-analyzer.md` | Detects shell, components, design tokens, adaptation mode |
| Research Engine | `agents/research-engine.md` | 6-round research via Gemini MCP with domain integrity |
| Article Architect | `agents/article-architect.md` | Generates 5 concepts, builds structural architecture |
| Draft Writer | `agents/draft-writer.md` | Renders final HTML with TOC, trust layer, section edit UI |

### 3. Bridge Server (`bridge/server.js`)

A zero-dependency Node.js HTTP server (510 lines) that:
- Gates section editing behind Supabase JWT authentication
- Spawns `claude -p` to process edit requests
- Provides admin endpoints for user management
- Enforces rate limiting, CORS, and path traversal protection

**Key patterns:**
- `readBody()` — Buffer.concat JSON parser with 64KB limit
- `requireAuth()` / `requireAdmin()` — middleware-style auth guards
- `checkRateLimit()` — in-memory TTL map, 10 req/min per key
- `activeEdit` — global mutex for Claude CLI spawn
- PID file for lifecycle management

### 4. Supabase Client (`bridge/supabase-client.js`)

A zero-dependency REST client (360 lines) using only `fetch()`. Handles:
- User auth (signup, login, token verification)
- Subscription management (check status, admin CRUD)
- Usage logging
- Config with mtime-based caching and auto-restore

### 5. Configuration (`config/`)

| File | Purpose | Size |
|------|---------|------|
| `engine-config.md` | All pipeline settings, defaults, fallback strategies | ~530 lines |
| `banned-patterns.md` | 24 phrases, 8 structural patterns, tone rules | ~100 lines |
| `structural-component-registry.md` | 193 HTML/CSS component blueprints | ~208KB |
| `article-shell-template.html` | Fallback HTML shell when no project shell detected | — |

### 6. Commands (`commands/`)

| Command | File | Purpose |
|---------|------|---------|
| `/start-bridge` | `commands/start-bridge.md` | Start the bridge server |
| `/stop-bridge` | `commands/stop-bridge.md` | Stop the bridge server |
| `/apply-edit` | `commands/apply-edit.md` | Clipboard-based fallback edit |

## Data Flow

### Article Generation

```
User topic → SKILL.md orchestrator
  → project-analyzer: scan cwd for shell, components, design tokens
  → research-engine: 6 rounds via Gemini MCP (or WebSearch fallback)
  → article-architect: generate 5 concepts, user picks one, build architecture
  → SKILL.md: generate 4-6 images via Gemini (or placeholder fallback)
  → draft-writer: render HTML combining research + architecture + images
  → SKILL.md: save file, record blueprint usage in history JSON
  → Output: standalone .html file in project directory
```

### Section Edit

```
User clicks edit button in article HTML
  → Browser sends POST /apply-edit to bridge server
  → Bridge: validate token → check subscription → validate prompt → check mutex
  → Bridge: spawn `claude -p` with edit prompt via stdin
  → Claude CLI reads SKILL.md Step 20 (Section Edit Mode)
  → Claude modifies the target section in the HTML file
  → Bridge: return success + output to browser
  → Browser reflects changes
```

## Security Model

| Layer | Mechanism |
|-------|-----------|
| Network | Localhost-only binding (127.0.0.1), CORS restricted |
| Auth | Supabase JWT tokens, verified server-side |
| Admin | Service role key for privilege checks (never trust user token) |
| Rate limiting | 10 req/min per email/IP on auth endpoints |
| Edit safety | Path traversal checks, .html-only, project dir containment |
| Process | `shell: false` on Claude CLI spawn, 64KB body limit |
| Secrets | Environment variables preferred, no disk persistence for tokens |

## External Dependencies

| Dependency | Required | Fallback |
|-----------|----------|----------|
| Claude Code CLI | Yes | None (core dependency) |
| Supabase | No | Auth disabled, all edits allowed |
| Gemini MCP | No | WebSearch/WebFetch for research, placeholder images |
| Node.js >=18 | Yes (for bridge) | None |

The system is designed for graceful degradation: it works without Gemini, without Supabase, and without the bridge server (full generation still works, just no section editing).

## Directory Structure

```
article-engine/
├── agents/                    # 4 agent definitions (markdown)
│   ├── project-analyzer.md
│   ├── research-engine.md
│   ├── article-architect.md
│   └── draft-writer.md
├── bridge/                    # HTTP bridge server (JavaScript)
│   ├── server.js              # Main server (~510 lines)
│   └── supabase-client.js     # Supabase REST client (~360 lines)
├── commands/                  # Claude Code slash commands
│   ├── start-bridge.md
│   ├── stop-bridge.md
│   └── apply-edit.md
├── config/                    # Configuration files
│   ├── engine-config.md       # Pipeline settings
│   ├── banned-patterns.md     # Quality enforcement rules
│   ├── structural-component-registry.md  # 193 blueprints
│   └── article-shell-template.html       # Fallback shell
├── skills/article-engine/
│   └── SKILL.md               # Main orchestrator (~800+ lines)
├── tests/                     # Test suites
│   ├── unit/                  # 12 unit tests
│   └── integration/           # 18 integration tests
├── dev_docs/                  # Development documentation
├── plugin.json                # Claude Code plugin manifest
├── package.json               # Node.js package (devDeps only)
└── CLAUDE.md                  # AI agent instructions
```
