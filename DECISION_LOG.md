# Decision Log + Key Prompts

[Zurück zum Root README](./README.md)

Dieses Log hält die wichtigsten Entscheidungen, Trade-offs und KI-Schritte für die Developer-Challenge knapp fest. Ausführliche technische Details stehen in [dev/README.md](./dev/README.md). Der Business-Teil wurde nachträglich als knapper Quick-Pass ergänzt, weil der Schwerpunkt der Arbeit auf der Developer-Challenge lag.

## Entscheidungen

1. **Kern zuerst:** Der deterministische CLI-Seed-Lauf blieb die Hauptabgabe. Stretches wurden nur ergänzt, wenn sie den Kern nicht verdecken: Live-APIs, Alert-Export, Eval-Set und Ollama-Texte.
2. **Regelbasiertes Scoring, LLM nur für Text:** Risiko-Score, Ampel, Top-Treiber und Datenqualitätsnotizen kommen immer aus TypeScript. Ollama erzeugt optional nur Kurzbrief, Begründung und Empfehlung und wird als `(AI generated)` markiert.
3. **Gewichtung `40/40/20`:** Governance und Sanktionen zählen stärker als Handels-Exposure. Sanktionen ab `85` erzwingen `rot`; Handels-Exposure ab `90` erzwingt mindestens `gelb` und eine Diversifikations-Empfehlung.
4. **Top-Treiber nach Beitrag:** Treiber werden nach `Rohwert * Gewicht` sortiert, nicht nach Rohwert. Dadurch erklärt der Report, was den Score tatsächlich beeinflusst.
5. **Business-Priorisierung:** `risk_adjusted_exposure = handelsvolumen_eur_jahr * risiko_score / 100` ergänzt die Ampel um wirtschaftliche Relevanz. Sortiert wird primär nach Risiko-Score, sekundär nach risk-adjusted Exposure.
6. **Missing Values sichtbar:** Bekannte Marker wie `NA`, `NaN`, `unknown` gelten als fehlend; numerische Strings werden gelesen; unplausible Strings werden konservativ `rot`. Jede Imputation oder Eskalation erscheint im Report.
7. **Imputation nur mit nahen Peers:** Governance/Sanktionen nutzen Same-Country-Median. Handels-Exposure nutzt zuerst Same-Country + gleichen HS-Code, danach dokumentierten Länder-Fallback. Kein globales Raten für kritische Governance-/Sanktionslücken.
8. **Live-APIs als Opt-in:** `--live` ersetzt einzelne Dimensionen durch World Bank WGI, EU FSF und UN Comtrade Preview. Fällt eine Quelle im normalen Lauf aus, bleibt nur diese Dimension beim Seed-Wert; Probe-Modi brechen dagegen sichtbar ab.
9. **Live-Proxies bewusst begrenzt:** WGI nutzt Rule of Law und Control of Corruption; EU FSF ist ein Länder-Proxy, kein Name-Matching; Comtrade ist ein Importanteils-/Konzentrationsproxy aus Reporter-Sicht, default Österreich.
10. **Tests als Guardrails:** Tests decken Kernverhalten, CLI, Datenqualität, Reports, Eval-Set und Adapter ab, aber bewusst ohne Coverage-Theater. Ollama wird ohne echte lokale Modellabhängigkeit testbar gehalten, damit CI stabil bleibt.
11. **Business-Case bewusst schmal gehalten:** Der Business-Nachtrag fokussiert auf Lean Canvas, DACH-bottom-up-Absatzpotenzial, ICP, Preislogik und Umsatzabschätzung. Keine Folien, keine breite Marktstudie, keine ausgedachten Unit-Economics.
12. **DACH vor EU-TAM:** Für das Sizing wurde DACH als primärer Beachhead gewählt. Die exakte Zahl der Unternehmen mit 5000+ Mitarbeitenden und EUR 1,5 Mrd.+ Umsatz ist öffentlich nicht sauber in einer Quelle verfügbar, daher wird mit einer transparenten Named-Account-Range und Validierungslogik gearbeitet.
13. **Preis aus Zeitersparnis statt Bauchgefühl:** EUR 990/Monat wurde gegen konservative manuelle Screening-Kosten gespiegelt: 500 Lieferanten × 30-60 Minuten × EUR 30-50/Stunde.
14. **Prototyp-Insight als Positionierung:** `risk_adjusted_exposure` wurde im Business-Case als Differenzierung genutzt, weil es Risiko und Einkaufsvolumen verbindet und damit besser zu Procurement-Entscheidungen passt als eine reine Ampel.

## Schlüssel-Prompts / KI-Collaboration

KI wurde eingesetzt, um Anforderungen zu strukturieren, Code kritisch zu reviewen, Edge Cases zu finden, Tests zu schärfen und Dokumentation zu verdichten. Die wichtigsten Prompts aus dem Verlauf waren sinngemäß:

1. "Take a look at my repo and lets discuss the scope of the dev challenge."
2. "Create a Feature/Todo list ranked from MUST to NICE TO HAVE, including CLI, snippet check, live APIs, UI, live news and deploy."
3. "Take a look at the first vibe-coded version and explain what core functionality is already handled."
4. "Split the code into submodules: I/O, validation, scoring, config and report."
5. "Make console printing, markdown report and input file argument dependent. Support JSON and CSV, reject unsupported formats."
6. "Rank top drivers by weighted score and make that visible in the report."
7. "What do you think about the risk score, that if all is low but only exposure is high, it can still be green?"
8. "Implement that handels_exposure >= 90 forces at least `gelb` and add an explanation that diversification should be considered."
9. "Shouldn't thresholds like the minimum trade exposure yellow thing be defined in config, like sanctionsHardStop?"
10. "Create a `risk_adjusted_exposure` by computing `handelsvolumen_eur_jahr * risiko_score / 100` to give some business risk value to the calculation."
11. "Use `risk_adjusted_exposure` as the secondary sorting value for results."
12. "Implement missing values: impute from country peers, make it visible, and mark unsafe cases red."
13. "For handels_exposure, consider that you cannot just copy from another supplier; also look at HS code."
14. "Treat NA/NaN as missing, numeric strings as numbers, but weird strings as red data-quality problems."
15. "Create a small eval set and reduce the tests because the challenge says no coverage theater."
16. "Research and integrate live WGI, EU sanctions and Comtrade APIs behind `--live`, with fallbacks and source notes."
17. "Question whether the live scores make sense and recalibrate EU FSF from raw/max counts to a conservative median/log country proxy."
18. "How is handels_exposure computed in live mode? If X/Y, what is X and what is Y?"
19. "Add Ollama integration behind `--llm`; keep scoring deterministic, use structured JSON output, batch supplier explanations, and mark generated text."
20. "Document all usage in the root README and all challenge decisions in the dev README."
21. "Fokussiere den Business-Case auf DACH statt EU-weit und recherchiere, wie viele Unternehmen in DE/AT/CH grob 5000+ Mitarbeitende und EUR 1,5 Mrd.+ Umsatz erreichen."
22. "Begründe die Preislogik über interne Prüfungskosten, setze EUR 30-50 pro Stunde an und ergänze EUR 990/Monat mit wöchentlichem Check plus Daily-Check-Upsell für EUR 200/Monat."

## Navigation

- [Root README](./README.md)
- [Developer Notes](./dev/README.md)
- [Self Report](./SELF_REPORT.md)
