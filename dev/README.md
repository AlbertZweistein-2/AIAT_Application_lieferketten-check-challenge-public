# Developer Challenge Notes

[Zurück zum Root README](../README.md)

Dieses Dokument beschreibt die Umsetzung der AI:AT Developer Challenge aus [dev/Challenge.md](./Challenge.md): Teil A, Teil B, zentrale Design-Entscheidungen, Trade-offs und bewusst nicht umgesetzte Stretch-Ziele.

Die Challenge-Instruktionen bleiben in den verlinkten [Challenge.md](../Challenge.md)-Dateien erhalten:

- [../Challenge.md](../Challenge.md): allgemeine Challenge-Übersicht.
- [./Challenge.md](./Challenge.md): Developer-Challenge mit Teil A und Teil B.

Weitere Abgabe-Artefakte:

- [../DECISION_LOG.md](../DECISION_LOG.md): Entscheidungen, Trade-offs und Schlüssel-Prompts.
- [../SELF_REPORT.md](../SELF_REPORT.md): Selbst-Report-Vorlage zum finalen Ausfüllen.

## Content

[1 Umsetzung Teil A](#1-umsetzung-teil-a)<br>
[2 Umsetzung Teil B](#2-umsetzung-teil-b)<br>
[3 Detaillierte Umsetzung Teil A](#3-detaillierte-umsetzung-teil-a)<br>
<span style="margin-left: 20px;"></span>[3.1 Scoring-Entscheidungen](#31-scoring-entscheidungen)<br>
<span style="margin-left: 20px;"></span>[3.2 Ampel-Logik](#32-ampel-logik)<br>
<span style="margin-left: 20px;"></span>[3.3 Datenqualität und Missing Values](#33-datenqualität-und-missing-values)<br>
<span style="margin-left: 40px;"></span>[3.3.1 Imputationswahl](#331-imputationswahl)<br>
<span style="margin-left: 20px;"></span>[3.4 Reporting-Entscheidungen](#34-reporting-entscheidungen)<br>
<span style="margin-left: 20px;"></span>[3.5 CLI-Flags](#35-cli-flags)<br>
<span style="margin-left: 20px;"></span>[3.6 Decomposition](#36-decomposition)<br>
[4 Stretches](#4-stretches)<br>
<span style="margin-left: 20px;"></span>[4.1 Risk-adjusted Exposure und Alert-Export](#41-risk-adjusted-exposure-und-alert-export)<br>
<span style="margin-left: 20px;"></span>[4.2 Eval-Set und Tests](#42-eval-set-und-tests)<br>
<span style="margin-left: 20px;"></span>[4.3 Live-API-Stretch](#43-live-api-stretch)<br>
<span style="margin-left: 20px;"></span>[4.4 Ollama-/LLM-Stretch](#44-ollama-llm-stretch)<br>
<span style="margin-left: 20px;"></span>[4.5 Bewusst nicht umgesetzt](#45-bewusst-nicht-umgesetzt)<br>
[5 Navigation](#5-navigation)<br>

## 1 Umsetzung Teil A

Gebaut wurde ein deterministisches TS/Node-CLI, das:

- [../data/suppliers.json](../data/suppliers.json) oder [../data/suppliers.csv](../data/suppliers.csv) einliest
- je Lieferant einen Risiko-Score `0-100` berechnet
- ein `risk_adjusted_exposure` als `Handelsvolumen × Risiko-Score / 100` berechnet (*stretch goal*)
- eine Ampel `grün` / `gelb` / `rot` vergibt
- die wichtigsten Treiber erklärt
- eine Handlungsempfehlung erzeugt
- eine Portfolio-Übersicht nach Risiko sortiert ausgibt
- Terminal-, Markdown- und optional JSON-Reports erzeugt
- optional kompakte JSON-Alerts für rote oder gelbe/rote Lieferanten erzeugt
- Änderungen in der Scoring Gewichtung, den Ampel thresholds und LLM Defaults sind über [src/config.ts](../src/config.ts) anpassbar; lokale LLM-Overrides liegen optional in `src/config.local.json`
- Für Installationsanleitung und usage siehe [README.md](../README.md) oder `npm start -- --help`

Der Kern ist bewusst ohne API-Key und ohne LLM-Abhängigkeit lauffähig, weil die Challenge einen deterministischen Seed-Lauf verlangt. Optionale Stretch-Modi für Live-APIs (`--live`), Alerts (`--alerts`) und lokale Ollama-Texte (`--llm`) verändern diese Grundannahme nicht: Der normale Seed-Lauf bleibt reproduzierbar.

Für detaillierte Design-Entscheidungen, Scoring-Formeln, Ampel-Logik, Imputation, Reporting-Entscheidungen und CLI-Flags siehe [3 Detaillierte Umsetzung Teil A](#3-detaillierte-umsetzung-teil-a).

## 2 Umsetzung Teil B

Die Code-Review-Antwort liegt in [dev/code-review/REVIEW.md](./code-review/REVIEW.md).

Der zentrale Bug im Snippet ist die fälschliche Invertierung der bereits normalisierten Risiko-Werte durch `100 - value`. Laut Dataset gilt aber: `0-100`, hoch bedeutet mehr Risiko. Dadurch werden Low-Risk-Lieferanten hoch priorisiert und High-Risk-Lieferanten entlastet. Das ist fachlich kritisch, weil der First-Pass genau die riskanten Lieferanten sichtbar machen soll. Weitere Vorschläge sind in der Review-Antwort dokumentiert.

## 3 Detaillierte Umsetzung Teil A

### 3.1 Scoring-Entscheidungen

Alle Risiko-Dimensionen sind bereits normalisiert:

```text
0 = niedriges Risiko
100 = hohes Risiko
```

Default-Gewichtung in [src/config.ts](../src/config.ts):

- Geopolitik/Governance: `40 %`
- Sanktions-Exposure: `40 %`
- Handels-Exposure: `20 %`

Begründung:

- Governance und geopolitische Stabilität sind breite Risikotreiber für Lieferketten- und Compliance-Risiko.
- Sanktions-Exposure ist besonders kritisch, weil es schnell zu harten rechtlichen oder operativen Stopps führen kann.
- Handels-Exposure ist relevant für Konzentrations- und Resilienzrisiko, aber allein weniger stark als Governance/Sanktionen.

Score-Berechnung:

```text
score = governance * 0.4 + sanctions * 0.4 + trade * 0.2
risk_adjusted_exposure = handelsvolumen_eur_jahr * score / 100
```

Die Top-Treiber werden nach gewichtetem Beitrag sortiert:

```text
Rohwert * Gewicht = gewichteter Beitrag
```

Das war eine bewusste Korrektur gegenüber einer reinen Rohwert-Sortierung: Eine Dimension mit niedrigerem Rohwert, aber höherem Gewicht kann den Score stärker treiben.

Das `risk_adjusted_exposure` ist kein zweiter Risiko-Score, sondern ein Business-Priorisierungssignal: Ein hoher Score bei kleinem Volumen ist anders zu behandeln als ein mittlerer Score bei sehr hohem Handelsvolumen. Ebenso erlaubt dieser die Priorisierung von Lieferanten mit selbem Risiko-Score, aber unterschiedlicher wirtschaftlicher Relevanz.

### 3.2 Ampel-Logik

Schwellen in [src/config.ts](../src/config.ts):

- `rot`: Score ab `65`
- `gelb`: Score ab `35`
- `grün`: Score unter `35`
- `sanctionsHardStop`: Sanktions-Exposure ab `85` erzwingt `rot`
- `tradeExposureMinimumYellow`: Handels-Exposure ab `90` erzwingt mindestens `gelb`

Begründung:

- `35` und `65` teilen die 0-100-Skala in nachvollziehbare Low/Medium/High-Bereiche.
- Sanktionen ab `85` sind ein Hard-Stop, weil starke Sanktionsnähe auch bei sonst niedrigem Score eskaliert werden sollte.
- Handels-Exposure ab `90` wird mindestens `gelb`, weil extreme Bezugs- oder Importkonzentration nicht als komplett unkritisch gelten sollte. Die Empfehlung nennt dann explizit eine Diversifikationsprüfung.

### 3.3 Datenqualität und Missing Values

Fehlende Risiko-Werte werden sichtbar behandelt und nicht still ignoriert.

Als fehlend gelten unter anderem:

```text
NA, N/A, NaN, null, none, missing, unknown, unbekannt, k.a., -, --
```

Numerische Strings wie `"42"` werden für Risiko-Dimensionen als Zahlen gelesen.

Nicht interpretierbare Werte wie `"hoch"` oder `"not-a-number"` werden als ungültige Datenqualität behandelt. Der Lieferant wird dann konservativ auf `rot` gesetzt und mit Score `100/100` berichtet.

#### 3.3.1 Imputationswahl

Imputation ist hier als Dirty-Data-Absicherung gemeint, nicht als freie Risikoschätzung. Die Risiko-Dimensionen liegen technisch pro Lieferantenzeile vor. Gerade Governance- und Sanktions-Proxies sind aber überwiegend landesweit. Wenn einzelne Zeilen fehlen oder abweichen, soll das Tool fehlende Werte robust aus naheliegenden Peers ableiten, ohne vorhandene Werte still zu überschreiben.

Allgemeine Regeln:

- Es wird nur pro fehlender Dimension imputiert, nicht ein ganzes Länderprofil kopiert.
- Genutzt wird der Median, nicht der erste passende Wert, damit einzelne Ausreißer oder falsch eingetragene Zeilen weniger stark wirken.
- Peers, denen die jeweilige Dimension selbst fehlt oder bei denen sie ungültig ist, werden für den Median ignoriert.
- Wenn alle Risiko-Dimensionen fehlen, wird der Lieferant konservativ auf `rot` gesetzt.

Governance und Sanktionen:

- `geopolitik_governance` und `sanktions_exposure` werden bei fehlendem Wert aus Same-Country-Peers mit gleichem `land_iso2` imputiert.
- Wenn `geopolitik_governance` oder `sanktions_exposure` fehlen und kein Same-Country-Peer verfügbar ist, wird ebenfalls `rot` gesetzt.

Handels-Exposure:

- `handels_exposure` wird strenger behandelt, weil Handelsabhängigkeit nicht nur landes-, sondern auch warenbezogen ist.
- Zuerst wird aus Peers mit gleichem `land_iso2` und gleichem `hs_code` imputiert.
- Wenn kein Peer mit gleichem Land und HS-Code verfügbar ist, wird als dokumentierter Fallback der Same-Country-Median genutzt.
- Wenn auch kein Same-Country-Wert verfügbar ist, wird der Wert auf `100/100` gesetzt und die Ampel mindestens auf `gelb` angehoben.
- Wenn der Fallback auf den reinen Länder-Median genutzt wird, erscheint das explizit im Report unter `Datenqualität`.

Jede Imputation oder Eskalation erscheint im Report unter `Datenqualität`.

### 3.4 Reporting-Entscheidungen

Outputs:

- Terminal-Report standardmäßig aktiv
- Markdown-Report standardmäßig aktiv
- JSON-Report optional mit `--json`
- Alert-Export optional mit `--alerts`
- Ollama-generierter KI-Kurzbrief und Supplier-Texte optional mit `--llm`

Markdown-Reports werden mit Timestamp geschrieben:

```text
reports/lieferketten-check-YYYY-MM-DD_HH-MM-SS.md
```

JSON-Reports werden analog geschrieben:

```text
reports/lieferketten-check-YYYY-MM-DD_HH-MM-SS.json
```

Alert-Reports werden separat geschrieben:

```text
reports/lieferketten-alerts-YYYY-MM-DD_HH-MM-SS.json
```

Die Ampel wird im Terminal farbig ausgegeben, wenn ANSI-Farben verfügbar sind. Im Markdown werden die Ampel-Texte über HTML-Spans farbig dargestellt. Für Markdown-Ranking-Tabellen werden Top-Treiber kompakt mit einer Zeile pro Wert dargestellt.
Das Risiko-Ranking und die Detailberichte zeigen zusätzlich `risk_adjusted_exposure`, damit fachliches Risiko und wirtschaftliche Relevanz zusammen sichtbar werden.

### 3.5 CLI-Flags

Kurzüberblick:

- `--console` / `--no-console`
- `--markdown` / `--no-markdown`
- `--json` / `--no-json`
- `--input` / `-i`
- `--output-dir` / `-o`
- `--help`, `-h`, `help`
- `--alerts` / `--no-alerts`
- `--alert-threshold rot|gelb`
- `--llm` / `--no-llm`
- `--llm-model`, `--llm-base-url`, `--llm-batch-size`, `--llm-timeout-ms`
- `--live`
- `--wgi-probe`, `--wgi-year`
- `--eu-sanctions-probe`
- `--comtrade-probe`, `--comtrade-year`, `--comtrade-reporter`, `--comtrade-concurrency`

Vollständige Optionsliste aus der App-Hilfe:

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
    --comtrade-year <year> Comtrade year for live scoring/--comtrade-probe; defaults to 2024
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

# JSON für weitere Verarbeitung erzeugen
npm start -- --json

# Nur JSON erzeugen
npm start -- --json --no-console --no-markdown

# Nur rote Alerts für nachgelagerte Workflows erzeugen
npm start -- --alerts --no-console --no-markdown

# Gelbe und rote Alerts erzeugen
npm start -- --alerts --alert-threshold gelb

# CSV einlesen und Reports in anderes Verzeichnis schreiben
npm start -- --input data/suppliers.csv --output-dir out

# Kurzform für Input und Output-Verzeichnis
npm start -- -i data/suppliers.csv -o out

# Supplier-Scoring mit live World-Bank-WGI-Governance und UN-Comtrade-Handels-Exposure
npm start -- --live --wgi-year 2024

# Live-Comtrade aus Sicht eines anderen Reporter-Landes berechnen, z. B. Österreich (40)
npm start -- --live --comtrade-reporter 40 --comtrade-year 2024

# Konservativer gegen Rate-Limits: weniger parallele Comtrade-Requests
npm start -- --live --comtrade-concurrency 1 --comtrade-year 2024

# Nur World-Bank-WGI-Governance-Risiko live testen, ohne Supplier-Scoring
npm start -- --live --wgi-probe AT,DE,CN --wgi-year 2024

# Nur EU-FSF-Sanktions-Exposure live testen, ohne Supplier-Scoring
npm start -- --live --eu-sanctions-probe RU,CN,DE

# Nur UN-Comtrade-Preview-Handels-Exposure live testen, ohne Supplier-Scoring
# Beispiel: Österreich (40) importiert HS 85 aus China (156)
npm start -- --live --comtrade-probe 40,156,85 --comtrade-year 2024

# Markdown-Report mit lokalem Ollama-Kurzbrief und LLM-Erklärungen erzeugen
npm start -- --llm --llm-model qwen3:14b
```

### 3.6 Decomposition

Die Implementierung wurde in kleine Module aufgeteilt:

- [src/index.ts](../src/index.ts): CLI-Orchestrierung
- [src/cli.ts](../src/cli.ts): Argument-Parsing und Help-Text
- [src/config.ts](../src/config.ts): Gewichte, Schwellen, getrackte Defaults
- [src/config.local.example.json](../src/config.local.example.json): Beispiel für lokale, gitignorierte LLM-Overrides
- [src/io.ts](../src/io.ts): JSON/CSV Input und Report-Dateien
- [src/validation.ts](../src/validation.ts): Validierung, Missing-Marker, numerische String-Konvertierung
- [src/scoring.ts](../src/scoring.ts): Score, Ampel, Treiber, Imputation, Empfehlungen
- [src/report.ts](../src/report.ts): Terminal- und Markdown-Rendering
- [src/alerts.ts](../src/alerts.ts): kompakter Alert-Export für nachgelagerte Workflows
- [src/worldBankWgi.ts](../src/worldBankWgi.ts): Live-Governance-Proxy aus World Bank WGI
- [src/euSanctions.ts](../src/euSanctions.ts): Live-Sanktions-Proxy aus EU FSF
- [src/unComtradePreview.ts](../src/unComtradePreview.ts): Live-Handels-Exposure aus UN Comtrade Preview
- [src/ollama.ts](../src/ollama.ts): lokale Ollama-Texte für Briefing, Begründung und Empfehlung
- [src/llmConfigFile.ts](../src/llmConfigFile.ts): Persistenz für das zuletzt konfigurierte Ollama-Modell
- [src/app.test.ts](../src/app.test.ts): fokussierte Tests

Diese Aufteilung war bewusst: Scoring, I/O, Reporting und CLI lassen sich dadurch separat prüfen und bei Bedarf gezielt erweitern.

## 4 Stretches

Die Challenge nennt Stretch-Ziele wie Live-API-Anbindung, Eval-Set gegen bekannte Hochrisiko-Länder, Alert-Export, UI und Deployment. Um den CLI-Kern nicht zu verdecken, wurden nur Stretches umgesetzt, die mit wenig zusätzlicher Oberfläche direkt auf dem Kern aufbauen.

### 4.1 Risk-adjusted Exposure und Alert-Export

Das `risk_adjusted_exposure` ergänzt das Risiko-Ranking um wirtschaftliche Relevanz:

```text
risk_adjusted_exposure = handelsvolumen_eur_jahr * risiko_score / 100
```

Die Hauptsortierung bleibt der Risiko-Score. Bei gleichem Score wird sekundär nach `risk_adjusted_exposure` sortiert, damit große wirtschaftliche Exposures zuerst geprüft werden.

Der Alert-Export ist ein bewusst kleiner Workflow-Stretch:

- `--alerts` erzeugt kompakte JSON-Alerts
- `--alert-threshold rot` exportiert nur rote Lieferanten
- `--alert-threshold gelb` exportiert gelbe und rote Lieferanten
- Alert-Dateien sind für nachgelagerte Automatisierung gedacht, z. B. n8n, Slack, E-Mail oder Tickets

### 4.2 Eval-Set und Tests

Das Eval-Set liegt in:

[data/eval-set.json](../data/eval-set.json)

Es ist kein statistischer Benchmark, sondern ein kleines Guardrail-Set für erwartetes Modellverhalten:

- Low-Risk bleibt `grün`
- mittlere Gesamtrisiken werden `gelb`
- hohe aggregierte Risiken werden `rot`
- Sanktions-Hard-Stop erzwingt `rot`
- extreme Handels-Exposure erzwingt mindestens `gelb`
- fehlende Risiko-Dimensionen werden konservativ behandelt
- ungültige Risiko-Werte werden konservativ behandelt

Die Tests sind bewusst auf sinnvolle Kernfälle begrenzt, weil die Challenge explizit "kein Coverage-Theater" verlangt. Geprüft werden unter anderem:

- JSON- und CSV-Input
- CLI-Optionen inklusive Help
- Seed-Ranking
- gewichtete Treiber
- konfigurierbare Handels-Exposure-Schwelle
- Same-Country-Imputation
- Missing-/Invalid-Value-Handling
- Report-Erzeugung
- Eval-Set-Szenarien
- Live-API-Adapter für WGI, EU FSF und Comtrade
- Ollama-Adapter mit strukturiertem JSON-Schema-Output

### 4.3 Live-API-Stretch

Der Seed-Lauf bleibt der deterministische Kern. Live-Daten sind nur mit `--live`
aktiv und ersetzen dann einzelne Risiko-Dimensionen:

- World Bank WGI ersetzt `geopolitik_governance`
- EU FSF ersetzt `sanktions_exposure`
- UN Comtrade Preview ersetzt `handels_exposure`

Im normalen Scoring-Lauf mit `--live` ist jede Live-Datenquelle separat abgesichert.
Wenn WGI, EU FSF oder Comtrade nicht erreichbar ist, unerwartete Daten liefert
oder beim Anwenden auf Supplier scheitert, bleibt nur diese Dimension auf dem
Seed-Wert und der Report läuft weiter. Markdown- und Konsolenreport nennen im
Abschnitt `Datenquellen`, welche Dimension live war und wo ein Seed-Fallback
genutzt wurde.

Die Diagnose-Modi sind bewusst anders: `--live --wgi-probe ...`,
`--live --eu-sanctions-probe ...` und `--live --comtrade-probe ...` brechen bei
API- oder Parse-Fehlern sichtbar ab. Sie sollen externe Quellen isoliert testen,
nicht still in einen Seed-Report übergehen.

Live-WGI nutzt einen engeren Governance-Proxy aus Rechtsstaatlichkeit und
Korruptionskontrolle und invertiert ihn auf die lokale Risikoskala:

```text
governance_score = GOV_WGI_RL.SC * 0.6 + GOV_WGI_CC.SC * 0.4
geopolitik_governance = 100 - governance_score
```

Die World-Bank-API wird pro WGI-Dimension mit allen betroffenen Ländern in
einem Request aufgerufen, z. B. `DEU;AUT;CHN`. Die Requests haben kurze
Timeouts, damit ein hängender Endpoint nicht den ganzen Report blockiert.

Die EU-FSF-Integration nutzt den offenen RSS-Feed der EU-Kommission und die
CSV-v1.1-Datei:

```text
sanktions_exposure = clamp(25 + 10 * log2((country_count + 1) / (median_count + 1)), 0, 100)
```

Das ist bewusst ein Länder-Proxy, kein Name-Matching: Die EU-FSF-Liste enthält
reale sanktionierte Personen/Organisationen, während die Seed-Lieferanten
synthetische Namen haben. Der CSV-Download wird lokal unter `.cache/eu-fsf/`
gespeichert und bei Folgeruns wiederverwendet, solange die lokal gespeicherte
RSS-`pubDate` zur aktuellen CSV-v1.1-`pubDate` passt. Bei neuer Publikation wird
die CSV automatisch neu geladen. Ein Land mit median-vielen EU-FSF-Entitäten im
aktuellen Supplier-Länder-Set erhält `25/100`; höhere und niedrigere Werte
steigen/fallen logarithmisch. Die niedrige Basis ist bewusst konservativ, weil
EU-FSF-Länderzählungen nur ein Proxy für Sanktionslisten-Präsenz sind, kein
direkter Lieferanten-Treffer.

Die UN-Comtrade-Integration nutzt M49-Codes aus `land_m49` und berechnet
Handels-Exposure als Importanteil:

```text
handels_exposure_diagnostic = sum(primaryValue reporter<-partner HS) / sum(primaryValue reporter<-world HS) * 100
```

Der Public-Preview-Endpunkt liefert keine einzelne Aggregatzeile, sondern bis zu
500 Detailzeilen nach `partner2`, Zoll- und Transport-Dimensionen. Der Client
summiert deshalb `primaryValue` über die gelieferten Zeilen, dedupliziert
Supplier nach `land_m49` und `hs_code` und cached die Reporter-Weltimporte je
HS-Code. Default-Reporter ist Österreich (`40`), per `--comtrade-reporter`
umschaltbar. Comtrade-Requests laufen mit begrenzter Concurrency (Default `3`,
per `--comtrade-concurrency` anpassbar), aber echte Netzwerk-Requests werden
zusätzlich leicht gethrottled, damit der Public-Preview-Endpunkt nicht durch
Bursts in `429` läuft. Live-Fortschritt wird auf `stderr` mit `[live]`-Prefix
geloggt, damit `stdout` für Reports und Probe-Ausgaben nutzbar bleibt.

### 4.4 Ollama-/LLM-Stretch

Mit `--llm` wird nach dem deterministischen Scoring ein lokales Ollama-Modell
für narrative Texte genutzt:

- `KI-Kurzbrief` am Anfang des Markdown-Reports
- `Begründung` je Lieferant
- `Empfehlung` je Lieferant

Das LLM darf keine Scores, Ampeln, Treiber oder Datenqualitätsnotizen
verändern. Diese Werte bleiben aus dem TypeScript-Scoring. Die Supplier-Texte
werden in Batches erzeugt, nicht mit einem Prompt pro Lieferant. Die Ollama-
Requests nutzen schema-basiertes `format` für strukturierte JSON-Ausgabe und
`temperature: 0`.

Die getrackten Prompts und Ollama-Defaults liegen in [src/config.ts](../src/config.ts).
Lokale Overrides für Modell, Base-URL, Batch Size oder Timeout können in
`src/config.local.json` liegen; die Beispielstruktur steht in
[src/config.local.example.json](../src/config.local.example.json). Diese lokale
Datei ist gitignored. Wenn per `--llm-model` ein anderes Modell angegeben wird,
wird es dort für Folgeruns gespeichert. Wenn kein Modell konfiguriert ist,
versucht das Tool `ollama list`, lässt interaktiv wählen und speichert diese
Auswahl ebenfalls lokal. Wenn Ollama nicht erreichbar ist oder ungültige JSON-
Antworten liefert, bleiben die regelbasierten Texte erhalten. Jeder LLM-
generierte Textblock wird mit `(AI generated)` markiert.

### 4.5 Bewusst nicht umgesetzt

Nicht umgesetzt, aber als nächste Schritte sinnvoll:

- n8n-Workflow, der werktags morgens periodisch Daten zieht, das CLI/API aufruft und Reports/Alerts an Slack, E-Mail oder ein Ticket-System versendet
- einfache UI für Upload, Ranking-Tabelle, Detailansicht, Filter, Export und manuelle Review-Notizen
- Deployment als kleiner HTTP-Service mit scheduled Job und persistentem Report-/Alert-Archiv
- Live-News- oder Risk-Intelligence-API für Frühwarnungen, z. B. neue Sanktionen, Grenz-/Logistikstörungen, politische Ereignisse oder Naturkatastrophen entlang relevanter Lieferländer
- Alert-Deduplizierung und Eskalationslogik, damit wiederkehrende Warnungen nicht jeden Morgen erneut ungefiltert versendet werden

Wichtig: Die finale Ampel bleibt auch mit LLM- oder n8n-Erweiterungen deterministisch im Scoring-Code. Das LLM wird nur für Text und Zusammenfassung genutzt.

## 5 Navigation

- [Zurück zum Root README](../README.md)
- [Zur Teil-B-Code-Review-Antwort](./code-review/REVIEW.md)
- [Zur Developer-Challenge](./Challenge.md)
- [Zum Decision Log](../DECISION_LOG.md)
- [Zum Self Report](../SELF_REPORT.md)
