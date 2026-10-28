'use strict';
/* NotizSchrabSchrab – Dashboard.
   Echt: spricht mit dem Helfer auf dem iMac (/api/...).
   Vorschau: wenn kein Helfer da ist (z. B. GitHub Pages), simuliert DemoBackend dieselben Antworten.
   Regeln: eine Funktion = eine Aufgabe, flach (async/await, fruehe Returns). */

const $ = (sel) => document.querySelector(sel);
const ui = { mode: 'live', offline: false, shown: 0, connectHelp: false, status: null, inlineError: null, started: false, imported: null };
const JOPLIN_URL = '../joplin-vorschau/';

/* ---------- Helfer-Verbindung (echt) ---------- */
function readToken() {
  const fromUrl = new URLSearchParams(location.search).get('t');
  if (!fromUrl) return sessionStorage.getItem('helfer-t') || '';
  sessionStorage.setItem('helfer-t', fromUrl);
  history.replaceState(null, '', location.pathname); // Token nicht in der Adresszeile stehen lassen
  return fromUrl;
}

const TOKEN = readToken();

const LiveBackend = {
  async status() {
    const r = await fetch('/api/status', { cache: 'no-store', headers: { 'X-Helfer': TOKEN } });
    if (!r.ok) throw new Error('status ' + r.status);
    return r.json();
  },
  async post(path, body) {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'X-Helfer': TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    return r.json();
  },
};

/* ---------- Vorschau (simuliert) ---------- */
const NAMES = ['Büro', 'Rezepte', 'Garten', 'Reisen', 'Steuer', 'Auto', 'Gesundheit', 'Fotos', 'Haus', 'Briefe'];
const DEMO_TOTAL = 1000;
const DEMO_BROKEN = 734;
const DEMO_BUSY = { code: 'BUSY', text: 'Es läuft gerade ein Export.', action: 'show_progress', label: 'Fortschritt ansehen', help: [], details: '' };
const DEMO_BROKEN_HELP = ['„Erneut versuchen“ drücken.', 'Klappt es wieder nicht: „Überspringen“ drücken – alles andere bleibt gesichert.', 'Protokoll an den Support schicken („Hoppla – Protokoll sichern“).'];
const demo = {
  connected: false, running: false, phase: '', done: 0, total: 0, events: [], error: null,
  result: null, target: 'notizen', timer: null, limit: DEMO_TOTAL, failed: [], started: 0, last: {},
  source: null, probe: false,
};

function demoTime() {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' ';
}

function demoEvent(text) {
  demo.events = demo.events.concat(demoTime() + text).slice(-300);
}

function demoNotebookName(n) {
  if (demo.source) return demo.source.notebooks[n - 1].name;
  return NAMES[n % NAMES.length] + ' ' + n;
}

function demoNotesIn(n) {
  if (demo.source) return demo.source.notebooks[n - 1].count;
  return (n * 7) % 4;
}

function demoNotesUpTo(limit) {
  return demo.source.notebooks.slice(0, limit).reduce((sum, b) => sum + b.count, 0);
}

const DEMO_FAKE_NOTES = 15242;

function demoIcloudError() {
  return {
    code: 'ICLOUD_FULL', text: 'Der iCloud-Speicher ist voll. Der Export ist bei Notizbuch ' + (demo.done + 1) + ' angehalten.',
    action: 'backup', label: 'Erneut versuchen', details: 'Notes: storage full (Vorschau)',
    help: ['In den Systemeinstellungen unter „Apple-ID → iCloud“ Platz freimachen.', 'Dann „Erneut versuchen“ drücken. Es geht an derselben Stelle weiter.'],
  };
}

function demoFailStop() {
  clearInterval(demo.timer);
  demo.running = false;
  demo.phase = 'angehalten';
  demo.failAt = 0;
  demo.error = demoIcloudError();
  demoEvent(demo.error.text);
}

function demoFailAt() {
  if (new URLSearchParams(location.search).get('demo') !== 'exportfehler') return 0;
  return Math.max(1, Math.ceil(demo.limit * 0.4));
}

function demoNotesDone() {
  if (demo.source) return demoNotesUpTo(demo.done);
  return Math.round((demo.done / DEMO_TOTAL) * DEMO_FAKE_NOTES);
}

function demoNotesTotal() {
  if (demo.source) return demoNotesUpTo(demo.limit);
  return Math.round((demo.limit / DEMO_TOTAL) * DEMO_FAKE_NOTES);
}

function demoStepOne() {
  if (demo.failAt && demo.done + 1 === demo.failAt) return demoFailStop();
  demo.done += 1;
  const n = demo.done;
  if (n === DEMO_BROKEN && !demo.source) {
    demo.failed.push(demoNotebookName(n));
    return demoEvent('Notizbuch „' + demoNotebookName(n) + '“ konnte nicht gesichert werden.');
  }
  const k = demoNotesIn(n);
  const what = k ? (k === 1 ? '1 Notiz' : k + ' Notizen') + ' gespeichert' : 'Schon gesichert, wird übersprungen.';
  if (n % 7 === 0 || demo.limit < 10 || demo.source) demoEvent('Notizbuch „' + demoNotebookName(n) + '“ (' + n + ' von ' + demo.total + '): ' + what);
}

function demoTick() {
  const steps = demo.limit < 10 || demo.source ? 1 : 9;
  for (let i = 0; i < steps && demo.done < demo.limit && demo.running; i += 1) demoStepOne();
  if (demo.running && demo.done >= demo.limit) demoFinish();
}

function demoFinishProbe() {
  const books = Math.min(2, demo.total);
  const notes = demo.source ? demoNotesUpTo(books) : 37;
  demo.result = { probe: true, notebooks: books, new: notes, changed: 0, failed: [] };
  demoEvent('Probe fertig.');
}

function demoFinishFull() {
  const failed = demo.failed;
  const notes = demo.source ? demo.source.noteCount : 15230;
  demo.result = { probe: false, notebooks: demo.total, new: notes, changed: demo.source ? 0 : 12, failed: failed };
  demo.last = { saved_at: Date.now() / 1000 };
  if (!failed.length) return demoEvent('Fertig. Alles ist gesichert.');
  const text = '„' + failed[0] + '“ konnte nicht gesichert werden. Alles andere ist gesichert.';
  demo.error = { code: 'BROKEN_NOTEBOOK', text: text, action: 'backup', label: 'Erneut versuchen', secondary: { action: 'skip', label: 'Überspringen' }, help: DEMO_BROKEN_HELP, details: 'ParseError: no element found: line 1, column 48 (Vorschau)' };
  demoEvent(text);
}

function demoFinish() {
  clearInterval(demo.timer);
  demo.running = false;
  demo.phase = 'fertig';
  if (demo.probe) return demoFinishProbe();
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
  demoEvent(resume ? 'Es geht weiter bei Notizbuch ' + (demo.done + 1) + '.' : demoStartText());
  demo.timer = setInterval(demoTick, demo.source ? 500 : 150);
}

function demoStartText() {
  return demo.source ? 'Export aus der geladenen Datei beginnt.' : 'Verbindung zu Evernote steht.';
}

function demoReset(probe) {
  demo.done = 0;
  demo.failed = [];
  demo.total = demo.source ? demo.source.notebooks.length : DEMO_TOTAL;
  demo.probe = !!probe;
  demo.limit = probe ? Math.min(2, demo.total) : demo.total;
  demo.failAt = demoFailAt();
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
  demoEvent('Fertig. Alles ist gesichert.');
}

function demoUseSource(data) {
  const notebooks = data.notebooks.map((b) => ({ name: b.name, count: data.notes.filter((n) => n.buch === b.id).length }));
  demo.source = { notebooks: notebooks, noteCount: data.notes.length };
  demo.result = null;
  demo.error = null;
  demo.failed = [];
  demo.done = 0;
  demo.phase = '';
  demo.events = [];
  demoEvent('Datei geladen: ' + plural(notebooks.length, 'Notizbuch', 'Notizbücher') + ', ' + plural(data.notes.length, 'Notiz', 'Notizen') + '.');
}

const DEMO_LOGIN_ERROR = {
  code: 'LOGIN_FAILED', text: 'Die Anmeldung bei Evernote hat nicht geklappt.',
  fix: 'Bitte prüfen Sie E-Mail und Passwort auf der Evernote-Seite und versuchen Sie es noch einmal. Klappt es nicht, laden Sie stattdessen eine .enex-Datei.',
};

function demoConnect(body) {
  if (new URLSearchParams(location.search).get('demo') === 'anmeldefehler') return { ok: false, error: DEMO_LOGIN_ERROR };
  demo.provider = (body && body.provider) || 'app';
  setTimeout(() => { demo.connected = true; }, 900);
  return { ok: true };
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
  demoEvent('Angehalten. Mit „Weiter exportieren“ geht es an dieser Stelle weiter.');
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
      eta: demoEta(), last: demo.last, provider: demo.provider,
      notes_done: demoNotesDone(), notes_total: demoNotesTotal(),
    };
  },
  async post(path, body) {
    const routes = {
      '/api/connect': () => demoConnect(body),
      '/api/disconnect': () => { demo.connected = false; demo.provider = ''; return { ok: true }; },
      '/api/backup': () => demoBackup(body),
      '/api/stop': () => { demoStop(); return { ok: true }; },
      '/api/skip': () => { demoSkip(); return { ok: true }; },
      '/api/target': () => { demo.target = (body && body.target) || demo.target; return { ok: true }; },
      '/api/action': () => ({ ok: true }),
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
  label: 'Erneut versuchen', details: 'fetch /api/status fehlgeschlagen',
  help: ['Auf dem Schreibtisch „Evernote-Sicherung starten“ doppelklicken.', 'Dann „Erneut versuchen“ drücken.'],
};

function plural(n, one, many) {
  return n === 1 ? '1 ' + one : n.toLocaleString('de-DE') + ' ' + many;
}

function etaText(sec) {
  if (sec === null || sec === undefined) return '';
  const min = Math.max(1, Math.round(sec / 60));
  if (min === 1) return 'Noch etwa 1 Minute.';
  if (min < 60) return 'Noch etwa ' + min + ' Minuten.';
  const h = Math.round(min / 60);
  if (h === 1) return 'Noch etwa 1 Stunde.';
  return 'Noch etwa ' + h + ' Stunden.';
}

function lastText(last) {
  if (!last || !last.saved_at) return 'noch nie';
  return new Date(last.saved_at * 1000).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

function nowText(s) {
  if (ui.offline) return 'Helfer antwortet nicht';
  if (s.running) return 'exportiert …';
  if (s.phase === 'angehalten') return 'angehalten';
  if (s.error) return 'braucht Ihre Hilfe';
  return 'bereit';
}

function targetName(t) {
  return t === 'joplin' ? 'Joplin' : 'Apple Notizen';
}

function hasData(s) {
  return !!(s && s.connected) || !!ui.imported;
}

function joplinAvailable() {
  return ui.mode === 'demo'; // die Vorschau liegt nur auf GitHub Pages, nicht im Helfer
}

const PROVIDER_TEXT = { google: ' (über Google)', apple: ' (über Apple)', app: ' (mit E-Mail und Passwort)' };

function loginText(s) {
  return 'Bei Evernote angemeldet' + (PROVIDER_TEXT[s.provider] || '') + '.';
}

function sourceText(s) {
  const file = ui.imported ? 'Datei geladen: ' + plural(ui.imported.notebooks.length, 'Notizbuch', 'Notizbücher') + ', ' + plural(ui.imported.notes.length, 'Notiz', 'Notizen') + '.' : '';
  if (s.connected) return (loginText(s) + ' ' + file).trim();
  return file;
}

/* ---------- Anzeige ---------- */
function renderFacts(s) {
  $('#f-conn').textContent = ui.imported ? 'Datei geladen ✓' : (s.connected ? 'Evernote verbunden ✓' : 'noch nichts geladen');
  $('#f-target').textContent = targetName(s.target);
  $('#f-last').textContent = lastText(s.last);
  $('#f-now').textContent = nowText(s);
}

function renderSource(s) {
  const ready = hasData(s);
  $('#source-ok').hidden = !ready;
  $('#source-text').textContent = sourceText(s);
  $('#source-next').textContent = joplinAvailable() ? 'Notizen ansehen' : 'Weiter zum Export';
  $('#login-box').hidden = !!s.connected || ui.connectHelp;
  $('#logout-btn').hidden = !s.connected;
  $('#login-hint').textContent = ui.mode === 'demo' ? 'In dieser Vorschau wird die Anmeldung nur simuliert. Echt läuft sie auf der offiziellen Evernote-Seite; hier geben Sie kein Passwort ein.' : 'Die Anmeldung läuft auf der offiziellen Evernote-Seite. Hier geben Sie kein Passwort ein.';
  renderConnectError();
  $('#file-box').hidden = ui.mode !== 'demo' || !!s.running;
  $('#enex-btn').textContent = ui.imported ? 'Andere Datei laden' : 'Beispieldatei laden';
}

function renderVorschau() {
  $('#vorschau-none').hidden = joplinAvailable();
  $('#joplin-frame').hidden = !joplinAvailable();
  $('#vorschau-lead').hidden = !joplinAvailable();
  $('#vorschau-lead').textContent = ui.imported ? 'Ihre geladenen Notizen, so wie sie in Joplin aussehen. Das Import-Protokoll steht unter „Datenverbindung“.' : 'Beispieldaten zum Ansehen. Laden Sie eine Datei, dann sehen Sie hier Ihre Notizen.';
}

function exportLabel(s) {
  if (s.phase === 'angehalten') return 'Weiter exportieren';
  return 'Jetzt exportieren';
}

function renderExport(s) {
  const ready = hasData(s);
  const busy = !!s.running;
  $('#export-empty').hidden = ready;
  $('#empty-file').hidden = ui.mode !== 'demo';
  $('#export-btn').hidden = !ready || busy || !!currentError(s);
  $('#export-btn').textContent = exportLabel(s);
  $('#probe-btn').hidden = !ready || busy || !!s.result || !!(s.last && s.last.saved_at) || s.phase === 'angehalten';
  $('#stop-btn').hidden = !busy;
  $('#target-box').disabled = busy;
}

/* ---------- Hubschrauber-Fortschritt (Import und Export) ---------- */
function heliState(s) {
  if (s.phase === 'fertig') return 'done';
  if (!s.running) return 'stopped';
  return 'fly';
}

function heliPercent(s) {
  if (s.phase === 'fertig') return 100;
  if (s.notes_total) return Math.round((s.notes_done / s.notes_total) * 100);
  return s.total ? Math.round((s.done / s.total) * 100) : 0;
}

function heliLabel(s, pct) {
  if (s.notes_total) return s.notes_done.toLocaleString('de-DE') + ' von ' + s.notes_total.toLocaleString('de-DE') + ' Notizen – ' + pct + ' %';
  return 'Notizbuch ' + s.done + ' von ' + s.total + ' – ' + pct + ' %';
}

function heliPallets(track, pct) {
  track.querySelectorAll('.pallet').forEach((p, i) => p.classList.toggle('lifted', pct >= (i + 1) * 10));
}

/* Ein Baustein fuer beide Balken: Position, Paletten, Text, Zustand. */
function heliRender(ids, pct, label, state) {
  const track = $(ids.track);
  track.style.setProperty('--p', String(pct));
  track.setAttribute('aria-valuenow', String(pct));
  track.setAttribute('aria-valuetext', label);
  track.classList.toggle('done', state === 'done');
  track.classList.toggle('stopped', state === 'stopped');
  heliPallets(track, pct);
  $(ids.text).textContent = label;
  $(ids.done).hidden = state !== 'done';
}

function runStateText(s) {
  if (s.running) return 'Exportiere … Notizbuch ' + s.done + ' von ' + s.total;
  if (s.phase === 'fertig') return 'Export abgeschlossen.';
  if (currentError(s)) return 'Gestoppt bei Notizbuch ' + s.done + ' von ' + s.total + '.';
  return 'Angehalten bei Notizbuch ' + s.done + ' von ' + s.total + '.';
}

function renderRun(s) {
  const showRun = s.running || s.phase === 'angehalten' || (s.phase === 'fertig' && !!s.result);
  $('#run').hidden = !showRun;
  if (!showRun) return;
  const pct = heliPercent(s);
  heliRender({ track: '#bar', text: '#run-text', done: '#run-done' }, pct, heliLabel(s, pct), heliState(s));
  $('#run-state').textContent = runStateText(s);
  $('#run-eta').textContent = s.running ? etaText(s.eta) : '';
  $('#run-keep').hidden = !s.running;
}

function whereText(target) {
  if (target === 'joplin') return 'In Joplin finden Sie die Notizen unter „Notizbücher“.';
  return 'In Notizen finden Sie links unter iCloud den Ordner „Evernote“. Jedes Notizbuch ist dort ein eigener Ordner.';
}

function resultAction(target) {
  if (joplinAvailable()) return { label: 'Notizen in der Vorschau ansehen', run: showVorschau };
  if (target === 'notizen') return { label: 'In Notizen ansehen', run: doOpenNotes };
  return null;
}

function renderResult(target) {
  const a = resultAction(target);
  $('#result-btn').hidden = !a;
  if (!a) return;
  $('#result-btn').textContent = a.label;
  $('#result-btn').onclick = a.run;
}

function renderDone(s) {
  const r = s.result;
  const finished = !s.running && s.phase === 'fertig' && r;
  $('#done').hidden = !finished || r.probe;
  $('#probe-ok').hidden = !finished || !r.probe;
  if (!finished) return;
  const notes = (r.new || 0) + (r.changed || 0) + (r.same || 0);
  $('#probe-text').textContent = 'Probe fertig: ' + plural(r.notebooks, 'Notizbuch', 'Notizbücher') + ' in ' + targetName(s.target) + '. Bitte kurz prüfen.';
  $('#done-text').textContent = 'Fertig: ' + plural(notes, 'Notiz', 'Notizen') + ' in ' + plural(r.notebooks, 'Ordner', 'Ordnern') + ' (' + targetName(s.target) + ').';
  $('#done-where').textContent = whereText(s.target);
  renderMissing(r.att_failed || 0);
  renderResult(s.target);
}

function renderMissing(n) {
  const btn = $('#att-missing');
  btn.hidden = n < 1;
  btn.textContent = n === 1 ? '1 Anhang fehlt – ansehen' : n + ' Anhänge fehlen – ansehen';
}

function showLog() {
  ui.started = true;
  render(ui.status);
  $('.logwrap').scrollIntoView({ block: 'start' });
  $('#log').focus({ preventScroll: true });
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
  $('#err-action').textContent = err.label || 'Erneut versuchen';
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
  renderSource(s);
  renderVorschau();
  renderExport(s);
  renderRun(s);
  renderDone(s);
  renderError(s);
  renderLog(s);
  renderConnectHelp();
  syncTargetRadios(s.target);
}

/* ---------- Aktionen ---------- */
const LOGIN_FIX = 'Bitte versuchen Sie es noch einmal. Klappt es nicht, laden Sie stattdessen eine .enex-Datei aus Evernote.';

function setLoginBusy(busy) {
  document.querySelectorAll('#login-box button').forEach((b) => { b.disabled = busy; });
}

function renderConnectError() {
  const err = ui.connectError;
  $('#connect-error').hidden = !err;
  if (!err) return;
  $('#connect-error-text').textContent = err.text || 'Die Anmeldung hat nicht geklappt.';
  $('#connect-error-fix').textContent = err.fix || LOGIN_FIX;
  $('#connect-to-file').hidden = ui.mode !== 'demo';
}

async function postSafely(path, body) {
  try {
    return await backend.post(path, body);
  } catch (e) {
    return { ok: false, error: { text: 'Der Helfer auf dem iMac antwortet nicht.', fix: 'Auf dem Schreibtisch „Evernote-Sicherung starten“ doppelklicken, dann noch einmal anmelden.' } };
  }
}

async function doConnect(provider) {
  ui.inlineError = null;
  ui.connectError = null;
  ui.lastProvider = provider || 'app';
  setLoginBusy(true);
  const r = await postSafely('/api/connect', { provider: ui.lastProvider });
  setLoginBusy(false);
  ui.connectHelp = !r.ok && !!r.browser;
  if (!r.ok && !r.browser) ui.connectError = r.error || {};
  await refresh();
}

async function doLogout() {
  await postSafely('/api/disconnect');
  ui.connectError = null;
  await refresh();
}

function connectFromExport() {
  showView('daten');
  $('#login-app').focus();
}

async function doConnectFinish() {
  const url = $('#connect-url').value;
  $('#connect-url').value = '';
  const r = await backend.post('/api/connect-finish', { url: url });
  ui.connectHelp = !r.ok;
  if (!r.ok && r.error) showInlineError(r.error);
  await refresh();
}

function selectedTarget() {
  const radio = document.querySelector('input[name="target"]:checked');
  return radio ? radio.value : 'notizen';
}

async function doBackup(probe) {
  ui.started = true;
  ui.inlineError = null;
  const r = await backend.post('/api/backup', { probe: probe === true });
  if (!r.ok && r.error) showInlineError(r.error);
  await refresh();
}

const JOPLIN_KEY_MISSING = {
  code: 'JOPLIN_KEY', text: 'Für Joplin fehlt noch der Schlüssel.', action: 'target', label: 'Schlüssel eingeben',
  help: ['In Joplin: Einstellungen → Web Clipper → Schlüssel kopieren.', 'Hier einfügen und „Ziel speichern“ drücken.'], details: '',
};

function joplinKeyMissing(target) {
  return ui.mode === 'live' && target === 'joplin' && ui.status && ui.status.target !== 'joplin';
}

async function doExport(probe) {
  const target = selectedTarget();
  if (joplinKeyMissing(target)) return showInlineError(JOPLIN_KEY_MISSING);
  if (ui.status && ui.status.target !== target) await backend.post('/api/target', { target: target });
  await doBackup(probe);
}

async function doSkip() {
  ui.inlineError = null;
  await backend.post('/api/skip');
  await refresh();
}

function showProgress() {
  ui.inlineError = null;
  ui.started = true;
  showView('export');
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

function loadVorschau() {
  const frame = $('#joplin-frame');
  if (!joplinAvailable()) return;
  if (!frame.getAttribute('src')) return frame.setAttribute('src', JOPLIN_URL);
  sendImportToJoplin();
}

function showVorschau() {
  showView('vorschau');
}

function sendImportToJoplin() {
  const win = $('#joplin-frame').contentWindow;
  if (!ui.imported || !win) return;
  win.postMessage({ type: 'ebdemo-import', notebooks: ui.imported.notebooks, notes: ui.imported.notes }, location.origin);
}

function chooseEnex() {
  $('#enex-file').click();
}

const IMPORT_DONE_PAUSE = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 1400;

function applyImport(data, reports) {
  ui.imported = data;
  demoUseSource(data);
  ui.shown = 0;
  $('#enex-error').hidden = true;
  refresh();
  if (reports.some((r) => r.error)) return showView('daten'); // erst das Protokoll zeigen
  setTimeout(showVorschau, IMPORT_DONE_PAUSE); // kurz „Rohbau fertig“ zeigen, dann die Notizen
}

function showEnexError(report) {
  showView('daten');
  const err = report.error || ENEX_ERRORS.read;
  $('#enex-error-text').textContent = '„' + report.file + '“: ' + err.text;
  $('#enex-error-fix').textContent = err.fix;
  $('#enex-error').hidden = false;
  $('#enex-retry').focus();
}

/* ---------- Import-Protokoll ---------- */
function logStamp() {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function bytesText(n) {
  if (n < 1024) return n.toLocaleString('de-DE') + ' Bytes';
  if (n < 1024 * 1024) return (n / 1024).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' KB';
  return (n / 1024 / 1024).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' MB';
}

function attText(att) {
  return plural(att.pdf, 'PDF', 'PDFs') + ', ' + plural(att.bild, 'Bild', 'Bilder') + ', ' + plural(att.sonstige, 'sonstige Datei', 'sonstige Dateien');
}

function rangeText(r) {
  if (!r.oldest) return 'ohne Datum';
  const fmt = (d) => d.toLocaleDateString('de-DE');
  return fmt(r.oldest) + ' bis ' + fmt(r.newest);
}

function reportLines(r) {
  const lines = ['Datei „' + r.file + '“ (' + bytesText(r.size) + '), gelesen in ' + r.ms + ' ms.'];
  if (r.error) return lines.concat(['Fehler: ' + r.error.text + ' Lösung: ' + r.error.fix]);
  lines.push('Notizen: ' + r.notes + ', Zeitraum: ' + rangeText(r) + '.');
  lines.push('Anhänge: ' + attText(r.att) + ', zusammen ' + bytesText(r.attBytes) + '.');
  lines.push('Schlagwörter: ' + (Object.keys(r.tags).sort().join(', ') || 'keine') + '.');
  return lines.concat(r.warnings.map((w) => 'Warnung: ' + w + '.'));
}

function sumReports(reports) {
  const ok = reports.filter((r) => !r.error);
  const att = { pdf: 0, bild: 0, sonstige: 0 };
  ok.forEach((r) => { att.pdf += r.att.pdf; att.bild += r.att.bild; att.sonstige += r.att.sonstige; });
  const notes = ok.reduce((n, r) => n + r.notes, 0);
  const warnings = reports.reduce((n, r) => n + r.warnings.length, 0);
  return { files: reports.length, notes: notes, att: att, warnings: warnings, errors: reports.length - ok.length };
}

function summaryText(reports) {
  const t = sumReports(reports);
  return plural(t.files, 'Datei', 'Dateien') + ' gelesen: ' + plural(t.notes, 'Notiz', 'Notizen') + '; Anhänge: ' + attText(t.att) +
    '. Warnungen: ' + t.warnings + '. Fehler: ' + t.errors + '.';
}

function renderImportLog(reports) {
  const stamp = logStamp();
  ui.logText = [stamp + '  ' + summaryText(reports)];
  const list = $('#import-lines');
  list.textContent = '';
  reports.forEach((r) => reportLines(r).forEach((line) => {
    const li = document.createElement('li');
    li.textContent = stamp + '  ' + line;
    li.className = /^(Fehler|Warnung)/.test(line) ? 'implog-warn' : '';
    list.appendChild(li);
    ui.logText.push(li.textContent);
  }));
  $('#import-summary').textContent = summaryText(reports);
  $('#copy-msg').hidden = true;
  $('#import-log').hidden = false;
}

function copyFallback(text) {
  const area = document.createElement('textarea');
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

async function copyLog() {
  const text = (ui.logText || []).join('\n');
  try { await navigator.clipboard.writeText(text); } catch (e) { copyFallback(text); }
  $('#copy-msg').hidden = false;
}

function importLabel(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { pct: pct, text: done + ' von ' + total + ' Notizen – ' + pct + ' %' };
}

function onImportProgress(done, total) {
  const l = importLabel(done, total);
  heliRender({ track: '#imp-bar', text: '#imp-text', done: '#imp-done' }, l.pct, l.text, 'fly');
}

function finishImportHeli(r) {
  const l = importLabel(r.done || 0, r.total || 0);
  const state = r.ok ? 'done' : 'stopped';
  const text = r.ok ? l.text : 'Import gestoppt – die Datei ist fehlerhaft. Hinweise stehen unten.';
  heliRender({ track: '#imp-bar', text: '#imp-text', done: '#imp-done' }, r.ok ? 100 : l.pct, text, state);
}

function startImportHeli() {
  $('#import-run').hidden = false;
  $('#enex-error').hidden = true;
  onImportProgress(0, 0);
}

async function readEnexSafely(files) {
  try {
    return await enexReadFiles(files, onImportProgress);
  } catch (e) {
    return { ok: false, data: null, reports: [{ file: files[0].name, size: files[0].size, ms: 0, warnings: [], error: ENEX_ERRORS.read }] };
  }
}

async function onEnexChosen(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  if (!files.length) return;
  await importFiles(files);
}

async function importFiles(files) {
  ui.lastFiles = files;
  startImportHeli();
  const r = await readEnexSafely(files);
  finishImportHeli(r);
  renderImportLog(r.reports);
  if (!r.ok) return showEnexError(r.reports.find((x) => x.error) || r.reports[0]);
  applyImport(r.data, r.reports);
}

function retryImport() {
  if (ui.lastFiles && ui.lastFiles.length) return importFiles(ui.lastFiles);
  chooseEnex();
}

function nextAfterSource() {
  showView(joplinAvailable() ? 'vorschau' : 'export');
}

async function doSaveTarget() {
  const token = $('#joplin-token').value;
  $('#joplin-token').value = '';
  await backend.post('/api/target', { target: selectedTarget(), token: token });
  await refresh();
}

function showInlineError(err) {
  ui.inlineError = err;
  render(ui.status);
}

function runAction(action) {
  const actions = {
    connect: connectFromExport,
    backup: () => doBackup(false),
    retry_poll: refresh,
    skip: doSkip,
    show_progress: showProgress,
    target: () => { ui.inlineError = null; showView('export'); $('#joplin-token').focus(); },
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
  if (name === 'vorschau') loadVorschau();
  $('#main').focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function syncTargetRadios(target) {
  if (document.activeElement && document.activeElement.name === 'target') return;
  if (ui.targetTouched) return; // die Wahl des Nutzers nicht ueberschreiben
  const radio = document.querySelector('input[name="target"][value="' + (target || 'notizen') + '"]');
  if (radio) radio.checked = true;
  renderJoplinBox();
}

function renderJoplinBox() {
  $('#joplin-box').hidden = selectedTarget() !== 'joplin' || ui.mode === 'demo'; // Schluessel braucht nur der echte Helfer
}

async function onTargetChange() {
  ui.targetTouched = true;
  renderJoplinBox();
  if (selectedTarget() === 'joplin' && ui.mode === 'live') return; // erst mit Schluessel speichern
  await backend.post('/api/target', { target: selectedTarget() });
  await refresh();
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
  $('#login-app').addEventListener('click', () => doConnect('app'));
  $('#login-google').addEventListener('click', () => doConnect('google'));
  $('#login-apple').addEventListener('click', () => doConnect('apple'));
  $('#logout-btn').addEventListener('click', doLogout);
  $('#connect-retry').addEventListener('click', () => doConnect(ui.lastProvider));
  $('#connect-to-file').addEventListener('click', chooseEnex);
  $('#empty-connect').addEventListener('click', connectFromExport);
  $('#empty-file').addEventListener('click', chooseEnex);
  $('#source-next').addEventListener('click', nextAfterSource);
  $('#vorschau-next').addEventListener('click', () => showView('export'));
  $('#export-btn').addEventListener('click', () => doExport(false));
  $('#probe-btn').addEventListener('click', () => doExport(true));
  $('#stop-btn').addEventListener('click', doStop);
  $('#connect-finish').addEventListener('click', doConnectFinish);
  $('#connect-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') doConnectFinish(); });
  $('#report-btn').addEventListener('click', () => doReport('#report-msg'));
  $('#report-btn-2').addEventListener('click', () => doReport('#report-msg-2'));
  $('#reveal-btn').addEventListener('click', doReveal);
  $('#att-missing').addEventListener('click', showLog);
  $('#save-target').addEventListener('click', doSaveTarget);
  $('#joplin-frame').addEventListener('load', sendImportToJoplin);
  $('#enex-btn').addEventListener('click', chooseEnex);
  $('#enex-retry').addEventListener('click', chooseEnex);
  $('#enex-file').addEventListener('change', onEnexChosen);
  $('#copy-log').addEventListener('click', copyLog);
  $('#enex-again').addEventListener('click', retryImport);
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
