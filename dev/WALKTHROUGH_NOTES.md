# Walkthrough Notes

[Zurück zum Developer README](./README.md)

Kurze Notiz für den morgigen 3-5-Minuten-Walkthrough.

## Ablauf

1. Ziel in einem Satz: deterministischer First-Pass Lieferketten-Check für synthetische Supplier-Daten.
2. Kurz zeigen, dass der normale Lauf ohne API-Key und ohne LLM funktioniert:

```bash
npm start
```

3. CSV-Input und maschinenlesbaren Export zeigen:

```bash
npm start -- --input data/suppliers.csv --json
```

4. Optional Alerts zeigen:

```bash
npm start -- --alerts --no-console --no-markdown
```

5. Optional `--llm` zeigen, falls Ollama lokal läuft:

```bash
npm start -- --llm
```

6. Tests und Typecheck zeigen:

```bash
npm test
npm run typecheck
```

## Code-Stellen

- [src/config.ts](../src/config.ts): Gewichte, Schwellen, Defaults, LLM-Prompts
- [src/scoring.ts](../src/scoring.ts): Score, Ampel, Top-Treiber, Datenqualität
- [data/eval-set.json](../data/eval-set.json): kleine Guardrail-Szenarien
- [dev/code-review/REVIEW.md](./code-review/REVIEW.md): Teil-B-Code-Review
- [DECISION_LOG.md](../DECISION_LOG.md): Entscheidungen, Trade-offs und KI-Nutzung

## Sprechpunkte

- Der Seed-Lauf bleibt reproduzierbar und prüfbar.
- Live-APIs und Ollama sind Opt-in-Stretches.
- Die Ampel kommt immer aus deterministischem TypeScript-Scoring, nicht aus dem LLM.
- UI, n8n, Live-News und Deployment sind bewusst als nächste Schritte dokumentiert, nicht überhastet gebaut.
