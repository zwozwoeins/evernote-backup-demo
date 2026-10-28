# Notiz-Converter – Übersicht

Der Notiz-Converter liest Evernote-Exportdateien (`.enex`) und bereitet die Übernahme nach **Joplin** vor (empfohlen, läuft auf Mac, Windows, Linux, iPhone und Android). Apple Notizen bleibt als weiteres Ziel wählbar; OneNote kommt später.

- Live: <https://zwozwoeins.github.io/evernote-backup-demo/dashboard/>
- Startseite: <https://zwozwoeins.github.io/evernote-backup-demo/>
- Beispieldaten: <https://zwozwoeins.github.io/evernote-backup-demo/beispiel-export/>

## Seiten im Wiki
- [Anleitung](Anleitung.md) – für Endnutzer
- [Bedienung](Bedienung.md) – Reiter und Knöpfe
- [Beispieldaten und Lasttest](Beispieldaten.md)
- [Zeichentest](Zeichentest.md)
- [CLI und Cron](CLI-Cron.md)
- [Debug-Upload](Debug-Upload.md)
- [Grenzen und Simuliertes](Grenzen.md)
- [Changelog](Changelog.md)

## Aufbau
| Teil | Datei |
|---|---|
| Kern ohne DOM (Browser und Node) | `dashboard/notiz-core.js`, `dashboard/md5.js` |
| ENEX-Import im Browser | `dashboard/enex-import.js` |
| Oberfläche | `dashboard/index.html`, `dashboard.css`, `dashboard.js` |
| Joplin-Vorschau | `joplin-vorschau/` |
| Debug-Upload | `dashboard/debug-upload.js`, `dashboard/config.js`, `apps-script/Code.gs` |
| Kommandozeile | `cli/notiz-converter.mjs`, `cli/gen-large.mjs` |
