# Beispieldaten und Lasttest

Alle Inhalte sind erfunden (Firma „Muster Bau GmbH“, keine echten Personen). Anhänge wurden selbst erzeugt (PDF mit ReportLab, Bilder mit Pillow, DOCX/XLSX mit python-docx/openpyxl). Alle Dateien sind gegen `evernote-export4.dtd` und `enml2.dtd` geprüft, alle MD5-Hashes stimmen.

## Normales Paket (zusammen ca. 30 MB)
| Datei | Notizen | Anhänge | Größe |
|---|---|---|---|
| Projekte.enex | 20 | 23 (Baustellenfotos, Bauzeichnungen A3, XLSX) | 29 MB |
| Angebote.enex | 14 | 10 (PDF, XLSX, DOCX) | 124 KB |
| Rechnungen.enex | 16 | 17 (PDF, Belegfotos, XLSX) | 264 KB |
| Versicherung-und-Papiere.enex | 10 | 9 (Verträge PDF, DOCX) | 123 KB |
| Haus-und-Garten.enex | 13 | 7 (Fotos, PNG-Skizze, ZIP, TXT) | 169 KB |
| Reisen.enex | 8 | 9 (Fotos, PDF, TXT) | 152 KB |
| Rezepte.enex | 11 | 4 (sehr lange Notiz, Tabelle) | 182 KB |
| **Summe** | **92** | **79** (43 PDF, 28 Bilder, 3 XLSX, 2 DOCX, 2 TXT, 1 ZIP) | |

Datumsbereich 2019–2026, Umlaute, Checklisten, Tabellen, Notizen mit mehreren und ohne Anhänge.

## Zeichentest
`Zeichentest-Äöü-ß.enex` – siehe [Zeichentest](Zeichentest.md).

## Lasttest
`Lasttest-1000-Notizen.enex`: 1.000 Notizen, 7.026 Anhänge, 88 MB (unter der GitHub-Grenze von 100 MB je Datei). Erzeugt mit `cli/gen-large.mjs` aus den Anhängen der Beispieldateien; jeder Anhang hat eigene Bytes am Ende, damit alle Hashes verschieden sind. Größere Dateien nur lokal erzeugen (siehe [CLI und Cron](CLI-Cron.md)).
