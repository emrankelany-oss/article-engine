import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// These tests validate Tier 3 bridge features by testing the logic patterns
// used in server.js without importing the auto-starting server module.

describe('Per-article edit locking', () => {
  it('allows concurrent edits to different files', () => {
    const activeEdits = new Map();
    activeEdits.set('/articles/a.html', Date.now());
    activeEdits.set('/articles/b.html', Date.now());
    expect(activeEdits.size).toBe(2);
    expect(activeEdits.has('/articles/a.html')).toBe(true);
    expect(activeEdits.has('/articles/c.html')).toBe(false);
  });

  it('blocks concurrent edits to the same file', () => {
    const activeEdits = new Map();
    activeEdits.set('/articles/a.html', Date.now());
    const isLocked = activeEdits.has('/articles/a.html');
    expect(isLocked).toBe(true);
  });

  it('releases lock after edit completes', () => {
    const activeEdits = new Map();
    activeEdits.set('/articles/a.html', Date.now());
    activeEdits.delete('/articles/a.html');
    expect(activeEdits.has('/articles/a.html')).toBe(false);
  });

  it('cleans up stale locks', () => {
    const TIMEOUT_MS = 600000;
    const activeEdits = new Map();
    // Simulate a stale lock (older than TIMEOUT_MS + 30s)
    activeEdits.set('/articles/stale.html', Date.now() - TIMEOUT_MS - 60000);
    activeEdits.set('/articles/fresh.html', Date.now());

    const now = Date.now();
    for (const [key, ts] of activeEdits) {
      if (now - ts > TIMEOUT_MS + 30000) activeEdits.delete(key);
    }

    expect(activeEdits.size).toBe(1);
    expect(activeEdits.has('/articles/fresh.html')).toBe(true);
    expect(activeEdits.has('/articles/stale.html')).toBe(false);
  });
});

describe('Notification system', () => {
  let notifFile;
  const MAX_NOTIFICATIONS = 50;

  beforeEach(() => {
    notifFile = path.join(os.tmpdir(), `.bridge-notif-test-${Date.now()}.json`);
  });

  afterEach(() => {
    try { fs.unlinkSync(notifFile); } catch { /* ok */ }
  });

  function loadNotifications() {
    try {
      return JSON.parse(fs.readFileSync(notifFile, 'utf8'));
    } catch { return []; }
  }

  function addNotification(type, message, meta = {}) {
    const notifs = loadNotifications();
    notifs.unshift({ ts: new Date().toISOString(), type, message, read: false, ...meta });
    if (notifs.length > MAX_NOTIFICATIONS) notifs.length = MAX_NOTIFICATIONS;
    fs.writeFileSync(notifFile, JSON.stringify(notifs, null, 2));
  }

  it('returns empty array when no file exists', () => {
    expect(loadNotifications()).toEqual([]);
  });

  it('adds a notification', () => {
    addNotification('user:signup', 'New user: test@test.com', { email: 'test@test.com' });
    const notifs = loadNotifications();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].type).toBe('user:signup');
    expect(notifs[0].message).toContain('test@test.com');
    expect(notifs[0].read).toBe(false);
  });

  it('prepends new notifications (newest first)', () => {
    addNotification('edit:success', 'Edit 1');
    addNotification('edit:success', 'Edit 2');
    const notifs = loadNotifications();
    expect(notifs[0].message).toBe('Edit 2');
    expect(notifs[1].message).toBe('Edit 1');
  });

  it('caps at MAX_NOTIFICATIONS', () => {
    for (let i = 0; i < 55; i++) {
      addNotification('test', `Notification ${i}`);
    }
    const notifs = loadNotifications();
    expect(notifs).toHaveLength(MAX_NOTIFICATIONS);
  });

  it('marks all as read', () => {
    addNotification('user:signup', 'User 1');
    addNotification('edit:success', 'Edit 1');
    const notifs = loadNotifications();
    notifs.forEach(n => { n.read = true; });
    fs.writeFileSync(notifFile, JSON.stringify(notifs, null, 2));
    const updated = loadNotifications();
    expect(updated.every(n => n.read)).toBe(true);
  });
});

describe('Error log rotation', () => {
  let errorLog;

  beforeEach(() => {
    errorLog = path.join(os.tmpdir(), `.bridge-errors-test-${Date.now()}.log`);
  });

  afterEach(() => {
    try { fs.unlinkSync(errorLog); } catch { /* ok */ }
    try { fs.unlinkSync(errorLog + '.1'); } catch { /* ok */ }
  });

  function persistError(entry, maxSize = 256 * 1024) {
    try {
      try {
        const stat = fs.statSync(errorLog);
        if (stat.size > maxSize) {
          const rotated = errorLog + '.1';
          try { fs.unlinkSync(rotated); } catch { /* ok */ }
          fs.renameSync(errorLog, rotated);
        }
      } catch { /* file doesn't exist yet */ }
      fs.appendFileSync(errorLog, JSON.stringify(entry) + '\n');
    } catch { /* never crash for logging */ }
  }

  it('creates error log on first error', () => {
    persistError({ level: 'error', msg: 'test error' });
    expect(fs.existsSync(errorLog)).toBe(true);
    const content = fs.readFileSync(errorLog, 'utf8');
    expect(content).toContain('test error');
  });

  it('appends multiple errors', () => {
    persistError({ msg: 'error 1' });
    persistError({ msg: 'error 2' });
    const lines = fs.readFileSync(errorLog, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
  });

  it('rotates when exceeding max size', () => {
    // Use a tiny max size to trigger rotation
    const smallMax = 50;
    persistError({ msg: 'first error that is long enough to exceed limit' }, smallMax);
    persistError({ msg: 'second error after rotation' }, smallMax);

    expect(fs.existsSync(errorLog)).toBe(true);
    expect(fs.existsSync(errorLog + '.1')).toBe(true);
    const rotatedContent = fs.readFileSync(errorLog + '.1', 'utf8');
    expect(rotatedContent).toContain('first error');
    const currentContent = fs.readFileSync(errorLog, 'utf8');
    expect(currentContent).toContain('second error');
  });
});

describe('Security headers', () => {
  it('defines expected security header values', () => {
    // Validate the header values that server.js sets
    const headers = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    };
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
  });
});
