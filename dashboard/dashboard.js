'use strict';
/* Evernote-Sicherung – Dashboard.
   Echt: spricht mit dem Helfer auf dem iMac (/api/...).
   Vorschau: wenn kein Helfer da ist (z. B. GitHub Pages), simuliert DemoBackend dieselben Antworten.
   Regeln: eine Funktion = eine Aufgabe, flach (async/await, fruehe Returns). */

const $ = (sel) => document.querySelector(sel);
const ui = { mode: 'live', offline: false, shown: 0, connectHelp: false, status: null, inlineError: null, started: false };

/* ---------- Helfer-Verbindung (echt) ---------- */
const LiveBackend = {
  async status() {
    const r = await fetch('/api/status', { cache: 'no-store' });
    if (!r.ok) throw new Error('status ' + r.status);
    return r.json();
  },
  async post(path, body) {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'X-Helfer': '1', 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    return r.json();
  },
};

/* ---------- Vorschau (simuliert) ---------- */
const NAMES = ['Familie', 'Rezepte', 'Garten', 'Reisen', 'Steuer', 'Auto', 'Gesundheit', 'Fotos', 'Haus', 'Briefe'];
const DEMO_TOTAL = 1000;
const DEMO_BROKEN = 734;
const DEMO_BUSY = { code: 'BUSY', text: 'Es läuft gerade eine Sicherung.', action: 'show_progress', label: 'Fortschritt ansehen', help: [], details: '' };
const DEMO_BROKEN_HELP = ['„Nochmal versuchen“ drücken.', 'Klappt es wieder nicht: „Überspringen“ drücken – alles andere bleibt gesichert.', 'Protokoll an Ihren Neffen schicken („Hoppla – Protokoll sichern“).'];
const demo = {
  connected: false, running: false, phase: '', done: 0, total: 0, events: [], error: null,
  result: null, target: 'notizen', timer: null, limit: DEMO_TOTAL, failed: [], started: 0, last: {},
};

function demoTime() {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' ';
}

function demoEvent(text) {
  demo.events = demo.events.concat(demoTime() + text).slice(-300);
}

function demoNotebookName(n) {
  return NAMES[n % NAMES.length] + ' ' + n;
}

function demoStepOne() {
  demo.done += 1;
  const n = demo.done;
  if (n === DEMO_BROKEN) {
    demo.failed.push(demoNotebookName(n));
    return demoEvent('Notizbuch „' + demoNotebookName(n) + '“ konnte nicht gesichert werden.');
  }
  const k = (n * 7) % 4;
  const what = k ? (k === 1 ? '1 Notiz' : k + ' Notizen') + ' gespeichert' : 'Schon gesichert, wird übersprungen.';
  if (n % 7 === 0 || demo.limit < 10) demoEvent('Notizbuch „' + demoNotebookName(n) + '“ (' + n + ' von ' + demo.total + '): ' + what);
}

function demoTick() {
  const steps = demo.limit < 10 ? 1 : 9;
  for (let i = 0; i < steps && demo.done < demo.limit; i += 1) demoStepOne();
  if (demo.done >= demo.limit) demoFinish();
}

function demoFinishProbe() {
  demo.result = { probe: true, notebooks: 2, new: 37, changed: 0, failed: [] };
  demoEvent('Probe fertig.');
}

function demoFinishFull() {
  const failed = demo.failed;
  demo.result = { probe: false, notebooks: demo.total, new: 15230, changed: 12, failed: failed };
  demo.last = { saved_at: Date.now() / 1000 };
  if (!failed.length) return demoEvent('Fertig! Alles ist gesichert.');
  const text = '„' + failed[0] + '“ konnte nicht gesichert werden. Alles andere ist gesichert.';
  demo.error = { code: 'BROKEN_NOTEBOOK', text: text, action: 'backup', label: 'Nochmal versuchen', secondary: { action: 'skip', label: 'Überspringen' }, help: DEMO_BROKEN_HELP, details: 'ParseError: no element found: line 1, column 48 (Vorschau)' };
  demoEvent(text);
}

function demoFinish() {
  clearInterval(demo.timer);
  demo.running = false;
  demo.phase = 'fertig';
  if (demo.limit === 2) return demoFinishProbe();
  demoFinishFull();
}

function demoStart(probe) {
  const resume = demo.phase === 'angehalten';
  const retry = demo.error && demo.error.code === 'BROKEN_NOTEBOOK';
  demo.error = null;
  demo.running = true;
  demo.phase = 'schreiben';
  if (retry) return demoRetryBroken();
  if (!resume) demoReset(probe);
  demoEvent(resume ? 'Es geht weiter bei Notizbuch ' + (demo.done + 1) + '.' : 'Verbindung zu Evernote steht.');
  demo.timer = setInterval(demoTick, 150);
}

function demoReset(probe) {
  demo.done = 0;
  demo.failed = [];
  demo.total = DEMO_TOTAL;
  demo.limit = probe ? 2 : DEMO_TOTAL;
  demo.started = Date.now();
  demo.events = [];
  if (!demo.last.saved_at) demoEvent('Gleich fragt der Mac, ob der Helfer Notizen nutzen darf. Bitte „OK“ klicken.');
}

function demoRetryBroken() {
  demoEvent('Notizbuch „' + demo.failed[0] + '“ wird noch einmal versucht … 3 Notizen gespeichert.');
  demo.failed = [];
  demo.running = false;
  demo.phase = 'fertig';
  demo.result = Object.assign({}, demo.result, { failed: [] });
  demoEvent('Fertig! Alles ist gesichert.');
}

function demoSkip() {
  demo.failed.forEach((n) => demoEvent('Notizbuch „' + n + '“ wird künftig übersprungen.'));
  demo.failed = [];
  demo.error = null;
  demo.result = Object.assign({}, demo.result, { failed: [] });
}

function demoBackup(body) {
  if (demo.running) return { ok: false, error: DEMO_BUSY };
  demoStart(body && body.probe);
  return { ok: true };
}

function demoStop() {
  clearInterval(demo.timer);
  demo.running = false;
  demo.phase = 'angehalten';
  demoEvent('Angehalten. Mit „Weiter sichern“ geht es an dieser Stelle weiter.');
}

function demoEta() {
  if (!demo.running || demo.done < 1) return null;
  return Math.round((demo.total - demo.done) * 7); // so rechnet der echte Helfer: Dauer je Notizbuch
}

const DemoBackend = {
  async status() {
    return {
      local: false, connected: demo.connected, running: demo.running, phase: demo.phase, done: demo.done,
      total: demo.total, events: demo.events, error: demo.error, result: demo.result, target: demo.target,
      eta: demoEta(), last: demo.last,
    };
  },
  async post(path, body) {
    const routes = {
      '/api/connect': () => { setTimeout(() => { demo.connected = true; }, 900); return { ok: true }; },
      '/api/backup': () => demoBackup(body),
      '/api/stop': () => { demoStop(); return { ok: true }; },
      '/api/skip': () => { demoSkip(); return { ok: true }; },
      '/api/target': () => { demo.target = (body && body.target) || demo.target; return { ok: true }; },
      '/api/report': () => ({ ok: true, path: '~/Desktop/Evernote-Sicherung-Fehlerbericht.txt' }),
    };
    const fn = routes[path];
    return fn ? fn() : { ok: true };
  },
};

let backend = LiveBackend;

/* ---------- Texte ---------- */
const OFFLINE_ERROR = {
  code: 'HELPER_OFFLINE', text: 'Der Helfer auf dem iMac antwortet nicht.', action: 'retry_poll',
  label: 'Nochmal versuchen', details: 'fetch /api/status fehlgeschlagen',
  help: ['Auf dem Schreibtisch „Evernote-Sicherung starten“ doppelklicken.', 'Dann „Nochmal versuchen“ drücken.'],
};

function plural(n, one, many) {
  return n === 1 ? '1 ' + one : n.toLocaleString('de-DE') + ' ' + many;
}

function etaText(sec) {
  if (sec === null || sec === undefined) return '';
  const min = Math.max(1, Math.round(sec / 60));
  if (min === 1) return 'Noch etwa 1 Minute.';
  if (min < 60) return 'Noch etwa ' + min + ' Minuten.';
  const h = Math.floor(min / 60);
  const m = Math.round((min % 60) / 10) * 10;
  return 'Noch etwa ' + h + ' Std.' + (m ? ' ' + m + ' Min.' : '');
}

function lastText(last) {
  if (!last || !last.saved_at) return 'noch nie';
  return new Date(last.saved_at * 1000).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

function nowText(s) {
  if (ui.offline) return 'Helfer antwortet nicht';
  if (s.running) return 'sichert …';
  if (s.phase === 'angehalten') return 'angehalten';
  if (s.error) return 'braucht Ihre Hilfe';
  return 'bereit';
}

/* ---------- Anzeige ---------- */
function renderFacts(s) {
  $('#f-conn').textContent = s.connected ? 'verbunden ✓' : 'noch nicht verbunden';
  $('#f-target').textContent = s.target === 'joplin' ? 'Joplin' : 'Apple Notizen';
  $('#f-last').textContent = lastText(s.last);
  $('#f-now').textContent = nowText(s);
}

function mainAction(s) {
  if (!s.connected) return { label: 'Mit Evernote verbinden', run: doConnect, disabled: false };
  if (s.running) return { label: 'Sichere …', run: null, disabled: true };
  if (s.phase === 'angehalten') return { label: 'Weiter sichern', run: doBackup, disabled: false };
  return { label: 'Jetzt sichern', run: doBackup, disabled: false };
}

function renderMain(s) {
  const a = mainAction(s);
  const btn = $('#main-btn');
  btn.hidden = !!currentError(s) || s.running; // eine Hauptaktion; waehrend der Sicherung nur „Anhalten“
  btn.textContent = a.label;
  btn.disabled = a.disabled;
  btn.onclick = a.run;
  $('#probe-btn').hidden = !s.connected || s.running || !!s.result || (s.last && s.last.saved_at) || s.phase === 'angehalten';
  $('#stop-btn').hidden = !s.running;
}

function renderRun(s) {
  const showRun = s.running || s.phase === 'angehalten';
  $('#run').hidden = !showRun;
  if (!showRun) return;
  const pct = s.total ? Math.round((s.done / s.total) * 100) : 2;
  $('#run-state').textContent = s.running ? 'Sichere … Notizbuch ' + s.done + ' von ' + s.total : 'Angehalten bei Notizbuch ' + s.done + ' von ' + s.total + '.';
  $('#run-eta').textContent = s.running ? etaText(s.eta) : '';
  $('#bar-fill').style.width = pct + '%';
  $('#bar').setAttribute('aria-valuenow', String(pct));
}

function renderDone(s) {
  const r = s.result;
  const finished = !s.running && s.phase === 'fertig' && r;
  $('#done').hidden = !finished || r.probe;
  $('#probe-ok').hidden = !finished || !r.probe;
  if (!finished || r.probe) return;
  const notes = (r.new || 0) + (r.changed || 0) + (r.same || 0);
  $('#done-text').textContent = 'Fertig: ' + plural(notes, 'Notiz', 'Notizen') + ' in ' + plural(r.notebooks, 'Ordner', 'Ordnern') + '.';
}

function currentError(s) {
  if (ui.offline) return OFFLINE_ERROR;
  if (ui.inlineError) return ui.inlineError;
  if (!s.error || s.error.code === 'STOPPED') return null;
  return s.error;
}

function renderHelp(steps) {
  const list = $('#err-help');
  list.textContent = '';
  (steps || []).forEach((t) => {
    const li = document.createElement('li');
    li.textContent = t;
    list.appendChild(li);
  });
  list.hidden = !(steps && steps.length);
}

function renderError(s) {
  const err = currentError(s);
  $('#error').hidden = !err;
  if (!err) return;
  $('#err-text').textContent = err.text;
  $('#err-action').textContent = err.label || 'Nochmal versuchen';
  $('#err-action').hidden = err.action === 'none';
  $('#err-action').onclick = () => runAction(err.action);
  $('#err-second').hidden = !err.secondary;
  $('#err-second').textContent = err.secondary ? err.secondary.label : '';
  $('#err-second').onclick = err.secondary ? () => runAction(err.secondary.action) : null;
  $('#err-details').textContent = (err.code || '') + '\n' + (err.details || '');
  $('#report-btn').hidden = ui.offline; // ohne Helfer kann kein Protokoll geschrieben werden
  renderHelp(err.help);
}

function renderLog(s) {
  const events = s.events || [];
  $('.logwrap').hidden = !ui.started && !events.length;
  const log = $('#log');
  if (events.length < ui.shown) { log.textContent = ''; ui.shown = 0; }
  for (; ui.shown < events.length; ui.shown += 1) {
    const li = document.createElement('li');
    li.textContent = events[ui.shown];
    log.appendChild(li);
  }
  log.scrollTop = log.scrollHeight;
}

function renderConnectHelp() {
  $('#connect-help').hidden = !ui.connectHelp;
}

function render(s) {
  ui.status = s;
  renderFacts(s);
  renderMain(s);
  renderRun(s);
  renderDone(s);
  renderError(s);
  renderLog(s);
  renderConnectHelp();
  syncTargetRadios(s.target);
}

/* ---------- Aktionen ---------- */
async function doConnect() {
  ui.started = true;
  ui.inlineError = null;
  $('#main-btn').disabled = true;
  $('#main-btn').textContent = 'Verbinde …';
  const r = await backend.post('/api/connect');
  ui.connectHelp = !r.ok && !!r.browser;
  await refresh();
}

async function doConnectFinish() {
  const url = $('#connect-url').value;
  $('#connect-url').value = '';
  const r = await backend.post('/api/connect-finish', { url: url });
  ui.connectHelp = !r.ok;
  if (!r.ok && r.error) showInlineError(r.error);
  await refresh();
}

async function doBackup(probe) {
  ui.started = true;
  ui.inlineError = null;
  const r = await backend.post('/api/backup', { probe: probe === true });
  if (!r.ok && r.error) showInlineError(r.error);
  await refresh();
}

async function doSkip() {
  ui.inlineError = null;
  await backend.post('/api/skip');
  await refresh();
}

function showProgress() {
  ui.inlineError = null;
  ui.started = true;
  showView('sichern');
  render(ui.status);
  $('#run').scrollIntoView({ block: 'start' });
}

async function doStop() {
  await backend.post('/api/stop');
  await refresh();
}

async function doReport(msgSel) {
  const r = await backend.post('/api/report');
  $(msgSel).hidden = !r.ok;
  $('#reveal-btn').hidden = !r.ok || ui.mode === 'demo';
}

async function doReveal() {
  await backend.post('/api/reveal');
}

async function doOpenNotes() {
  await backend.post('/api/action', { action: 'open_notes' });
}

async function doSaveTarget() {
  const target = document.querySelector('input[name="target"]:checked').value;
  const token = $('#joplin-token').value;
  $('#joplin-token').value = '';
  await backend.post('/api/target', { target: target, token: token });
  await refresh();
}

function showInlineError(err) {
  ui.inlineError = err;
  render(ui.status);
}

function runAction(action) {
  const actions = {
    connect: doConnect,
    backup: () => doBackup(false),
    retry_poll: refresh,
    skip: doSkip,
    show_progress: showProgress,
    target: () => { showView('hilfe'); $('#opt').open = true; },
  };
  if (actions[action]) return actions[action]();
  return backend.post('/api/action', { action: action });
}

/* ---------- Ansichten ---------- */
function showView(name) {
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== 'v-' + name; });
  document.querySelectorAll('.rail-btn').forEach((b) => {
    if (b.dataset.view === name) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  $('#main').focus({ preventScroll: true });
}

function syncTargetRadios(target) {
  if (document.activeElement && document.activeElement.name === 'target') return;
  const radio = document.querySelector('input[name="target"][value="' + (target || 'notizen') + '"]');
  if (radio) radio.checked = true;
  $('#joplin-box').hidden = (target || 'notizen') !== 'joplin' && !document.querySelector('input[value="joplin"]').checked;
}

function onTargetChange() {
  $('#joplin-box').hidden = document.querySelector('input[name="target"]:checked').value !== 'joplin';
  if (!$('#joplin-box').hidden) return;
  doSaveTarget();
}

/* ---------- Abfrage ---------- */
async function refresh() {
  try {
    const s = await backend.status();
    ui.offline = false;
    render(s);
  } catch (e) {
    ui.offline = true;
    render(ui.status || { connected: false, events: [] });
  }
}

async function detectMode() {
  try {
    const s = await LiveBackend.status();
    if (s && s.local) return 'live';
  } catch (e) { /* kein Helfer -> Vorschau */ }
  return 'demo';
}

function bindEvents() {
  document.querySelectorAll('.rail-btn').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
  $('#probe-btn').addEventListener('click', () => doBackup(true));
  $('#stop-btn').addEventListener('click', doStop);
  $('#connect-finish').addEventListener('click', doConnectFinish);
  $('#connect-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') doConnectFinish(); });
  $('#report-btn').addEventListener('click', () => doReport('#report-msg'));
  $('#report-btn-2').addEventListener('click', () => doReport('#report-msg-2'));
  $('#reveal-btn').addEventListener('click', doReveal);
  $('#open-notes').addEventListener('click', doOpenNotes);
  $('#save-target').addEventListener('click', doSaveTarget);
  document.querySelectorAll('input[name="target"]').forEach((r) => r.addEventListener('change', onTargetChange));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('details[open]').forEach((d) => { d.open = false; }); });
}

async function init() {
  bindEvents();
  ui.mode = await detectMode();
  backend = ui.mode === 'live' ? LiveBackend : DemoBackend;
  $('#mode').hidden = ui.mode === 'live';
  await refresh();
  setInterval(refresh, 1000);
}

init();
