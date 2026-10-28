# Notiz-Converter – Kommandozeile (Gerüst)

Für spätere Automatisierung (cron, sh). Nutzt denselben Kern wie das Dashboard: `dashboard/notiz-core.js` (ohne DOM, läuft im Browser und in Node ≥ 18).

```sh
node cli/notiz-converter.mjs --in <datei.enex|ordner> --out <ordner> [--format md|jex] [--log <datei>]
```

- `--in`: eine .enex-Datei oder ein Ordner mit .enex-Dateien
- `--out`: Zielordner. Je Notizbuch ein Unterordner mit einer .md-Datei je Notiz (Front Matter: title, created, updated, tags) und `_resources/` für die Anhänge.
  In Joplin: **Datei → Importieren → „MD – Markdown + Front Matter (Ordner)“**.
- `--format jex`: vorgesehen, noch nicht umgesetzt (Exit-Code 4).
- `--log`: hängt jede Zeile mit Zeitstempel an die Datei an. Bereinigte Datei- und Notiznamen stehen dort als `NAME …`, Laufzeiten als `… s, … Notizen/s`.

| Exit-Code | Bedeutung |
|---|---|
| 0 | alles gut |
| 1 | Aufruf falsch |
| 2 | Eingabe fehlt oder keine .enex-Datei |
| 3 | teilweise fehlerhaft (mindestens eine Datei nicht lesbar) |
| 4 | Format noch nicht verfügbar |
| 5 | Schreiben fehlgeschlagen (z. B. Platte voll, keine Rechte) |

Beispiel für die crontab (`crontab -e`), jeden Sonntag um 10 Uhr:

```cron
0 10 * * 0  /usr/local/bin/node "$HOME/notiz-converter/cli/notiz-converter.mjs" --in "$HOME/Evernote-Export" --out "$HOME/Notizen-Markdown" --log "$HOME/notiz-converter.log" || echo "Notiz-Converter: Exit $?" >> "$HOME/notiz-converter.log"
```

Lasttest-Datei erzeugen (lokal auch größer möglich, GitHub nimmt höchstens 100 MB je Datei):

```sh
node cli/gen-large.mjs --notes 1000 --mb 88 --out beispiel-export/Lasttest-1000-Notizen.enex
node cli/gen-large.mjs --notes 5000 --mb 400 --out /tmp/Lasttest-5000.enex   # nur lokal
```

Keine Zugangsdaten nötig; das Skript liest und schreibt nur lokale Dateien.
