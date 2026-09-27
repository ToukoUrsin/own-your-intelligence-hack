#!/usr/bin/env bash
# Video fallback shot: run one ticket through the compiled tier only (no model call).
# Usage: video/compiled-demo.sh [email] [message]   (default: T0003, Crystal Minh, refund status)
set -euo pipefail
cd "$(dirname "$0")/../agent"
EMAIL="${1:-crystalm392@example.com}"
MSG="${2:-I am looking for the status of my refund. Crystal Minh}"
TICKET="From: $EMAIL

$MSG" bun -e '
import { tryCompiled, lastFallback } from "./src/compiled";
const t0 = performance.now();
const r = await tryCompiled(null, process.env.TICKET!);
if (!r) { console.log(`\x1b[33mFALLBACK to agent:\x1b[0m ${lastFallback}`); process.exit(0); }
console.log(`\x1b[32mCOMPILED\x1b[0m  ${r.planId}  (${r.risk})\n`);
for (const s of r.steps) console.log(`  → ${s.tool} ${JSON.stringify(s.input)}`);
console.log(`\n${r.reply}\n`);
console.log(`\x1b[32m${r.modelCalls} model calls · ${r.steps.length} tool calls · ${(performance.now() - t0).toFixed(0)} ms · $0.00\x1b[0m`);
'
