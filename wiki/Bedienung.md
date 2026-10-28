# Bedienung

Links (auf dem Handy unten) gibt es vier Reiter. Rechts daneben zeigt die Statusspalte **Daten**, **Ziel** (Standard: Joplin), **Zuletzt exportiert** und **Gerade**.

## 1. Datenverbindung
- **In der Evernote-App anmelden**, **Mit Google anmelden**, **Mit Apple anmelden** – im Browser ausgegraut („Kommt bald – funktioniert bisher nur mit dem Mac-Helfer.“) mit Knopf **Datei wählen (.enex)**; echt nur mit dem Helfer auf dem iMac.
- **Verbindungsquittung** (ein grüner Kasten, bei Passwort, Google und Apple gleich): „✓ Verbindung zu Evernote hergestellt (über Google). Angemeldet als … (E-Mail).“ Der Helfer liest Name und E-Mail aus der Ausgabe von evernote-backup („Successfully authenticated as …“).
- **Dateien laden (.enex)** – echte Datei(en) wählen, auch mehrere auf einmal. Die Dateien bleiben im Browser. Weitere Dateien kommen zu den schon geladenen dazu.
- Fortschrittsbalken: „37 von 120 Notizen – 31 %“, kurz „✓ Fertig …“, danach steht das Ergebnis nur noch im grünen Kasten.
- **Import-Protokoll** mit Summe, Laufzeit (Sekunden, Notizen/s), bereinigten Namen und Warnungen. Knöpfe: **Protokoll kopieren**, **Daten zur Fehlersuche senden**.
- Bei einer kaputten Datei: Erklärung mit Lösung, **Erneut versuchen** oder **Andere Datei wählen**.

## 2. Joplin-Vorschau
So sehen die geladenen Notizen in Joplin aus: Notizbücher, Schlagwörter, Suche, Notizliste, Inhalt mit Bildern, PDFs, Tabellen und Checklisten. Oben **Notizen** / **Anhänge (n)** mit einer Tabelle aller Anhänge. Unten **Weiter zum Export**.

**Geladene Dateien** (Kasten über der Vorschau): je Datei Name, Notizbuch, Notizen, Anhänge, Größe und Uhrzeit des Ladens, dazu **Entfernen**. Ab 6 Dateien ist die Liste zugeklappt („28 Dateien: 510 Notizen, 504 Anhänge“).

Regeln beim Dazuladen:
1. Dieselbe Datei noch einmal (gleicher Name, gleiche Größe, gleiches Datum) wird übersprungen.
2. Eine Notiz, die schon da ist (gleiche Evernote-ID, sonst gleicher Titel und gleiches Erstelldatum), wird übersprungen. Hinweis: „X doppelte Notizen übersprungen.“
3. Dasselbe Notizbuch aus einer neueren Datei ersetzt den alten Stand („Neuer Stand ersetzt: …“).

**Alles leeren** fragt einmal nach („Ja, alles leeren“ / „Abbrechen“) und zeigt dann wieder die Beispieldaten, ohne die Seite neu zu laden. Ihre Dateien auf dem Gerät bleiben unverändert.

## 3. Export
- Ziel: **Joplin (empfohlen)**, Apple Notizen, OneNote (*kommt später*, ausgegraut).
- **Jetzt exportieren**, **Erst mit 2 Notizbüchern ausprobieren**, **Anhalten**.
- Fortschritt in Notizen, am Ende „✓ Fertig: 92 Notizen in 7 Ordnern gesichert“.
- Fehler stoppen den Balken (rot) und zeigen Lösungsschritte mit **Erneut versuchen**.

## 4. Hilfe
Was nicht übernommen wird, warum Joplin empfohlen ist, regelmäßig sichern, Protokoll sichern, Fernhilfe (RustDesk – ID und Passwort nur jemandem nennen, den Sie selbst angerufen haben; keinen dauerhaften Zugriff einrichten).

## Test-Schalter (nur Vorschau)
- `?demo=simulation` – ausgegraute Knöpfe (Anmeldung, Export) wieder klickbar, alles simuliert.
- `?demo=exportfehler` – Export stoppt bei 40 % mit „Joplin antwortet nicht“.
- `?demo=anmeldefehler` – Anmeldung schlägt fehl.
