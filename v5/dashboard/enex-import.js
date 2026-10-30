'use strict';
/* Evernote-Exportdateien (.enex) im Browser einlesen – nur zum Testen in der Vorschau.
   Nichts wird hochgeladen: DOMParser liest die Datei lokal.
   Ergebnis im Format der Joplin-Vorschau: { notebooks: [{id, name}], notes: [{id, buch, titel, datum, tags, inhalt, anhaenge}] }
   Dazu ein Protokoll je Datei (Zahlen, Warnungen, Fehler mit Loesung). */

const ENEX_MAX_BYTES = 100 * 1024 * 1024; // GitHub-Grenze je Datei; groessere Dateien besser mit der Kommandozeile
const ENEX_IMAGE_MIME = /^image\/(png|jpeg|gif|webp)$/;

const ENEX_ERRORS = {
  type: { text: 'Keine .enex-Datei.', fix: 'Bitte in Evernote ein Notizbuch exportieren (Format .enex) und diese Datei wählen.' },
  size: { text: 'Die Datei ist größer als 100 MB.', fix: 'Bitte das Notizbuch in Evernote in kleinere Teile aufteilen und einzeln exportieren.' },
  xml: { text: 'Die Datei ist beschädigt oder unvollständig.', fix: 'Bitte in Evernote noch einmal exportieren und die neue Datei wählen.' },
  root: { text: 'Die Datei ist keine Evernote-Exportdatei.', fix: 'Bitte eine Datei wählen, die Evernote beim Export erstellt hat.' },
  empty: { text: 'Die Datei enthält keine Notizen.', fix: 'Bitte prüfen, ob das Notizbuch in Evernote Notizen hat, und erneut exportieren.' },
  read: { text: 'Die Datei ließ sich nicht lesen.', fix: 'Bitte die Datei noch einmal herunterladen oder neu exportieren.' },
};

/* ---------- kleine Helfer ---------- */
const enexNotebookName = NotizCore.notebookName; // gemeinsamer Kern (auch fuer die Kommandozeile)

function enexParseXml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return null;
  return doc;
}

const enexDateObj = NotizCore.parseDate; // gemeinsamer Kern (auch fuer die Kommandozeile)

function enexDateText(d) {
  if (!d) return '';
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
}

function enexChildText(el, tag) {
  const c = el.getElementsByTagName(tag)[0];
  return c ? c.textContent.trim() : '';
}

function enexBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

const enexKind = NotizCore.attachmentKind; // gemeinsamer Kern (auch fuer die Kommandozeile)

/* ---------- Anhaenge ---------- */
function enexResource(r, i) {
  const data = enexChildText(r, 'data').replace(/\s+/g, '');
  const mime = enexChildText(r, 'mime') || 'application/octet-stream';
  let bytes = null;
  try { bytes = enexBytes(data); } catch (e) { bytes = null; }
  return {
    name: enexChildText(r, 'file-name') || 'Anhang ' + (i + 1),
    mime: mime, kind: enexKind(mime), size: bytes ? bytes.length : 0, data: data, md5: bytes ? md5(bytes) : '',
  };
}

function enexResources(noteEl) {
  return Array.from(noteEl.getElementsByTagName('resource')).map(enexResource).filter((r) => r.data);
}

/* en-media verweist per Hash; passt der Hash nicht, nehmen wir den naechsten Anhang gleichen Typs. */
function enexFindResource(files, used, hash, type) {
  const byHash = files.findIndex((f, i) => !used[i] && f.md5 === hash);
  if (byHash >= 0) return { index: byHash, hashOk: true };
  const byType = files.findIndex((f, i) => !used[i] && f.mime === type);
  return { index: byType, hashOk: false };
}

/* ---------- Inhalt (ENML -> Bloecke der Vorschau) ---------- */
function enexTodoItem(el) {
  const todo = el.getElementsByTagName('en-todo')[0];
  return [todo.getAttribute('checked') === 'true', el.textContent.trim()];
}

function enexListItems(el) {
  return Array.from(el.children).filter((li) => li.tagName.toLowerCase() === 'li').map((li) => li.textContent.trim());
}

function enexMediaBlock(el, ctx) {
  const media = el.tagName.toLowerCase() === 'en-media' ? el : el.getElementsByTagName('en-media')[0];
  const hit = enexFindResource(ctx.files, ctx.used, media.getAttribute('hash') || '', media.getAttribute('type') || '');
  if (hit.index < 0) { ctx.warn('Anhang fehlt in der Datei'); return null; }
  if (!hit.hashOk) ctx.warn('Hash passt nicht zu „' + ctx.files[hit.index].name + '“');
  ctx.used[hit.index] = true;
  const f = ctx.files[hit.index];
  if (ENEX_IMAGE_MIME.test(f.mime)) return ['img', 'data:' + f.mime + ';base64,' + f.data, f.name];
  return ['file', hit.index];
}

function enexTableRows(el) {
  return Array.from(el.getElementsByTagName('tr')).map((tr) => Array.from(tr.children).map((td) => td.textContent.trim()));
}

function enexBlock(el, ctx) {
  const tag = el.tagName.toLowerCase();
  if (el.getElementsByTagName('en-todo').length) return ['todo', enexTodoItem(el)];
  if (tag === 'en-media' || el.getElementsByTagName('en-media').length) return enexMediaBlock(el, ctx);
  if (/^h[1-6]$/.test(tag)) return ['h', el.textContent.trim()];
  if (tag === 'table') return ['table', enexTableRows(el)];
  if (tag === 'ul' || tag === 'ol') return [tag, enexListItems(el)];
  if (tag === 'blockquote') return ['quote', el.textContent.trim()];
  const text = el.textContent.trim();
  return text ? ['p', text] : null;
}

function enexMergeTodos(blocks, b) {
  const last = blocks[blocks.length - 1];
  if (b[0] !== 'todo') return blocks.concat([b]);
  if (last && last[0] === 'check') { last[1].push(b[1]); return blocks; }
  return blocks.concat([['check', [b[1]]]]);
}

function enexUnusedFiles(ctx) {
  return ctx.files.map((f, i) => i).filter((i) => !ctx.used[i]).map((i) => ['file', i]);
}

function enexContent(noteEl, ctx) {
  const doc = enexParseXml(NotizCore.htmlEntitiesToNumeric(enexChildText(noteEl, 'content').replace(/<!DOCTYPE[^>]*>/i, '')));
  if (!doc || doc.documentElement.tagName !== 'en-note') { ctx.warn('Inhalt nicht lesbar'); return [['p', '']]; }
  const blocks = Array.from(doc.documentElement.children).map((el) => enexBlock(el, ctx)).filter(Boolean);
  const merged = blocks.reduce(enexMergeTodos, []).concat(enexUnusedFiles(ctx));
  if (!merged.length) { ctx.warn('leere Notiz'); return [['p', '']]; }
  return merged;
}

/* ---------- Notiz ---------- */
function enexNote(noteEl, bookId, id, report) {
  const title = enexChildText(noteEl, 'title') || 'Ohne Titel';
  const createdRaw = enexChildText(noteEl, 'created');
  const created = enexDateObj(createdRaw);
  const files = enexResources(noteEl);
  enexExportNames(files, report);
  const ctx = { files: files, used: files.map(() => false), warn: (t) => report.warnings.push('„' + title + '“: ' + t) };
  const note = {
    id: id, buch: bookId, titel: title, datum: enexDateText(created),
    tags: Array.from(noteEl.getElementsByTagName('tag')).map((t) => t.textContent.trim()).filter(Boolean),
    inhalt: enexContent(noteEl, ctx), anhaenge: files,
    schluessel: NotizCore.noteKey(enexChildText(noteEl, 'guid'), title, createdRaw),
  };
  enexCount(report, note, created);
  return note;
}

/* Name fuer die Ablage auf der Platte (Windows/macOS-tauglich, ohne Doppelte). Der Originalname bleibt fuer die Anzeige. */
function enexExportNames(files, report) {
  files.forEach((f) => {
    f.exportName = NotizCore.uniqueName(NotizCore.safeFileName(f.name), report.usedNames);
    if (f.exportName !== f.name) report.renamed.push('„' + f.name + '“ → „' + f.exportName + '“');
  });
}

/* ---------- Protokoll ---------- */
function enexNewReport(file) {
  return {
    file: file.name, size: file.size, notes: 0, att: { pdf: 0, bild: 0, sonstige: 0 }, attBytes: 0,
    tags: {}, oldest: null, newest: null, ms: 0, warnings: [], renamed: [], usedNames: new Set(), error: null,
  };
}

function enexCount(report, note, created) {
  report.notes += 1;
  note.tags.forEach((t) => { report.tags[t] = true; });
  note.anhaenge.forEach((a) => { report.att[a.kind] += 1; report.attBytes += a.size; });
  if (created && (!report.oldest || created < report.oldest)) report.oldest = created;
  if (created && (!report.newest || created > report.newest)) report.newest = created;
}

function enexFail(report, key) {
  report.error = ENEX_ERRORS[key];
  return null;
}

/* ---------- Fortschritt ---------- */
const ENEX_MIN_SECONDS = 1.5; // kleine Dateien: Balken kurz sichtbar, grosse Dateien laufen in Echtzeit

function enexPause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function enexCountNotes(text) {
  return (text.match(/<note>/g) || []).length;
}

async function enexReadText(file) {
  if (!/\.enex$/i.test(file.name) || file.size > ENEX_MAX_BYTES) return '';
  try { return await file.text(); } catch (e) { return ''; }
}

/* ---------- Datei ---------- */
function enexCheckFile(file, text, report) {
  if (!/\.enex$/i.test(file.name)) return enexFail(report, 'type') || false;
  if (file.size > ENEX_MAX_BYTES) return enexFail(report, 'size') || false;
  return true;
}

async function enexParseNotes(doc, bookId, firstId, report, progress) {
  const els = Array.from(doc.documentElement.getElementsByTagName('note'));
  const notes = [];
  for (let i = 0; i < els.length; i += 1) {
    notes.push(enexNote(els[i], bookId, firstId + i, report));
    await progress.step();
  }
  return notes;
}

async function enexReadFile(file, text, index, firstId, report, progress) {
  if (!enexCheckFile(file, text, report)) return null;
  const doc = enexParseXml(text);
  if (!doc) return enexFail(report, 'xml');
  if (doc.documentElement.tagName !== 'en-export') return enexFail(report, 'root');
  const bookId = 'b' + index;
  const notes = await enexParseNotes(doc, bookId, firstId, report, progress);
  if (!notes.length) return enexFail(report, 'empty');
  return { notebook: { id: bookId, name: enexNotebookName(file.name) }, notes: notes, file: enexFileMeta(file) };
}

/* Was die Dateiliste der Vorschau braucht (und woran eine doppelt gewaehlte Datei zu erkennen ist). */
function enexFileMeta(file) {
  return { name: file.name, size: file.size, lastModified: file.lastModified || 0 };
}

async function enexReadOne(file, text, index, firstId, progress) {
  const report = enexNewReport(file);
  const t0 = performance.now();
  const paused0 = progress.pausedMs;
  let part = null;
  try { part = await enexReadFile(file, text, index, firstId, report, progress); } catch (e) { part = enexFail(report, 'read'); }
  report.ms = Math.round(performance.now() - t0 - (progress.pausedMs - paused0));
  return { part: part, report: report };
}

/* Kleine Dateien: kurze Pause je Notiz, damit der Balken sichtbar laeuft. Grosse Dateien: keine Pause,
   nur alle 20 Notizen kurz Luft fuer die Anzeige. Die Pausen werden gezaehlt und von der Lesezeit abgezogen. */
function enexProgress(total, onProgress) {
  const pace = total && total <= 200 ? Math.min(60, (ENEX_MIN_SECONDS * 1000) / total) : 0;
  const p = { done: 0, total: total, pausedMs: 0 };
  p.step = async () => {
    p.done += 1;
    onProgress(p.done, p.total);
    if (!pace && p.done % 20) return;
    const t = performance.now();
    await enexPause(pace);
    p.pausedMs += performance.now() - t;
  };
  return p;
}

/* Liest alle Dateien. Gute Dateien werden geladen, schlechte stehen mit Loesung im Protokoll.
   onProgress(done, total) meldet den echten Fortschritt in Notizen. */
async function enexReadFiles(files, onProgress) {
  const t0 = performance.now();
  const texts = [];
  for (let i = 0; i < files.length; i += 1) texts.push(await enexReadText(files[i]));
  const total = texts.reduce((n, t) => n + enexCountNotes(t), 0);
  const progress = enexProgress(total, onProgress || (() => {}));
  onProgress && onProgress(0, total);
  const data = { notebooks: [], notes: [] };
  const parts = [];
  const reports = [];
  for (let i = 0; i < files.length; i += 1) {
    const r = await enexReadOne(files[i], texts[i], i + 1, data.notes.length + 1, progress);
    reports.push(r.report);
    if (!r.part) continue;
    r.part.ms = r.report.ms;
    parts.push(r.part);
    data.notebooks.push(r.part.notebook);
    data.notes = data.notes.concat(r.part.notes);
  }
  const ms = Math.round(performance.now() - t0 - progress.pausedMs);
  return { ok: data.notes.length > 0, data: data, parts: parts, reports: reports, total: total, done: progress.done, ms: ms };
}
