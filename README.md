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
- [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md): Hinweise zu uebernommenen Drittanbieter-Dateien.
- [SELF_REPORT.md](./SELF_REPORT.md): Vorlage fuer den finalen Selbst-Report.

Die Challenge-Instruktionen wurden bewusst in den [Challenge.md](./Challenge.md)-Dateien behalten, damit Aufgabenstellung und Loesung im Repo getrennt nachvollziehbar bleiben.

## Voraussetzungen

- Node.js 22 oder neuer empfohlen
- npm
- Optional fuer LLM-Texte: lokal laufendes Ollama, z. B. mit `qwen3:14b`

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
    --alerts              Write timestamped JSON alerts for suppliers needing attention
    --no-alerts           Skip alert export
    --alert-threshold     Alert threshold: rot or gelb; defaults to rot
    --live                Use live World Bank WGI governance risk for supplier scoring
    --wgi-probe <codes>   With --live: fetch only World Bank WGI governance risk for comma-separated ISO2/ISO3 countries
    --wgi-year <year>     WGI year for --live/--wgi-probe; defaults to latest available
    --eu-sanctions-probe <codes>
                          With --live: fetch only EU FSF country sanctions exposure for comma-separated ISO2 countries
    --comtrade-probe <reporter,partner,hs>
                          With --live: fetch only UN Comtrade Preview import exposure for M49 reporter/partner and HS code
    --comtrade-year <year> Comtrade year for live scoring/--comtrade-probe; defaults to 2023
    --comtrade-reporter <m49> Reporter M49 for live Comtrade scoring; defaults to 40
    --comtrade-concurrency <n> Parallel Comtrade requests for live scoring; defaults to 3
    --llm                Enrich report text with local Ollama JSON output
    --no-llm             Disable LLM enrichment
    --llm-backend <name>  LLM backend; currently only ollama
    --llm-model <model>   Ollama model name, e.g. qwen3:14b
    --llm-base-url <url>  Ollama endpoint; defaults to http://localhost:11434
    --llm-batch-size <n>  Suppliers per explanation batch; defaults to 6
    --llm-timeout-ms <n>  Ollama request timeout; defaults to 120000
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

# Nur rote Alerts fuer nachgelagerte Workflows erzeugen
npm start -- --alerts --no-console --no-markdown

# Gelbe und rote Alerts erzeugen
npm start -- --alerts --alert-threshold gelb

# CSV einlesen und Reports in anderes Verzeichnis schreiben
npm start -- --input data/suppliers.csv --output-dir out

# Kurzform fuer Input und Output-Verzeichnis
npm start -- -i data/suppliers.csv -o out

# Supplier-Scoring mit live World-Bank-WGI-Governance und UN-Comtrade-Handels-Exposure
npm start -- --live --wgi-year 2024

# Live-Comtrade aus Sicht eines anderen Reporter-Landes berechnen, z. B. Österreich (40)
npm start -- --live --comtrade-reporter 40 --comtrade-year 2023

# Konservativer gegen Rate-Limits: weniger parallele Comtrade-Requests
npm start -- --live --comtrade-concurrency 1 --comtrade-year 2023

# Nur World-Bank-WGI-Governance-Risiko live testen, ohne Supplier-Scoring
npm start -- --live --wgi-probe AT,DE,CN --wgi-year 2024

# Nur EU-FSF-Sanktions-Exposure live testen, ohne Supplier-Scoring
npm start -- --live --eu-sanctions-probe RU,CN,DE

# Nur UN-Comtrade-Preview-Handels-Exposure live testen, ohne Supplier-Scoring
# Beispiel: Oesterreich (40) importiert HS 85 aus China (156)
npm start -- --live --comtrade-probe 40,156,85 --comtrade-year 2023

# Markdown-Report mit lokalem Ollama-Kurzbrief und LLM-Erklaerungen erzeugen
npm start -- --llm --llm-model qwen3:14b
```

Mit `--llm` erzeugt Ollama nur den `KI-Kurzbrief`,
`Begruendung` und `Empfehlung`. Score, Ampel, Top-Treiber und Datenqualitaet
bleiben deterministisch aus dem TypeScript-Scoring. LLM-Backend, Modell,
Timeout, Batch-Groesse und Prompts liegen in `DEFAULT_LLM_CONFIG` in
[src/config.ts](./src/config.ts). Wenn `--llm-model` gesetzt wird und vom
aktuellen Default abweicht, speichert das Tool dieses Modell wieder in
`src/config.ts`, damit Folgeruns mit `--llm` ohne erneute Modellangabe laufen.
Wenn weder CLI-Modell noch Config-Modell gesetzt ist, versucht das Tool
`ollama list`, nummeriert die installierten Modelle, fragt interaktiv nach einer
Auswahl und speichert diese Auswahl als neuen Default. Falls `ollama list`, die
lokale API oder die JSON-Antwort fehlschlaegt, laeuft der Report ohne LLM weiter
und nutzt die regelbasierten Texte.

Live-WGI nutzt einen engeren Governance-Proxy aus Rechtsstaatlichkeit und
Korruptionskontrolle und invertiert ihn auf die lokale Risikoskala:

```text
governance_score = GOV_WGI_RL.SC * 0.6 + GOV_WGI_CC.SC * 0.4
geopolitik_governance = 100 - governance_score
```

Bei normalem `--live` werden `geopolitik_governance` aus World Bank WGI,
`sanktions_exposure` aus der EU-FSF-Sanktionsliste und `handels_exposure` aus
UN Comtrade ersetzt. Jeder Live-Schritt ist unabhaengig gehaertet: Wenn eine API
nicht erreichbar ist, unerwartete Daten liefert oder rate-limited bleibt, laeuft
der Report weiter und die betroffene Dimension bleibt deterministisch auf dem
Seed-Wert. Markdown- und Konsolenreport nennen im Abschnitt `Datenquellen`,
welche Dimension live ersetzt wurde und wo ein Seed-Fallback genutzt wurde. Die
World-Bank- und Comtrade-Requests haben kurze Timeouts, damit ein haengender
Endpoint nicht den ganzen Report blockiert. Die World-Bank-API wird pro
WGI-Dimension mit allen betroffenen Laendern in einem Request aufgerufen, z. B.
`DEU;AUT;CHN`. Die Probe-Modi sind dagegen bewusst strikt:
`--live --wgi-probe ...`, `--live --eu-sanctions-probe ...` und
`--live --comtrade-probe ...` brechen bei API- oder Parse-Fehlern sichtbar ab,
weil sie Diagnose-Kommandos sind. Seed-Fallback gilt fuer den normalen
Scoring-Lauf mit `npm start -- --live`.

Die EU-FSF-Integration nutzt den offenen RSS-Feed der EU-Kommission und die
CSV-v1.1-Datei:

```text
sanktions_exposure = clamp(25 + 10 * log2((country_count + 1) / (median_count + 1)), 0, 100)
```

Das ist bewusst ein Laender-Proxy, kein Name-Matching: Die EU-FSF-Liste enthaelt
reale sanktionierte Personen/Organisationen, waehrend die Seed-Lieferanten
synthetische Namen haben. Der CSV-Download wird lokal unter `.cache/eu-fsf/`
gespeichert und bei Folgeruns wiederverwendet, solange die lokal gespeicherte
RSS-`pubDate` zur aktuellen CSV-v1.1-`pubDate` passt; bei neuer Publikation wird
die CSV automatisch neu geladen. Ein Land mit median-vielen EU-FSF-Entitaeten im
aktuellen Supplier-Laender-Set erhaelt `25/100`; hoehere und niedrigere Werte
steigen/fallen logarithmisch. Die niedrige Basis ist bewusst konservativ, weil
EU-FSF-Laenderzaehlungen nur ein Proxy fuer Sanktionslisten-Praesenz sind, kein
direkter Lieferanten-Treffer.

Die UN-Comtrade-Integration nutzt M49-Codes aus `land_m49` und berechnet
Handels-Exposure als Importanteil:

```text
handels_exposure_diagnostic = sum(primaryValue reporter<-partner HS) / sum(primaryValue reporter<-world HS) * 100
```

Der Public-Preview-Endpunkt liefert keine einzelne Aggregatzeile, sondern bis zu
500 Detailzeilen nach `partner2`, Zoll- und Transport-Dimensionen. Der Client
summiert deshalb `primaryValue` ueber die gelieferten Zeilen, dedupliziert
Supplier nach `land_m49` und `hs_code` und cached die Reporter-Weltimporte je
HS-Code. Default-Reporter ist Oesterreich (`40`), per `--comtrade-reporter`
umschaltbar. Comtrade-Requests laufen mit begrenzter Concurrency (Default `3`,
per `--comtrade-concurrency` anpassbar), aber echte Netzwerk-Requests werden
zusaetzlich leicht gethrottled, damit der Public-Preview-Endpunkt nicht durch
Bursts in `429` laeuft. Live-Fortschritt wird auf `stderr` mit `[live]`-Prefix
geloggt, damit `stdout` fuer Reports und Probe-Ausgaben nutzbar bleibt.

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

### Alerts

Mit `--alerts` wird ein kleiner maschinenlesbarer Alert-Export fuer nachgelagerte Workflows erzeugt:

```text
reports/lieferketten-alerts-YYYY-MM-DD_HH-MM-SS.json
```

Standardmaessig enthaelt der Export nur `rot` bewertete Lieferanten. Mit `--alert-threshold gelb` werden `gelb` und `rot` exportiert. Das Format ist bewusst kompakt fuer n8n, Slack, E-Mail oder andere Follow-up-Prozesse.

## Tests und Typecheck

```bash
npm test
npm run test:wgi
npm run test:comtrade
npm run test:sanctions
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
- Alert-Export
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
├── THIRD_PARTY_NOTICES.md         # Drittanbieter-Hinweise und Attributionen
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
    ├── config.ts                 # Gewichtung, Schwellen, LLM-Prompts, Defaults
    ├── io.ts                     # JSON/CSV Input und Report-Dateien
    ├── validation.ts             # Input-Validierung und Normalisierung
    ├── alerts.ts                 # Kompakter Alert-Export fuer Workflows
    ├── worldBankWgi.ts           # Live-Governance-Proxy aus World Bank WGI
    ├── euSanctions.ts            # Live-Sanktions-Proxy aus EU FSF
    ├── unComtradePreview.ts      # Live-Handels-Exposure aus UN Comtrade Preview
    ├── ollama.ts                 # Opt-in LLM-Texte via lokalem Ollama
    ├── llmConfigFile.ts          # Persistiert ausgewaehltes Ollama-Modell
    ├── scoring.ts                # Risiko-Scoring, Ampel, Treiber
    ├── report.ts                 # Terminal- und Markdown-Rendering
    ├── types.ts                  # Geteilte Typen
    ├── app.test.ts               # Fokussierte Kern-Tests
    ├── worldBankWgi.test.ts      # WGI-Adaptertests
    ├── euSanctions.test.ts       # EU-FSF-Adaptertests
    ├── unComtradePreview.test.ts # Comtrade-Adaptertests
    └── ollama.test.ts            # Ollama-Adaptertests
```

## Hinweise

- Der Default-Lauf ist deterministisch und braucht keinen API-Key.
- `--live` und `--llm` sind optionale Stretch-Modi mit Fallbacks.
- Die Daten sind synthetisch und vereinfacht.
- Das Ergebnis ist ein First-Pass-Screening, keine rechts- oder compliance-sichere CSDDD-Auskunft.
- Details zu Scoring, Datenqualitaet, Entscheidungen und nicht implementierten Stretch-Goals stehen in [dev/README.md](./dev/README.md).
