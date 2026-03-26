# Contributing to Article Engine

## Getting Started

```bash
# Clone the repo
git clone https://github.com/emrankelany-oss/article-engine.git
cd article-engine

# Install dev dependencies
npm install

# Set up git hooks (runs automatically via `prepare` script)
npm run prepare

# Copy environment template
cp .env.example .env
# Edit .env with your values (optional — defaults work for basic usage)
```

## Development Workflow

### Running the Bridge Server

```bash
node bridge/server.js
# Or with npm
npm run bridge
```

The server starts on `http://127.0.0.1:19847` by default.

### Running Tests

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Linting & Formatting

```bash
npm run lint          # Check for lint errors
npm run format        # Auto-format with Prettier
```

Pre-commit hooks run lint + tests automatically. If a commit is blocked, fix the issues and try again.

## Code Style

- **Language:** JavaScript (CommonJS, Node.js >=18)
- **Naming:** kebab-case for files, camelCase for JS variables/functions
- **Formatting:** Prettier (single quotes, trailing commas, 120 char width)
- **Linting:** ESLint with `eqeqeq`, `no-eval`, `no-unused-vars`
- **Dependencies:** Zero npm runtime dependencies. Bridge server uses only Node.js built-ins.

## Project Structure

```
bridge/        → HTTP server + Supabase client (JavaScript)
agents/        → Agent definitions (Markdown)
config/        → Configuration files (Markdown + JSON)
commands/      → Claude Code slash commands (Markdown)
skills/        → Skill orchestrator (Markdown)
tests/         → Vitest test suites
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system diagram.

## Making Changes

### Bridge Server (`bridge/`)

1. Read the existing code first — follow established patterns
2. All route handlers use try/catch with JSON error responses
3. Auth uses `requireAuth()` / `requireAdmin()` guards
4. No npm runtime deps — use Node.js built-ins only
5. Write tests for new endpoints or behavior changes
6. Run `npm test && npm run lint` before committing

### Agents (`agents/`)

Agent files are markdown definitions read by Claude Code. When modifying:
- Keep single responsibility per agent
- Include numbered steps, critical rules, and example outputs
- Test by running the full article generation pipeline

### Protect List

These files should not be modified without explicit discussion:
- `bridge/supabase-client.js` — Zero-dep REST client (highest quality score)
- `agents/project-analyzer.md` — Exemplary agent design
- `agents/research-engine.md` — Clean 6-round research protocol
- `config/banned-patterns.md` — Focused quality enforcement
- Path traversal validation in `bridge/server.js` (lines ~370-395)

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BRIDGE_PORT` | No | `19847` | Bridge server port |
| `BRIDGE_LOG_JSON` | No | `0` | Set to `1` for JSON structured logs |
| `SUPABASE_URL` | No | Embedded default | Supabase project URL |
| `SUPABASE_ANON_KEY` | No | Embedded default | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | For admin ops | None | Supabase service role key |

## Commit Messages

- Use imperative mood: "Add logout endpoint" not "Added logout endpoint"
- Keep the first line under 72 characters
- Reference issue numbers if applicable

## Pull Requests

- One logical change per PR
- Include test coverage for new code
- Ensure `npm test && npm run lint` passes
- Update CHANGELOG.md for user-facing changes
