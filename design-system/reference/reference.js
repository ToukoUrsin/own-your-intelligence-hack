// Reference page behaviour. Example data only: nothing here is a measured result.
const ROUTES = {
  explored: { label: "Explored", icon: "i-explored", why: "No saved path was close enough, so the agent solved it from scratch with GBrain and the shop tools, then saved the path." },
  recalled: { label: "Recalled", icon: "i-recalled", why: "A saved path matched the canonical request. The agent replayed its steps for this customer and skipped the knowledge-base search." },
  compiled: { label: "Compiled", icon: "i-compiled", why: "The path had succeeded often enough to compile into a deterministic program: bindings, tool calls, policy guards and a reply template. No model calls." },
};
const OUTCOMES = {
  resolved: { label: "Resolved", tone: "success", icon: "i-check" },
  human: { label: "Needs human", tone: "warning", icon: "i-user" },
  fallback: { label: "Fell back", tone: "neutral", icon: "i-alert" },
};

const TICKETS = [
  { id: "T0093", request: "Remove a pair of Gale jeans from my order, added them by accident", rendered: "Request removal of an item from an order", route: "explored", outcome: "resolved", time: 25.1, cost: 0.23,
    steps: [["recall_path", "no match (0.61)"], ["pull_up_account"], ["search_kb", "returns-refunds policy"], ["verify_identity"], ["shipping_status", "in transit"], ["find_orders"], ["membership", "bronze"], ["offer_refund", "$54 to PayPal"], ["save_path", "new path saved"]] },
  { id: "T0075", request: "I ordered 2 jackets and need one of them removed", rendered: "Request removal of an item from an order", route: "recalled", outcome: "resolved", time: 14.8, cost: 0.09,
    steps: [["recall_path", "manage_cancel (0.91)"], ["pull_up_account"], ["verify_identity"], ["find_orders", "not shipped"], ["membership", "bronze"], ["offer_refund", "$94 Harbor jacket"]] },
  { id: "T0123", request: "Please take the Kline jeans off my order", rendered: "Request removal of an item from an order", route: "compiled", outcome: "resolved", time: 0.9, cost: 0.0,
    steps: [["bind", "order, item from canonical"], ["pull_up_account"], ["verify_identity"], ["find_orders"], ["guard", "refund within policy"], ["offer_refund", "$69"], ["render_reply"]] },
  { id: "T0293", request: "Cancel the Mercer boots, I ordered the wrong size", rendered: "Request removal of an item from an order", route: "compiled", outcome: "fallback", time: 12.4, cost: 0.08,
    steps: [["bind", "order, item from canonical"], ["pull_up_account"], ["find_orders", "two open orders"], ["guard", "ambiguous order", "failed"], ["handoff", "agent took over"]] },
  { id: "T0141", request: "Where is my order? It has been 9 days", rendered: "Retrieve shipping status for an order", route: "recalled", outcome: "resolved", time: 11.2, cost: 0.07,
    steps: [["recall_path", "shipping_status (0.88)"], ["pull_up_account"], ["find_orders"], ["shipping_status", "delayed at carrier"]] },
  { id: "T0208", request: "Promo code SPRING20 says it has expired but the email says it runs all month", rendered: "Assess promo code validity", route: "explored", outcome: "human", time: 31.4, cost: 0.29,
    steps: [["recall_path", "no match (0.54)"], ["search_kb", "promo-codes policy"], ["pull_up_account"], ["promo_lookup", "expired 25 Sep"], ["escalate", "policy conflict"]] },
  { id: "T0317", request: "Change the shipping address on my last order", rendered: "Request address change for an order", route: "compiled", outcome: "resolved", time: 1.1, cost: 0.0,
    steps: [["bind", "order, address from canonical"], ["pull_up_account"], ["verify_identity"], ["guard", "not yet shipped"], ["update_address"], ["render_reply"]] },
  { id: "T0352", request: "What is the status of the refund for the boots I returned?", rendered: "Retrieve refund information", route: "recalled", outcome: "resolved", time: 9.8, cost: 0.06,
    steps: [["recall_path", "refund_status (0.93)"], ["pull_up_account"], ["refund_status", "issued 24 Sep"]] },
];

// Share of routes per 50-ticket bucket across a 400-ticket replay.
const CURVE = [
  [92, 8, 0], [70, 28, 2], [52, 40, 8], [38, 46, 16], [28, 48, 24], [22, 48, 30], [16, 50, 34], [14, 48, 38],
];

const $ = (s) => document.querySelector(s);
const icon = (id) => `<svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#${id}"/></svg>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const money = (n) => (n === 0 ? "$0.00" : `$${n.toFixed(2)}`);
const routeChip = (r) => `<span class="ui-chip ui-chip--${r}">${icon(ROUTES[r].icon)}${ROUTES[r].label}</span>`;
const outcomeChip = (o) => {
  const t = OUTCOMES[o];
  return `<span class="ui-chip${t.tone === "neutral" ? "" : ` ui-chip--${t.tone}`}">${icon(t.icon)}${t.label}</span>`;
};

let state = { route: "all", q: "", selected: "T0075" };

function renderRows() {
  const q = state.q.trim().toLowerCase();
  const rows = TICKETS.filter((t) => (state.route === "all" || t.route === state.route) && (!q || `${t.id} ${t.request}`.toLowerCase().includes(q)));
  $("#rows").innerHTML = rows
    .map(
      (t) => `<tr tabindex="0" data-id="${t.id}" aria-selected="${t.id === state.selected}">
        <td class="ui-mono">${t.id}</td>
        <td class="ref-req"><span class="ref-request" title="${esc(t.request)}">${esc(t.request)}</span></td>
        <td>${routeChip(t.route)}</td>
        <td>${outcomeChip(t.outcome)}</td>
        <td class="ui-num ref-col-opt">${t.time.toFixed(1)} s</td>
        <td class="ui-num">${money(t.cost)}</td>
      </tr>`,
    )
    .join("");
  $("#count").textContent = `${rows.length} of ${TICKETS.length}`;
  $("#empty").hidden = rows.length > 0;
  $(".ref-tickets .ui-table-wrap").hidden = rows.length === 0;
  $("#empty-q").textContent = state.q || ROUTES[state.route]?.label || "";
  if (rows.length && !rows.some((t) => t.id === state.selected)) select(rows[0].id);
}

function select(id) {
  state.selected = id;
  const t = TICKETS.find((x) => x.id === id);
  document.querySelectorAll("#rows tr").forEach((tr) => tr.setAttribute("aria-selected", String(tr.dataset.id === id)));
  $("#p-id").textContent = t.id;
  $("#p-title").textContent = t.rendered;
  $("#p-route").innerHTML = routeChip(t.route);
  $("#p-canonical").textContent = t.rendered;
  $("#p-steps").innerHTML = t.steps
    .map(([tool, note, st]) => `<li${st ? ` data-state="${st}"` : ""}><span class="ui-steps__tool">${tool}${note ? `<span class="ui-steps__note">${esc(note)}</span>` : ""}</span><span></span></li>`)
    .join("");
  $("#p-outcome").innerHTML = outcomeChip(t.outcome);
  $("#p-cost").textContent = `${t.time.toFixed(1)} s · ${money(t.cost)} · ${t.steps.length} steps`;
}

$("#rows").addEventListener("click", (e) => {
  const tr = e.target.closest("tr[data-id]");
  if (tr) select(tr.dataset.id);
});
$("#rows").addEventListener("keydown", (e) => {
  const tr = e.target.closest("tr[data-id]");
  if (!tr) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    select(tr.dataset.id);
  }
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    (e.key === "ArrowDown" ? tr.nextElementSibling : tr.previousElementSibling)?.focus();
  }
});
$("#search").addEventListener("input", (e) => {
  state.q = e.target.value;
  renderRows();
});
$("#clear").addEventListener("click", () => {
  state.q = "";
  $("#search").value = "";
  renderRows();
  $("#search").focus();
});
$("#route-filter").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-route]");
  if (!b) return;
  state.route = b.dataset.route;
  $("#route-filter").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  renderRows();
});

// Dialog
const dlg = $("#why-dialog");
$("#why").addEventListener("click", () => {
  const t = TICKETS.find((x) => x.id === state.selected);
  $("#why-body").textContent = t.outcome === "fallback" ? `${ROUTES[t.route].why} Here a guard failed (${t.steps.find((s) => s[2] === "failed")[1]}), so the agent took over.` : ROUTES[t.route].why;
  dlg.showModal();
});
["#why-close", "#why-ok"].forEach((s) => $(s).addEventListener("click", () => dlg.close()));
dlg.addEventListener("click", (e) => {
  if (e.target === dlg) dlg.close();
});

// Chart: 100% stacked columns, 2px surface gaps, direct labels on the last column, hover tooltip.
function renderChart() {
  // Drawn at the container's real width so text stays at its CSS size.
  const W = Math.max(300, $("#chart").clientWidth), H = 220, L = 34, R = 104, T = 8, B = 26;
  const cw = (W - L - R) / CURVE.length;
  const bw = Math.min(46, cw * 0.62);
  const y = (p) => T + (H - T - B) * (1 - p / 100);
  const keys = ["explored", "recalled", "compiled"];
  const css = getComputedStyle(document.documentElement);
  const color = (k) => css.getPropertyValue(`--ui-color-${k}-mark`).trim();
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Route share per 50 tickets. Explored falls from 92% to 14%; compiled rises from 0% to 38%.">`;
  for (const p of [0, 50, 100]) s += `<line class="ref-chart__grid" x1="${L}" x2="${W - R}" y1="${y(p)}" y2="${y(p)}"/><text x="${L - 8}" y="${y(p) + 4}" text-anchor="end">${p}%</text>`;
  CURVE.forEach((col, i) => {
    const x = L + i * cw + (cw - bw) / 2;
    let acc = 0;
    s += `<g class="ref-chart__col" data-i="${i}">`;
    keys.forEach((k, j) => {
      const v = col[j];
      if (!v) return;
      const top = y(acc + v), bot = y(acc);
      const gap = acc > 0 ? 2 : 0;
      s += `<rect x="${x}" y="${top}" width="${bw}" height="${Math.max(0, bot - top - gap)}" rx="${j === keys.length - 1 || acc + v === 100 ? 4 : 1.5}" fill="${color(k)}"/>`;
      acc += v;
    });
    s += `<rect class="ref-chart__hit" x="${L + i * cw}" y="${T}" width="${cw}" height="${H - T - B}"/>`;
    s += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${(i + 1) * 50}</text></g>`;
  });
  // Direct labels beside the last column, at each segment's midpoint.
  const last = CURVE[CURVE.length - 1];
  let acc = 0;
  keys.forEach((k, j) => {
    const mid = y(acc + last[j] / 2);
    s += `<text class="ref-chart__direct" x="${W - R + 10}" y="${mid + 4}">${ROUTES[k].label} ${last[j]}%</text>`;
    acc += last[j];
  });
  s += `</svg><div class="ref-tooltip ui-glass" hidden></div>`;
  $("#chart").innerHTML = s;

  const tip = $("#chart .ref-tooltip");
  const svg = $("#chart svg");
  $("#chart").onpointermove = (e) => {
    const g = e.target.closest(".ref-chart__col");
    if (!g) return hide();
    const i = +g.dataset.i;
    svg.querySelectorAll(".ref-chart__col").forEach((c) => (c.dataset.dim = String(c !== g)));
    tip.innerHTML = `<b>Tickets ${i * 50 + 1}–${(i + 1) * 50}</b>` + keys.map((k, j) => `<span><em style="font-style:normal"><i style="background:${color(k)}"></i>${ROUTES[k].label}</em>${CURVE[i][j]}%</span>`).join("");
    const box = $("#chart").getBoundingClientRect();
    const hit = g.querySelector(".ref-chart__hit").getBoundingClientRect();
    tip.style.left = `${Math.min(Math.max(hit.left - box.left + hit.width / 2, 80), box.width - 80)}px`;
    tip.style.top = `${Math.max(hit.top - box.top + 24, 60)}px`;
    tip.hidden = false;
  };
  const hide = () => {
    tip.hidden = true;
    svg.querySelectorAll(".ref-chart__col").forEach((c) => (c.dataset.dim = "false"));
  };
  $("#chart").onpointerleave = hide;

  $("#chart-table").innerHTML =
    `<thead><tr><th scope="col">Tickets</th>${keys.map((k) => `<th scope="col" data-align="end">${ROUTES[k].label}</th>`).join("")}</tr></thead><tbody>` +
    CURVE.map((c, i) => `<tr><td>${i * 50 + 1}–${(i + 1) * 50}</td>${c.map((v) => `<td class="ui-num">${v}%</td>`).join("")}</tr>`).join("") +
    "</tbody>";
}

// Specimens
$("#chip-specimen").innerHTML = [...Object.keys(ROUTES).map(routeChip), ...Object.keys(OUTCOMES).map(outcomeChip), `<span class="ui-chip ui-chip--info">${icon("i-info")}Stand-in router</span>`].join("");

const SWATCHES = ["canvas", "surface", "fg", "fg-muted", "fg-subtle", "border-control", "primary", "accent", "accent-text", "info", "success", "warning", "danger", "explored-mark", "recalled-mark", "compiled-mark"];
function renderSwatches() {
  const css = getComputedStyle(document.documentElement);
  $("#swatches").innerHTML = SWATCHES.map((n) => `<div class="ref-swatch"><div class="ref-swatch__chip" style="background:var(--ui-color-${n})"></div><span>${n}</span><code>${css.getPropertyValue(`--ui-color-${n}`).trim()}</code></div>`).join("");
}

// Theme: light by default, dark opt-in. Remembered per browser.
const root = document.documentElement;
function setTheme(t) {
  root.dataset.theme = t;
  $("#theme").setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
  $("#theme use").setAttribute("href", t === "dark" ? "#i-sun" : "#i-moon");
  try { localStorage.setItem("ui-theme", t); } catch {}
  renderChart();
  renderSwatches();
}
$("#theme").addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark"));

document.querySelectorAll("[data-jump]").forEach((b) =>
  b.addEventListener("click", () => {
    document.querySelectorAll("[data-jump]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    document.getElementById(b.dataset.jump).scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }),
);

let saved = "light";
try { saved = localStorage.getItem("ui-theme") || new URLSearchParams(location.search).get("theme") || "light"; } catch {}
const forced = new URLSearchParams(location.search).get("theme");
renderRows();
select(state.selected);
setTheme(forced || saved);
let lastW = $("#chart").clientWidth;
new ResizeObserver(() => {
  const w = $("#chart").clientWidth;
  if (w !== lastW) (lastW = w), renderChart();
}).observe($("#chart"));
