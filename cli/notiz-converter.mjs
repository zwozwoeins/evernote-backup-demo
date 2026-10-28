#!/usr/bin/env node
/* Notiz-Converter – Kommandozeile (Geruest fuer Automatisierung per cron oder sh).
   Nutzt denselben Kern wie das Dashboard (dashboard/notiz-core.js).

   node cli/notiz-converter.mjs --in <datei.enex|ordner> --out <ordner> [--format md|jex] [--log <datei>]

   Ergebnis bei --format md: je Notizbuch ein Ordner mit einer .md-Datei je Notiz (Front Matter)
   und einem Unterordner _resources. In Joplin: Datei → Importieren → „MD – Markdown + Front Matter (Ordner)“.

   Exit-Codes: 0 alles gut · 1 Aufruf falsch · 2 Eingabe fehlt/keine .enex · 3 teilweise fehlerhaft
               4 Format noch nicht verfuegbar · 5 Schreiben fehlgeschlagen */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const core = require('../dashboard/notiz-core.js');
const EXIT = { OK: 0, USAGE: 1, INPUT: 2, PARTIAL: 3, FORMAT: 4, WRITE: 5 };
const USAGE = 'Aufruf: notiz-converter.mjs --in <datei.enex|ordner> --out <ordner> [--format md|jex] [--log <datei>]';

function parseArgs(argv) {
  const a = { format: 'md' };
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i].replace(/^--/, '');
    if (!['in', 'out', 'format', 'log'].includes(k) || argv[i + 1] === undefined) return null;
    a[k] = argv[i + 1];
  }
  return a.in && a.out ? a : null;
}

function makeLog(file) {
  return (line) => {
    const text = new Date().toISOString() + '  ' + line;
    console.log(text);
    if (file) fs.appendFileSync(file, text + '\n');
  };
}

function enexFiles(input) {
  if (!fs.existsSync(input)) return [];
  if (fs.statSync(input).isFile()) return /\.enex$/i.test(input) ? [input] : [];
  return fs.readdirSync(input).filter((f) => /\.enex$/i.test(f)).sort().map((f) => path.join(input, f));
}

function frontMatter(n) {
  const q = (s) => JSON.stringify(s);
  const lines = ['---', 'title: ' + q(n.title)];
  if (n.created) lines.push('created: ' + n.created.toISOString());
  if (n.updated) lines.push('updated: ' + n.updated.toISOString());
  if (n.tags.length) lines.push('tags:', ...n.tags.map((t) => '  - ' + q(t)));
  return lines.concat('---', '').join('\n');
}

/* Schreibt eine Notiz als .md mit Anhaengen. Bereinigte Namen landen im Protokoll. */
function writeNote(dir, n, used, log) {
  const res = path.join(dir, '_resources');
  const links = {};
  n.resources.forEach((r) => {
    const name = core.uniqueName(core.safeFileName(r.fileName || 'anhang'), used.res);
    if (name !== (r.fileName || '')) log('NAME Anhang „' + (r.fileName || '') + '“ → „' + name + '“');
    fs.mkdirSync(res, { recursive: true });
    fs.writeFileSync(path.join(res, name), r.bytes);
    const href = '_resources/' + encodeURIComponent(name).replace(/\(/g, '%28').replace(/\)/g, '%29');
    links[r.md5] = /^image\//.test(r.mime) ? '![' + name + '](' + href + ')' : '[' + name + '](' + href + ')';
  });
  const body = core.enmlToMarkdown(n.enml, (h) => links[h] || '(Anhang fehlt: ' + h + ')');
  const file = core.uniqueName(core.safeFileName(n.title) + '.md', used.notes);
  if (file !== n.title + '.md') log('NAME Notiz „' + n.title + '“ → „' + file + '“');
  fs.writeFileSync(path.join(dir, file), frontMatter(n) + body, 'utf8');
}

function convertFile(file, out, log) {
  const t0 = Date.now();
  const notes = core.parseEnex(fs.readFileSync(file, 'utf8'), (b64) => new Uint8Array(Buffer.from(b64, 'base64')));
  const dir = path.join(out, core.safeFileName(core.notebookName(path.basename(file))));
  fs.mkdirSync(dir, { recursive: true });
  const used = { res: new Set(), notes: new Set() };
  notes.forEach((n) => writeNote(dir, n, used, log));
  const ms = Math.max(1, Date.now() - t0);
  const att = notes.reduce((s, n) => s + n.resources.length, 0);
  log('OK  ' + path.basename(file) + ': ' + notes.length + ' Notizen, ' + att + ' Anhänge → ' + dir + ' (' + (ms / 1000).toFixed(1) + ' s, ' + Math.round(notes.length / ms * 1000) + ' Notizen/s)');
  return notes.length;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) { console.error(USAGE); return EXIT.USAGE; }
  const log = makeLog(args.log);
  if (args.format === 'jex') { log('FEHLER Format jex ist noch nicht verfügbar. Bitte --format md nutzen.'); return EXIT.FORMAT; }
  if (args.format !== 'md') { console.error(USAGE); return EXIT.USAGE; }
  const files = enexFiles(args.in);
  if (!files.length) { log('FEHLER Keine .enex-Datei gefunden: ' + args.in); return EXIT.INPUT; }
  try { fs.mkdirSync(args.out, { recursive: true }); } catch (e) { log('FEHLER Ausgabeordner nicht anlegbar: ' + e.message); return EXIT.WRITE; }
  let failed = 0;
  let total = 0;
  for (const f of files) {
    try { total += convertFile(f, args.out, log); } catch (e) {
      failed += 1;
      log('FEHLER ' + path.basename(f) + ': ' + (e.code === 'ENOSPC' || e.code === 'EACCES' ? 'Schreiben fehlgeschlagen' : 'Datei nicht lesbar (' + e.message + ')'));
      if (e.code === 'ENOSPC' || e.code === 'EACCES') return EXIT.WRITE;
    }
  }
  log('FERTIG ' + total + ' Notizen aus ' + (files.length - failed) + ' von ' + files.length + ' Dateien.');
  return failed ? EXIT.PARTIAL : EXIT.OK;
}

process.exitCode = main();
