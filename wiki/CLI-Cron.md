# CLI und Cron

Siehe auch `cli/README.md`.

```sh
node cli/notiz-converter.mjs --in <datei.enex|ordner> --out <ordner> [--format md|jex] [--log <datei>]
```

Ergebnis: je Notizbuch ein Ordner mit `.md`-Dateien (Front Matter) und `_resources/`. Import in Joplin über **Datei → Importieren → „MD – Markdown + Front Matter (Ordner)“**. `--format jex` ist vorgesehen, aber noch nicht umgesetzt (Exit 4).

Exit-Codes: 0 gut · 1 Aufruf falsch · 2 keine Eingabe · 3 teilweise fehlerhaft · 4 Format fehlt · 5 Schreiben fehlgeschlagen.

crontab, sonntags 10 Uhr:
```cron
0 10 * * 0  /usr/local/bin/node "$HOME/notiz-converter/cli/notiz-converter.mjs" --in "$HOME/Evernote-Export" --out "$HOME/Notizen-Markdown" --log "$HOME/notiz-converter.log"
```

Lasttest-Datei erzeugen:
```sh
node cli/gen-large.mjs --notes 1000 --mb 88 --out beispiel-export/Lasttest-1000-Notizen.enex
```
