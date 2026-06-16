# Lieferketten-Check

Deterministisches TypeScript/Node-CLI für die AI:AT Developer Challenge.

Das Tool liest eine Lieferantenliste aus JSON oder CSV, berechnet pro Lieferant einen erklärbaren Risiko-Score, vergibt eine Ampel und erzeugt einen Portfolio-Report für den First-Pass-Check.

## Repo-Orientierung

- [Challenge.md](./Challenge.md): originale Challenge-Übersicht.
- [dev/Challenge.md](./dev/Challenge.md): originale Developer-Challenge mit Teil A und Teil B.
- [business/Challenge.md](./business/Challenge.md): originale Business-Challenge, zur Vollständigkeit im Repo behalten.
- [dev/README.md](./dev/README.md): Developer-Notizen, Design-Entscheidungen, Scoring, Live-API- und LLM-Details.
- [dev/WALKTHROUGH_NOTES.md](./dev/WALKTHROUGH_NOTES.md): kurze Notiz für die Demo-/Walkthrough-Vorbereitung.
- [dev/code-review/REVIEW.md](./dev/code-review/REVIEW.md): Antwort auf Teil B der Developer-Challenge.
- [business/NOTES.md](./business/NOTES.md): erste knappe Notizen für den Business-Teil.
- [DECISION_LOG.md](./DECISION_LOG.md): Entscheidungen, Trade-offs und Schlüssel-Prompts.
- [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md): Hinweise zu übernommenen Drittanbieter-Dateien.
- [SELF_REPORT.md](./SELF_REPORT.md): Vorlage für den finalen Selbst-Report.

Die Challenge-Instruktionen wurden bewusst in den [Challenge.md](./Challenge.md)-Dateien behalten, damit Aufgabenstellung und Lösung im Repo getrennt nachvollziehbar bleiben.

## Voraussetzungen

- Node.js 22 oder neuer empfohlen
- npm
- Optional für LLM-Texte: lokal laufendes Ollama, z. B. mit `qwen3:14b`

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
Ampel-Verteilung: grün=13, gelb=13, rot=2
Markdown-Report: reports/lieferketten-check-2026-06-14_15-23-25.md
```

## CLI-Nutzung

```bash
npm start -- [input-file] [options]
```

Wichtig: Bei npm gehört `--` zwischen `npm start` und die App-Optionen. Ohne diesen Trenner interpretiert npm manche Flags selbst.

```bash
npm start -- --help
```

Häufige Beispiele:

```bash
# JSON-Input explizit auswählen
npm start -- data/suppliers.json

# CSV einlesen
npm start -- data/suppliers.csv

# Nur Terminal, keine Markdown-Datei schreiben
npm start -- --no-markdown

# Maschinenlesbaren JSON-Report zusätzlich erzeugen
npm start -- --json

# Kompakte Alerts für rote Lieferanten erzeugen
npm start -- --alerts --no-console --no-markdown

# Optionale Live-Daten nutzen
npm start -- --live

# Optional lokale Ollama-Texte erzeugen
npm start -- --llm --llm-model qwen3:14b
```

Weitere nützliche Run-Beispiele:

```bash
# Markdown schreiben, aber nichts ins Terminal drucken
npm start -- --no-console

# Nur JSON erzeugen
npm start -- --json --no-console --no-markdown

# Gelbe und rote Alerts erzeugen
npm start -- --alerts --alert-threshold gelb

# CSV einlesen und Reports in anderes Verzeichnis schreiben
npm start -- --input data/suppliers.csv --output-dir out

# Kurzform für Input und Output-Verzeichnis
npm start -- -i data/suppliers.csv -o out

# Live-Comtrade aus Sicht eines anderen Reporter-Landes berechnen, z. B. Österreich (40)
npm start -- --live --comtrade-reporter 40 --comtrade-year 2024

# Konservativer gegen Rate-Limits: weniger parallele Comtrade-Requests
npm start -- --live --comtrade-concurrency 1 --comtrade-year 2024
```

Die vollständige Optionsliste und die Details zu Live-APIs, Probe-Modi und Ollama stehen in [dev/README.md](./dev/README.md).

## Inputs

Der Input kann JSON oder CSV sein. Andere Dateiformate werden abgelehnt.

Default-Input:

```text
data/suppliers.json
```

Felddokumentation und Hinweise zum Seed-Dataset stehen in [data/README.md](./data/README.md).

## Outputs

Standardmäßig erzeugt das Tool:

- einen Terminal-Report mit Portfolio-Übersicht, Ampel-Verteilung, Ranking und Detailberichten
- einen timestamped Markdown-Report unter `reports/lieferketten-check-YYYY-MM-DD_HH-MM-SS.md`

Optional:

- `--json`: maschinenlesbarer Report unter `reports/lieferketten-check-YYYY-MM-DD_HH-MM-SS.json`
- `--alerts`: kompakter Alert-Export unter `reports/lieferketten-alerts-YYYY-MM-DD_HH-MM-SS.json`
- `--live`: Live-Daten für einzelne Risiko-Dimensionen, mit Seed-Fallback im normalen Scoring-Lauf
- `--llm`: lokal generierte Ollama-Texte für Kurzbrief, Begründung und Empfehlung

## Tests und Typecheck

```bash
npm test
npm run test:wgi
npm run test:comtrade
npm run test:sanctions
npm run typecheck
```

Watch-Modus für Tests:

```bash
npm run test:watch
```

CI ist unter [.github/workflows/ci.yml](./.github/workflows/ci.yml) eingerichtet und läuft auf Pushes und Pull Requests.

## Projektstruktur

```text
.
├── Challenge.md
├── README.md
├── DECISION_LOG.md
├── THIRD_PARTY_NOTICES.md
├── SELF_REPORT.md
├── data/
│   ├── README.md
│   ├── suppliers.json
│   ├── suppliers.csv
│   └── eval-set.json
├── dev/
│   ├── Challenge.md
│   ├── README.md
│   └── code-review/
├── business/
│   └── Challenge.md
└── src/
    ├── index.ts
    ├── cli.ts
    ├── config.ts
    ├── scoring.ts
    ├── report.ts
    ├── worldBankWgi.ts
    ├── euSanctions.ts
    ├── unComtradePreview.ts
    └── ollama.ts
```

## Hinweise

- Der Default-Lauf ist deterministisch und braucht keinen API-Key.
- `--live` und `--llm` sind optionale Stretch-Modi mit Fallbacks.
- Die Daten sind synthetisch und vereinfacht.
- Das Ergebnis ist ein First-Pass-Screening, keine rechts- oder compliance-sichere CSDDD-Auskunft.
- Details zu Scoring, Datenqualität, Entscheidungen und nicht implementierten Stretch-Goals stehen in [dev/README.md](./dev/README.md).
