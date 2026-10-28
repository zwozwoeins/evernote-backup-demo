// Joplin-Vorschau: nur lesen. Beispieldaten oder (im Dashboard) die dort geladenen .enex-Notizen.
var zustand = { buch: "alle", tag: null, suche: "", notiz: 7 };

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
  if (!erster || erster[0] === "img") return "";
  if (erster[0] === "p" || erster[0] === "quote") return erster[1];
  if (erster[0] === "check") return erster[1].map(function (c) { return c[1]; }).join(", ");
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

function block(b) {
  if (b[0] === "h") return el("h2", "", b[1]);
  if (b[0] === "p") return el("p", "", b[1]);
  if (b[0] === "quote") return el("blockquote", "", b[1]);
  if (b[0] === "ul") return blockListe("ul", b[1]);
  if (b[0] === "ol") return blockListe("ol", b[1]);
  if (b[0] === "check") return blockCheckliste(b[1]);
  if (b[0] === "img") return blockBild(b[1], b[2]);
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
  if (n.anhang) f.appendChild(el("span", "anhang", "📎 " + n.anhang));
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

function uebernehmeImport(e) {
  if (e.origin !== location.origin || e.source !== window.parent || !gueltigerImport(e.data)) return;
  NOTIZBUECHER = e.data.notebooks;
  NOTIZEN = e.data.notes;
  zustand = { buch: "alle", tag: null, suche: "", notiz: ersteMitBild() };
  document.getElementById("search").value = "";
  zeigeImportBanner();
  allesZeigen();
}

window.addEventListener("message", uebernehmeImport);
document.getElementById("search").addEventListener("input", beiSuche);
allesZeigen();
