// GBrain access through its CLI, isolated to this project's brain.
import { join } from "node:path";

const env = { ...process.env, GBRAIN_HOME: join(import.meta.dir, "../../.brain-home"), PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}` };

async function gbrain(args: string[]): Promise<string> {
  const p = Bun.spawn(["gbrain", ...args], { env, stdout: "pipe", stderr: "pipe" });
  const out = await new Response(p.stdout).text();
  await p.exited;
  return out;
}

export async function searchKb(query: string) {
  const raw = await gbrain(["search", query, "--json"]);
  try {
    const hits = JSON.parse(raw) as { slug: string; title: string; chunk_text: string }[];
    return hits.slice(0, 5).map((h) => ({ slug: h.slug, title: h.title, text: h.chunk_text }));
  } catch {
    return [];
  }
}

export async function readPage(slug: string) {
  return gbrain(["get", slug]);
}
