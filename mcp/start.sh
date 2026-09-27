#!/usr/bin/env bash
# Start the Kettle & Co MCP server on :8790 (MEMORABLE_API_KEY from hsec; the MCP never calls Claude).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p logs
export PATH="$HOME/.bun/bin:$HOME/.local/bin:$PATH" ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-unused-by-mcp}"
exec hsec exec --only MEMORABLE_API_KEY -- bun src/server.ts
