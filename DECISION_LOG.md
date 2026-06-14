# Decision Log + Key Prompts

[Zurueck zum Root README](./README.md)

Dieses Log dokumentiert die wichtigsten Entscheidungen, Trade-offs und KI-Schritte fuer die Developer-Challenge. Es ist bewusst knapp gehalten, weil die Challenge 5-10 Zeilen plus Schluessel-Prompts verlangt.

## Entscheidungen

1. **Kern zuerst, Stretch spaeter:** Der Fokus liegt auf Teil A, Teil B, Tests, README und Decision-Log, weil die Challenge explizit vor Overengineering warnt. UI, n8n, Ollama und Live-News wurden als moegliche Erweiterungen dokumentiert, aber nicht in den Kern gezogen.
2. **Deterministischer CLI-Kern:** Das Tool laeuft ohne API-Key und ohne LLM, damit der Seed-Lauf reproduzierbar bleibt und in unter 5 Minuten pruefbar ist.
3. **Modulare Struktur:** Der urspruengliche Kern wurde in CLI, I/O, Validation, Scoring, Config und Report aufgeteilt, damit Scoring-Logik, Input-Parsing und Output separat nachvollziehbar bleiben.
4. **Gewichtung `40/40/20`:** Governance und Sanktionen zaehlen jeweils `40 %`, Handels-Exposure `20 %`. Sanktionen und Governance sind staerkere Compliance-/Risikotreiber, Handels-Exposure ist eher ein Resilienz-/Konzentrationssignal.
5. **Sanktions-Hard-Stop:** `sanktions_exposure >= 85` erzwingt `rot`, auch wenn der gewichtete Durchschnitt niedriger waere. Sanktionen sind fachlich eher ein Eskalationsgrund als nur ein Durchschnittsfaktor.
6. **Handels-Exposure-Minimum-Gelb:** `handels_exposure >= 90` erzwingt mindestens `gelb`, nicht `rot`. Sehr hohe Bezugs-/Importkonzentration soll eine Diversifikationspruefung ausloesen, aber ohne hohe Governance-/Sanktionswerte nicht automatisch eine rote Compliance-Eskalation.
7. **Top-Treiber nach gewichtetem Beitrag:** Treiber werden nach `Rohwert * Gewicht` sortiert, nicht nach Rohwert. Dadurch erklaert der Report die Dimensionen, die den Score tatsaechlich treiben.
8. **Missing Values sichtbar behandeln:** Bekannte Marker wie `NA`, `N/A`, `NaN`, `unknown`, `k.a.` werden als fehlend interpretiert. Numerische Strings werden gelesen. Nicht interpretierbare Werte wie `"hoch"` werden als Datenqualitaetsproblem konservativ `rot`.
9. **Same-Country-Imputation statt globalem Default:** Fehlende Einzelwerte werden pro Dimension aus Same-Country-Peers per Median imputiert. Kritische fehlende Governance-/Sanktionswerte ohne Peer werden nicht global geraten, sondern konservativ `rot` markiert.
10. **Tests als Guardrails statt Coverage-Theater:** Die Tests decken Input, CLI, Scoring-Entscheidungen, Datenqualitaet, Reports und ein kleines Eval-Set ab. Einige redundante Unit-Tests wurden wieder entfernt, damit die Suite intentional bleibt.

## Schluessel-Prompts / KI-Collaboration

Die folgenden Prompts sind sinngemaess aus dem Arbeitsverlauf zusammengefasst:

1. **Challenge-Verstaendnis:** "Take a look at my repo and tell me what you think they want from me for the dev challenge."
2. **Feature-Priorisierung:** "Let's come up with a Feature List or Todo List ranked from MUST to NICE TO HAVE, including CLI, snippet check, live APIs, UI, live news, deploy."
3. **Code-Verstehen:** "Take a look at the first vibe coded version. What is it doing and which core functionality is already handled?"
4. **Refactoring:** "Split the code into submodules: I/O, validation, scoring, config, report."
5. **CLI/Output:** "Make console printing, markdown report and file input argument dependent. Also support CSV and reject unsupported formats."
6. **Scoring-Kritik:** "Adapt top drivers to rank by weighted score and make that visible in the report."
7. **Missing Values:** "Implement missing values approach. Impute from same-country peers, but make it visible. If all entries are missing, make it red."
8. **Invalid Values:** "Treat NA/NaN as missing, numeric strings as numbers, but weird strings as red data-quality problems."
9. **Tests:** "Make one test file, run it on GitHub, reduce tests because they said no coverage theater, create an eval set."
10. **Documentation:** "Document usage in root README, document all dev decisions in dev README, keep Challenge.md instructions, and add decision log/key prompts/self-report."

## Trade-offs bewusst geschnitten

- **Live-API-Anbindung:** Expliziter Stretch, aber nicht Kern. Ein `--live`-Flag waere sinnvoll als naechster Schritt mit Seed-Fallback.
- **Ollama/LLM:** Fuer Begruendungstexte interessant, aber nicht fuer finale Scores. Der Kern bleibt regelbasiert und reproduzierbar.
- **UI:** Waere demonstrativ, aber fuer die Challenge weniger wichtig als CLI, Review, Tests und Doku.
- **n8n:** Gute Erweiterungsidee fuer geplante Runs und Alerts, aber besser als Architektur-/Walkthrough-Idee statt voreiligem Custom Node.
- **Live-News:** Zu noisy fuer den Kern und nicht unter den konkret genannten Live-Quellen.

## Navigation

- [Root README](./README.md)
- [Developer Notes](./dev/README.md)
- [Self Report](./SELF_REPORT.md)
