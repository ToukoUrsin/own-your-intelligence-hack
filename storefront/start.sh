#!/usr/bin/env bash
# Start the public storefront chat backend on 127.0.0.1:8795 (exposed via `tailscale funnel`). Separate stores in state/.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p logs state
export PATH="/opt/homebrew/bin:$HOME/.bun/bin:$HOME/.local/bin:$PATH"
[ -f state/procedures.jsonl ] || cp ../replay/procedures.jsonl state/procedures.jsonl
[ -d state/plans ] || cp -R ../replay/plans state/plans
[ -d state/memorable-home ] || cp -R ../.memorable-home state/memorable-home
[ -f state/token.txt ] || openssl rand -hex 12 > state/token.txt
exec hsec exec --only ANTHROPIC_API_KEY,MEMORABLE_API_KEY,SHOPIFY_ADMIN_TOKEN -- bun server.ts
