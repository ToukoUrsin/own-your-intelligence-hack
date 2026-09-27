#!/usr/bin/env node
// tokens.json -> tokens.css, tokens.ts, tailwind.theme.css, plus WCAG contrast checks.
//   node design-system/build-tokens.mjs          write the generated files
//   node design-system/build-tokens.mjs --check  fail if generated files are stale or a contrast pair fails
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(dir, "tokens.json"), "utf8"));
const check = process.argv.includes("--check");
const HEADER = "/* Generated from tokens.json by build-tokens.mjs. Do not edit. */\n";

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const flat = (obj, prefix = []) =>
  Object.entries(obj).flatMap(([k, v]) =>
    k.startsWith("$") ? [] : typeof v === "object" ? flat(v, [...prefix, k]) : [[[...prefix, k].map(kebab).join("-"), String(v)]],
  );
const decls = (pairs, indent = "  ") => pairs.map(([k, v]) => `${indent}--ui-${k}: ${v};`).join("\n");

const base = flat(tokens.base);
const light = flat(tokens.themes.light);
const dark = flat(tokens.themes.dark);

const css =
  HEADER +
  `:root {\n${decls(base)}\n}\n\n` +
  `/* Light is the default theme. */\n:root,\n[data-theme="light"] {\n  color-scheme: light;\n${decls(light)}\n}\n\n` +
  `[data-theme="dark"] {\n  color-scheme: dark;\n${decls(dark)}\n}\n\n` +
  `/* Follow the OS only when the page opts in with data-theme="system". */\n@media (prefers-color-scheme: dark) {\n  [data-theme="system"] {\n    color-scheme: dark;\n${decls(dark, "    ")}\n  }\n}\n\n` +
  `@media (prefers-reduced-motion: reduce) {\n  :root {\n${tokens.base.duration ? Object.keys(tokens.base.duration).map((k) => `    --ui-duration-${kebab(k)}: 0ms;`).join("\n") : ""}\n  }\n}\n`;

const ts =
  "// Generated from tokens.json by build-tokens.mjs. Do not edit.\n" +
  `export const tokens = ${JSON.stringify({ base: tokens.base, themes: tokens.themes }, null, 2)} as const;\n\n` +
  "export type ThemeName = keyof typeof tokens.themes;\n" +
  "export type ColorToken = keyof typeof tokens.themes.light.color;\n\n" +
  "/** CSS custom property reference for a token path, e.g. cssVar('color', 'accent') -> 'var(--ui-color-accent)'. */\n" +
  "export const cssVar = (...path: string[]) =>\n" +
  "  `var(--ui-${path.map((p) => p.replace(/([a-z0-9])([A-Z])/g, \"$1-$2\").toLowerCase()).join(\"-\")})`;\n";

// Tailwind v4: `@import "./design-system/tailwind.theme.css";` after `@import "tailwindcss";`
const tw =
  HEADER +
  "@theme inline {\n" +
  [
    ...Object.keys(tokens.themes.light.color).map((k) => `  --color-${kebab(k)}: var(--ui-color-${kebab(k)});`),
    ...Object.keys(tokens.base.font).map((k) => `  --font-${kebab(k)}: var(--ui-font-${kebab(k)});`),
    ...Object.keys(tokens.base.radius).map((k) => `  --radius-${kebab(k)}: var(--ui-radius-${kebab(k)});`),
    ...Object.keys(tokens.themes.light.shadow).map((k) => `  --shadow-${kebab(k)}: var(--ui-shadow-${kebab(k)});`),
  ].join("\n") +
  "\n}\n";

// ---- WCAG contrast -------------------------------------------------------------------------------
function parse(c) {
  c = c.trim();
  let m = c.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, m[2] ? parseInt(m[2], 16) / 255 : 1];
  }
  m = c.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[/,]\s*([\d.]+%?))?\s*\)$/i);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [+m[1], +m[2], +m[3], a];
  }
  throw new Error(`Unparseable colour for contrast check: ${c}`);
}
const over = (top, under) => {
  const [r, g, b, a] = parse(top);
  const [R, G, B] = parse(under);
  return `rgb(${r * a + R * (1 - a)} ${g * a + G * (1 - a)} ${b * a + B * (1 - a)})`;
};
const lum = (c) => {
  const [r, g, b] = parse(c).map((v, i) => (i < 3 ? v / 255 : v)).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// A check background may name a glass fill ("pane", "chip"): it is checked composited over the canvas and over
// each glow at full strength (the worst case under the blur), and the lowest ratio is reported.
const backdrops = (t) => [t.color.canvas, ...Object.values(t.glow ?? {}).map((g) => over(g, t.color.canvas))];
const resolveAll = (theme, name) => {
  const t = tokens.themes[theme];
  if (t.color[name]) return [t.color[name]];
  if (t.glass?.[name]) return backdrops(t).map((b) => over(t.glass[name], b));
  throw new Error(`Unknown colour ${theme}.${name}`);
};

let failed = 0;
const rows = [];
for (const theme of Object.keys(tokens.themes)) {
  for (const [fg, bg, min] of tokens.checks) {
    const fgRaw = resolveAll(theme, fg)[0];
    const r = Math.min(...resolveAll(theme, bg).map((b) => ratio(parse(fgRaw)[3] < 1 ? over(fgRaw, b) : fgRaw, b)));
    const ok = r >= min;
    if (!ok) failed++;
    rows.push(`${ok ? "pass" : "FAIL"}  ${theme.padEnd(5)}  ${fg.padEnd(14)} on ${bg.padEnd(12)} ${r.toFixed(2).padStart(5)} (min ${min})`);
  }
}

const outputs = { "tokens.css": css, "tokens.ts": ts, "tailwind.theme.css": tw };
let stale = [];
for (const [name, body] of Object.entries(outputs)) {
  const path = join(dir, name);
  if (check) {
    let current = "";
    try { current = readFileSync(path, "utf8"); } catch {}
    if (current !== body) stale.push(name);
  } else writeFileSync(path, body);
}

console.log(rows.join("\n"));
if (check && stale.length) console.error(`stale: ${stale.join(", ")} — run node design-system/build-tokens.mjs`);
console.log(`${rows.length - failed}/${rows.length} contrast pairs pass${check ? "" : "; wrote " + Object.keys(outputs).join(", ")}`);
if (failed || stale.length) process.exit(1);
