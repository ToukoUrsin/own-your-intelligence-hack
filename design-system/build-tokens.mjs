import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const tokens = JSON.parse(await readFile(new URL('tokens.json', root), 'utf8'));
const check = process.argv.includes('--check');
const themes = Object.entries(tokens.themes);
const keys = Object.keys(tokens.themes.dark).sort().join(',');
for (const [name, values] of themes) {
  if (Object.keys(values).sort().join(',') !== keys) throw new Error(`${name}: incomplete theme`);
}
for (const [group, values] of [['global', tokens.global], ...themes, ['breakpoints', tokens.breakpoints]]) {
  for (const [key, value] of Object.entries(values)) {
    if (!/^[a-z][a-z0-9-]*$/.test(key) || typeof value !== 'string' || !value.trim() || /[;{}]/.test(value)) {
      throw new Error(`Invalid token ${group}.${key}`);
    }
    if (group !== 'global' && group !== 'breakpoints' && key in tokens.global) throw new Error(`Duplicate token ${key}`);
  }
}

const block = (selector, values, scheme = '') => `${selector} {\n${scheme ? `  color-scheme: ${scheme};\n` : ''}${Object.entries(values).map(([key, value]) => `  --ui-${key}: ${value};`).join('\n')}\n}`;
const css = `/* Generated from tokens.json by build-tokens.mjs. Do not edit. */\n${block(':root, .ui-root', tokens.global)}\n\n${block(':root, .ui-root, [data-theme="dark"]', tokens.themes.dark, 'dark')}\n\n${block('[data-theme="light"], .ui-root[data-theme="light"]', tokens.themes.light, 'light')}\n\n@media (prefers-reduced-motion: reduce) {\n  :root, .ui-root {\n    --ui-duration-fast: 0ms;\n    --ui-duration-base: 0ms;\n    --ui-duration-slow: 0ms;\n  }\n}\n`;
const ts = `// Generated from tokens.json by build-tokens.mjs. Do not edit.\nexport const tokens = ${JSON.stringify(tokens, null, 2)} as const;\nexport type Theme = keyof typeof tokens.themes;\nexport type TokenName = keyof typeof tokens.global | keyof typeof tokens.themes.dark;\nexport const cssVar = (name: TokenName): string => \`var(--ui-\${name})\`;\n`;

// Check useful foreground/background pairs, not just the palette in isolation.
const luminance = hex => {
  if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error(`Contrast needs a six-digit hex color: ${hex}`);
  const c = hex.slice(1).match(/../g).map(part => parseInt(part, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
};
const ratio = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
let minimum = Infinity;
let pairs = 0;
for (const [name, values] of themes) {
  const text = ['fg', 'muted', 'subtle', 'accent', 'success', 'warning', 'danger', 'info'];
  const checks = text.flatMap(fg => ['bg', 'surface', 'overlay'].map(bg => [fg, bg, 4.5]));
  checks.push(['primary-fg', 'primary-bg', 4.5], ['primary-fg', 'primary-hover', 4.5], ['bar-fg', 'bar-bg', 4.5], ['bar-muted', 'bar-bg', 4.5], ['bar-fg', 'bar-active', 4.5]);
  for (const bg of ['bg', 'surface', 'overlay']) checks.push(['border-control', bg, 3], ['focus', bg, 3]);
  for (const [fg, bg, target] of checks) {
    const actual = ratio(luminance(values[fg]), luminance(values[bg]));
    if (actual < target) throw new Error(`${name}: ${fg}/${bg} is ${actual.toFixed(2)}:1; needs ${target}:1`);
    if (target === 4.5) minimum = Math.min(minimum, actual);
    pairs++;
  }
}

for (const [name, source] of [['tokens.css', css], ['tokens.ts', ts]]) {
  const path = new URL(name, root);
  if (check) {
    if (await readFile(path, 'utf8') !== source) throw new Error(`${name} is stale. Run node design-system/build-tokens.mjs`);
  } else await writeFile(path, source);
}

const defined = new Set([...Object.keys(tokens.global), ...Object.keys(tokens.themes.dark)]);
for (const file of ['base.css', 'components.css', 'reference/reference.css']) {
  const source = await readFile(new URL(file, root), 'utf8');
  for (const match of source.matchAll(/var\(--ui-([a-z0-9-]+)\)/g)) {
    if (!defined.has(match[1])) throw new Error(`${file}: undefined token ${match[1]}`);
  }
  if (/#[\da-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(source)) throw new Error(`${file}: color values belong in tokens.json`);
}
const components = await readFile(new URL('components.css', root), 'utf8');
for (const size of Object.values(tokens.breakpoints)) {
  if (!components.includes(`@media (max-width: ${size})`)) throw new Error(`Missing responsive breakpoint ${size}`);
}
console.log(`${check ? 'Checked' : 'Generated'} CSS and TypeScript; ${pairs} contrast pairs pass (lowest text ${minimum.toFixed(2)}:1); component token references and breakpoints pass.`);
