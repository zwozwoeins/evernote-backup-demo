# Bedienung

## 1. Evernote-Exporter (Windows / Mac / Linux)
1. Zip von der Startseite laden und entpacken. Voraussetzung: Python 3.10+ (python.org). Der erste Start richtet `evernote-backup` einmalig ein.
2. Starten: Windows „Evernote-Exporter starten.cmd“ (Doppelklick), Mac „Evernote-Exporter starten.command“ (Doppelklick; erstes Mal rechte Maustaste → Öffnen → Öffnen), Linux `./evernote-exporter.sh`.
3. **Wohin sollen die Dateien gespeichert werden?** Enter = `~/Evernote-Export`, sonst Pfad eingeben. Für Skripte: Ordner als Argument (`./evernote-exporter.sh ~/Sicherung`). Der Ordner wird angelegt und auf Schreibrechte geprüft.
4. Anmeldung auf der offiziellen Evernote-Seite (E-Mail + Passwort, Google, Apple, ggf. Code). Danach Rechtsklick auf „Return to Evernote“ → „Link kopieren“ → einfügen. Windows/Mac: ist das Evernote-Programm angemeldet, wird diese Anmeldung ohne Tippen übernommen.
5. Fortschritt „123 von 500 Notizen geholt“. Pause von Evernote: „Es geht um HH:MM Uhr automatisch weiter“ mit Countdown.
6. Fertig: Anzahl Notizen/Dateien, der Ordner öffnet sich. Fehler: Satz + Schritte, Enter = nochmal versuchen, n = beenden.

## 2. Notiz-Converter
- **Dateien wählen (.enex)** – auch viele auf einmal (Strg + A im Ordner). Balken „37 von 120 Notizen – 31 %“.
- Danach: „✓ X Notizen aus Y Notizbüchern geladen“ und die **Joplin-Vorschau** (Notizbücher, Schlagwörter, Suche, Inhalt, Anhänge).
- **Weitere Dateien dazuladen**: doppelte Dateien und Notizen werden übersprungen.
- Kaputte oder leere Datei: Erklärung mit Schritten und Knopf **Dateien wählen**.

Ältere Oberfläche (v5.3): `/v5/`.
