# Grenzen und Simuliertes

## Echt (läuft heute im Browser)
- Einlesen echter `.enex`-Dateien (bis 100 MB je Datei), Prüfung der MD5-Hashes, Protokoll mit Laufzeiten und bereinigten Namen
- Joplin-Vorschau mit allen Notizen und Anhängen (PDF, Bilder, Tabellen, Checklisten)
- Debug-Upload, sobald die Web-App-URL eingetragen ist

## Simuliert (nur Vorschau)
- Anmeldung bei Evernote (App, Google, Apple)
- Export nach Joplin / Apple Notizen (Ablauf, Tempo und Fehler sind gespielt; die Laufzeit im Protokoll ist als „simuliert“ markiert)
- OneNote: ausgegraut, kommt später

## Echt mit dem Helfer auf dem iMac
Export nach Apple Notizen bzw. Joplin (Data API, Port 41184, Schlüssel aus Joplin → Werkzeuge → Optionen → Web Clipper). Der Helfer liefert noch keine Notizzahlen für den Balken (dann „Notizbuch x von y“).

## Einfachster echter Weg nach Joplin heute
Joplin Desktop installieren → **Datei → Importieren → ENEX** → `.enex` wählen. Für mehrere Geräte in Joplin unter **Synchronisation** z. B. Dropbox, OneDrive, Nextcloud oder einen Ordner wählen.

## Bekannte Grenzen
- Sehr große Dateien belegen im Browser viel Speicher (siehe Lasttest-Werte im Changelog).
- `--format jex` in der CLI ist noch nicht umgesetzt.
- Joplin-Vorschau ist unter 900 px einspaltig.
