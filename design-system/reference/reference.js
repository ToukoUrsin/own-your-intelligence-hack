import { examples } from './examples.js';

const $ = selector => document.querySelector(selector);
const root = document.body;
let selected = examples[0];
let filter = 'all';
const duration = ms => `${Number((ms / 1000).toFixed(2))} s`;
const sortedDurations = examples.map(run => run.ms).sort((a, b) => a - b);
$('#run-count').textContent = String(examples.length);
$('#path-count').textContent = `${examples.filter(run => run.method === 'Saved path').length} / ${examples.length}`;
$('#median-duration').textContent = duration((sortedDurations[1] + sortedDurations[2]) / 2);

function setTheme(theme) {
  root.dataset.theme = theme;
  const next = theme === 'dark' ? 'light' : 'dark';
  $('#theme-toggle').textContent = `${next === 'light' ? 'Light' : 'Dark'} theme`;
  $('#theme-toggle').setAttribute('aria-label', `Switch to ${next} theme`);
  try { localStorage.setItem('oyi-ui-reference-theme', theme); } catch { /* Storage can be disabled; switching still works. */ }
}
try { const saved = localStorage.getItem('oyi-ui-reference-theme'); if (saved === 'light' || saved === 'dark') setTheme(saved); } catch { /* Keep the documented dark default. */ }
$('#theme-toggle').addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

function selectRun(run) {
  selected = run;
  for (const [id, value] of Object.entries({
    'selected-id': run.id, 'selected-request': run.request, 'selected-status': run.status,
    'selected-method': run.method, 'selected-duration': duration(run.ms), 'selected-tools': run.tools,
    'selected-outcome': run.outcome, 'selected-canonical': run.canonical, 'selected-source': run.source
  })) $(`#${id}`).textContent = String(value);
  $('#selected-status').dataset.status = run.state;
  // Do not replace the focused row button after selection.
  for (const row of document.querySelectorAll('#run-rows tr')) {
    const active = row.dataset.id === run.id;
    row.dataset.selected = String(active);
    row.querySelector('button').setAttribute('aria-pressed', String(active));
  }
}

function renderRows() {
  const query = $('#run-search').value.trim().toLowerCase();
  const visible = examples.filter(run =>
    (filter === 'all' || (filter === 'saved' ? run.method === 'Saved path' : run.state === 'review')) &&
    `${run.id} ${run.request}`.toLowerCase().includes(query)
  );
  $('#run-rows').replaceChildren();
  for (const run of visible) {
    const row = document.createElement('tr');
    row.dataset.id = run.id;
    row.dataset.selected = String(run.id === selected.id);
    const request = document.createElement('td');
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'ui-row-button'; button.textContent = run.request;
    button.setAttribute('aria-pressed', String(run.id === selected.id));
    button.setAttribute('aria-controls', 'run-inspector');
    button.addEventListener('click', () => selectRun(run));
    const id = document.createElement('div'); id.className = 'ui-caption ui-mono'; id.textContent = run.id;
    request.append(button, id); row.append(request);
    for (const [value, classes, state] of [[run.method, 'ui-secondary-column'], [run.status, '', run.state], [duration(run.ms), 'ui-number ui-secondary-column']]) {
      const cell = document.createElement('td'); cell.className = classes;
      if (state) { const status = document.createElement('span'); status.className = 'ui-status'; status.dataset.status = state; status.textContent = value; cell.append(status); }
      else cell.textContent = value;
      row.append(cell);
    }
    $('#run-rows').append(row);
  }
  $('#no-results').hidden = visible.length > 0;
  $('#filter-result').textContent = `Showing ${visible.length} of ${examples.length} example runs`;
  // Keep a visible selection when possible. With no results, retain the inspected run explicitly.
  if (visible.length && !visible.some(run => run.id === selected.id)) selectRun(visible[0]);
  $('#inspector-title').textContent = visible.length ? 'Run details' : 'Last inspected run';
}

for (const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click', () => {
  filter = button.dataset.filter;
  for (const item of document.querySelectorAll('[data-filter]')) item.setAttribute('aria-pressed', String(item === button));
  renderRows();
});
$('#run-search').addEventListener('input', renderRows);
$('#clear-filters').addEventListener('click', () => {
  filter = 'all'; $('#run-search').value = '';
  for (const item of document.querySelectorAll('[data-filter]')) item.setAttribute('aria-pressed', String(item.dataset.filter === 'all'));
  renderRows(); $('#run-search').focus();
});

$('#open-trace').addEventListener('click', () => {
  $('#trace-title').textContent = `Example trace · ${selected.id}`;
  $('#trace-steps').replaceChildren(...selected.steps.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  $('#trace-dialog').showModal();
});
$('#close-trace').addEventListener('click', () => $('#trace-dialog').close());
$('#trace-dialog').addEventListener('close', () => $('#open-trace').focus());

$('#copy-import').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText("@import './design-system/index.css';");
    $('#copy-status').textContent = 'CSS import copied.';
  } catch { $('#copy-status').textContent = "Copy unavailable. Select this text: @import './design-system/index.css';"; }
});

$('#request-title').addEventListener('input', () => {
  $('#form-status').textContent = '';
  if ($('#request-title').getAttribute('aria-invalid') === 'true' && $('#request-title').value.trim()) {
    $('#request-title').setAttribute('aria-invalid', 'false');
    $('#request-error').hidden = true;
  }
});
$('#example-form').addEventListener('submit', event => {
  event.preventDefault();
  const valid = $('#request-title').value.trim().length > 0;
  $('#request-title').setAttribute('aria-invalid', String(!valid));
  $('#request-error').hidden = valid;
  $('#form-status').textContent = valid ? 'Example is valid. No ticket was created.' : '';
  if (!valid) $('#request-title').focus();
});
selectRun(selected);
renderRows();
