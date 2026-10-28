'use strict';
/* Notiz-Converter – Kern ohne DOM. Wird im Browser (als <script>, global NotizCore)
   und in Node (require) gleich benutzt. Nur reine Funktionen: Text rein, Daten raus. */
(function (root) {
  const md5fn = typeof module !== 'undefined' ? require('./md5.js').md5 : root.md5;

  function parseDate(raw) {
    const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(raw || '');
    if (!m) return null;
    return new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  }

  function notebookName(fileName) {
    return fileName.replace(/\.enex$/i, '').replace(/[-_]+/g, ' ').replace(' und ', ' & ').trim() || 'Notizbuch';
  }

  function attachmentKind(mime) {
    if (mime === 'application/pdf') return 'pdf';
    if (/^image\//.test(mime)) return 'bild';
    return 'sonstige';
  }

  const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
  const MAX_NAME = 120;

  /* Dateiname, der auf Windows, macOS und Linux gueltig ist. Umlaute, Emoji usw. bleiben erhalten. */
  function safeFileName(name) {
    let n = String(name || '').normalize('NFC').replace(/[\/\\:*?"<>|\u0000-\u001f\u007f]/g, '_').replace(/[. ]+$/g, '').replace(/^\.+/, '_').trim();
    if (!n) n = 'ohne-name';
    if (RESERVED.test(n)) n = '_' + n;
    const chars = Array.from(n);
    if (chars.length > MAX_NAME) {
      const dot = n.lastIndexOf('.');
      const ext = dot > 0 && n.length - dot <= 10 ? n.slice(dot) : '';
      n = Array.from(n.slice(0, n.length - ext.length)).slice(0, MAX_NAME - ext.length).join('') + ext;
    }
    return n;
  }

  /* Haengt bei doppelten Namen „ (2)“, „ (3)“ … vor die Endung. used ist ein Set (Kleinschreibung, wie bei macOS/Windows). */
  function uniqueName(name, used) {
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    let n = name;
    for (let k = 2; used.has(n.toLowerCase()); k += 1) n = base + ' (' + k + ')' + ext;
    used.add(n.toLowerCase());
    return n;
  }

  /* Benannte HTML-Entities (z. B. &nbsp; &auml; &euro;) kennt XML nicht. Evernote nutzt sie trotzdem.
     Darum vor dem Lesen in Zahlen-Entities umwandeln; &amp; &lt; &gt; &quot; &apos; bleiben. */
  const HTML_ENTITIES = {
    nbsp: 160, iexcl: 161, cent: 162, pound: 163, yen: 165, sect: 167, uml: 168, copy: 169, laquo: 171, reg: 174, deg: 176, plusmn: 177,
    sup2: 178, sup3: 179, micro: 181, para: 182, middot: 183, raquo: 187, frac12: 189, iquest: 191, Agrave: 192, Aacute: 193, Auml: 196,
    Ccedil: 199, Egrave: 200, Eacute: 201, Ntilde: 209, Ouml: 214, times: 215, Uuml: 220, szlig: 223, agrave: 224, aacute: 225, acirc: 226,
    auml: 228, ccedil: 231, egrave: 232, eacute: 233, ecirc: 234, iacute: 237, ntilde: 241, oacute: 243, ouml: 246, divide: 247, uacute: 250,
    uuml: 252, euro: 8364, ndash: 8211, mdash: 8212, lsquo: 8216, rsquo: 8217, sbquo: 8218, ldquo: 8220, rdquo: 8221, bdquo: 8222,
    bull: 8226, hellip: 8230, trade: 8482, larr: 8592, rarr: 8594, check: 10003,
  };

  function htmlEntitiesToNumeric(t) {
    return t.replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, n) => (HTML_ENTITIES[n] ? '&#' + HTML_ENTITIES[n] + ';' : m));
  }

  function decodeEntities(t) {
    return htmlEntitiesToNumeric(t).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&');
  }

  function tagText(xml, tag) {
    const m = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>').exec(xml);
    return m ? decodeEntities(m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '')).trim() : '';
  }

  function allTags(xml, tag) {
    const re = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>', 'g');
    const out = [];
    let m;
    while ((m = re.exec(xml))) out.push(m[1]);
    return out;
  }

  /* Inhalt eines Elements; mehrere CDATA-Abschnitte (Evernote teilt bei „]]>“) werden zusammengesetzt. */
  function cdata(xml, tag) {
    const m = new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>').exec(xml);
    if (!m) return '';
    if (!/<!\[CDATA\[/.test(m[1])) return decodeEntities(m[1]);
    return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  }

  /* bytesFromBase64 kommt von aussen (Browser: atob, Node: Buffer), damit der Kern nichts davon kennen muss. */
  function parseResource(xml, bytesFromBase64) {
    const b64 = tagText(xml, 'data').replace(/\s+/g, '');
    const bytes = bytesFromBase64(b64);
    return { mime: tagText(xml, 'mime') || 'application/octet-stream', fileName: tagText(xml, 'file-name'), bytes: bytes, md5: md5fn(bytes) };
  }

  /* Zerlegt eine ENEX-Datei in Notizen. Wirft bei fehlendem <en-export>. */
  function parseEnex(text, bytesFromBase64) {
    if (!/<en-export[\s>]/.test(text)) throw new Error('ENEX_ROOT');
    const notes = allTags(text, 'note');
    if (!notes.length) throw new Error('ENEX_EMPTY');
    return notes.map((n) => ({
      title: tagText(n, 'title') || 'Ohne Titel',
      created: parseDate(tagText(n, 'created')),
      updated: parseDate(tagText(n, 'updated')),
      tags: allTags(n, 'tag').map((t) => decodeEntities(t).trim()).filter(Boolean),
      enml: cdata(n, 'content'),
      resources: allTags(n, 'resource').map((r) => parseResource(r, bytesFromBase64)),
    }));
  }

  /* ---- ENML -> Markdown: jede Funktion macht genau einen Schritt, enmlToMarkdown ruft sie der Reihe nach auf. ---- */

  function stripTags(t) {
    return t.replace(/<[^>]+>/g, '');
  }

  function removeEnmlFrame(t) {
    return t.replace(/<\?xml[^>]*>|<!DOCTYPE[^>]*>/g, '').replace(/<\/?en-note[^>]*>/g, '');
  }

  function mediaToMarkdown(t, linkFor) {
    return t.replace(/<en-media[^>]*hash="([0-9a-f]+)"[^>]*\/?>(<\/en-media>)?/g, (_, h) => '\n\n' + linkFor(h) + '\n\n');
  }

  function todosToMarkdown(t) {
    return t.replace(/<en-todo[^>]*checked="true"[^>]*\/?>(<\/en-todo>)?/g, '- [x] ').replace(/<en-todo[^>]*\/?>(<\/en-todo>)?/g, '- [ ] ');
  }

  /* Leerzeichen und Klammern in der Adresse wuerden den Markdown-Link zerbrechen. */
  function safeUrl(url) {
    return url.trim().replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
  }

  function linkMarkdown(url, text) {
    const label = stripTags(text).trim().replace(/([\[\]])/g, '\\$1');
    return label ? '[' + label + '](' + safeUrl(url) + ')' : '<' + safeUrl(url) + '>';
  }

  /* Muss vor dem Entfernen der Tags laufen, sonst geht die Adresse verloren. */
  function linksToMarkdown(t) {
    return t.replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (_, url, text) => linkMarkdown(url, text));
  }

  function inlineToMarkdown(t) {
    return t.replace(/<(b|strong)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g, '**$2**').replace(/<(i|em)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g, '*$2*')
      .replace(/<code(?:\s[^>]*)?>([\s\S]*?)<\/code>/g, (_, c) => '`' + stripTags(c) + '`');
  }

  function headingsToMarkdown(t) {
    return t.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g, (_, l, x) => '\n\n' + '#'.repeat(+l) + ' ' + stripTags(x).trim() + '\n\n');
  }

  function tableMarkdown(tb) {
    const rows = allTags(tb, 'tr').map((r) => (r.match(/<t[hd][^>]*>[\s\S]*?<\/t[hd]>/g) || []).map((c) => stripTags(c).replace(/\|/g, '\\|').trim()));
    if (!rows.length) return '';
    const line = (r) => '| ' + r.join(' | ') + ' |';
    return [line(rows[0]), line(rows[0].map(() => '---'))].concat(rows.slice(1).map(line)).join('\n');
  }

  /* Leerzeile davor und danach: sonst haengt Joplin die naechste Zeile an die Tabelle. */
  function tablesToMarkdown(t) {
    return t.replace(/<table[^>]*>([\s\S]*?)<\/table>/g, (_, tb) => '\n\n' + tableMarkdown(tb) + '\n\n');
  }

  /* Evernote packt Listenpunkte oft in <div> oder <p>; die brauchen dort keinen eigenen Absatz. */
  function listItemText(li) {
    return li.replace(/<\/?(div|p)(?:\s[^>]*)?>/g, '').replace(/<br\s*\/?>/g, ' ').trim();
  }

  function listItems(list) {
    return allTags(list, 'li').map(listItemText);
  }

  function orderedListsToMarkdown(t) {
    return t.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/g, (_, l) => '\n\n' + listItems(l).map((x, i) => (i + 1) + '. ' + x).join('\n') + '\n\n');
  }

  function bulletListsToMarkdown(t) {
    return t.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/g, (_, l) => '\n\n' + listItems(l).map((x) => '- ' + x).join('\n') + '\n\n');
  }

  function quoteMarkdown(inner) {
    const text = stripTags(blocksToLines(inner)).replace(/\n{2,}/g, '\n').trim();
    return '\n\n' + text.split('\n').map((x) => '> ' + x).join('\n') + '\n\n';
  }

  function quotesToMarkdown(t) {
    return t.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g, (_, q) => quoteMarkdown(q));
  }

  /* Leerzeilen drumherum, sonst macht Markdown aus der Zeile davor eine Ueberschrift. */
  function rulesToMarkdown(t) {
    return t.replace(/<hr[^>]*\/?>(<\/hr>)?/g, '\n\n---\n\n');
  }

  /* Absatz = Leerzeile danach; <div> und <br> = einfacher Zeilenumbruch (wie in Evernote). */
  function blocksToLines(t) {
    return t.replace(/<br\s*\/?>/g, '\n').replace(/<\/p>/g, '\n\n').replace(/<\/div>/g, '\n');
  }

  function tidyBlankLines(t) {
    return t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  /* ENML -> Markdown (einfach, wie Joplin es braucht). linkFor(hash) liefert den Pfad zum Anhang. */
  function enmlToMarkdown(enml, linkFor) {
    let t = removeEnmlFrame(enml);
    t = mediaToMarkdown(t, linkFor);
    t = todosToMarkdown(t);
    t = linksToMarkdown(t);
    t = inlineToMarkdown(t);
    t = headingsToMarkdown(t);
    t = tablesToMarkdown(t);
    t = orderedListsToMarkdown(t);
    t = bulletListsToMarkdown(t);
    t = quotesToMarkdown(t);
    t = rulesToMarkdown(t);
    t = blocksToLines(t);
    return tidyBlankLines(decodeEntities(stripTags(t)));
  }

  const api = { htmlEntitiesToNumeric, parseDate, notebookName, attachmentKind, safeFileName, uniqueName, parseEnex, enmlToMarkdown, md5: md5fn };
  if (typeof module !== 'undefined') module.exports = api;
  else root.NotizCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
