// Joplin-Vorschau: nur lesen. Beispieldaten oder (im Dashboard) die dort geladenen .enex-Notizen.
var zustand = { buch: "alle", tag: null, suche: "", notiz: 7 };
var anh = { modus: "notizen", filter: "alle", suche: "", sort: "name", richtung: 1 };
var SICHER_OEFFNEN = /^(application\/pdf|image\/(png|jpeg|gif|webp)|text\/plain)$/;

function el(tag, klasse, text) {
  var e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text !== undefined) e.textContent = text;
  return e;
}

function anzahlImBuch(id) {
  return NOTIZEN.filter(function (n) { return id === "alle" || n.buch === id; }).length;
}

function alleTags() {
  var set = {};
  NOTIZEN.forEach(function (n) { n.tags.forEach(function (t) { set[t] = true; }); });
  return Object.keys(set).sort();
}

function passt(n) {
  if (zustand.buch !== "alle" && n.buch !== zustand.buch) return false;
  if (zustand.tag && n.tags.indexOf(zustand.tag) < 0) return false;
  if (zustand.suche && n.titel.toLowerCase().indexOf(zustand.suche) < 0) return false;
  return true;
}

function sichtbareNotizen() {
  return NOTIZEN.filter(passt);
}

function seitenEintrag(text, zahl, aktiv, beiKlick) {
  var li = el("li");
  var b = el("button", aktiv ? "aktiv" : "");
  b.appendChild(el("span", "", text));
  if (zahl !== null) b.appendChild(el("span", "zahl", String(zahl)));
  b.addEventListener("click", beiKlick);
  li.appendChild(b);
  return li;
}

function zeigeNotizbuecher() {
  var ul = document.getElementById("notebooks");
  ul.textContent = "";
  ul.appendChild(seitenEintrag("Alle Notizen", anzahlImBuch("alle"), zustand.buch === "alle" && !zustand.tag, function () { waehleBuch("alle"); }));
  NOTIZBUECHER.forEach(function (b) {
    ul.appendChild(seitenEintrag(b.name, anzahlImBuch(b.id), zustand.buch === b.id, function () { waehleBuch(b.id); }));
  });
}

function zeigeTags() {
  var ul = document.getElementById("tags");
  ul.textContent = "";
  alleTags().forEach(function (t) {
    ul.appendChild(seitenEintrag("# " + t, null, zustand.tag === t, function () { waehleTag(t); }));
  });
}

function vorschauText(n) {
  var erster = n.inhalt[0];
  if (!erster || erster[0] === "img" || erster[0] === "file") return "";
  if (erster[0] === "p" || erster[0] === "quote") return erster[1];
  if (erster[0] === "check") return erster[1].map(function (c) { return c[1]; }).join(", ");
  if (erster[0] === "table") return (erster[1][0] || []).join(" · ");
  if (typeof erster[1] === "string") return erster[1];
  return erster[1].join(", ");
}

function listenEintrag(n) {
  var li = el("li");
  var b = el("button", n.id === zustand.notiz ? "aktiv" : "");
  b.appendChild(el("span", "n-titel", n.titel));
  b.appendChild(el("span", "n-text", vorschauText(n)));
  b.appendChild(el("span", "n-datum", n.datum));
  b.addEventListener("click", function () { waehleNotiz(n.id); });
  li.appendChild(b);
  return li;
}

function zeigeListe() {
  var ul = document.getElementById("notes");
  var liste = sichtbareNotizen();
  ul.textContent = "";
  if (!liste.length) ul.appendChild(el("li", "leer", "Keine Notizen gefunden."));
  liste.forEach(function (n) { ul.appendChild(listenEintrag(n)); });
}

function blockListe(tag, punkte) {
  var l = el(tag);
  punkte.forEach(function (p) { l.appendChild(el("li", "", p)); });
  return l;
}

function blockCheckliste(punkte) {
  var l = el("ul", "checkliste");
  punkte.forEach(function (p) {
    var li = el("li", p[0] ? "erledigt" : "");
    var box = el("input");
    box.type = "checkbox";
    box.checked = p[0];
    box.disabled = true;
    li.appendChild(box);
    li.appendChild(el("span", "", p[1]));
    l.appendChild(li);
  });
  return l;
}

function blockBild(src, alt) {
  var f = el("figure");
  var img = el("img");
  if (!/^data:image\/(png|jpeg|gif|webp);base64,/.test(src) && src.indexOf(":") >= 0) return f; // nur eingebettete Bilder oder eigene Dateien
  img.src = src;
  img.alt = alt;
  f.appendChild(img);
  return f;
}

/* ---------- Anhänge: Blob-Adressen ---------- */
function bytesAus(b64) {
  var bin = atob(b64);
  var out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function anhangUrl(a) {
  if (a.url) return a.url;
  if (a.blobUrl) return a.blobUrl;
  var typ = SICHER_OEFFNEN.test(a.mime) ? a.mime : "application/octet-stream"; // Unbekanntes nie im Browser ausführen
  a.blobUrl = URL.createObjectURL(new Blob([bytesAus(a.data)], { type: typ }));
  return a.blobUrl;
}

function darfOeffnen(a) {
  return SICHER_OEFFNEN.test(a.mime) || a.mime === "image/svg+xml" && !!a.url;
}

function groesse(n) {
  if (n < 1024) return n.toLocaleString("de-DE") + " Bytes";
  if (n < 1048576) return (n / 1024).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " KB";
  return (n / 1048576).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " MB";
}

function art(a) {
  if (a.mime === "application/pdf") return "pdf";
  if (/^image\//.test(a.mime)) return "bild";
  return "sonstige";
}

function symbol(a) {
  return { pdf: "📄", bild: "🖼️", sonstige: "📎" }[art(a)];
}

function dateiLink(a, text, laden) {
  var link = el("a", "datei-link", text);
  link.href = anhangUrl(a);
  if (laden || !darfOeffnen(a)) link.download = a.name;
  else { link.target = "_blank"; link.rel = "noopener"; }
  return link;
}

/* Wie in Joplin: PDF direkt in der Notiz, andere Dateien als Link. */
function blockDatei(index) {
  var n = aktuelleNotiz();
  var a = n && n.anhaenge ? n.anhaenge[index] : null;
  var box = el("div", "datei-block");
  if (!a) return box;
  if (art(a) === "pdf") box.appendChild(pdfRahmen(a));
  box.appendChild(dateiLink(a, symbol(a) + " " + a.name + " (" + groesse(a.size) + ")", !darfOeffnen(a)));
  return box;
}

function pdfRahmen(a) {
  var f = el("iframe", "pdf-vorschau");
  f.title = "PDF-Vorschau: " + a.name;
  f.src = anhangUrl(a);
  return f;
}

function aktuelleNotiz() {
  return NOTIZEN.filter(function (x) { return x.id === zustand.notiz; })[0];
}

/* Tabelle wie in Joplin: erste Zeile als Kopf, breite Tabellen scrollen in ihrem Kasten. */
function blockTabelle(rows) {
  var box = el("div", "tabelle-box");
  var t = el("table", "notiz-tabelle");
  rows.forEach(function (r, i) {
    var tr = el("tr", "");
    r.forEach(function (c) { tr.appendChild(el(i === 0 ? "th" : "td", "", c)); });
    t.appendChild(tr);
  });
  box.appendChild(t);
  return box;
}

function block(b) {
  if (b[0] === "h") return el("h2", "", b[1]);
  if (b[0] === "p") return el("p", "", b[1]);
  if (b[0] === "quote") return el("blockquote", "", b[1]);
  if (b[0] === "ul") return blockListe("ul", b[1]);
  if (b[0] === "ol") return blockListe("ol", b[1]);
  if (b[0] === "check") return blockCheckliste(b[1]);
  if (b[0] === "img") return blockBild(b[1], b[2]);
  if (b[0] === "file") return blockDatei(b[1]);
  if (b[0] === "table") return blockTabelle(b[1]);
  return el("p", "", "");
}

function buchName(id) {
  var b = NOTIZBUECHER.filter(function (x) { return x.id === id; })[0];
  return b ? b.name : "";
}

function kopfzeile(n) {
  var k = el("div", "note-kopf");
  k.appendChild(el("h1", "", n.titel));
  k.appendChild(el("div", "meta", buchName(n.buch) + " · Erstellt " + n.datum + " · Aus Evernote übernommen"));
  return k;
}

function fusszeile(n) {
  var f = el("div", "note-fuss");
  n.tags.forEach(function (t) { f.appendChild(el("span", "tag", t)); });
  (n.anhaenge || []).forEach(function (a) { f.appendChild(el("span", "anhang", symbol(a) + " " + a.name)); });
  if (n.anhang && !n.anhaenge) f.appendChild(el("span", "anhang", "📎 " + n.anhang));
  return f;
}

function zeigeNotiz() {
  var main = document.getElementById("note");
  var n = NOTIZEN.filter(function (x) { return x.id === zustand.notiz; })[0];
  main.textContent = "";
  if (!n) { main.appendChild(el("p", "leer", "Keine Notiz ausgewählt.")); return; }
  main.appendChild(kopfzeile(n));
  var inhalt = el("article", "note-inhalt");
  n.inhalt.forEach(function (b) { inhalt.appendChild(block(b)); });
  main.appendChild(inhalt);
  main.appendChild(fusszeile(n));
}

function ersteSichtbare() {
  var liste = sichtbareNotizen();
  return liste.length ? liste[0].id : null;
}

function allesZeigen() {
  zeigeNotizbuecher();
  zeigeTags();
  zeigeListe();
  zeigeNotiz();
}

function waehleBuch(id) {
  zustand.buch = id;
  zustand.tag = null;
  zustand.notiz = ersteSichtbare();
  allesZeigen();
}

function waehleTag(t) {
  zustand.buch = "alle";
  zustand.tag = t;
  zustand.notiz = ersteSichtbare();
  allesZeigen();
}

function zurNotizScrollen() {
  if (window.innerWidth <= 900) document.getElementById("note").scrollIntoView({ behavior: "smooth" });
}

function waehleNotiz(id) {
  zustand.notiz = id;
  zeigeListe();
  zeigeNotiz();
  zurNotizScrollen();
}

function beiSuche(e) {
  zustand.suche = e.target.value.trim().toLowerCase();
  zeigeListe();
}

function ersteMitBild() {
  var mit = NOTIZEN.filter(function (n) { return n.inhalt.some(function (b) { return b[0] === "img"; }); });
  return mit.length ? mit[0].id : (NOTIZEN.length ? NOTIZEN[0].id : null);
}

function gueltigerImport(d) {
  return d && d.type === "ebdemo-import" && Array.isArray(d.notebooks) && Array.isArray(d.notes);
}

function zeigeImportBanner() {
  var banner = document.querySelector(".banner");
  banner.textContent = "";
  banner.appendChild(el("strong", "", "Vorschau mit Ihren geladenen Dateien"));
  banner.appendChild(document.createTextNode(" – So sehen diese Notizen in Joplin aus. Nur zum Ansehen, nichts wird gespeichert."));
}

/* ---------- Notizanhänge: eine Liste über den ganzen Datensatz ---------- */
function alleAnhaenge() {
  var liste = [];
  NOTIZEN.forEach(function (n) {
    (n.anhaenge || []).forEach(function (a) { liste.push({ a: a, notiz: n }); });
  });
  return liste;
}

function passtAnhang(x) {
  if (anh.filter !== "alle" && art(x.a) !== anh.filter) return false;
  if (!anh.suche) return true;
  return (x.a.name + " " + x.notiz.titel).toLowerCase().indexOf(anh.suche) >= 0;
}

function sortWert(x) {
  if (anh.sort === "size") return x.a.size;
  if (anh.sort === "mime") return x.a.mime;
  if (anh.sort === "notiz") return x.notiz.titel.toLowerCase();
  return x.a.name.toLowerCase();
}

function vergleiche(x, y) {
  var a = sortWert(x), b = sortWert(y);
  if (a === b) return 0;
  return (a < b ? -1 : 1) * anh.richtung;
}

function mehrzahl(n, eins, viele) {
  return n + " " + (n === 1 ? eins : viele);
}

function kennzahlen(liste) {
  var z = { pdf: 0, bild: 0, sonstige: 0 }, bytes = 0;
  liste.forEach(function (x) { z[art(x.a)] += 1; bytes += x.a.size || 0; });
  return mehrzahl(liste.length, "Anhang", "Anhänge") + " · " + z.pdf + " PDF · " + mehrzahl(z.bild, "Bild", "Bilder") + " · " + z.sonstige + " Sonstige · zusammen " + groesse(bytes);
}

function zelle(text, label, klasse) {
  var td = el("td", klasse || "", text);
  if (label) td.setAttribute("data-label", label);
  return td;
}

function nameZelle(x) {
  var td = el("td");
  td.appendChild(el("span", "anh-icon", symbol(x.a)));
  td.appendChild(el("span", "anh-name", x.a.name));
  return td;
}

function notizZelle(x) {
  var td = zelle(x.notiz.titel, "Notiz");
  td.appendChild(el("span", "anh-sub", buchName(x.notiz.buch)));
  return td;
}

function aktionsZelle(x) {
  var td = el("td");
  var box = el("div", "aktionen");
  box.appendChild(dateiLink(x.a, darfOeffnen(x.a) ? "Öffnen" : "Herunterladen", false));
  var zur = el("button", "", "Zur Notiz");
  zur.addEventListener("click", function () { zurNotiz(x.notiz.id); });
  box.appendChild(zur);
  td.appendChild(box);
  return td;
}

function anhangZeile(x) {
  var tr = el("tr");
  tr.appendChild(nameZelle(x));
  tr.appendChild(zelle(x.a.mime, "Typ"));
  tr.appendChild(zelle(groesse(x.a.size || 0), "Größe"));
  tr.appendChild(notizZelle(x));
  tr.appendChild(aktionsZelle(x));
  return tr;
}

function leerText(alle) {
  if (!alle.length) return "In diesen Notizen gibt es keine Anhänge.";
  return "Keine Anhänge passen zu Filter oder Suche.";
}

function zeigeSortierung() {
  document.querySelectorAll(".anh-tabelle th[data-sort]").forEach(function (th) {
    var aktiv = th.getAttribute("data-sort") === anh.sort;
    th.setAttribute("aria-sort", aktiv ? (anh.richtung > 0 ? "ascending" : "descending") : "none");
  });
}

function zeigeFilter() {
  document.querySelectorAll(".filter button").forEach(function (b) {
    b.setAttribute("aria-pressed", String(b.getAttribute("data-filter") === anh.filter));
  });
}

function zeigeAnhaenge() {
  var alle = alleAnhaenge();
  var liste = alle.filter(passtAnhang).sort(vergleiche);
  var body = document.getElementById("anh-liste");
  body.textContent = "";
  liste.forEach(function (x) { body.appendChild(anhangZeile(x)); });
  document.getElementById("anh-zahl").textContent = kennzahlen(alle);
  document.getElementById("anh-leer").textContent = leerText(alle);
  document.getElementById("anh-leer").hidden = liste.length > 0;
  document.querySelector(".anh-tabelle").hidden = liste.length === 0;
  zeigeSortierung();
  zeigeFilter();
}

function zeigeModus() {
  var istAnh = anh.modus === "anhaenge";
  document.querySelector(".app").classList.toggle("modus-anh", istAnh);
  document.getElementById("anh").hidden = !istAnh;
  document.getElementById("modus-notizen").setAttribute("aria-pressed", String(!istAnh));
  document.getElementById("modus-anhaenge").setAttribute("aria-pressed", String(istAnh));
  document.getElementById("modus-anhaenge").textContent = "Anhänge (" + alleAnhaenge().length + ")";
  if (istAnh) zeigeAnhaenge();
}

function waehleModus(m) {
  anh.modus = m;
  zeigeModus();
}

function zurNotiz(id) {
  zustand = { buch: "alle", tag: null, suche: "", notiz: id };
  document.getElementById("search").value = "";
  waehleModus("notizen");
  allesZeigen();
  document.getElementById("note").scrollIntoView({ block: "start" });
}

function sortiere(feld) {
  anh.richtung = anh.sort === feld ? -anh.richtung : 1;
  anh.sort = feld;
  zeigeAnhaenge();
}

function filtere(f) {
  anh.filter = f;
  zeigeAnhaenge();
}

function sucheAnhang(e) {
  anh.suche = e.target.value.trim().toLowerCase();
  zeigeAnhaenge();
}

function freigebenBlobs() {
  alleAnhaenge().forEach(function (x) { if (x.a.blobUrl) URL.revokeObjectURL(x.a.blobUrl); });
}

function bindeAnhaenge() {
  document.getElementById("modus-notizen").addEventListener("click", function () { waehleModus("notizen"); });
  document.getElementById("modus-anhaenge").addEventListener("click", function () { waehleModus("anhaenge"); });
  document.getElementById("anh-suche").addEventListener("input", sucheAnhang);
  document.querySelectorAll(".anh-tabelle th button").forEach(function (b) {
    b.addEventListener("click", function () { sortiere(b.getAttribute("data-sort")); });
  });
  document.querySelectorAll(".filter button").forEach(function (b) {
    b.addEventListener("click", function () { filtere(b.getAttribute("data-filter")); });
  });
}

function uebernehmeImport(e) {
  if (e.origin !== location.origin || e.source !== window.parent || !gueltigerImport(e.data)) return;
  freigebenBlobs();
  NOTIZBUECHER = e.data.notebooks;
  NOTIZEN = e.data.notes;
  zustand = { buch: "alle", tag: null, suche: "", notiz: ersteMitBild() };
  document.getElementById("search").value = "";
  zeigeImportBanner();
  allesZeigen();
  zeigeModus();
}

window.addEventListener("message", uebernehmeImport);
document.getElementById("search").addEventListener("input", beiSuche);
bindeAnhaenge();
allesZeigen();
zeigeModus();
