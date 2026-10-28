#!/usr/bin/env node
/* Erzeugt eine grosse ENEX-Datei fuer Lasttests aus den Anhaengen der Beispieldateien.
   node cli/gen-large.mjs --notes 1000 --mb 90 --out beispiel-export/Lasttest-1000-Notizen.enex
   Jeder Anhang bekommt ein paar eigene Bytes am Ende (nach %%EOF bzw. dem JPEG-Ende), damit
   alle MD5-Hashes verschieden sind. Alles erfunden; keine Personendaten. */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const core = require('../dashboard/notiz-core.js');
const here = path.dirname(new URL(import.meta.url).pathname);

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : def;
}

const NOTES = Number(arg('notes', 1000));
const MB = Number(arg('mb', 90));
const OUT = arg('out', path.join(here, '..', 'beispiel-export', 'Lasttest-' + NOTES + '-Notizen.enex'));
const SRC = path.join(here, '..', 'beispiel-export');
const THEMEN = ['Bautagebuch', 'Angebot', 'Rechnung', 'Aufmaß', 'Besprechung', 'Mängelliste', 'Lieferschein', 'Abnahme', 'Stundenzettel', 'Materialliste'];
const ORTE = ['Halle Nord', 'Gewerbepark Ost', 'Schulweg 12', 'Talstraße 8', 'Lindenallee', 'Bahnhofsplatz', 'Am Feldrain 5'];

function pool() {
  const files = fs.readdirSync(SRC).filter((f) => /\.enex$/i.test(f) && !/^Lasttest/.test(f));
  const out = [];
  files.forEach((f) => core.parseEnex(fs.readFileSync(path.join(SRC, f), 'utf8'), (b) => Buffer.from(b, 'base64'))
    .forEach((n) => n.resources.forEach((r) => { if (r.bytes.length < 600 * 1024) out.push(r); })));
  return out;
}

function esc(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function stamp(i) {
  const d = new Date(Date.UTC(2018, 0, 1) + i * 2.9 * 86400000);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
}

function noteXml(i, atts) {
  const title = THEMEN[i % THEMEN.length] + ' ' + ORTE[i % ORTE.length] + ' Nr. ' + (i + 1);
  const media = atts.map((a) => '<div><en-media type="' + a.mime + '" hash="' + a.md5 + '"/></div>').join('');
  const text = '<div>Lasttest-Notiz ' + (i + 1) + ' von ' + NOTES + '. Inhalt erfunden: Mauerwerk, Beton, Gerüst, Übergabe, Größe, Maße.</div>'
    + '<ul><li>Punkt A geprüft</li><li>Punkt B offen</li></ul>';
  const enml = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">\n<en-note>' + text + media + '</en-note>';
  let x = '<note><title>' + esc(title) + '</title><content><![CDATA[' + enml + ']]></content><created>' + stamp(i) + '</created><updated>' + stamp(i) + '</updated>'
    + '<tag>lasttest</tag><tag>' + esc(THEMEN[i % THEMEN.length].toLowerCase()) + '</tag><note-attributes><author>Beispiel</author></note-attributes>';
  atts.forEach((a) => {
    x += '<resource><data encoding="base64">\n' + a.bytes.toString('base64').replace(/.{76}/g, '$&\n') + '\n</data><mime>' + a.mime + '</mime>'
      + '<resource-attributes><file-name>' + esc(a.name) + '</file-name></resource-attributes></resource>';
  });
  return x + '</note>\n';
}

function main() {
  const src = pool();
  if (!src.length) { console.error('Keine Anhänge in ' + SRC); return 2; } // nur kleine und mittlere Anhänge, damit es viele werden
  const budget = MB * 1024 * 1024;
  const fd = fs.openSync(OUT, 'w');
  let written = 0;
  let k = 0;
  let count = 0;
  const w = (s) => { const b = Buffer.from(s, 'utf8'); fs.writeSync(fd, b); written += b.length; };
  w('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">\n<en-export export-date="20261028T080000Z" application="Evernote" version="10.0">\n');
  for (let i = 0; i < NOTES; i += 1) {
    const atts = [];
    const goal = (budget * (i + 1)) / NOTES;
    let est = written;
    while (est < goal - 20000 && atts.length < 9) {
      const r = src[k % src.length];
      k += 1;
      const bytes = Buffer.concat([r.bytes, Buffer.from('\n%lasttest-' + k + '\n')]);
      const name = (r.fileName || 'anhang').replace(/(\.[^.]+)?$/, ' ' + k + '$1');
      atts.push({ bytes: bytes, mime: r.mime, name: name, md5: crypto.createHash('md5').update(bytes).digest('hex') });
      est += bytes.length * 1.37;
    }
    count += atts.length;
    w(noteXml(i, atts));
  }
  w('</en-export>\n');
  fs.closeSync(fd);
  console.log(path.basename(OUT) + ': ' + NOTES + ' Notizen, ' + count + ' Anhänge, ' + (written / 1048576).toFixed(1) + ' MB');
  return 0;
}

process.exitCode = main();
