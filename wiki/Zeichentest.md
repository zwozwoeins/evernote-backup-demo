# Zeichentest

`beispiel-export/Zeichentest-Äöü-ß.enex` (9 Notizen, 21 Anhänge) prüft Sonderfälle:

- Umlaute und ß in Titeln, Texten, Tags, Notizbuch- und Anhangnamen (`Büroübergabe März.pdf`)
- Sonderzeichen `& < > " ' / \ : * ? |` in Titel, Text, Tags und Dateinamen
- Emoji (auch mit Hautton und Flagge), €, §, Akzente (é à ñ), Kyrillisch, Chinesisch, Japanisch, Koreanisch
- sehr langer Titel (über 300 Zeichen) und sehr langer Dateiname
- leere Notiz
- doppelte Dateinamen (`Foto.jpg`, `foto.JPG`, noch einmal `Foto.jpg`, dazu derselbe Name in einer anderen Notiz)
- für Windows/macOS ungültige Namen: `CON.txt`, `aux.pdf`, `NUL`, `Zeitplan 12:30 Uhr.txt`, `Pfad/mit/Schrägstrich.txt`, Punkt am Ende, Punkt am Anfang
- CDATA und HTML-Entities im ENML (`&nbsp;`, `&auml;`, `&euro;`, `&#x1F600;`, wörtliches `<![CDATA[` im Text)

## Bereinigung der Namen
Regeln (`NotizCore.safeFileName` / `uniqueName`): verbotene Zeichen `/ \ : * ? " < > |` und Steuerzeichen → `_`; Punkte/Leerzeichen am Ende weg; Punkt am Anfang → `_`; reservierte Windows-Namen bekommen `_` davor; Unicode wird NFC (wichtig für macOS); höchstens 120 Zeichen, Endung bleibt; Doppelte (ohne Groß/klein-Unterschied) → `Name (2).jpg`.

Im Protokoll steht jede Änderung, z. B.:
```
Name bereinigt: „Plan: Halle 3/4 *final*?.pdf“ → „Plan_ Halle 3_4 _final__.pdf“.
Name bereinigt: „foto.JPG“ → „foto (2).JPG“.
```
Die Anzeige in der Vorschau nutzt weiter den Originalnamen.

## Geprüft
- Vorschau zeigt Kyrillisch, CJK, Emoji, €, §, Entities unverändert (headless-Test).
- CLI-Export nach Markdown ist gültiges UTF-8, alle Prüftexte sind unverändert enthalten, alle 21 Anhänge geschrieben.
- Benannte HTML-Entities (z. B. `&nbsp;`) werden vor dem XML-Lesen in Zahlen-Entities umgewandelt – vorher wäre eine solche Notiz als „Inhalt nicht lesbar“ gemeldet worden.
