# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [4.7.0] - 2026-03-26

### Added
- Per-article edit locking (concurrent edits to different articles, blocks same-file conflicts)
- Notification system with admin endpoints (`GET /notifications`, `POST /notifications/mark-read`)
- Error tracking with rotating `.bridge-errors.log` and unhandled exception catchers
- Database migration system (`migrations/` with baseline schema and tracking table)
- Blueprint registry index (`config/blueprint-registry-index.md`) — 12KB lookup for 208KB registry
- Domain integrity single authority (`config/domain-integrity.md`)
- 3 new agents: `image-generator.md`, `edit-ui-builder.md`, `preflight-check.md`
- Logout endpoint (`POST /auth/logout`) with rate limiting
- Audit logging for all admin actions
- Structured logging (JSON/plain modes via `BRIDGE_LOG_JSON`)
- Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`)
- 53 tests (up from 0) — 27 unit + 26 integration
- BRIDGE-API.md, ARCHITECTURE.md, CONTRIBUTING.md, TROUBLESHOOTING.md

### Changed
- SKILL.md decomposed — ~500 lines extracted to dedicated agents
- Edit mutex changed from global to per-article file locks
- `requireAuth`/`requireAdmin` now return 503 on Supabase outages instead of crashing
- Blueprint discovery now uses index-first approach (12KB scan vs 208KB)
- Pre-commit hook runs lint + tests

### Security
- Rate limiting on logout endpoint
- Stale lock cleanup interval prevents resource leaks
- Unhandled exception/rejection catchers prevent silent crashes

## [4.6.8] - 2026-03-24

### Changed
- Sync marketplace metadata to v4.6.8
- Never expose Supabase internals to end users

### Security
- Moved secrets to environment variables (SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, SUPABASE_ANON_KEY)
- Removed auth session disk persistence (tokens kept in memory only)
- Restricted CORS to localhost origins
- Changed `shell: true` to `shell: false` on Claude CLI spawn
- Raised minimum password length from 6 to 8 characters
- Removed filesystem path from /health endpoint
- Fixed rate limiter memory leak (TTL-based cleanup)

### Added
- Test framework (Vitest) with auth and integration tests
- ESLint and Prettier configuration
- CI/CD pipeline (GitHub Actions)
- `.env.example` documenting all environment variables
- README.md and CHANGELOG.md

## [4.6.7] - 2026-03-22

### Added
- Blueprint history tracking via JSON file
- Longer bridge timeout (10 minutes)

## [4.6.6] - 2026-03-15

### Added
- Self-healing Supabase auth (auto-restore config from defaults)
- Left-side table of contents with sticky positioning
- Template improvements for article shell

### Fixed
- Bridge server stability improvements
