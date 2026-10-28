# Daten zur Fehlersuche empfangen – Einrichtung (ca. 5 Minuten, kostenlos)

1. **Script anlegen:** <https://script.google.com> öffnen (mit dem Google-Konto, dem der Ordner „Notiz-Converter Debug“ gehört) → **Neues Projekt**. Den Inhalt von `Code.gs` hineinkopieren und den Projektnamen auf „Notiz-Converter Debug“ setzen. Speichern.
2. **Ordner eintragen:** Links auf **Projekteinstellungen** (Zahnrad) → ganz unten **Script-Property hinzufügen**: Name `FOLDER_ID`, Wert = die ID des Ordners „Notiz-Converter Debug“ (der Teil der Ordner-Adresse nach `/folders/`). Optional zusätzlich `UPLOAD_KEY` mit einem frei gewählten Schlüssel (siehe Hinweis unten).
3. **Bereitstellen:** Oben rechts **Bereitstellen → Neue Bereitstellung** → Typ **Web-App**. „Ausführen als“: **Ich**. „Zugriff“: **Jeder**. Auf **Bereitstellen** klicken.
4. **Zugriff erlauben:** Google fragt nach den Rechten für Drive. Konto wählen → „Erweitert“ → „Zu Notiz-Converter Debug wechseln“ → **Zulassen**. (Die Warnung kommt, weil das Script nicht von Google geprüft ist. Es ist Ihr eigenes Script.)
5. **Adresse weitergeben:** Die angezeigte **Web-App-URL** (endet auf `/exec`) kopieren und dem Support geben. Er trägt sie in `dashboard/config.js` ein.

Test: Die URL im Browser öffnen. Es erscheint `{"ok":true,"app":"Notiz-Converter Debug-Upload"}`.

**Hinweise**
- Jede Sendung landet in einem eigenen Unterordner mit Datum und Uhrzeit, z. B. `2026-10-28 14-05-12`.
- Grenzen: höchstens 200 MB pro Sendung und 20 Sendungen pro Tag. Dateien über 45 MB bleiben in Teilen liegen; `info.txt` im Ordner sagt, wie man sie zusammensetzt.
- Die Web-App-URL ist nicht geheim (sie steht in der öffentlichen Seite). Wer sie kennt, könnte Dateien in den Ordner schicken – darum die Grenzen oben. Ein `UPLOAD_KEY` hilft nur, wenn er **nicht** in der öffentlichen Seite steht (z. B. nur im Helfer auf dem iMac).
- Nach einer Änderung am Code: **Bereitstellen → Bereitstellungen verwalten → Bearbeiten → Version „Neu“**, sonst läuft die alte Version weiter.
