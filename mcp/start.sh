#!/usr/bin/env bash
# Start the Northwind Outfitters support MCP server on :8790 for QM. Shop tools run on the Shopify dev store
# (SHOP_BACKEND=shopify, cache loaded at start: restart after seeding new orders). recall_path/save_path use the
# replay's procedure store (agent/src/memory.ts) with the same normalizer (NORMALIZER=haiku unless ROUTER_URL is set).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p logs
export PATH="/opt/homebrew/bin:$HOME/.bun/bin:$HOME/.local/bin:$PATH"
export SHOP_BACKEND="${SHOP_BACKEND:-shopify}" NORMALIZER="${NORMALIZER:-haiku}"
exec hsec exec --only ANTHROPIC_API_KEY,MEMORABLE_API_KEY,SHOPIFY_ADMIN_TOKEN -- bun src/server.ts
