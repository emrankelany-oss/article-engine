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

const PORT = parseInt(process.env.BRIDGE_PORT || '19847', 10);
const PROJECT_DIR = path.resolve(process.argv[2] || process.cwd());
const TIMEOUT_MS = 180000; // 3 minutes max per edit

let activeEdit = null;

const pidFile = path.join(PROJECT_DIR, '.claude-bridge-pid');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Helper: read JSON body from request (64KB max)
const MAX_BODY = 64 * 1024;
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { req.destroy(); reject(new Error('Request body too large (max 64KB)')); return; }
      body += chunk;
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
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
}

// Helper: verify token and require admin role (uses service_role key for privilege check)
async function requireAdmin(req, res) {
  const token = getToken(req);
  if (!token) {
    json(res, 401, { status: 'error', error: 'Authentication required.' });
    return null;
  }

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
}

// Simple rate limiter for auth endpoints (10 attempts per minute per key)
const rateLimitMap = new Map();
function checkRateLimit(key) {
  const now = Date.now();
  // Clean expired entries periodically
  if (rateLimitMap.size > 100) {
    for (const [k, v] of rateLimitMap) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
  }
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }
  entry.count++;
  if (entry.count > 10) return false;
  return true;
}

const server = http.createServer(async (req, res) => {
  // CORS — articles open as file:// URLs, Origin will be null
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
      projectDir: PROJECT_DIR,
      busy: !!activeEdit,
      authEnabled: !!config
    });
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
      if (password.length < 6) {
        json(res, 400, { status: 'error', error: 'Password must be at least 6 characters.' });
        return;
      }
      const data = await supabase.signUp(email, password);
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

      // Write auth session file for SKILL.md quota bypass
      if (sub && sub.status === 'active') {
        const sessionPath = path.join(__dirname, '..', 'config', '.auth-session.json');
        try {
          fs.writeFileSync(sessionPath, JSON.stringify({
            access_token: data.access_token,
            user_email: data.user.email,
            subscription_status: sub.status,
            last_verified: new Date().toISOString()
          }, null, 2));
        } catch (e) {
          console.error('[bridge] Failed to write auth session file:', e.message);
        }
      }

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
      if (password.length < 6) { json(res, 400, { status: 'error', error: 'Password must be at least 6 characters.' }); return; }
      const result = await supabase.adminCreateUser(email, password);
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

    if (activeEdit) {
      json(res, 409, {
        status: 'busy',
        error: 'An edit is already in progress. Please wait for it to finish.'
      });
      return;
    }

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
      if (fileMatch) {
        const articleFile = fileMatch[1].trim();
        // Block path traversal
        if (articleFile.includes('..') || articleFile.includes('/') || articleFile.includes('\\')) {
          json(res, 400, { status: 'error', error: 'Invalid article file path.' });
          return;
        }
        // Only allow .html files
        if (!articleFile.endsWith('.html')) {
          json(res, 400, { status: 'error', error: 'Article file must be an .html file.' });
          return;
        }
      }

      activeEdit = Date.now();

      // Log the edit usage
      supabase.logUsage(auth.token, auth.user.id, 'edit', null)
        .catch(err => console.error('[bridge] Failed to log usage:', err.message));

      // Spawn claude in print mode to process the edit
      const proc = spawn('claude', ['-p'], {
        cwd: PROJECT_DIR,
        stdio: ['pipe', 'pipe', 'pipe']
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
          activeEdit = null;
          if (!res.writableEnded) {
            json(res, 504, { status: 'timeout', error: 'Edit timed out after 3 minutes' });
          }
        }
      }, TIMEOUT_MS);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        activeEdit = null;

        if (res.writableEnded) return;

        if (code === 0) {
          json(res, 200, { status: 'success', output: stdout.trim() });
        } else {
          json(res, 500, {
            status: 'error',
            error: stderr || stdout || 'Claude exited with code ' + code
          });
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        activeEdit = null;

        if (res.writableEnded) return;

        json(res, 500, {
          status: 'error',
          error: 'Failed to start claude CLI: ' + err.message
        });
      });

    } catch (e) {
      activeEdit = null;
      json(res, 400, { status: 'error', error: e.message });
    }
    return;
  }

  json(res, 404, { error: 'Not found' });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error('  Port ' + PORT + ' is already in use. Is the bridge already running?');
    console.error('  Run /stop-bridge first, or set BRIDGE_PORT to use a different port.');
    console.error('');
  } else {
    console.error('  Server error:', err.message);
  }
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  // Write PID file after successful bind
  try { fs.writeFileSync(pidFile, process.pid.toString()); } catch (e) { console.error('[bridge] Failed to write PID file:', e.message); }
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
  try { fs.unlinkSync(pidFile); } catch (e) {}
  server.close();
  process.exit(0);
}

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
