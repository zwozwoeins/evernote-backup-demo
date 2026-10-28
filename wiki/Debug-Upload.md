# Debug-Upload („Daten zur Fehlersuche senden“)

Nach dem Import steht im **Import-Protokoll** der Knopf **Daten zur Fehlersuche senden**. Ein Dialog erklärt: „Es werden Ihre Notizen mit allen Anhängen und das Protokoll an den Support gesendet. Sie dienen nur der Fehlersuche.“ Erst nach Haken bei „Ich bin einverstanden …“ ist **Senden** möglich; **Abbrechen** schließt ohne Senden. Danach Fortschrittsbalken (MB), grüner Haken oder Fehler mit Lösung und **Erneut versuchen**.

Gesendet werden die gewählten `.enex`-Dateien unverändert sowie das Protokoll als TXT und JSON.

- **Beispieldaten**: wird nur simuliert, nichts verlässt den Browser.
- **Keine Web-App-URL in `dashboard/config.js`**: der Knopf fehlt, stattdessen „Noch nicht eingerichtet“.
- **URL eingetragen**: echte Übertragung in 5-MB-Blöcken an das Google-Apps-Script (`apps-script/Code.gs`), höchstens 200 MB pro Sendung, 20 Sendungen pro Tag. Pro Sendung ein Unterordner mit Datum und Uhrzeit.

Einrichtung: `apps-script/ANLEITUNG.md`. Die Ordner-ID und ein optionaler Schlüssel stehen nur in den Script-Properties, nicht im Repo.

Hinweis: Die Web-App-URL ist öffentlich lesbar (statische Seite). Ein Schlüssel in `config.js` wäre ebenfalls öffentlich und schützt daher nicht; die Grenzen im Script begrenzen Missbrauch.
