'use strict';
/* „Daten zur Fehlersuche senden“: schickt die Import-Dateien und das Protokoll in Bloecken
   an die Google-Apps-Script-Web-App des Supports (Adresse in config.js). Nur nach Zustimmung. */

const DEBUG_CHUNK = 5 * 1024 * 1024; // 5 MB je Block (als base64 etwa 6,7 MB)
const DEBUG_MAX = 200 * 1024 * 1024; // so viel nimmt das Script pro Sendung an

const DEBUG_ERRORS = {
  NET: { text: 'Die Verbindung zum Support ist abgebrochen.', fix: 'Bitte prüfen Sie die Internetverbindung und drücken Sie „Erneut versuchen“.' },
  TOO_BIG: { text: 'Die Daten sind zu groß (mehr als 200 MB).', fix: 'Bitte laden Sie nur die Datei, bei der der Fehler auftritt, und senden Sie dann noch einmal.' },
  KEY: { text: 'Der Support hat die Sendung abgelehnt (Schlüssel passt nicht).', fix: 'Bitte geben Sie dem Support Bescheid. Er prüft die Einrichtung.' },
  QUOTA: { text: 'Heute wurden schon sehr viele Sendungen angenommen.', fix: 'Bitte morgen noch einmal senden oder dem Support Bescheid geben.' },
  SETUP: { text: 'Das Senden ist beim Support noch nicht fertig eingerichtet.', fix: 'Bitte geben Sie dem Support Bescheid.' },
  SERVER: { text: 'Beim Support ist ein Fehler aufgetreten.', fix: 'Bitte in ein paar Minuten „Erneut versuchen“ drücken.' },
};

function debugConfigured() {
  return typeof SUPPORT_UPLOAD_URL === 'string' && /^https:\/\/script\.google\.com\//.test(SUPPORT_UPLOAD_URL);
}

function debugTotal(files) {
  return files.reduce((n, f) => n + f.size, 0);
}

function debugFail(code) {
  const e = new Error(code);
  e.code = DEBUG_ERRORS[code] ? code : 'SERVER';
  return e;
}

function debugBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(debugFail('NET'));
    r.readAsDataURL(blob);
  });
}

/* Ein Aufruf der Web-App. text/plain vermeidet die CORS-Vorabfrage. */
async function debugPost(body) {
  let res;
  try {
    res = await fetch(SUPPORT_UPLOAD_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ key: SUPPORT_UPLOAD_KEY }, body)) });
  } catch (e) { throw debugFail('NET'); }
  let data = null;
  try { data = await res.json(); } catch (e) { throw debugFail('SERVER'); }
  if (!data.ok) throw debugFail(data.code);
  return data;
}

function debugParts(file) {
  return Math.max(1, Math.ceil(file.size / DEBUG_CHUNK));
}

/* Sendet alle Dateien. onProgress(gesendeteBytes, gesamtBytes). Gibt den Ordnernamen zurueck. */
async function debugSendReal(files, onProgress) {
  const total = debugTotal(files);
  if (total > DEBUG_MAX) throw debugFail('TOO_BIG');
  const start = await debugPost({ action: 'start', total: total, files: files.map((f) => ({ name: f.name, size: f.size, parts: debugParts(f) })) });
  let sent = 0;
  for (const f of files) {
    const parts = debugParts(f);
    for (let i = 0; i < parts; i += 1) {
      const piece = f.slice(i * DEBUG_CHUNK, (i + 1) * DEBUG_CHUNK);
      await debugPost({ action: 'chunk', session: start.session, name: f.name, index: i, parts: parts, data: await debugBase64(piece) });
      sent += piece.size;
      onProgress(sent, total);
    }
  }
  const done = await debugPost({ action: 'finish', session: start.session });
  return done.folder || '';
}

/* Vorschau mit Beispieldaten: gleicher Ablauf, aber nichts verlaesst den Browser. */
async function debugSendDemo(files, onProgress) {
  const total = debugTotal(files);
  const steps = 20;
  for (let i = 1; i <= steps; i += 1) {
    await new Promise((r) => setTimeout(r, 120));
    onProgress(Math.round((total * i) / steps), total);
  }
  return 'Vorschau';
}

/* Protokoll als TXT und JSON, damit der Support beides hat. */
function debugLogFiles(logText, reports) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const txt = new File([logText.join('\n') + '\n'], 'protokoll-' + stamp + '.txt', { type: 'text/plain' });
  const clean = reports.map((r) => Object.assign({}, r, { tags: Object.keys(r.tags || {}) }));
  const json = new File([JSON.stringify({ app: 'Notiz-Converter', created: new Date().toISOString(), userAgent: navigator.userAgent, reports: clean }, null, 2)], 'protokoll-' + stamp + '.json', { type: 'application/json' });
  return [txt, json];
}
