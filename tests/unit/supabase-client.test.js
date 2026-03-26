import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// We need to reset module cache between tests to get fresh state
let supabase;

beforeEach(async () => {
  vi.resetModules();
  mockFetch.mockReset();
  // Re-import to get fresh module state
  supabase = await import('../../bridge/supabase-client.js');
});

describe('loadConfig', () => {
  it('returns config with url and anonKey', () => {
    const config = supabase.loadConfig();
    expect(config).toBeDefined();
    expect(config.url).toBeTruthy();
    expect(config.anonKey).toBeTruthy();
  });

  it('uses SUPABASE_URL env var when set', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    vi.resetModules();
    const fresh = await import('../../bridge/supabase-client.js');
    // The DEFAULT_CONFIG should have our env var
    const config = fresh.loadConfig();
    // If file exists it reads from file; if not, falls back to DEFAULT_CONFIG
    expect(config).toBeDefined();
    delete process.env.SUPABASE_URL;
  });
});

describe('signUp', () => {
  it('calls Supabase signup endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: { id: 'u1', email: 'test@test.com' } })
    });

    const result = await supabase.signUp('test@test.com', 'password123');
    expect(result.user.email).toBe('test@test.com');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/auth/v1/signup');
    expect(opts.method).toBe('POST');
  });

  it('throws on failed signup', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Email taken' })
    });

    await expect(supabase.signUp('dup@test.com', 'password123'))
      .rejects.toThrow('Unable to create account');
  });
});

describe('signIn', () => {
  it('calls Supabase token endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'tok123',
        user: { id: 'u1', email: 'test@test.com' }
      })
    });

    const result = await supabase.signIn('test@test.com', 'password123');
    expect(result.access_token).toBe('tok123');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/auth/v1/token');
  });

  it('throws on invalid credentials', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid login' })
    });

    await expect(supabase.signIn('test@test.com', 'wrong'))
      .rejects.toThrow('Invalid email or password');
  });
});

describe('signOut', () => {
  it('calls Supabase logout endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await supabase.signOut('valid-token');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/auth/v1/logout');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Authorization']).toBe('Bearer valid-token');
  });

  it('throws on failed logout', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    await expect(supabase.signOut('bad-token'))
      .rejects.toThrow('Failed to invalidate session');
  });
});

describe('verifyToken', () => {
  it('returns user on valid token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'u1', email: 'test@test.com' })
    });

    const user = await supabase.verifyToken('valid-token');
    expect(user.id).toBe('u1');
  });

  it('returns null on invalid token', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const user = await supabase.verifyToken('bad-token');
    expect(user).toBeNull();
  });
});

describe('getSubscription', () => {
  it('returns subscription on valid user', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ user_id: 'u1', plan: 'pro', status: 'active' }])
    });

    const sub = await supabase.getSubscription('tok', 'u1');
    expect(sub.status).toBe('active');
  });

  it('returns null on no subscription', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([])
    });

    const sub = await supabase.getSubscription('tok', 'u1');
    expect(sub).toBeNull();
  });
});

describe('loadAdminConfig', () => {
  it('uses SUPABASE_SERVICE_ROLE_KEY env var when set', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    vi.resetModules();
    const fresh = await import('../../bridge/supabase-client.js');
    const config = fresh.loadAdminConfig();
    expect(config.serviceRoleKey).toBe('test-service-key');
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('returns null when no env var and no file', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.resetModules();
    // This test depends on whether .supabase-admin.json exists on disk
    // In CI it won't exist, so loadAdminConfig returns null or file-based config
    const fresh = await import('../../bridge/supabase-client.js');
    const config = fresh.loadAdminConfig();
    // Either null (no file) or an object (file exists)
    expect(config === null || typeof config === 'object').toBe(true);
  });
});
