# Developer Challenge Notes

[Zurueck zum Root README](../README.md)

Dieses Dokument beschreibt die Umsetzung der AI:AT Developer Challenge aus [dev/Challenge.md](./Challenge.md): Teil A, Teil B, zentrale Design-Entscheidungen, Trade-offs und bewusst nicht umgesetzte Stretch-Ziele.

Die Challenge-Instruktionen bleiben in den verlinkten [Challenge.md](../Challenge.md)-Dateien erhalten:

- [../Challenge.md](../Challenge.md): allgemeine Challenge-Uebersicht.
- [./Challenge.md](./Challenge.md): Developer-Challenge mit Teil A und Teil B.

Weitere Abgabe-Artefakte:

- [../DECISION_LOG.md](../DECISION_LOG.md): Entscheidungen, Trade-offs und Schluessel-Prompts.
- [../SELF_REPORT.md](../SELF_REPORT.md): Selbst-Report-Vorlage zum finalen Ausfuellen.

## Umsetzung Teil A

Gebaut wurde ein deterministisches TS/Node-CLI, das:

- [../data/suppliers.json](../data/suppliers.json) oder [../data/suppliers.csv](../data/suppliers.csv) einliest
- je Lieferant einen Risiko-Score `0-100` berechnet
- eine Ampel `gruen` / `gelb` / `rot` vergibt
- die wichtigsten Treiber erklaert
- eine Handlungsempfehlung erzeugt
- eine Portfolio-Uebersicht nach Risiko sortiert ausgibt
- Terminal-, Markdown- und optional JSON-Reports erzeugt

Der Kern ist bewusst ohne API-Key und ohne LLM-Abhaengigkeit lauffaehig, weil die Challenge einen deterministischen Seed-Lauf verlangt.

## Umsetzung Teil B

Die Code-Review-Antwort liegt in [dev/code-review/REVIEW.md](./code-review/REVIEW.md).

Der zentrale Bug im Snippet ist die faelschliche Invertierung der bereits normalisierten Risiko-Werte durch `100 - value`. Laut Dataset gilt aber: `0-100`, hoch bedeutet mehr Risiko. Dadurch werden Low-Risk-Lieferanten hoch priorisiert und High-Risk-Lieferanten entlastet. Das ist fachlich kritisch, weil der First-Pass genau die riskanten Lieferanten sichtbar machen soll.

## Scoring-Entscheidungen

Alle Risiko-Dimensionen sind bereits normalisiert:

```text
0 = niedriges Risiko
100 = hohes Risiko
```

Default-Gewichtung in [src/config.ts](../src/config.ts):

- Geopolitik/Governance: `40 %`
- Sanktions-Exposure: `40 %`
- Handels-Exposure: `20 %`

Begruendung:

- Governance und geopolitische Stabilitaet sind breite Risikotreiber fuer Lieferketten- und Compliance-Risiko.
- Sanktions-Exposure ist besonders kritisch, weil es schnell zu harten rechtlichen oder operativen Stopps fuehren kann.
- Handels-Exposure ist relevant fuer Konzentrations- und Resilienzrisiko, aber allein weniger stark als Governance/Sanktionen.

Score-Berechnung:

```text
score = governance * 0.4 + sanctions * 0.4 + trade * 0.2
```

Die Top-Treiber werden nach gewichtetem Beitrag sortiert:

```text
Rohwert * Gewicht = gewichteter Beitrag
```

Das war eine bewusste Korrektur gegenueber einer reinen Rohwert-Sortierung: Eine Dimension mit niedrigerem Rohwert, aber hoeherem Gewicht kann den Score staerker treiben.

## Ampel-Logik

Schwellen in [src/config.ts](../src/config.ts):

- `rot`: Score ab `65`
- `gelb`: Score ab `35`
- `gruen`: Score unter `35`
- `sanctionsHardStop`: Sanktions-Exposure ab `85` erzwingt `rot`
- `tradeExposureMinimumYellow`: Handels-Exposure ab `90` erzwingt mindestens `gelb`

Begruendung:

- `35` und `65` teilen die 0-100-Skala in nachvollziehbare Low/Medium/High-Bereiche.
- Sanktionen ab `85` sind ein Hard-Stop, weil starke Sanktionsnaehe auch bei sonst niedrigem Score eskaliert werden sollte.
- Handels-Exposure ab `90` wird mindestens `gelb`, weil extreme Bezugs- oder Importkonzentration nicht als komplett unkritisch gelten sollte. Die Empfehlung nennt dann explizit eine Diversifikationspruefung.

## Datenqualitaet und Missing Values

Fehlende Risiko-Werte werden sichtbar behandelt und nicht still ignoriert.

Als fehlend gelten unter anderem:

```text
NA, N/A, NaN, null, none, missing, unknown, unbekannt, k.a., -, --
```

Numerische Strings wie `"42"` werden fuer Risiko-Dimensionen als Zahlen gelesen.

Nicht interpretierbare Werte wie `"hoch"` oder `"not-a-number"` werden als ungueltige Datenqualitaet behandelt. Der Lieferant wird dann konservativ auf `rot` gesetzt und mit Score `100/100` berichtet.

Imputation:

- Es wird nur pro fehlender Dimension imputiert, nicht ein ganzes Laenderprofil kopiert.
- Imputiert wird aus Same-Country-Peers mit gleichem `land_iso2`.
- Genutzt wird der Median der vorhandenen Werte dieser Dimension.
- Peers, denen diese Dimension selbst fehlt oder bei denen sie ungueltig ist, werden fuer den Median ignoriert.
- Wenn alle Risiko-Dimensionen fehlen, wird der Lieferant konservativ auf `rot` gesetzt.
- Wenn `geopolitik_governance` oder `sanktions_exposure` fehlen und kein Same-Country-Peer verfuegbar ist, wird ebenfalls `rot` gesetzt.
- Wenn nur `handels_exposure` fehlt und kein Same-Country-Peer verfuegbar ist, wird der Wert auf `100/100` gesetzt und die Ampel mindestens auf `gelb` angehoben.

Jede Imputation oder Eskalation erscheint im Report unter `Datenqualitaet`.

## Reporting-Entscheidungen

Outputs:

- Terminal-Report standardmaessig aktiv
- Markdown-Report standardmaessig aktiv
- JSON-Report optional mit `--json`

CLI-Flags:

- `--console` / `--no-console`
- `--markdown` / `--no-markdown`
- `--json` / `--no-json`
- `--input` / `-i`
- `--output-dir` / `-o`
- `--help`, `-h`, `help`

Markdown-Reports werden mit Timestamp geschrieben:

```text
reports/lieferketten-check-YYYY-MM-DD_HH-MM-SS.md
```

JSON-Reports werden analog geschrieben:

```text
reports/lieferketten-check-YYYY-MM-DD_HH-MM-SS.json
```

Die Ampel wird im Terminal farbig ausgegeben, wenn ANSI-Farben verfuegbar sind. Im Markdown werden die Ampel-Texte ueber HTML-Spans farbig dargestellt. Fuer Markdown-Ranking-Tabellen werden Top-Treiber kompakt mit einer Zeile pro Wert dargestellt.

## Eval-Set und Tests

Das Eval-Set liegt in:

[data/eval-set.json](../data/eval-set.json)

Es ist kein statistischer Benchmark, sondern ein kleines Guardrail-Set fuer erwartetes Modellverhalten:

- Low-Risk bleibt `gruen`
- mittlere Gesamtrisiken werden `gelb`
- hohe aggregierte Risiken werden `rot`
- Sanktions-Hard-Stop erzwingt `rot`
- extreme Handels-Exposure erzwingt mindestens `gelb`
- fehlende Risiko-Dimensionen werden konservativ behandelt
- ungueltige Risiko-Werte werden konservativ behandelt

Die Tests sind bewusst auf sinnvolle Kernfaelle begrenzt, weil die Challenge explizit "kein Coverage-Theater" verlangt. Geprueft werden unter anderem:

- JSON- und CSV-Input
- CLI-Optionen inklusive Help
- Seed-Ranking
- gewichtete Treiber
- konfigurierbare Handels-Exposure-Schwelle
- Same-Country-Imputation
- Missing-/Invalid-Value-Handling
- Report-Erzeugung
- Eval-Set-Szenarien

## Decomposition

Die Implementierung wurde in kleine Module aufgeteilt:

- [src/index.ts](../src/index.ts): CLI-Orchestrierung
- [src/cli.ts](../src/cli.ts): Argument-Parsing und Help-Text
- [src/config.ts](../src/config.ts): Gewichte, Schwellen, Defaults
- [src/io.ts](../src/io.ts): JSON/CSV Input und Report-Dateien
- [src/validation.ts](../src/validation.ts): Validierung, Missing-Marker, numerische String-Konvertierung
- [src/scoring.ts](../src/scoring.ts): Score, Ampel, Treiber, Imputation, Empfehlungen
- [src/report.ts](../src/report.ts): Terminal- und Markdown-Rendering
- [src/app.test.ts](../src/app.test.ts): fokussierte Tests

Diese Aufteilung war bewusst: Scoring, I/O, Reporting und CLI lassen sich dadurch separat pruefen und in einem Live-Walkthrough leichter erweitern.

## Bewusst nicht umgesetzt

Die Challenge nennt Stretch-Goals wie UI, Live-API-Anbindung, Eval-Set, Alert-Export und Deployment. Wegen der 2-4h-Regel wurden nur sinnvolle, kleine Erweiterungen umgesetzt:

- CSV-Support
- JSON-Output fuer weitere Verarbeitung
- Markdown-Report
- Eval-Set
- GitHub Actions
- robuste Datenqualitaetslogik

Nicht umgesetzt, aber als naechste Schritte sinnvoll:

- `--live`-Flag fuer World Bank WGI, UN Comtrade und EU-Sanktionsliste mit deterministischem Seed-Fallback
- optionaler Ollama-Modus fuer bessere Begruendungstexte, aber nicht fuer die finale Score-Entscheidung
- n8n-Workflow, der periodisch Daten zieht, das CLI/API aufruft und Reports/Alerts versendet
- einfache UI fuer Upload, Ranking-Tabelle, Detailansicht und Export
- Alert-Export fuer rote/gelbe Lieferanten
- Deployment als kleiner HTTP-Service

Wichtig: Die finale Ampel sollte auch bei LLM- oder n8n-Erweiterungen deterministisch im Scoring-Code bleiben. Ein LLM waere eher fuer Text, Zusammenfassung und Recherche-Evidenz geeignet.

## AI-Collaboration / Prozess

KI wurde genutzt fuer:

- Strukturierung der offenen Anforderungen
- Refactoring in Module
- Diskussion der Gewichtung und Schwellen
- Review von Edge Cases bei Missing Values
- Generierung und Schaerfung sinnvoller Tests
- README-/Decision-Log-Formulierung

Die fachlichen Entscheidungen wurden anschliessend explizit im Code, in Tests und in dieser Dokumentation festgehalten. Das war bewusst wichtiger als eine groessere UI oder eine breite Stretch-Implementierung.

## Walkthrough-Hinweis

Fuer einen 3-5-Minuten-Walkthrough bietet sich diese Reihenfolge an:

1. Kurz Ziel erklaeren: deterministischer First-Pass Lieferketten-Check.
2. `npm start` zeigen.
3. `npm start -- --input data/suppliers.csv --json` zeigen.
4. `npm test` und `npm run typecheck` zeigen.
5. Kurz [src/config.ts](../src/config.ts), [src/scoring.ts](../src/scoring.ts), [data/eval-set.json](../data/eval-set.json) und [dev/code-review/REVIEW.md](./code-review/REVIEW.md) erklaeren.
6. Erwaehnen, dass Live-API, n8n, Ollama und UI bewusst als Erweiterungen dokumentiert, aber nicht ueberinvestiert wurden.

## Navigation

- [Zurueck zum Root README](../README.md)
- [Zur Teil-B-Code-Review-Antwort](./code-review/REVIEW.md)
- [Zur Developer-Challenge](./Challenge.md)
- [Zum Decision Log](../DECISION_LOG.md)
- [Zum Self Report](../SELF_REPORT.md)
