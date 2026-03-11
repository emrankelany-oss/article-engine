#!/bin/bash
# ============================================================
# Article Engine — One-Time Setup
# ============================================================
# Run this once after copying the skill to a new machine.
# Requires: Node.js (for npx)
#
# Usage:
#   bash .claude/plugins/article-engine/setup.sh
#   bash .claude/plugins/article-engine/setup.sh YOUR_GEMINI_API_KEY
# ============================================================

set -e

CLAUDE_JSON="$HOME/.claude.json"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   Article Engine — Gemini MCP Setup      ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "  ✗ Node.js not found. Install it from https://nodejs.org"
  exit 1
fi
echo "  ✓ Node.js found: $(node -v)"

# Get API key
API_KEY="${1:-}"
if [ -z "$API_KEY" ]; then
  echo ""
  echo "  Get a free Gemini API key from:"
  echo "  → https://aistudio.google.com/apikey"
  echo ""
  read -p "  Paste your Gemini API key: " API_KEY
fi

if [ -z "$API_KEY" ]; then
  echo "  ✗ No API key provided. Aborting."
  exit 1
fi

# Add to ~/.claude.json
if [ -f "$CLAUDE_JSON" ]; then
  # File exists — merge mcpServers
  node -e "
    const fs = require('fs');
    const d = JSON.parse(fs.readFileSync('$CLAUDE_JSON', 'utf8'));
    d.mcpServers = d.mcpServers || {};
    if (d.mcpServers.gemini) {
      console.log('  ⚠ Gemini MCP already configured — updating API key');
    }
    d.mcpServers.gemini = {
      command: 'npx',
      args: ['-y', '@rlabs-inc/gemini-mcp'],
      env: { GEMINI_API_KEY: '$API_KEY' }
    };
    fs.writeFileSync('$CLAUDE_JSON', JSON.stringify(d, null, 2));
    console.log('  ✓ Gemini MCP added to ~/.claude.json');
  "
else
  # File doesn't exist — create it
  node -e "
    const fs = require('fs');
    const d = {
      mcpServers: {
        gemini: {
          command: 'npx',
          args: ['-y', '@rlabs-inc/gemini-mcp'],
          env: { GEMINI_API_KEY: '$API_KEY' }
        }
      }
    };
    fs.writeFileSync('$CLAUDE_JSON', JSON.stringify(d, null, 2));
    console.log('  ✓ Created ~/.claude.json with Gemini MCP');
  "
fi

# Pre-download the package
echo "  ↓ Pre-downloading Gemini MCP package..."
npx -y @rlabs-inc/gemini-mcp --help &> /dev/null || true
echo "  ✓ Package cached"

echo ""
echo "  ══════════════════════════════════════════"
echo "  ✓ Setup complete!"
echo "  "
echo "  Restart Claude Code, then say:"
echo "  \"write an article about [any topic]\""
echo "  ══════════════════════════════════════════"
echo ""
