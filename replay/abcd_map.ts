// Our tool names → ABCD agent actions (kb.json / ontology.json), for the gold-workflow agreement metric.
// Unlisted tools map to their own name with dashes (search_faq → search-faq); tools listed with [] have no ABCD
// counterpart (pure knowledge lookups) and are ignored.
export const TOOL_TO_ABCD: Record<string, string[]> = {
  search_kb: [],
  read_page: [],
};

export function toAbcd(tools: string[] = []): Set<string> {
  const out = new Set<string>();
  for (const t of tools) for (const a of TOOL_TO_ABCD[t] ?? [t.replace(/_/g, "-")]) out.add(a);
  return out;
}

// Compare only against the ABCD actions: agreement = exact set match; jaccard for partial credit.
export function agreement(tools: string[] | undefined, gold: string[] | undefined) {
  if (!tools || !gold?.length) return undefined;
  const a = toAbcd(tools), g = new Set(gold);
  const inter = [...a].filter((x) => g.has(x)).length, union = new Set([...a, ...g]).size;
  return { exact: inter === g.size && a.size === g.size, jaccard: union ? inter / union : 1, missing: [...g].filter((x) => !a.has(x)), extra: [...a].filter((x) => !g.has(x)) };
}
