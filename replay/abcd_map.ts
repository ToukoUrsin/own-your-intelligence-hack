// Our tool names → ABCD agent actions (data/abcd/raw/ontology.json), for the gold-workflow agreement metric.
// Tools not listed map to their own name with dashes (verify_identity → verify-identity), so ABCD-named tools need
// no entry. [] = no ABCD counterpart (brain/policy lookups; ABCD agents read guidelines without logging an action).
export const TOOL_TO_ABCD: Record<string, string[]> = {
  search_kb: [], read_page: [], list_products: [], find_orders: [], get_refunds: [],
  // Northwind tools are named after ABCD actions (pull_up_account → pull-up-account); these differ:
  check_system: ["ask-the-oracle"], update_subscription: ["update-account"], troubleshoot_step: ["try-again", "log-out-in"],
  // Earlier Kettle tool set:
  find_customer: ["pull-up-account"],
  get_tracking: ["ask-the-oracle"], get_refunds: ["ask-the-oracle"], get_invoices: ["ask-the-oracle"],
  cancel_order: ["update-order"], edit_order: ["update-order"], change_shipping_address: ["update-order"],
  update_account: ["update-account"], change_plan: ["update-account"], set_newsletter: ["update-account"],
  create_account: ["update-account"], request_account_deletion: ["update-account"],
  issue_refund: ["offer-refund"],
  place_order: ["make-purchase"], reship: ["make-purchase"], send_part: ["make-purchase"],
  create_case: ["notify-team"],
  send_password_reset: ["make-password"],
  email_invoice: ["send-link"],
};

export function toAbcd(tools: string[] = []): Set<string> {
  const out = new Set<string>();
  for (const t of tools) for (const a of TOOL_TO_ABCD[t] ?? [t.replace(/_/g, "-")]) out.add(a);
  return out;
}

// ABCD actions our toolset can express at all (gold actions outside it, e.g. record-reason, are human-only steps).
export function expressible(allTools: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const vs of Object.values(TOOL_TO_ABCD)) for (const v of vs) out.add(v);
  for (const t of allTools) for (const a of toAbcd([t])) out.add(a);
  return out;
}

// match: the path's action set equals the gold workflow restricted to expressible actions.
export function agreement(tools: string[] | undefined, gold: string[] | undefined, scope: Set<string>) {
  if (!tools || !gold?.length) return undefined;
  const a = toAbcd(tools), g = new Set(gold.filter((x) => scope.has(x)));
  const inter = [...a].filter((x) => g.has(x)).length, union = new Set([...a, ...g]).size;
  return { exact: inter === g.size && a.size === g.size, jaccard: union ? inter / union : 1, missing: [...g].filter((x) => !a.has(x)), extra: [...a].filter((x) => !g.has(x)) };
}
