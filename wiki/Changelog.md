# Changelog

## v5.2 – 28.10.2026
- Joplin-Vorschau: Liste **Geladene Dateien** (Name, Notizbuch, Notizen, Anhänge, Größe, Ladezeit) mit **Entfernen** je Datei
- Weitere Dateien kommen dazu statt zu ersetzen; doppelte Dateien und Notizen werden übersprungen („X doppelte Notizen übersprungen“), ein neuerer Stand desselben Notizbuchs ersetzt den alten
- **Alles leeren** mit kurzer Rückfrage, ohne die Seite neu zu laden
- Verbindungsquittung mit Konto (Name, E-Mail) auch bei Google und Apple; nur noch eine grüne Erfolgsmeldung
- Logik dafür im Kern `notiz-core.js` (ohne DOM): `noteKey`, `mergeFiles`, `removeFile`, `libraryData`
- Geprüft in Chrome (headless): 28 Dateien in zwei Stapeln, 510 Notizen, 504 Anhänge, Doppeltes übersprungen, 360 px ohne Querscrollen

## v5.1 – 28.10.2026 (Live-Test mit echtem Evernote-Konto)
- Markdown: Leerzeile nach Absätzen, Tabellen und Listen – die Zeile nach einer Tabelle landet nicht mehr in der Tabelle
- Links bleiben erhalten: `<a href>` wird zu `[Text](Adresse)`
- Nummerierte Listen bleiben nummeriert (`1.`, `2.` …)
- Neu: Zitate (`>`), Trennlinien (`---`) und Code im Text (`` `x` ``)
- Geprüft: 510 Notizen, 504 Anhänge mit der Kommandozeile umgewandelt und in Joplin importiert

## v5 – 28.10.2026
- Name **Notiz-Converter**; alle Spielereien entfernt (Hubschrauber, Paletten, Easter Eggs, UFO, Jet, Flugzeugträger, Wellen)
- Schlichter Fortschrittsbalken mit `role=progressbar`, Text „x von y Notizen – z %“, Fertig-Meldungen mit ✓
- Dark Mode auch auf der Startseite
- **Joplin** ist vorausgewähltes Ziel; Apple Notizen wählbar; OneNote „kommt später“
- Neue Beispieldaten (92 Notizen, 79 Anhänge, 30 MB), Zeichentest, Lasttest (1.000 Notizen, 88 MB)
- Protokoll: Laufzeiten (Einlesen, Export, Notizen/s) und bereinigte Namen
- Benannte HTML-Entities (`&nbsp;` …) werden jetzt gelesen
- Tabellen in der Joplin-Vorschau
- Debug-Upload mit Zustimmung (Google Apps Script)
- Gemeinsamer Kern `notiz-core.js` und CLI-Gerüst mit Exit-Codes
- Fernhilfe: Sicherheitshinweis (ID/Passwort nur bei eigenem Anruf, kein dauerhafter Zugriff)
- Knopf heißt jetzt „Datei laden (.enex)“

## v4
- Dark Mode, Hubschrauber als Fortschritt (in v5 entfernt)

## v3
- Reiter Datenverbindung / Joplin-Vorschau / Export / Hilfe, Import-Protokoll, Anhänge-Tabelle
