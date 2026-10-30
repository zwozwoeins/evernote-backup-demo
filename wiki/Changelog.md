# Changelog

## v6.2 – 30.10.2026
- **Evernote-Exporter für Mac**: Doppelklick auf „Evernote-Exporter starten.command“ (erstes Mal: rechte Maustaste → Öffnen), Prüfung auf Python 3.10+ mit Hinweis auf python.org, übernimmt die Anmeldung aus dem Evernote-Programm, öffnet am Ende den Ordner im Finder
- Startskript für Linux und Mac gemeinsam (`evernote-exporter.sh`); Download-Knopf „Für Mac“ auf der Startseite

## v6.1 – 30.10.2026
- **Evernote-Exporter** für Windows und Linux zum Herunterladen (Startseite, Schritt 1): fragt den Zielordner (Enter = `~/Evernote-Export`, auch als Argument), Anmeldung auf der offiziellen Evernote-Seite, holt alle Notizbücher, schreibt je Notizbuch eine .enex-Datei, öffnet am Ende den Ordner
- Pausen von Evernote laufen mit Countdown automatisch weiter; jeder Fehler mit konkreten Schritten; Passwort und Token nie im Protokoll
- Startseite: Schritt 1 Exporter herunterladen, Schritt 2 Dateien im Notiz-Converter laden
- Geprüft: 28 Dateien / 510 Notizen aus dem Exporter laden im Converter (Mehrfachauswahl) und importieren in Joplin (28 Notizbücher, 510 Notizen)

## v6.0 – 28.10.2026
- Oberfläche aufs Minimum: **Dateien wählen → Joplin-Vorschau**. Keine Anmeldung, keine Einstellungen, kein Ziel-Auswahl (immer Joplin)
- Übernahme vom Programm **Syncline**: Syncline öffnet den Converter mit Einmal-Code im #-Teil der Adresse; der Converter holt die .enex-Dateien direkt von Syncline (nur 127.0.0.1, Code gilt einmal und 5 Minuten). Anmeldedaten erreichen den Converter nie
- Klappt das Holen nicht: Hinweis mit Weg „In Syncline ‚Ordner zeigen‘ → hier Dateien wählen“
- Startseite auf einen Knopf reduziert; Simulation, Debug-Upload und ausgegraute Knöpfe entfernt

## v5.3 – 28.10.2026
- Im Browser ausgegraut (nicht klickbar, mit Hinweis „Kommt bald – funktioniert bisher nur mit dem Mac-Helfer.“): Anmeldung über Evernote-App, Google und Apple, „Mit Evernote verbinden“ und „Jetzt sichern“ auf der Startseite, Export („Jetzt exportieren“, „Erst mit 2 Notizbüchern ausprobieren“), Joplin-Schlüssel und „Ziel speichern“, „Protokoll sichern“ in der Hilfe
- Jeder Hinweis zeigt den Weg, der schon geht: „Datei wählen (.enex)“ bzw. „Zur Joplin-Vorschau“
- Weiter echt: Datei-Import, Joplin-Vorschau, Liste der geladenen Dateien, Import-Protokoll, Daten zur Fehlersuche senden, Joplin-Downloads
- Simulation zum Testen weiter erreichbar mit `?demo=simulation` (oder `?demo=exportfehler`, `?demo=anmeldefehler`)

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
