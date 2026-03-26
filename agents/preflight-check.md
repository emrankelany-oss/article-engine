# Preflight Check Agent

Runs preflight checks before article generation: Gemini setup gate (once per project), Claude CLI availability (every run), and generation quota enforcement (every run).

**Dispatched by:** SKILL.md (Steps 0, 0.1, 0.5)
**Returns:** Preflight status report with `gemini_configured`, `cli_available`, and `quota_ok` flags.

---

## STEP 0 — FIRST-TIME SETUP GATE (runs once per project)

Before ANYTHING else in the pipeline, you MUST run the following Bash command. Do NOT skip this. Do NOT proceed to any other step until you have run this command and read its output.

**MANDATORY — Run this Bash command FIRST:**

```bash
node -e "
const fs = require('fs');
const path = require('path');
const home = process.env.HOME || process.env.USERPROFILE;
const claudeJson = path.join(home, '.claude.json');
let geminiFound = false;
try {
  const config = JSON.parse(fs.readFileSync(claudeJson, 'utf8'));
  const servers = config.mcpServers || {};
  for (const [key, val] of Object.entries(servers)) {
    if (key === 'gemini') { geminiFound = true; break; }
    const args = (val.args || []).join(' ');
    const cmd = val.command || '';
    if (args.includes('gemini') || cmd.includes('gemini')) { geminiFound = true; break; }
    const env = val.env || {};
    if ('GEMINI_API_KEY' in env) { geminiFound = true; break; }
  }
} catch (e) {}
const pluginDir = process.argv[1] || '';
let setupDone = false;
try {
  const status = JSON.parse(fs.readFileSync(path.join(pluginDir, 'config', '.setup-status.json'), 'utf8'));
  setupDone = status.setup_completed === true;
} catch (e) {}
if (geminiFound) {
  console.log('[SETUP OK] Gemini MCP is configured. Proceed to Step 0.1.');
} else if (setupDone) {
  console.log('[SETUP STALE] Setup file says done, but Gemini MCP is NOT in ~/.claude.json. Run setup gate.');
} else {
  console.log('[SETUP REQUIRED] First-time run. Gemini MCP not found. Run setup gate.');
}
" "<PLUGIN_DIR>"
```

Replace `<PLUGIN_DIR>` with the plugin root directory (two levels up from SKILL.md: `skills/article-engine/SKILL.md` → plugin root).

**React to the output:**

- `[SETUP OK]` → Skip the setup gate entirely. Proceed to Step 0.1 (Claude CLI check).
- `[SETUP REQUIRED]` or `[SETUP STALE]` → Execute the setup gate below. Do NOT skip it. The user needs Gemini configured for image generation.

**IMPORTANT:** The presence of other MCP servers (Playwright, filesystem, etc.) does NOT mean Gemini is configured. Only the script output above determines this.

**First-Time Setup Flow:**

Present the following to the user:

```
╔══════════════════════════════════════════════════════════════╗
║            ARTICLE ENGINE — First-Time Setup                ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Welcome! This is your first time using the Article Engine.  ║
║                                                              ║
║  For the BEST results, this plugin uses Gemini MCP to:       ║
║    • Research topics with deep multi-round analysis          ║
║    • Generate 4-6 professional images per article            ║
║    • Enhance content quality with AI-powered insights        ║
║                                                              ║
║  To enable these features, you need a Gemini API key.        ║
║  Get one free at: https://aistudio.google.com/apikey         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

Would you like to configure Gemini MCP now?

  1. YES — I have a Gemini API key (or I'll get one now)
  2. SKIP — Proceed without Gemini (articles will use web search
     for research and image placeholders instead of generated images)
```

**WAIT for user response.**

**NOTE:** The Claude CLI check has been moved to Step 0.1 (runs independently every time). Do NOT check for Claude CLI here — it is handled separately.

**If user chooses YES (option 1):**

1. Ask the user for their Gemini API key:
   ```
   Please paste your Gemini API key:
   ```
2. Once the user provides the key, check if `~/.claude.json` exists.
3. If it exists, read it and merge the Gemini MCP server config into `mcpServers`:
   ```json
   {
     "mcpServers": {
       "gemini": {
         "command": "npx",
         "args": ["-y", "@rlabs-inc/gemini-mcp"],
         "env": { "GEMINI_API_KEY": "<USER_PROVIDED_KEY>" }
       }
     }
   }
   ```
4. If it does not exist, create it with the above structure.
5. **Post-write verification:** Read back `~/.claude.json` and confirm that `mcpServers.gemini` exists and contains the correct `GEMINI_API_KEY`. If the verification fails, inform the user: `⚠ Config write failed — please check ~/.claude.json manually.` and set `gemini_configured: false` in the status file.
6. Inform the user:
   ```
   ✓ Gemini MCP configured in ~/.claude.json

   IMPORTANT: You need to restart Claude Code for the Gemini MCP
   server to become available. After restarting, run your article
   request again and Gemini will be fully active.

   Alternatively, if you want to proceed NOW without restarting,
   the article will generate with web search and image placeholders.
   You can regenerate images after restarting.
   ```
7. Ask: `Would you like to restart now, or proceed without Gemini for this session?`
   - If restart → save setup status and tell user to restart and re-run
   - If proceed → continue to Step 1 (Gemini won't be available until restart)
8. Write the setup status file.

**If user chooses SKIP (option 2):**

1. Inform the user:
   ```
   ✓ Skipping Gemini setup.

   The article engine will still work — it will use web search for
   research and generate image placeholders with exportable prompts.

   You can configure Gemini anytime later by saying "configure gemini" or "setup gemini"
   in any future session.
   ```
2. Write the setup status file with `gemini_configured: false`.

**Setup Status File (`config/.setup-status.json`):**

After either path, write this file:

```json
{
  "setup_completed": true,
  "setup_date": "<ISO_DATE>",
  "gemini_configured": true | false,
  "gemini_setup_method": "interactive" | "skipped",
  "notes": "<any relevant notes>"
}
```

**Re-triggering Setup:**

The user can re-trigger setup at any time by:
- Saying "configure gemini" or "setup gemini" or "reconfigure article engine"
- Manually deleting `config/.setup-status.json`

When re-triggered, run the same flow above regardless of existing setup status.

**Output after setup gate completes:**

```
SETUP STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━
Gemini MCP: [configured / skipped]
Image generation: [available after restart / fallback mode]
Research: [Gemini + web search / web search only]
Status: ready → proceeding to Claude CLI check (Step 0.1)
━━━━━━━━━━━━━━━━━━━━━━━━━
```

Proceed to Step 0.1.

---

## STEP 0.1 — CLAUDE CLI CHECK (runs EVERY time)

This step runs on EVERY pipeline execution — regardless of whether the setup gate was skipped. The Claude CLI is required by the bridge server to process browser-based section edits. Without it, the edit system falls back to clipboard mode.

**MANDATORY — Run this Bash command:**

```bash
claude --version 2>/dev/null
```

**React to the output:**

- **If the command succeeds** (prints a version string like `claude 1.x.x`):
  ```
  ✓ Claude CLI detected — section editing will be fully automatic via bridge server.
  ```
  Store internally: `cli_available = true`. Proceed to Step 0.5.

- **If the command fails** (command not found, error, or empty output):

  **Do NOT silently skip this.** Inform the user clearly:

  ```
  ⚠ CLAUDE CLI NOT FOUND
  ━━━━━━━━━━━━━━━━━━━━━━━━━
  The Claude CLI is required for automatic section editing via the
  bridge server. Without it, browser edits will use clipboard fallback.

  The Claude CLI is usually installed automatically with Claude Code.
  If you're running Claude Code in VS Code, the CLI should already be
  available. This error may indicate:

    • Claude Code was installed via VS Code extension only (CLI not on PATH)
    • Global npm packages are not on your system PATH
    • You're on a restricted system without global install permissions

  Would you like me to try installing it now?
    1. YES — Run: npm install -g @anthropic-ai/claude-code
    2. SKIP — Continue without automatic editing (clipboard fallback)
  ```

  **WAIT for user response.**

  - **If YES:**
    1. Run: `npm install -g @anthropic-ai/claude-code`
    2. Verify: `claude --version 2>/dev/null`
    3. If verification succeeds: `✓ Claude CLI installed successfully — automatic editing enabled.`
       Store: `cli_available = true`
    4. If verification fails: `⚠ Installation completed but CLI still not found on PATH. Section editing will use clipboard fallback. You may need to restart your terminal or add npm global bin to your PATH.`
       Store: `cli_available = false`

  - **If SKIP:**
    ```
    ✓ Skipping Claude CLI installation.
    Section editing will use clipboard fallback mode.
    You can install it anytime: npm install -g @anthropic-ai/claude-code
    ```
    Store: `cli_available = false`

**IMPORTANT — Windows-specific:**

On Windows, `claude --version` may fail even when the CLI is installed because:
- The CLI is installed as a `.cmd` shim (not a native binary)
- The current shell session may not have the PATH updated

If the first check fails on Windows, also try:
```bash
claude.cmd --version 2>/dev/null
```
If `claude.cmd` succeeds, the CLI IS available — store `cli_available = true` and proceed.

**This step is non-blocking** — the pipeline continues regardless. But the user MUST be informed of the result so they know whether browser editing will work automatically.

Proceed to Step 0.5.

---

## STEP 0.5 — GENERATION QUOTA CHECK

Before generating an article, check whether the user has remaining quota. Free users get 4 articles per day. Authorized users get unlimited.

**Pre-check — ensure bridge is available for auth verification:**
If `config/.auth-session.json` exists and `count` >= 4, you will need the bridge server to verify the token. Run `curl -s http://127.0.0.1:19847/health` to check. If the bridge is not running but the auth session file shows `subscription_status: "active"` and `last_verified` is within 24 hours, trust the local file and proceed. Otherwise, start the bridge server (see auto-start instructions below) before verifying.

**Local quota tracking:**

Read the file `config/.usage.json` inside the plugin directory. If it doesn't exist, create it:

```json
{
  "date": "YYYY-MM-DD",
  "count": 0
}
```

**Check logic:**

1. Read `config/.usage.json`
2. If `date` doesn't match today → reset: set `date` to today, `count` to 0
3. If `count` >= 4:
   - Check if user has a stored auth session in `config/.auth-session.json`
   - If **authenticated with active subscription** → proceed (unlimited), increment count
   - If **not authenticated** → stop and show:
     ```
     ╔══════════════════════════════════════════════════════════════╗
     ║          DAILY GENERATION LIMIT REACHED (4/4)               ║
     ╠══════════════════════════════════════════════════════════════╣
     ║                                                              ║
     ║  You've used your 4 free articles for today.                ║
     ║                                                              ║
     ║  To generate unlimited articles:                             ║
     ║    1. Sign up at the edit panel in any generated article     ║
     ║    2. Contact the admin for account activation               ║
     ║    3. Your unlimited access applies to both generation       ║
     ║       and section editing                                    ║
     ║                                                              ║
     ║  Your free quota resets tomorrow.                            ║
     ║                                                              ║
     ╚══════════════════════════════════════════════════════════════╝
     ```
     **Stop here. Do not proceed.**
4. If `count` < 4 → proceed, increment `count`, write updated file

**After incrementing, write back `config/.usage.json`.**

**Note:** The local quota file is a convenience limit — the real access gate is the Supabase auth on the edit side (bridge server). The generation limit is a soft nudge toward signup, not a hard security boundary.

**Auth session file (`config/.auth-session.json`):**

This file is created when a user authenticates through the bridge server. The bridge server's `/auth/login` endpoint returns a token. The SKILL.md orchestrator can check this file to verify authorization:

```json
{
  "access_token": "<JWT>",
  "user_email": "user@example.com",
  "subscription_status": "active",
  "last_verified": "ISO_DATE"
}
```

If the file exists and `subscription_status` is `"active"`, the user has unlimited access. The orchestrator should verify the token is still valid by calling the bridge server's `/auth/verify` endpoint if the `last_verified` date is older than 24 hours.

---

## PREFLIGHT STATUS REPORT

After all three checks complete, return this structured report to the orchestrator:

```
PREFLIGHT STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━
Gemini MCP: [configured / skipped / stale]
Claude CLI: [available / not available]
Quota: [ok (N/4 used) / unlimited (authenticated) / exceeded]
Status: [ready / blocked (quota exceeded)]
━━━━━━━━━━━━━━━━━━━━━━━━━
```

If status is `ready`, proceed to Step 1.
If status is `blocked`, stop — do not proceed with article generation.
