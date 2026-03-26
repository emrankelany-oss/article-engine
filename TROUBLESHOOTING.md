# Troubleshooting — Article Engine

## Bridge Server

### Port already in use

```
Port 19847 is already in use. Is the bridge already running?
```

**Fix:** Stop the existing instance first:
```bash
# Option 1: Use the stop command
# (In Claude Code) /stop-bridge

# Option 2: Kill the process manually
# Check the PID file
cat .claude-bridge-pid
kill <pid>

# Option 3: Use a different port
BRIDGE_PORT=8080 node bridge/server.js
```

### Auth errors ("Authentication service unavailable")

The bridge server cannot reach Supabase. Check:
1. Internet connectivity
2. `SUPABASE_URL` environment variable (or `config/.supabase.json`)
3. `SUPABASE_ANON_KEY` environment variable (or embedded default)

If `config/.supabase.json` is corrupt, delete it — it auto-restores from defaults on next startup.

### Admin endpoints return 403

Admin operations require:
1. A valid Bearer token from a user with `role: "admin"` in the subscriptions table
2. The `SUPABASE_SERVICE_ROLE_KEY` environment variable (or `config/.supabase-admin.json`)

Without the service role key, admin privilege checks will fail.

### Edit returns 409 ("An edit is already in progress")

Only one edit can run at a time. Wait for the current edit to complete (up to 10 minutes) or restart the bridge server to clear the lock.

### Edit returns 504 (timeout)

The Claude CLI took longer than 10 minutes. This usually means:
- The edit prompt was too complex
- Claude Code is processing a large file
- Network issues with Claude's API

Try simplifying the edit request or breaking it into smaller changes.

---

## Article Generation

### "Gemini MCP not found"

Run `configure gemini` or `setup gemini` in Claude Code to set up the Gemini MCP server. You need a Gemini API key from https://aistudio.google.com/apikey.

After configuration, restart Claude Code for the MCP server to become available.

### Articles generate without images

This happens when:
1. Gemini MCP is not configured → images use placeholders with exportable prompts
2. Gemini API key is invalid or expired
3. Gemini rate limits have been hit

**Fix:** Run `configure gemini` to reconfigure, or wait for rate limits to reset.

### "Claude CLI not found"

The Claude CLI is needed for automatic section editing via the bridge server. If not found:
```bash
npm install -g @anthropic-ai/claude-code
```

On Windows, also try `claude.cmd --version` — the CLI may be installed as a `.cmd` shim.

### "Daily generation limit reached"

Free users get 4 articles per day. To get unlimited access:
1. Sign up through the edit panel in any generated article
2. Contact the admin for account activation
3. Quota resets daily at midnight

---

## Tests

### Tests fail with "EADDRINUSE"

Integration tests start a real server on a random port. If tests fail with address-in-use errors:
```bash
# Kill any leftover test server processes
# On Linux/Mac:
pkill -f "node bridge/server.js"
# On Windows:
taskkill /f /im node.exe
```

### Tests time out

Integration tests have a 10-second timeout. If tests consistently time out:
1. Check that no other process is interfering with network ports
2. Ensure `node` is available on PATH
3. Try running a single test: `npx vitest run tests/unit/`

---

## Development

### ESLint errors after editing

```bash
npm run lint        # See all errors
npm run format      # Auto-fix formatting issues
```

### Pre-commit hook blocks commit

The pre-commit hook runs lint + tests. Fix the reported issues:
```bash
npm run lint        # Fix lint errors
npm test            # Fix failing tests
```

To skip the hook in emergencies (not recommended):
```bash
git commit --no-verify -m "emergency fix"
```
