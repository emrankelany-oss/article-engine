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

# Add to ~/.claude.json — pass key via env to avoid shell injection
GEMINI_KEY="$API_KEY" CLAUDE_CFG="$CLAUDE_JSON" node -e '
  const fs = require("fs");
  const key = process.env.GEMINI_KEY;
  const cfgPath = process.env.CLAUDE_CFG;
  let d = {};
  if (fs.existsSync(cfgPath)) {
    d = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
    if (d.mcpServers && d.mcpServers.gemini) {
      console.log("  ⚠ Gemini MCP already configured — updating API key");
    }
  }
  d.mcpServers = d.mcpServers || {};
  d.mcpServers.gemini = {
    command: "npx",
    args: ["-y", "@rlabs-inc/gemini-mcp"],
    env: { GEMINI_API_KEY: key }
  };
  fs.writeFileSync(cfgPath, JSON.stringify(d, null, 2));
  console.log(fs.existsSync(cfgPath)
    ? "  ✓ Gemini MCP added to ~/.claude.json"
    : "  ✓ Created ~/.claude.json with Gemini MCP");
'

# Pre-download the package
echo "  ↓ Pre-downloading Gemini MCP package..."
if npx -y @rlabs-inc/gemini-mcp --help &> /dev/null; then
  echo "  ✓ Package cached"
else
  echo "  ⚠ Package pre-download failed. Gemini MCP will download on first use."
  echo "    If this persists, check your internet connection or npm registry access."
fi

echo ""
echo "  ══════════════════════════════════════════"
echo "  ✓ Setup complete!"
echo "  "
echo "  Restart Claude Code, then say:"
echo "  \"write an article about [any topic]\""
echo "  ══════════════════════════════════════════"
echo ""
