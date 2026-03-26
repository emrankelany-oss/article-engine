# Article Engine — AI Agent Instructions

## Project Overview

Article Engine v4.7.0 — Claude Code plugin for autonomous article generation. Generates standalone HTML pages by adapting to any website's design system.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | JavaScript (Node.js >=18, CommonJS) |
| Framework | Claude Code plugin (skill + agents + commands) |
| Database | Supabase (PostgreSQL, cloud-hosted) |
| Auth | Supabase JWT (public anon key + RLS) |
| External services | Gemini MCP, WebSearch/WebFetch |
| Test framework | Vitest |
| Linter | ESLint |
| Formatter | Prettier |
| CI/CD | GitHub Actions |

## Architecture

4-agent pipeline orchestrated by `skills/article-engine/SKILL.md`:
1. `agents/project-analyzer.md` — detects project shell, components, design tokens
2. `agents/research-engine.md` — 6-round research via Gemini MCP
3. `agents/article-architect.md` — concept generation + structural architecture
4. `agents/draft-writer.md` — HTML rendering with TOC, trust layer, edit UI

Bridge server: `bridge/server.js` (HTTP, port 19847) + `bridge/supabase-client.js` (zero-dep REST client)

## Protect List

Do NOT modify these files without explicit user permission:
- `bridge/supabase-client.js` — cleanest file, zero-dep REST client with proper caching
- `agents/project-analyzer.md` — exemplary agent design, single responsibility
- `agents/research-engine.md` — clean 6-round research protocol
- `config/banned-patterns.md` — focused quality enforcement
- `bridge/server.js:380-409` — path traversal validation (correct and important)

## Enhancement Context

- **Composite score at intake:** 4.75/10
- **Tier 1 blockers (10 items):** ALL COMPLETED
- **Tier 2 remaining:** 10 items (API docs, architecture docs, logout, audit logging, performance fixes, SKILL.md decomposition, git hooks, contributing guide, troubleshooting, environments)
- **Tier 3 remaining:** 8 items (image agent extraction, draft writer split, domain rules unification, error tracking, per-article locking, notifications, registry optimization, migrations)
- **Target score:** >=7.5/10

## Existing Patterns

- **Error handling:** try/catch in route handlers, errors as `{ status, error }` JSON
- **Auth pattern:** Bearer token → `verifyToken()` → `getSubscription()` → role check
- **Config loading:** File-based with mtime cache, env var fallback for secrets
- **Agent dispatch:** SKILL.md orchestrates → agents execute → structured reports returned
- **Folder structure:** `bridge/` (JS), `agents/` (MD), `config/` (MD + JSON), `skills/` (MD), `commands/` (MD)
- **Naming:** kebab-case files, camelCase JS, PascalCase none

## Rules

1. Follow existing patterns — do not introduce new conventions without discussion
2. Zero npm runtime dependencies — bridge server uses only Node.js built-ins
3. Secrets go in environment variables, NEVER in committed files
4. All code changes must have corresponding tests
5. Run `npm test` and `npm run lint` before considering work complete
6. Domain integrity: article content must stay within the declared topic domain
