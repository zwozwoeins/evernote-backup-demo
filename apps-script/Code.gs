/**
 * Notiz-Converter – Empfang für „Daten zur Fehlersuche senden“.
 * Google Apps Script als Web-App (Ausführen als: ich, Zugriff: Jeder).
 *
 * Keine Geheimnisse in dieser Datei. Einstellungen stehen in den Script-Properties
 * (Projekteinstellungen → Script-Properties):
 *   FOLDER_ID   Pflicht. ID des Drive-Ordners, in dem die Sendungen landen.
 *   UPLOAD_KEY  Optional. Wenn gesetzt, muss jede Sendung diesen Schlüssel mitschicken.
 *
 * Ablauf einer Sendung (JSON im Body, Content-Type text/plain):
 *   {action:'start',  total, files:[{name,size,parts}]}      -> {ok, session}
 *   {action:'chunk',  session, name, index, parts, data}       -> {ok}
 *   {action:'finish', session}                                 -> {ok, folder, files}
 */

var MAX_BYTES = 200 * 1024 * 1024;   // pro Sendung
var MAX_PER_DAY = 20;                 // Sendungen pro Tag
var MAX_JOIN_BYTES = 45 * 1024 * 1024; // groessere Dateien bleiben in Teilen (Drive-Grenze je Datei im Script: 50 MB)
var ZONE = 'Europe/Berlin';

function doGet() {
  return out({ ok: true, app: 'Notiz-Converter Debug-Upload' });
}

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    checkKey(req.key);
    if (req.action === 'start') return out(start(req));
    if (req.action === 'chunk') return out(chunk(req));
    if (req.action === 'finish') return out(finish(req));
    return out({ ok: false, code: 'SERVER', text: 'Unbekannte Aktion' });
  } catch (err) {
    return out({ ok: false, code: err.code || 'SERVER', text: String(err.message || err) });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fail(code, text) {
  var e = new Error(text || code);
  e.code = code;
  throw e;
}

function props() {
  return PropertiesService.getScriptProperties();
}

function checkKey(key) {
  var want = props().getProperty('UPLOAD_KEY');
  if (want && key !== want) fail('KEY', 'Schlüssel passt nicht');
}

function rootFolder() {
  var id = props().getProperty('FOLDER_ID');
  if (!id) fail('SETUP', 'FOLDER_ID fehlt in den Script-Properties');
  return DriveApp.getFolderById(id);
}

/* Name nur aus harmlosen Zeichen, damit niemand Pfade oder Steuerzeichen einschleust. */
function safeName(name) {
  var n = String(name || 'datei').replace(/[^\wäöüÄÖÜß .,()+-]/g, '_').slice(0, 120);
  return n || 'datei';
}

function countToday() {
  var key = 'count_' + Utilities.formatDate(new Date(), ZONE, 'yyyyMMdd');
  var n = Number(props().getProperty(key) || 0) + 1;
  if (n > MAX_PER_DAY) fail('QUOTA', 'Tageslimit erreicht');
  props().setProperty(key, String(n));
}

function start(req) {
  var total = Number(req.total || 0);
  if (!(total > 0) || total > MAX_BYTES) fail('TOO_BIG', 'Sendung zu groß');
  countToday();
  var name = Utilities.formatDate(new Date(), ZONE, 'yyyy-MM-dd HH-mm-ss');
  var folder = rootFolder().createFolder(name);
  var info = { total: total, received: 0, files: (req.files || []).map(function (f) { return { name: safeName(f.name), parts: Number(f.parts || 1) }; }) };
  props().setProperty('s_' + folder.getId(), JSON.stringify(info));
  return { ok: true, session: folder.getId() };
}

function session(id) {
  var raw = props().getProperty('s_' + id);
  if (!raw) fail('SERVER', 'Sendung unbekannt oder schon abgeschlossen');
  return JSON.parse(raw);
}

function chunk(req) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var info = session(req.session);
    var bytes = Utilities.base64Decode(req.data || '');
    info.received += bytes.length;
    if (info.received > MAX_BYTES) fail('TOO_BIG', 'Sendung zu groß');
    var name = safeName(req.name);
    var parts = Number(req.parts || 1);
    var fileName = parts > 1 ? name + '.part' + ('000' + (Number(req.index) + 1)).slice(-4) : name;
    DriveApp.getFolderById(req.session).createFile(Utilities.newBlob(bytes, 'application/octet-stream', fileName));
    props().setProperty('s_' + req.session, JSON.stringify(info));
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/* Teile einer Datei wieder zusammensetzen. Klappt es nicht, bleiben die Teile liegen. */
function join(folder, f) {
  var parts = [];
  for (var i = 1; i <= f.parts; i++) {
    var it = folder.getFilesByName(f.name + '.part' + ('000' + i).slice(-4));
    if (!it.hasNext()) return false;
    parts.push(it.next());
  }
  var size = parts.reduce(function (n, p) { return n + p.getSize(); }, 0);
  if (size > MAX_JOIN_BYTES) return false;
  var all = [];
  parts.forEach(function (p) {
    var b = p.getBlob().getBytes();
    for (var k = 0; k < b.length; k++) all.push(b[k]);
  });
  folder.createFile(Utilities.newBlob(all, 'application/octet-stream', f.name));
  parts.forEach(function (p) { p.setTrashed(true); });
  return true;
}

function finish(req) {
  var info = session(req.session);
  var folder = DriveApp.getFolderById(req.session);
  var notes = [];
  info.files.forEach(function (f) {
    if (f.parts < 2) return;
    var ok = false;
    try { ok = join(folder, f); } catch (e) { ok = false; }
    if (!ok) notes.push(f.name + ': liegt in ' + f.parts + ' Teilen vor. Zusammensetzen am Mac: cat "' + f.name + '".part* > "' + f.name + '"');
  });
  folder.createFile('info.txt', 'Notiz-Converter Debug-Sendung\n' + folder.getName() + '\n' + info.files.length + ' Dateien, ' + info.received + ' Bytes\n' + notes.join('\n') + '\n');
  props().deleteProperty('s_' + req.session);
  return { ok: true, folder: folder.getName(), files: info.files.length };
}
