/**
 * Article Engine Bridge Server
 *
 * Lightweight local HTTP server that receives section edit requests
 * from the article's browser-based edit UI and routes them to Claude CLI
 * for automatic processing. No manual copy-paste required.
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

const PORT = parseInt(process.env.BRIDGE_PORT || '19847', 10);
const PROJECT_DIR = path.resolve(process.argv[2] || process.cwd());
const TIMEOUT_MS = 180000; // 3 minutes max per edit

let activeEdit = null;

// Write PID file early so stop-bridge can find it
const pidFile = path.join(PROJECT_DIR, '.claude-bridge-pid');
try {
  fs.writeFileSync(pidFile, process.pid.toString());
} catch (e) {
  // Non-fatal
}

const server = http.createServer((req, res) => {
  // CORS — articles open as file:// URLs, Origin will be null
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      projectDir: PROJECT_DIR,
      busy: !!activeEdit
    }));
    return;
  }

  // Apply edit — fully automatic via claude -p
  if (req.method === 'POST' && req.url === '/apply-edit') {
    if (activeEdit) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'busy',
        error: 'An edit is already in progress. Please wait for it to finish.'
      }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { prompt } = JSON.parse(body);

        if (!prompt || !prompt.includes('SECTION_EDIT:')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', error: 'Invalid SECTION_EDIT prompt' }));
          return;
        }

        activeEdit = Date.now();

        // Spawn claude in print mode to process the edit
        const proc = spawn('claude', ['-p', '--dangerously-skip-permissions'], {
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
              res.writeHead(504, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'timeout', error: 'Edit timed out after 3 minutes' }));
            }
          }
        }, TIMEOUT_MS);

        proc.on('close', (code) => {
          clearTimeout(timeout);
          activeEdit = null;

          if (res.writableEnded) return;

          if (code === 0) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', output: stdout.trim() }));
          } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              status: 'error',
              error: stderr || stdout || 'Claude exited with code ' + code
            }));
          }
        });

        proc.on('error', (err) => {
          clearTimeout(timeout);
          activeEdit = null;

          if (res.writableEnded) return;

          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'error',
            error: 'Failed to start claude CLI: ' + err.message
          }));
        });

      } catch (e) {
        activeEdit = null;
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', error: 'Invalid JSON: ' + e.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  Article Engine Bridge Server');
  console.log('  ────────────────────────────');
  console.log('  URL:     http://127.0.0.1:' + PORT);
  console.log('  Project: ' + PROJECT_DIR);
  console.log('  Status:  Ready for fully automatic section edits');
  console.log('');
  console.log('  Click "Apply Edit" in browser → edit processed automatically.');
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
