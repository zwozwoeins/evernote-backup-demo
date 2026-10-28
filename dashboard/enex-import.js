'use strict';
/* Evernote-Exportdateien (.enex) im Browser einlesen – nur zum Testen in der Vorschau.
   Nichts wird hochgeladen: DOMParser liest die Datei lokal.
   Ergebnis im Format der Joplin-Vorschau: { notebooks: [{id, name}], notes: [{id, buch, titel, datum, tags, inhalt, anhang}] } */

const ENEX_MAX_BYTES = 50 * 1024 * 1024;
const ENEX_IMAGE_MIME = /^image\/(png|jpeg|gif|webp)$/;

function enexNotebookName(fileName) {
  return fileName.replace(/\.enex$/i, '').replace(/[-_]+/g, ' ').replace(' und ', ' & ').trim() || 'Notizbuch';
}

function enexParseXml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return null;
  return doc;
}

function enexDate(raw) {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(raw || '');
  if (!m) return '';
  const d = new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
}

function enexChildText(el, tag) {
  const c = el.getElementsByTagName(tag)[0];
  return c ? c.textContent.trim() : '';
}

function enexImages(noteEl) {
  return Array.from(noteEl.getElementsByTagName('resource'))
    .map((r) => ({ mime: enexChildText(r, 'mime'), data: enexChildText(r, 'data').replace(/\s+/g, ''), name: enexChildText(r, 'file-name') }))
    .filter((r) => ENEX_IMAGE_MIME.test(r.mime) && r.data);
}

function enexTodoItem(el) {
  const todo = el.getElementsByTagName('en-todo')[0];
  return [todo.getAttribute('checked') === 'true', el.textContent.trim()];
}

function enexListItems(el) {
  return Array.from(el.children).filter((li) => li.tagName.toLowerCase() === 'li').map((li) => li.textContent.trim());
}

function enexMediaBlock(images) {
  const img = images.shift();
  if (!img) return null;
  return ['img', 'data:' + img.mime + ';base64,' + img.data, img.name || 'Bild aus Evernote'];
}

function enexBlock(el, images) {
  const tag = el.tagName.toLowerCase();
  if (el.getElementsByTagName('en-todo').length) return ['todo', enexTodoItem(el)];
  if (tag === 'en-media' || el.getElementsByTagName('en-media').length) return enexMediaBlock(images);
  if (/^h[1-6]$/.test(tag)) return ['h', el.textContent.trim()];
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

function enexContent(noteEl) {
  const raw = enexChildText(noteEl, 'content');
  const doc = enexParseXml(raw.replace(/<!DOCTYPE[^>]*>/i, ''));
  if (!doc || !doc.documentElement || doc.documentElement.tagName !== 'en-note') return [['p', '']];
  const images = enexImages(noteEl);
  const blocks = Array.from(doc.documentElement.children).map((el) => enexBlock(el, images)).filter(Boolean);
  const merged = blocks.reduce(enexMergeTodos, []);
  return merged.length ? merged : [['p', '']];
}

function enexNote(noteEl, bookId, id) {
  const images = enexImages(noteEl);
  return {
    id: id,
    buch: bookId,
    titel: enexChildText(noteEl, 'title') || 'Ohne Titel',
    datum: enexDate(enexChildText(noteEl, 'created')),
    tags: Array.from(noteEl.getElementsByTagName('tag')).map((t) => t.textContent.trim()).filter(Boolean),
    inhalt: enexContent(noteEl),
    anhang: images.length ? images[0].name || 'Anhang' : '',
  };
}

async function enexReadFile(file, index, firstId) {
  if (!/\.enex$/i.test(file.name) || file.size > ENEX_MAX_BYTES) return null;
  const doc = enexParseXml(await file.text());
  if (!doc || doc.documentElement.tagName !== 'en-export') return null;
  const bookId = 'b' + index;
  const notes = Array.from(doc.documentElement.getElementsByTagName('note')).map((n, i) => enexNote(n, bookId, firstId + i));
  if (!notes.length) return null;
  return { notebook: { id: bookId, name: enexNotebookName(file.name) }, notes: notes };
}

/* Liest alle Dateien. Gibt { ok, data } oder { ok: false, bad: Dateiname } zurück. */
async function enexReadFiles(files) {
  const data = { notebooks: [], notes: [] };
  for (let i = 0; i < files.length; i += 1) {
    const part = await enexReadFile(files[i], i + 1, data.notes.length + 1);
    if (!part) return { ok: false, bad: files[i].name };
    data.notebooks.push(part.notebook);
    data.notes = data.notes.concat(part.notes);
  }
  return { ok: data.notes.length > 0, data: data, bad: '' };
}
