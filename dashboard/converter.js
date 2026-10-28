'use strict';
/* Notiz-Converter: Dateien laden (von Hand oder von Syncline) -> Joplin-Vorschau. Keine Anmeldung, keine Einstellungen.
   Syncline uebergibt nur einen Einmal-Code im #-Teil der Adresse: #syncline=<port>.<code>. Eine Funktion = eine Aufgabe. */
const $ = (s) => document.querySelector(s);
const ui = { library: NotizCore.emptyLibrary(), frameReady: false };
const JOPLIN_URL = '../joplin-vorschau/';

const ERR = {
  blocked: { text: 'Der Browser lässt die Notizen nicht direkt von Syncline holen.',
    help: ['In Syncline auf „Ordner zeigen“ klicken.', 'Hier „Dateien wählen“ drücken, im Ordner „Evernote-Export“ alle Dateien markieren (⌘ + A) und „Öffnen“ klicken.'] },
  expired: { text: 'Der Link von Syncline ist abgelaufen oder wurde schon benutzt.',
    help: ['In Syncline nochmal „Im Notiz-Converter ansehen“ klicken.', 'Oder: In Syncline „Ordner zeigen“ und hier die Dateien wählen.'] },
  empty: { text: 'In den Dateien wurden keine Notizen gefunden.',
    help: ['Bitte .enex-Dateien aus Evernote oder aus dem Syncline-Ordner „Evernote-Export“ wählen.'] },
};

function show(id, on) { $(id).hidden = !on; }

function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

/* ---------- Anzeige ---------- */
function showError(err) {
  show('#s-run', false);
  show('#s-error', true);
  $('#err-text').textContent = err.text;
  $('#err-help').replaceChildren(...err.help.map((t) => Object.assign(document.createElement('li'), { textContent: t })));
  $('#err-btn').focus();
}

function showRun(title) {
  show('#s-error', false);
  show('#s-start', false);
  show('#s-run', true);
  $('#run-title').textContent = title;
  setBar(0, '');
}

function setBar(pct, text) {
  $('#bar').style.setProperty('--p', String(pct));
  $('#bar').setAttribute('aria-valuenow', String(pct));
  $('#run-text').textContent = text;
}

function onNoteProgress(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  setBar(pct, done + ' von ' + total + ' Notizen – ' + pct + ' %');
}

function showDone() {
  const data = NotizCore.libraryData(ui.library);
  show('#s-run', false);
  show('#s-start', false);
  show('#s-done', true);
  $('#done-text').textContent = '✓ ' + plural(data.notes.length, 'Notiz', 'Notizen') + ' aus ' + plural(data.notebooks.length, 'Notizbuch', 'Notizbüchern') + ' geladen.';
  showPreview();
}

/* ---------- Joplin-Vorschau ---------- */
function showPreview() {
  const frame = $('#joplin-frame');
  show('#joplin-frame', true);
  if (!frame.getAttribute('src')) return frame.setAttribute('src', JOPLIN_URL);
  sendToPreview();
}

function sendToPreview() {
  const win = $('#joplin-frame').contentWindow;
  const data = NotizCore.libraryData(ui.library);
  if (win && data.notes.length) win.postMessage(Object.assign({ type: 'ebdemo-import' }, data), location.origin);
}

/* ---------- Dateien lesen ---------- */
async function readFiles(files) {
  showRun('Notizen werden gelesen …');
  let r;
  try { r = await enexReadFiles(files, onNoteProgress); } catch (e) { r = { ok: false }; }
  if (!r.ok) return showError(ERR.empty);
  ui.library = NotizCore.mergeFiles(ui.library, r.parts, Date.now()).lib;
  showDone();
}

function pickFiles() {
  $('#enex-file').click();
}

function onPicked(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  if (files.length) readFiles(files);
}

/* ---------- Von Syncline holen (Einmal-Code) ---------- */
function readPairing() {
  const m = location.hash.match(/syncline=(\d{2,5})\.([\w-]{16,})/);
  history.replaceState(null, '', location.pathname); // Code sofort aus der Adresse entfernen
  return m ? { base: 'http://127.0.0.1:' + m[1], code: m[2] } : null;
}

async function pair(p) {
  const r = await fetch(p.base + '/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: p.code }), signal: AbortSignal.timeout(15000) });
  return r.json();
}

async function fetchFile(p, session, f) {
  const r = await fetch(p.base + '/pair/file?i=' + f.i, { headers: { 'X-Sitzung': session } });
  if (!r.ok) throw new Error('datei ' + r.status);
  return new File([await r.blob()], f.name, { type: 'application/xml' });
}

async function fetchAll(p, session, list) {
  const files = [];
  for (let k = 0; k < list.length; k += 1) {
    setBar(Math.round((k / list.length) * 100), 'Datei ' + (k + 1) + ' von ' + list.length + ' wird von Syncline geholt …');
    files.push(await fetchFile(p, session, list[k]));
  }
  return files;
}

async function loadFromSyncline(p) {
  showRun('Notizen werden von Syncline geholt …');
  let r;
  try { r = await pair(p); } catch (e) { return showError(ERR.blocked); }
  if (!r.ok) return showError(ERR.expired);
  let files;
  try { files = await fetchAll(p, r.session, r.files); } catch (e) { return showError(ERR.blocked); }
  readFiles(files);
}

function init() {
  $('#pick-btn').addEventListener('click', pickFiles);
  $('#err-btn').addEventListener('click', pickFiles);
  $('#more-btn').addEventListener('click', pickFiles);
  $('#enex-file').addEventListener('change', onPicked);
  $('#joplin-frame').addEventListener('load', sendToPreview);
  const p = readPairing();
  if (p) loadFromSyncline(p);
}

init();
