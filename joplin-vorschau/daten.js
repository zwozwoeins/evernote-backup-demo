// Nur erfundene Beispieldaten. Keine echten Notizen.
var NOTIZBUECHER = [
  { id: "haushalt", name: "Haushalt" },
  { id: "rezepte", name: "Rezepte" },
  { id: "garten", name: "Garten" },
  { id: "reisen", name: "Reisen" },
  { id: "papiere", name: "Versicherung & Papiere" }
];

var NOTIZEN = [
  { id: 1, buch: "haushalt", titel: "Einkaufsliste Wochenende", datum: "26.10.2026 18:12", tags: ["einkauf"],
    inhalt: [["check", [[true, "Milch"], [true, "Brot vom Bäcker Schulz"], [false, "Kartoffeln, 2,5 kg"], [false, "Kaffee"], [false, "Batterien AA"]]]] },
  { id: 2, buch: "haushalt", titel: "Heizung entlüften – so geht's", datum: "14.10.2026 09:40", tags: ["anleitung", "wohnung"],
    inhalt: [["p", "Vor dem Winter einmal alle Heizkörper entlüften."], ["ol", ["Heizung voll aufdrehen und 10 Minuten warten.", "Heizung abdrehen.", "Lappen unter das Ventil halten, Schlüssel eine halbe Umdrehung öffnen.", "Schließen, sobald Wasser statt Luft kommt.", "Druck am Kessel prüfen (soll zwischen 1,5 und 2 bar liegen)."]]] },
  { id: 3, buch: "haushalt", titel: "Müllabfuhr Termine", datum: "02.01.2026 11:05", tags: ["termine"],
    inhalt: [["p", "Restmüll: jeden 2. Dienstag"], ["p", "Gelbe Tonne: jeden 2. Donnerstag"], ["p", "Papier: erster Montag im Monat"], ["quote", "Tonne am Vorabend rausstellen!"]] },
  { id: 4, buch: "rezepte", titel: "Omas Apfelkuchen", datum: "03.09.2025 15:30", tags: ["backen", "familie"],
    inhalt: [["h", "Zutaten"], ["ul", ["250 g Mehl", "125 g Butter", "100 g Zucker", "1 Ei", "1 Päckchen Backpulver", "1 kg säuerliche Äpfel"]], ["h", "Zubereitung"], ["p", "Teig kneten, in die Springform drücken, Äpfel in Spalten darauf legen. Bei 180 °C etwa 45 Minuten backen."]] },
  { id: 5, buch: "rezepte", titel: "Linsensuppe", datum: "18.02.2026 12:15", tags: ["kochen"],
    inhalt: [["p", "Für 4 Personen. Mit Würstchen oder ohne."], ["ul", ["300 g Tellerlinsen", "1 Bund Suppengrün", "2 Kartoffeln", "1 EL Essig zum Schluss"]], ["p", "Alles 40 Minuten köcheln lassen, mit Salz, Pfeffer und Essig abschmecken."]] },
  { id: 6, buch: "rezepte", titel: "Kartoffelsalat (Rezept von Tante Inge)", datum: "21.06.2025 17:48", tags: ["kochen", "familie"],
    inhalt: [["p", "Festkochende Kartoffeln, warme Brühe, Zwiebeln, Essig, Öl. Am besten über Nacht ziehen lassen."]] },
  { id: 7, buch: "garten", titel: "Tomaten 2026", datum: "12.08.2026 19:02", tags: ["pflanzen", "foto"],
    inhalt: [["p", "Die Sorte ‚Ochsenherz' hat dieses Jahr am besten getragen. Foto vom Beet hinterm Haus:"], ["img", "beispielbild.svg", "Garten mit Häuschen"], ["p", "Nächstes Jahr früher ausgeizen."]], anhang: "beispielbild.svg" },
  { id: 8, buch: "garten", titel: "Rasen düngen", datum: "05.04.2026 10:20", tags: ["pflanzen", "termine"],
    inhalt: [["check", [[true, "März: vertikutieren"], [true, "April: düngen"], [false, "Juni: zweite Düngung"], [false, "September: Herbstdünger"]]]] },
  { id: 9, buch: "reisen", titel: "Packliste Ostsee", datum: "30.05.2026 20:44", tags: ["urlaub"],
    inhalt: [["check", [[true, "Ausweis"], [true, "Fahrkarten"], [false, "Sonnencreme"], [false, "Regenjacke"], [false, "Ladegerät fürs Telefon"], [false, "Medikamente für eine Woche"]]]] },
  { id: 10, buch: "reisen", titel: "Ferienwohnung Usedom", datum: "11.03.2026 08:55", tags: ["urlaub"],
    inhalt: [["p", "Beispiel-Ferienwohnung „Strandblick“, 2. Stock mit Balkon."], ["p", "Anreise ab 15 Uhr, Abreise bis 10 Uhr. Schlüssel liegt im Kasten neben der Tür."], ["quote", "Fahrräder kann man unten im Keller abstellen."]] },
  { id: 11, buch: "papiere", titel: "Versicherungen Übersicht", datum: "07.01.2026 14:10", tags: ["wichtig"],
    inhalt: [["p", "Nur Beispielwerte, keine echten Nummern."], ["ul", ["Hausrat: Musterversicherung AG, Vertrag 000-BEISPIEL", "Haftpflicht: Beispiel-Versicherung, Vertrag 000-MUSTER", "Kfz: läuft am 30.11. aus – rechtzeitig vergleichen"]]] },
  { id: 12, buch: "papiere", titel: "Wo liegt was?", datum: "22.11.2025 16:33", tags: ["wichtig", "wohnung"],
    inhalt: [["ul", ["Geburtsurkunden: blauer Ordner, Arbeitszimmer", "Garantiescheine: Schublade im Flur", "Zweitschlüssel Auto: Schlüsselbrett"]]] },
  { id: 13, buch: "papiere", titel: "Arzttermine", datum: "19.10.2026 07:58", tags: ["termine"],
    inhalt: [["check", [[true, "Zahnarzt Kontrolle (Oktober)"], [false, "Augenarzt: neue Brille"], [false, "Grippeimpfung beim Hausarzt"]]]] }
];
