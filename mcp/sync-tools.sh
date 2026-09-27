#!/usr/bin/env bash
# Regenerate src/tools.ts from the tool list + dispatcher in agent/src/agent.ts, then restart the server.
set -euo pipefail
cd "$(dirname "$0")"; A=../agent/src/agent.ts
{ cat <<'H'
// Mirror of the tool list and dispatcher in agent/src/agent.ts (not exported there). Regenerate with sync-tools.sh.
import { readPage, searchKb } from "../../agent/src/brain";
import * as shop from "../../agent/src/shop";

type Tool = { name: string; description: string; input_schema: Record<string, unknown> };
H
sed -n '/^const str = /,/^const obj = /p' $A; echo
sed -n '/^const tools: Anthropic.Tool\[\] = \[/,/^\];/p' $A | sed 's/^const tools: Anthropic.Tool\[\] = \[/export const shopTools: Tool[] = [/'; echo
sed -n '/^async function runTool/,/^}/p' $A | sed 's/^async function runTool/export async function runShopTool/'
} > src/tools.ts
echo "synced $(grep -c '{ name: "' src/tools.ts) tools"
