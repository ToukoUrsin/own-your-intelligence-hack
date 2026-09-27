import { handleTicket } from "./agent";
import { actions } from "./shop";

const ticket = process.argv.slice(2).join(" ") || "Hi, my Burr One shows E3 and won't grind. Order KC-10421. — Maya";
const t = await handleTicket(ticket);
for (const s of t.steps) console.log(`→ ${s.tool} ${JSON.stringify(s.input)}`);
console.log(`\n${t.reply}\n`);
console.log(`actions: ${JSON.stringify(actions)}`);
console.log(`${t.steps.length} tool calls · ${t.modelCalls} model calls · ${(t.ms / 1000).toFixed(1)} s · ${t.inputTokens} in / ${t.outputTokens} out tokens`);
