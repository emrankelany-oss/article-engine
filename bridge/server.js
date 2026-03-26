/**
 * Article Engine Bridge Server
 *
 * Lightweight local HTTP server that receives section edit requests
 * from the article's browser-based edit UI and routes them to Claude CLI
 * for automatic processing. Includes Supabase auth for edit gating.
 *
 * Usage:
 *   node server.js <project-directory>
 *
 * The server listens on http://127.0.0.1:19847
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const supabase = require('./supabase-client');

// Strip CLAUDECODE env var immediately on startup.
// When the bridge is started from within a Claude Code session, this var is inherited.
// If not removed, any spawned `claude` child process will refuse to start with
// "cannot be launched inside another Claude Code session".
delete process.env.CLAUDECODE;

const PORT = parseInt(process.env.BRIDGE_PORT || '19847', 10);
const PROJECT_DIR = path.resolve(process.argv[2] || process.cwd());
const TIMEOUT_MS = 600000; // 10 minutes max per edit

// Structured logger — outputs JSON lines when BRIDGE_LOG_JSON is set, plain text otherwise
// Errors are also persisted to a rotating log file for post-mortem analysis
const LOG_JSON = process.env.BRIDGE_LOG_JSON === '1';
const ERROR_LOG = path.join(PROJECT_DIR, '.bridge-errors.log');
const ERROR_LOG_MAX = 256 * 1024; // 256KB max, rotate when exceeded

function persistError(entry) {
  try {
    // Rotate if file exceeds max size
    try {
      const stat = fs.statSync(ERROR_LOG);
      if (stat.size > ERROR_LOG_MAX) {
        const rotated = ERROR_LOG + '.1';
        try { fs.unlinkSync(rotated); } catch { /* ok */ }
        fs.renameSync(ERROR_LOG, rotated);
      }
    } catch { /* file doesn't exist yet, fine */ }
    fs.appendFileSync(ERROR_LOG, JSON.stringify(entry) + '\n');
  } catch { /* never crash the server for logging failures */ }
}

function log(level, msg, meta = {}) {
  const entry = { ts: new Date().toISOString(), level, msg, ...meta };
  if (LOG_JSON) {
    process[level === 'error' ? 'stderr' : 'stdout'].write(JSON.stringify(entry) + '\n');
  } else {
    const prefix = level === 'error' ? '[bridge] ERROR' : '[bridge]';
    const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    console[level === 'error' ? 'error' : 'log'](`${prefix} ${msg}${extra}`);
  }
  if (level === 'error') persistError(entry);
}

// Per-article edit locks: Map<filePath, timestamp>
// Allows concurrent edits to different articles, blocks concurrent edits to the same file
const activeEdits = new Map();
// Clean up stale locks every 5 minutes (in case a process dies without cleanup)
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of activeEdits) {
    if (now - ts > TIMEOUT_MS + 30000) activeEdits.delete(key);
  }
}, 300000).unref();

const pidFile = path.join(PROJECT_DIR, '.claude-bridge-pid');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Helper: read JSON body from request (64KB max, uses Buffer.concat for O(n) performance)
const MAX_BODY = 64 * 1024;
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { req.destroy(); reject(new Error('Request body too large (max 64KB)')); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { reject(new Error('Invalid JSON: ' + e.message)); }
    });
    req.on('error', reject);
  });
}

// Helper: send JSON response
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Helper: extract Bearer token from Authorization header
function getToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

// Helper: verify token and check active subscription
async function requireAuth(req, res) {
  const token = getToken(req);
  if (!token) {
    json(res, 401, { status: 'error', error: 'Authentication required. Please log in.' });
    return null;
  }

  try {
    const user = await supabase.verifyToken(token);
    if (!user || !user.id) {
      json(res, 401, { status: 'error', error: 'Invalid or expired token. Please log in again.' });
      return null;
    }

    const sub = await supabase.getSubscription(token, user.id);
    if (!sub || sub.status !== 'active') {
      json(res, 403, { status: 'error', error: 'Your account is pending approval. Contact the admin for access.' });
      return null;
    }

    return { user, token, subscription: sub };
  } catch (e) {
    log('error', 'Auth service error: ' + e.message);
    json(res, 503, { status: 'error', error: 'Authentication service unavailable. Please try again.' });
    return null;
  }
}

// Helper: verify token and require admin role (uses service_role key for privilege check)
async function requireAdmin(req, res) {
  const token = getToken(req);
  if (!token) {
    json(res, 401, { status: 'error', error: 'Authentication required.' });
    return null;
  }

  try {
    const user = await supabase.verifyToken(token);
    if (!user || !user.id) {
      json(res, 401, { status: 'error', error: 'Invalid or expired token.' });
      return null;
    }

    // Use service_role key to check admin status (never trust user's own token for privilege check)
    const sub = await supabase.adminGetSubscription(user.id);
    if (!sub || sub.role !== 'admin' || sub.status !== 'active') {
      json(res, 403, { status: 'error', error: 'Admin access required.' });
      return null;
    }

    return { user, token, subscription: sub };
  } catch (e) {
    log('error', 'Admin auth service error: ' + e.message);
    json(res, 503, { status: 'error', error: 'Authentication service unavailable. Please try again.' });
    return null;
  }
}

// Notification system — file-backed alerts for quota warnings, admin events
const NOTIF_FILE = path.join(PROJECT_DIR, '.bridge-notifications.json');
const MAX_NOTIFICATIONS = 50;

function loadNotifications() {
  try {
    return JSON.parse(fs.readFileSync(NOTIF_FILE, 'utf8'));
  } catch { return []; }
}

function addNotification(type, message, meta = {}) {
  const notifs = loadNotifications();
  notifs.unshift({ ts: new Date().toISOString(), type, message, read: false, ...meta });
  // Keep only the most recent MAX_NOTIFICATIONS
  if (notifs.length > MAX_NOTIFICATIONS) notifs.length = MAX_NOTIFICATIONS;
  try { fs.writeFileSync(NOTIF_FILE, JSON.stringify(notifs, null, 2)); } catch { /* ok */ }
}

// Simple rate limiter for auth endpoints (10 attempts per minute per key)
const rateLimitMap = new Map();
function checkRateLimit(key) {
  const now = Date.now();
  // Clean expired entries on every check (prevents memory leak)
  for (const [k, v] of rateLimitMap) {
    if (now > v.resetAt) rateLimitMap.delete(k);
  }
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }
  entry.count++;
  return entry.count <= 10;
}

const server = http.createServer(async (req, res) => {
  const reqStart = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - reqStart;
    log('info', `${req.method} ${req.url} ${res.statusCode}`, { duration_ms: duration });
  });

  // CORS — restrict to localhost origins (bridge is local-only)
  const origin = req.headers.origin || '';
  const allowedOrigins = ['http://127.0.0.1', 'http://localhost', 'null']; // 'null' = file:// URLs
  const isAllowed = allowedOrigins.some(o => origin === o || origin.startsWith(o + ':'));
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : 'null');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    const config = supabase.loadConfig();
    json(res, 200, {
      status: 'ok',
      busy: activeEdits.size > 0,
      activeEdits: activeEdits.size,
      authEnabled: !!config
    });
    return;
  }

  // Notifications endpoint (admin only)
  if (req.method === 'GET' && req.url === '/notifications') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const notifs = loadNotifications();
    json(res, 200, { notifications: notifs });
    return;
  }

  if (req.method === 'POST' && req.url === '/notifications/mark-read') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const notifs = loadNotifications();
    notifs.forEach(n => { n.read = true; });
    try { fs.writeFileSync(NOTIF_FILE, JSON.stringify(notifs, null, 2)); } catch { /* ok */ }
    json(res, 200, { status: 'success' });
    return;
  }

  // ── AUTH ENDPOINTS ──────────────────────────────────────────

  // Sign up
  if (req.method === 'POST' && req.url === '/auth/signup') {
    try {
      const { email, password } = await readBody(req);
      if (!checkRateLimit('signup:' + (email || req.socket.remoteAddress))) {
        json(res, 429, { status: 'error', error: 'Too many attempts. Please wait a minute.' });
        return;
      }
      if (!email || !password) {
        json(res, 400, { status: 'error', error: 'Email and password are required.' });
        return;
      }
      if (password.length < 8) {
        json(res, 400, { status: 'error', error: 'Password must be at least 8 characters.' });
        return;
      }
      const data = await supabase.signUp(email, password);
      addNotification('user:signup', `New user registered: ${email}`, { email });
      json(res, 200, {
        status: 'success',
        message: 'Account created! Your access is pending admin approval.',
        user: { id: data.user?.id, email: data.user?.email }
      });
    } catch (e) {
      json(res, 400, { status: 'error', error: e.message });
    }
    return;
  }

  // Login
  if (req.method === 'POST' && req.url === '/auth/login') {
    try {
      const { email, password } = await readBody(req);
      if (!checkRateLimit('login:' + (email || req.socket.remoteAddress))) {
        json(res, 429, { status: 'error', error: 'Too many attempts. Please wait a minute.' });
        return;
      }
      if (!email || !password) {
        json(res, 400, { status: 'error', error: 'Email and password are required.' });
        return;
      }
      const data = await supabase.signIn(email, password);

      // Check subscription status
      const sub = await supabase.getSubscription(data.access_token, data.user.id);

      // Auth session kept in memory only — no disk persistence (security: prevents token theft)
      // SKILL.md quota bypass now uses the bridge /auth/verify endpoint instead

      json(res, 200, {
        status: 'success',
        access_token: data.access_token,
        user: { id: data.user.id, email: data.user.email },
        subscription: sub ? { plan: sub.plan, status: sub.status, role: sub.role || 'user' } : { plan: 'free', status: 'pending', role: 'user' }
      });
    } catch (e) {
      json(res, 401, { status: 'error', error: e.message });
    }
    return;
  }

  // Logout (invalidate token on Supabase)
  if (req.method === 'POST' && req.url === '/auth/logout') {
    if (!checkRateLimit('logout:' + req.socket.remoteAddress)) {
      json(res, 429, { status: 'error', error: 'Too many attempts. Please wait a minute.' });
      return;
    }
    const token = getToken(req);
    if (!token) {
      json(res, 401, { status: 'error', error: 'No token provided.' });
      return;
    }
    try {
      await supabase.signOut(token);
      json(res, 200, { status: 'success', message: 'Logged out successfully.' });
    } catch (e) {
      json(res, 500, { status: 'error', error: 'Logout failed: ' + e.message });
    }
    return;
  }

  // Verify token
  if (req.method === 'GET' && req.url === '/auth/verify') {
    const token = getToken(req);
    if (!token) {
      json(res, 401, { status: 'error', error: 'No token provided.' });
      return;
    }
    const user = await supabase.verifyToken(token);
    if (!user || !user.id) {
      json(res, 401, { status: 'error', error: 'Invalid or expired token.' });
      return;
    }
    const sub = await supabase.getSubscription(token, user.id);
    json(res, 200, {
      status: 'ok',
      user: { id: user.id, email: user.email },
      subscription: sub ? { plan: sub.plan, status: sub.status } : { plan: 'free', status: 'pending' }
    });
    return;
  }

  // ── ADMIN ENDPOINTS (admin role required) ──────────────────

  // List all users + subscriptions
  if (req.method === 'GET' && req.url === '/admin/users') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const data = await supabase.adminListUsers();
      json(res, 200, { status: 'ok', users: data.users, subscriptions: data.subscriptions });
    } catch (e) {
      json(res, 500, { status: 'error', error: e.message });
    }
    return;
  }

  // Approve a user (set status to active)
  if (req.method === 'POST' && req.url === '/admin/approve') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const { user_id } = await readBody(req);
      if (!user_id || !UUID_RE.test(user_id)) { json(res, 400, { status: 'error', error: 'Valid user_id required' }); return; }
      await supabase.adminUpdateSubscription(user_id, { status: 'active' });
      supabase.logAdminAction(admin.user.id, 'admin:approve', user_id).catch(() => {});
      json(res, 200, { status: 'success', message: 'User approved.' });
    } catch (e) {
      json(res, 500, { status: 'error', error: e.message });
    }
    return;
  }

  // Revoke a user (set status to pending)
  if (req.method === 'POST' && req.url === '/admin/revoke') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const { user_id } = await readBody(req);
      if (!user_id || !UUID_RE.test(user_id)) { json(res, 400, { status: 'error', error: 'Valid user_id required' }); return; }
      await supabase.adminUpdateSubscription(user_id, { status: 'pending' });
      supabase.logAdminAction(admin.user.id, 'admin:revoke', user_id).catch(() => {});
      json(res, 200, { status: 'success', message: 'User access revoked.' });
    } catch (e) {
      json(res, 500, { status: 'error', error: e.message });
    }
    return;
  }

  // Delete a user
  if (req.method === 'POST' && req.url === '/admin/delete') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const { user_id } = await readBody(req);
      if (!user_id || !UUID_RE.test(user_id)) { json(res, 400, { status: 'error', error: 'Valid user_id required' }); return; }
      await supabase.adminDeleteUser(user_id);
      supabase.logAdminAction(admin.user.id, 'admin:delete', user_id).catch(() => {});
      json(res, 200, { status: 'success', message: 'User deleted.' });
    } catch (e) {
      json(res, 500, { status: 'error', error: e.message });
    }
    return;
  }

  // Add a new user (admin-created, auto-activated)
  if (req.method === 'POST' && req.url === '/admin/add-user') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const { email, password } = await readBody(req);
      if (!email || !password) { json(res, 400, { status: 'error', error: 'Email and password required.' }); return; }
      if (password.length < 8) { json(res, 400, { status: 'error', error: 'Password must be at least 8 characters.' }); return; }
      const result = await supabase.adminCreateUser(email, password);
      supabase.logAdminAction(admin.user.id, 'admin:add-user', result.id).catch(() => {});
      json(res, 200, { status: 'success', message: 'User created and activated.', user: result });
    } catch (e) {
      json(res, 400, { status: 'error', error: e.message });
    }
    return;
  }

  // Get usage logs
  if (req.method === 'GET' && req.url === '/admin/usage') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const logs = await supabase.adminGetUsageLogs();
      json(res, 200, { status: 'ok', logs: logs });
    } catch (e) {
      json(res, 500, { status: 'error', error: e.message });
    }
    return;
  }

  // ── APPLY EDIT (auth required) ─────────────────────────────

  if (req.method === 'POST' && req.url === '/apply-edit') {
    // Require auth
    const auth = await requireAuth(req, res);
    if (!auth) return; // response already sent

    let lockKey = null;
    try {
      const { prompt } = await readBody(req);

      if (!prompt || !prompt.includes('SECTION_EDIT:')) {
        json(res, 400, { status: 'error', error: 'Invalid SECTION_EDIT prompt' });
        return;
      }

      // Sanitize: cap length
      if (prompt.length > 8000) {
        json(res, 400, { status: 'error', error: 'Edit prompt too long (max 8000 characters)' });
        return;
      }

      // Sanitize: validate prompt structure to prevent prompt injection
      // Only allow prompts that match the expected SECTION_EDIT format
      const requiredFields = ['Article file:', 'Section ID:', 'User requested change:'];
      const missingFields = requiredFields.filter(f => !prompt.includes(f));
      if (missingFields.length > 0) {
        json(res, 400, { status: 'error', error: 'Invalid edit prompt format. Missing: ' + missingFields.join(', ') });
        return;
      }

      // Extract the article file from the prompt and validate it
      const fileMatch = prompt.match(/Article file:\s*(.+?)[\r\n]/);
      let articleFilePath = null;
      if (fileMatch) {
        const articleFile = fileMatch[1].trim();
        // Block path traversal (.. anywhere in the path)
        if (articleFile.includes('..')) {
          json(res, 400, { status: 'error', error: 'Invalid article file path: path traversal not allowed.' });
          return;
        }
        // Block absolute paths (must be relative to project dir)
        if (path.isAbsolute(articleFile)) {
          json(res, 400, { status: 'error', error: 'Invalid article file path: absolute paths not allowed.' });
          return;
        }
        // Only allow .html files
        if (!articleFile.endsWith('.html')) {
          json(res, 400, { status: 'error', error: 'Article file must be an .html file.' });
          return;
        }
        // Resolve and verify the file stays within PROJECT_DIR
        const resolvedPath = path.resolve(PROJECT_DIR, articleFile);
        if (!resolvedPath.startsWith(path.resolve(PROJECT_DIR))) {
          json(res, 400, { status: 'error', error: 'Invalid article file path: file must be within project directory.' });
          return;
        }
        // Check file exists
        if (!fs.existsSync(resolvedPath)) {
          json(res, 400, { status: 'error', error: 'Article file not found: ' + articleFile + '. Check that the file exists in your project directory.' });
          return;
        }
        articleFilePath = resolvedPath;
      }

      // Per-article lock: block concurrent edits to the SAME file, allow different files
      lockKey = articleFilePath || '__unknown__';
      if (activeEdits.has(lockKey)) {
        json(res, 409, {
          status: 'busy',
          error: 'An edit is already in progress for this article. Please wait for it to finish.'
        });
        return;
      }
      activeEdits.set(lockKey, Date.now());

      // Log the edit usage
      supabase.logUsage(auth.token, auth.user.id, 'edit', null)
        .catch(err => log('error', 'Failed to log usage: ' + err.message));

      // Spawn claude in print mode to process the edit (shell:false prevents command injection)
      const proc = spawn('claude', ['-p'], {
        cwd: PROJECT_DIR,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false
      });

      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      // Send the edit prompt via stdin
      proc.stdin.write(prompt);
      proc.stdin.end();

      // Timeout guard
      const timeout = setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGTERM');
          activeEdits.delete(lockKey);
          if (!res.writableEnded) {
            json(res, 504, { status: 'timeout', error: 'Edit timed out after 10 minutes' });
          }
        }
      }, TIMEOUT_MS);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        activeEdits.delete(lockKey);

        if (res.writableEnded) return;

        if (code === 0) {
          addNotification('edit:success', `Edit completed for ${lockKey}`, { user: auth.user.email });
          json(res, 200, { status: 'success', output: stdout.trim() });
        } else {
          addNotification('edit:failed', `Edit failed for ${lockKey}: code ${code}`, { user: auth.user.email });
          json(res, 500, {
            status: 'error',
            error: stderr || stdout || 'Claude exited with code ' + code
          });
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        activeEdits.delete(lockKey);

        if (res.writableEnded) return;

        json(res, 500, {
          status: 'error',
          error: 'Failed to start claude CLI: ' + err.message
        });
      });

    } catch (e) {
      if (lockKey) activeEdits.delete(lockKey);
      json(res, 400, { status: 'error', error: e.message });
    }
    return;
  }

  json(res, 404, { error: 'Not found' });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    log('error', 'Port ' + PORT + ' is already in use. Is the bridge already running?');
    log('error', 'Run /stop-bridge first, or set BRIDGE_PORT to use a different port.');
  } else {
    log('error', 'Server error: ' + err.message);
  }
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  // Write PID file after successful bind
  try { fs.writeFileSync(pidFile, process.pid.toString()); } catch (e) { log('error', 'Failed to write PID file: ' + e.message); }
  const config = supabase.loadConfig();
  console.log('');
  console.log('  Article Engine Bridge Server');
  console.log('  ────────────────────────────');
  console.log('  URL:     http://127.0.0.1:' + PORT);
  console.log('  Project: ' + PROJECT_DIR);
  console.log('  Auth:    ' + (config ? 'Supabase ✓' : 'Not configured'));
  console.log('  Status:  Ready for section edits');
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});

// Graceful shutdown
function cleanup() {
  try { fs.unlinkSync(pidFile); } catch { /* ignore */ }
  server.close();
  process.exit(0);
}

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

// Catch unhandled errors so the server doesn't silently crash
process.on('uncaughtException', (err) => {
  log('error', 'Uncaught exception: ' + err.message, { stack: err.stack });
  cleanup();
});
process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  log('error', 'Unhandled rejection: ' + msg, { stack });
});
