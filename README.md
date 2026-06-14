# Lieferketten-Check

Deterministisches TypeScript/Node-CLI fuer die AI:AT Developer Challenge.

Das Tool liest eine Lieferantenliste aus JSON oder CSV, berechnet pro Lieferant einen erklaerbaren Risiko-Score, vergibt eine Ampel und erzeugt einen Portfolio-Report fuer den First-Pass-Check.

## Repo-Orientierung

- [Challenge.md](./Challenge.md): originale Challenge-Uebersicht.
- [dev/Challenge.md](./dev/Challenge.md): originale Developer-Challenge mit Teil A und Teil B.
- [business/Challenge.md](./business/Challenge.md): originale Business-Challenge, zur Vollstaendigkeit im Repo behalten.
- [dev/README.md](./dev/README.md): Developer-Notizen, Design-Entscheidungen, Annahmen, Scope und Stretch-Ideen.
- [dev/code-review/REVIEW.md](./dev/code-review/REVIEW.md): Antwort auf Teil B der Developer-Challenge.
- [DECISION_LOG.md](./DECISION_LOG.md): Entscheidungen, Trade-offs und Schluessel-Prompts.
- [SELF_REPORT.md](./SELF_REPORT.md): Vorlage fuer den finalen Selbst-Report.

Die Challenge-Instruktionen wurden bewusst in den [Challenge.md](./Challenge.md)-Dateien behalten, damit Aufgabenstellung und Loesung im Repo getrennt nachvollziehbar bleiben.

## Voraussetzungen

- Node.js 22 oder neuer empfohlen
- npm

## Installation

```bash
npm install
```

In CI oder bei frischem Checkout kann auch der Lockfile-basierte Install genutzt werden:

```bash
npm ci
```

## Schnellstart

Default: nutzt [data/suppliers.json](./data/suppliers.json), druckt den Report ins Terminal und schreibt einen Markdown-Report nach `reports/`.

```bash
npm start
```

Beispiel-Ausgabe:

```text
Lieferketten-Check — Portfolio Summary
======================================
Lieferanten gesamt: 28
Ampel-Verteilung: gruen=13, gelb=13, rot=2
Markdown-Report: reports/lieferketten-check-2026-06-14_15-23-25.md
```

## CLI-Nutzung

```bash
npm start -- [input-file] [options]
```

Wichtig: Bei npm gehoert `--` zwischen `npm start` und die App-Optionen. Ohne diesen Trenner interpretiert npm manche Flags selbst. App-Hilfe daher so aufrufen:

```bash
npm start -- --help
```

Auch moeglich:

```bash
npm start -- help
npm start help
```

`npm start --help` zeigt dagegen die npm-Hilfe fuer den `start`-Befehl, nicht die Hilfe dieser App.

## Inputs

Der Input kann JSON oder CSV sein. Andere Dateiformate werden abgelehnt.

```bash
npm start -- data/suppliers.json
npm start -- data/suppliers.csv
npm start -- --input data/suppliers.csv
```

Default-Input:

```text
data/suppliers.json
```

## Optionen

```text
-i, --input <file>        Supplier input file (.json or .csv)
-o, --output-dir <dir>    Directory for timestamped reports
    --console             Print report to terminal
    --no-console          Skip terminal report
    --markdown            Write timestamped Markdown report
    --no-markdown         Skip Markdown report
    --json                Write timestamped JSON results
    --no-json             Skip JSON results
    -h, --help            Show app help
```

Beispiele:

```bash
# Nur Terminal, keine Datei schreiben
npm start -- --no-markdown

# Markdown schreiben, aber nichts ins Terminal drucken
npm start -- --no-console

# JSON fuer weitere Verarbeitung erzeugen
npm start -- --json

# Nur JSON erzeugen
npm start -- --json --no-console --no-markdown

# CSV einlesen und Reports in anderes Verzeichnis schreiben
npm start -- --input data/suppliers.csv --output-dir out

# Kurzform fuer Input und Output-Verzeichnis
npm start -- -i data/suppliers.csv -o out
```

## Outputs

### Terminal

Der Terminal-Report zeigt:

- Portfolio-Zusammenfassung
- Ampel-Verteilung
- Lieferanten sortiert nach Risiko, hoechstes zuerst
- Detailberichte mit Score, Treibern, Begruendung, Datenqualitaet und Empfehlung

Ampeln werden farbig ausgegeben, wenn das Terminal ANSI-Farben unterstuetzt. Mit `NO_COLOR=1` bleiben Farben deaktiviert.

### Markdown

Standardmaessig wird ein timestamped Markdown-Report geschrieben:

```text
reports/lieferketten-check-YYYY-MM-DD_HH-MM-SS.md
```

Der Markdown-Report enthaelt:

- Portfolio-Uebersicht
- Scoring-Annahmen
- Risiko-Ranking
- Detailbericht je Lieferant

### JSON

Mit `--json` wird zusaetzlich ein maschinenlesbarer Report erzeugt:

```text
reports/lieferketten-check-YYYY-MM-DD_HH-MM-SS.json
```

Das JSON enthaelt die berechneten `RiskResult`-Objekte inklusive Lieferant, Score, Ampel, Top-Treibern, Begruendung, Handlungsempfehlung und Datenqualitaets-Hinweisen.

## Tests und Typecheck

```bash
npm test
npm run typecheck
```

Watch-Modus fuer Tests:

```bash
npm run test:watch
```

Die Tests in [src/app.test.ts](./src/app.test.ts) sind bewusst klein gehalten und pruefen die wichtigsten Verhaltensannahmen statt Coverage-Theater:

- JSON- und CSV-Input
- nicht unterstuetzte Dateiformate
- CLI-Optionen und Help-Modus
- Risiko-Sortierung auf dem Seed-Dataset
- gewichtete Top-Treiber
- konfigurierbare Handels-Exposure-Schwelle
- Imputation und Datenqualitaetsfaelle
- Markdown- und JSON-Report-Erzeugung
- Eval-Set-Szenarien in [data/eval-set.json](./data/eval-set.json)

## GitHub Actions

CI ist unter [.github/workflows/ci.yml](./.github/workflows/ci.yml) eingerichtet und laeuft auf Pushes und Pull Requests:

```bash
npm ci
npm run typecheck
npm test
```

## Projektstruktur

```text
.
├── Challenge.md                  # Originale Challenge-Uebersicht
├── README.md                     # Runbook: Installation, CLI, Tests
├── DECISION_LOG.md               # Entscheidungen, Trade-offs, Prompts
├── SELF_REPORT.md                # Auszufuellender Selbst-Report
├── package.json                  # npm-Skripte und Dependencies
├── tsconfig.json                 # TypeScript-Konfiguration
├── .github/
│   └── workflows/
│       └── ci.yml                # Typecheck und Tests auf Push/PR
├── data/
│   ├── README.md                 # Felddokumentation zum Seed-Dataset
│   ├── suppliers.json            # Seed-Dataset
│   ├── suppliers.csv             # Seed-Dataset als CSV
│   ├── eval-set.json             # Szenarien fuer erwartetes Modellverhalten
│   └── examples/                 # Einzelne Beispielprofile
├── dev/
│   ├── Challenge.md              # Originale Developer-Challenge
│   ├── README.md                 # Design-Entscheidungen und Trade-offs
│   └── code-review/
│       ├── snippet.ts            # Vorgegebenes Review-Snippet
│       └── REVIEW.md             # Teil-B-Antwort
├── business/
│   └── Challenge.md              # Originale Business-Challenge
└── src/
    ├── index.ts                  # CLI-Orchestrierung
    ├── cli.ts                    # Argument-Parsing und Help-Text
    ├── config.ts                 # Gewichtung, Schwellen, Defaults
    ├── io.ts                     # JSON/CSV Input und Report-Dateien
    ├── validation.ts             # Input-Validierung und Normalisierung
    ├── scoring.ts                # Risiko-Scoring, Ampel, Treiber
    ├── report.ts                 # Terminal- und Markdown-Rendering
    ├── types.ts                  # Geteilte Typen
    └── app.test.ts               # Fokussierte Tests
```

## Hinweise

- Das Tool ist deterministisch und braucht keinen API-Key.
- Die Daten sind synthetisch und vereinfacht.
- Das Ergebnis ist ein First-Pass-Screening, keine rechts- oder compliance-sichere CSDDD-Auskunft.
- Details zu Scoring, Datenqualitaet, Entscheidungen und nicht implementierten Stretch-Goals stehen in [dev/README.md](./dev/README.md).
