/**
 * Supabase REST API Client for Article Engine Bridge Server
 *
 * Uses direct HTTP calls to Supabase — no npm dependencies required.
 * Requires Node.js 18+ for built-in fetch.
 */

const fs = require('fs');
const path = require('path');

let _config = null;
let _configMtime = 0;

/**
 * Load Supabase config from .supabase.json
 * Re-reads the file if it has been modified since last load.
 */
function loadConfig() {
  const configPath = path.join(__dirname, '..', 'config', '.supabase.json');
  if (!fs.existsSync(configPath)) {
    _config = null;
    _configMtime = 0;
    return null;
  }
  try {
    const stat = fs.statSync(configPath);
    if (_config && stat.mtimeMs === _configMtime) return _config;
    _config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    _configMtime = stat.mtimeMs;
  } catch (e) {
    console.error('[supabase] Failed to parse .supabase.json:', e.message);
    return null;
  }
  return _config;
}

/**
 * Sign up a new user
 */
async function signUp(email, password) {
  const config = loadConfig();
  if (!config) throw new Error('Supabase not configured');

  const res = await fetch(`${config.url}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.anonKey
    },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Unable to create account. Please try a different email.');
  return data;
}

/**
 * Sign in with email and password
 */
async function signIn(email, password) {
  const config = loadConfig();
  if (!config) throw new Error('Supabase not configured');

  const res = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.anonKey
    },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Invalid email or password.');
  return data;
}

/**
 * Verify an access token and return the user
 */
async function verifyToken(token) {
  const config = loadConfig();
  if (!config) return null;

  const res = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': config.anonKey
    }
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Get subscription status for a user
 */
async function getSubscription(token, userId) {
  const config = loadConfig();
  if (!config) return null;

  const res = await fetch(
    `${config.url}/rest/v1/subscriptions?user_id=eq.${userId}&select=*`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': config.anonKey
      }
    }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

/**
 * Log a usage event (generate or edit)
 */
async function logUsage(token, userId, action, articleFile) {
  const config = loadConfig();
  if (!config) return false;

  const res = await fetch(`${config.url}/rest/v1/usage_logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': config.anonKey,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      user_id: userId,
      action,
      article_file: articleFile || null
    })
  });
  return res.ok;
}

/**
 * Count today's usage for a user
 */
async function getTodayUsageCount(token, userId, action) {
  const config = loadConfig();
  if (!config) return 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const res = await fetch(
    `${config.url}/rest/v1/usage_logs?user_id=eq.${userId}&action=eq.${action}&created_at=gte.${todayStart.toISOString()}&select=id`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': config.anonKey,
        'Prefer': 'count=exact'
      }
    }
  );
  if (!res.ok) return 0;
  const count = res.headers.get('content-range');
  if (count) {
    const match = count.match(/\/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
  const rows = await res.json();
  return rows.length;
}

// ── ADMIN FUNCTIONS (use service_role key from .supabase.json) ──

/**
 * Load admin config (service_role key)
 * Falls back to null if not configured
 */
let _adminConfig = null;
let _adminConfigMtime = 0;
function loadAdminConfig() {
  const configPath = path.join(__dirname, '..', 'config', '.supabase-admin.json');
  if (!fs.existsSync(configPath)) {
    _adminConfig = null;
    _adminConfigMtime = 0;
    return null;
  }
  try {
    const stat = fs.statSync(configPath);
    if (_adminConfig && stat.mtimeMs === _adminConfigMtime) return _adminConfig;
    _adminConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    _adminConfigMtime = stat.mtimeMs;
  } catch (e) {
    console.error('[supabase] Failed to parse .supabase-admin.json:', e.message);
    return null;
  }
  return _adminConfig;
}

/**
 * Make an admin API call using service_role key
 */
async function adminFetch(path, opts = {}) {
  const config = loadConfig();
  const adminConfig = loadAdminConfig();
  if (!config || !adminConfig) throw new Error('Admin config not available');

  const res = await fetch(config.url + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'apikey': adminConfig.serviceRoleKey,
      'Authorization': 'Bearer ' + adminConfig.serviceRoleKey,
      ...(opts.headers || {})
    }
  });
  if (opts.noBody) return res;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || data.message || 'Admin API error');
  return data;
}

/**
 * Get a subscription using service_role key (for admin privilege checks)
 */
async function adminGetSubscription(userId) {
  const config = loadConfig();
  const adminConfig = loadAdminConfig();
  if (!config || !adminConfig) return null;

  const res = await fetch(
    config.url + '/rest/v1/subscriptions?user_id=eq.' + userId + '&select=*',
    {
      headers: {
        'apikey': adminConfig.serviceRoleKey,
        'Authorization': 'Bearer ' + adminConfig.serviceRoleKey
      }
    }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

/**
 * List all users and their subscriptions
 */
async function adminListUsers() {
  const authData = await adminFetch('/auth/v1/admin/users');
  const users = authData.users || [];

  const config = loadConfig();
  const adminConfig = loadAdminConfig();
  const subRes = await fetch(config.url + '/rest/v1/subscriptions?select=*&order=created_at.desc', {
    headers: {
      'apikey': adminConfig.serviceRoleKey,
      'Authorization': 'Bearer ' + adminConfig.serviceRoleKey
    }
  });
  const subscriptions = await subRes.json();

  return { users, subscriptions: Array.isArray(subscriptions) ? subscriptions : [] };
}

/**
 * Update a user's subscription
 */
async function adminUpdateSubscription(userId, updates) {
  const config = loadConfig();
  const adminConfig = loadAdminConfig();
  if (!config || !adminConfig) throw new Error('Admin config not available');

  // Whitelist safe fields only — never allow role escalation via this function
  const safeUpdates = {};
  if (updates.status) safeUpdates.status = updates.status;
  if (updates.plan) safeUpdates.plan = updates.plan;
  if (updates.expires_at) safeUpdates.expires_at = updates.expires_at;

  const res = await fetch(config.url + '/rest/v1/subscriptions?user_id=eq.' + userId, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': adminConfig.serviceRoleKey,
      'Authorization': 'Bearer ' + adminConfig.serviceRoleKey,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(safeUpdates)
  });
  if (!res.ok) throw new Error('Failed to update subscription');
}

/**
 * Delete a user and their subscription
 */
async function adminDeleteUser(userId) {
  const config = loadConfig();
  const adminConfig = loadAdminConfig();
  if (!config || !adminConfig) throw new Error('Admin config not available');

  // Delete subscription first
  await fetch(config.url + '/rest/v1/subscriptions?user_id=eq.' + userId, {
    method: 'DELETE',
    headers: {
      'apikey': adminConfig.serviceRoleKey,
      'Authorization': 'Bearer ' + adminConfig.serviceRoleKey,
      'Prefer': 'return=minimal'
    }
  });

  // Delete auth user
  await adminFetch('/auth/v1/admin/users/' + userId, { method: 'DELETE', noBody: true });
}

/**
 * Create a user via admin API (auto-confirmed, auto-activated)
 */
async function adminCreateUser(email, password) {
  const result = await adminFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true })
  });

  if (!result.id) throw new Error('Failed to create user');

  // Wait for trigger to create subscription, then activate (retry up to 3 times)
  let activated = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    await new Promise(r => setTimeout(r, 500));
    await adminUpdateSubscription(result.id, { status: 'active' });
    // Verify the row was actually updated
    const sub = await adminGetSubscription(result.id);
    if (sub && sub.status === 'active') {
      activated = true;
      break;
    }
  }

  if (!activated) {
    throw new Error('User created but activation failed. Check the subscriptions table manually.');
  }

  return { id: result.id, email: result.email };
}

/**
 * Get recent usage logs (last 50)
 */
async function adminGetUsageLogs() {
  const config = loadConfig();
  const adminConfig = loadAdminConfig();
  if (!config || !adminConfig) throw new Error('Admin config not available');

  const res = await fetch(config.url + '/rest/v1/usage_logs?select=*&order=created_at.desc&limit=50', {
    headers: {
      'apikey': adminConfig.serviceRoleKey,
      'Authorization': 'Bearer ' + adminConfig.serviceRoleKey
    }
  });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

module.exports = {
  loadConfig,
  signUp,
  signIn,
  verifyToken,
  getSubscription,
  logUsage,
  getTodayUsageCount,
  loadAdminConfig,
  adminGetSubscription,
  adminListUsers,
  adminUpdateSubscription,
  adminDeleteUser,
  adminCreateUser,
  adminGetUsageLogs
};
