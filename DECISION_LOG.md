# Decision Log + Key Prompts

[Zurück zum Root README](./README.md)

Dieses Log dokumentiert die wichtigsten Entscheidungen, Trade-offs und KI-Schritte für die Developer-Challenge. Es ist bewusst knapp gehalten, weil die Challenge 5-10 Zeilen plus Schlüssel-Prompts verlangt.

## Entscheidungen

1. **Kern zuerst, Stretch später:** Der Fokus lag zuerst auf Teil A, Teil B, Tests, README und Decision-Log, weil die Challenge explizit vor Overengineering warnt. Danach wurden bewusst nur die Stretch-Ziele umgesetzt, die den Kern erweitern, ohne eine UI-Politurspirale zu starten: Live-APIs, Alert-Export und Ollama-Texte.
2. **Deterministischer CLI-Kern:** Das Tool läuft ohne API-Key und ohne LLM, damit der Seed-Lauf reproduzierbar bleibt und in unter 5 Minuten prüfbar ist.
3. **Modulare Struktur:** Der ursprüngliche Kern wurde in CLI, I/O, Validation, Scoring, Config und Report aufgeteilt, damit Scoring-Logik, Input-Parsing und Output separat nachvollziehbar bleiben.
4. **Gewichtung `40/40/20`:** Governance und Sanktionen zählen jeweils `40 %`, Handels-Exposure `20 %`. Sanktionen und Governance sind stärkere Compliance-/Risikotreiber, Handels-Exposure ist eher ein Resilienz-/Konzentrationssignal.
5. **Sanktions-Hard-Stop:** `sanktions_exposure >= 85` erzwingt `rot`, auch wenn der gewichtete Durchschnitt niedriger wäre. Sanktionen sind fachlich eher ein Eskalationsgrund als nur ein Durchschnittsfaktor.
6. **Handels-Exposure-Minimum-Gelb:** `handels_exposure >= 90` erzwingt mindestens `gelb`, nicht `rot`. Sehr hohe Bezugs-/Importkonzentration soll eine Diversifikationsprüfung auslösen, aber ohne hohe Governance-/Sanktionswerte nicht automatisch eine rote Compliance-Eskalation.
7. **Top-Treiber nach gewichtetem Beitrag:** Treiber werden nach `Rohwert * Gewicht` sortiert, nicht nach Rohwert. Dadurch erklärt der Report die Dimensionen, die den Score tatsächlich treiben.
8. **Missing Values sichtbar behandeln:** Bekannte Marker wie `NA`, `N/A`, `NaN`, `unknown`, `k.a.` werden als fehlend interpretiert. Numerische Strings werden gelesen. Nicht interpretierbare Werte wie `"hoch"` werden als Datenqualitätsproblem konservativ `rot`.
9. **Same-Country-Imputation statt globalem Default:** Fehlende Einzelwerte werden pro Dimension aus Same-Country-Peers per Median imputiert. Kritische fehlende Governance-/Sanktionswerte ohne Peer werden nicht global geraten, sondern konservativ `rot` markiert.
10. **Tests als Guardrails statt Coverage-Theater:** Die Tests decken Input, CLI, Scoring-Entscheidungen, Datenqualität, Reports und ein kleines Eval-Set ab. Einige redundante Unit-Tests wurden wieder entfernt, damit die Suite intentional bleibt.

## Live-API-Entscheidungen

1. **`--live` bleibt explizit:** Ohne `--live` nutzt das Tool weiter nur den Seed. Live-APIs sind bewusst Opt-in, weil sie langsamer, rate-limited und nicht voll deterministisch sind.
2. **Probe-Modi zuerst:** WGI, EU FSF und Comtrade wurden zuerst als isolierte Probe-Modi umgesetzt. Dadurch kann jede externe Quelle einzeln getestet werden, ohne sofort das Supplier-Scoring zu verändern.
3. **Live-Probes nur mit `--live`:** API-Probing soll nicht versehentlich im normalen Lauf passieren. `--wgi-probe`, `--eu-sanctions-probe` und `--comtrade-probe` verlangen deshalb `--live`.
4. **World Bank WGI ersetzt Governance:** `geopolitik_governance` wird live aus `GOV_WGI_RL.SC * 0.6 + GOV_WGI_CC.SC * 0.4` berechnet und auf die lokale Risikoskala invertiert. Rechtsstaatlichkeit ist fachlich am nächsten an der GCDDD-/Lieferkettenlogik; Korruptionskontrolle wird als ergänzender Governance-Indikator aufgenommen.
5. **WGI nicht als Durchschnitt aller sechs Dimensionen:** Ein Durchschnitt aller WGI-Scores wäre breiter, aber unschärfer. Voice and Accountability, Political Stability, Government Effectiveness und Regulatory Quality sind relevant, aber weniger direkt als Rule of Law und Control of Corruption für Rechtsdurchsetzung, Vertragsrisiken und Compliance.
6. **WGI-Werte richtig lesen:** Ein WGI-Rule-of-Law-Wert wie Russland `37,1` ist auf einer 0-100-Governance-Skala nicht "hoch", sondern eher schwach bis mittel. Für Risiko wird deshalb invertiert: hohe Governance = niedriges Risiko, niedrige Governance = hohes Risiko.
7. **WGI wird gebatcht:** Die World-Bank-API wird pro Indikator mit mehreren Ländern in einem Request aufgerufen, z. B. `DEU;AUT;CHN`, damit der Live-Lauf schneller und weniger fehleranfällig ist.
8. **ISO2/ISO3-Abdeckung aus MIT-Projekt:** Für WGI wurden ISO2-zu-ISO3-Codes aus `claudiobusatto/ts-country-iso-2-to-3` übernommen. Die Datei wird mit Attribution und MIT-Hinweis dokumentiert, weil World Bank ISO3 erwartet, der Seed aber ISO2 nutzt.
9. **UN Comtrade ersetzt Handels-Exposure nur als Proxy:** Der Public-Preview-Endpunkt liefert Detailzeilen und ist rate-limited. Der Client summiert `primaryValue` und berechnet `reporter imports from partner HS / reporter imports from world HS`. Das ersetzt `handels_exposure`, bleibt aber als Handelskonzentrations-/Importanteils-Proxy dokumentiert; die Werte sind fachlich nicht direkt mit Governance- oder Sanktionsrisiko gleichzusetzen.
10. **Comtrade-Werte bleiben fraglich:** Die Diskussion zeigte, dass Live-Comtrade-Exposure nicht immer intuitiv wirkt. Der Wert bleibt deshalb erklärt als diagnostisches Handels-Exposure aus Reporter-Sicht, mit konfigurierbarem Reporter-Land und klarer Dokumentation im README.
11. **Comtrade wird dedupliziert, gedrosselt und geloggt:** Supplier werden nach `land_m49` und `hs_code` dedupliziert, Weltimporte pro HS-Code gecached, Requests mit begrenzter Concurrency und Request-Spacing ausgeführt und Live-Fortschritt mit `[live]` auf `stderr` geloggt. Das reduziert Laufzeit und `429`-Rate-Limits.
12. **EU FSF ist kein Name-Matching für synthetische Supplier:** Die EU-Sanktionsliste enthält reale Personen/Organisationen; die Supplier-Namen sind synthetisch. Direktes Name-Matching wäre daher fachlich wertlos. Stattdessen wird ein Länder-Proxy über `Address_CountryIso2Code` und `Citizenship_CountryIso2Code` gebildet.
13. **EU FSF ersetzt Sanktionen als konservativ kalibrierter Live-Proxy:** `sanktions_exposure = clamp(25 + 10 * log2((country_count + 1) / (median_count + 1)), 0, 100)`. Median-viele EU-FSF-Entitäten im aktuellen Supplier-Länder-Set ergeben `25/100`; Russland bleibt durch den Ausreißer hoch, normale Länder werden nicht übertrieben hoch bewertet.
14. **Seed nicht mit Live-Wert maxen:** Der Live-Wert soll die jeweilige Dimension ersetzen, nicht durch den Seed übersteuert werden. Die Seed-Daten sind vermutlich synthetisch/AI-generiert und dienen nur als deterministischer Fallback, wenn Live-Daten fehlen oder scheitern.
15. **Sanktions-Score niedriger kalibriert:** Max-Normalisierung und medianzentrierte Varianten machten normale Länder wie Deutschland zu hoch. Die finale Log-Formel mit Basis `25` ist absichtlich konservativer, weil die EU-FSF-Länderzählung nur Listenpräsenz misst, keinen direkten Supplier-Treffer.
16. **EU FSF wird gecached und per `pubDate` validiert:** Die CSV-v1.1-Datei wird unter `.cache/eu-fsf/` gespeichert. Ein Metadata-Sidecar hält die RSS-`pubDate`. Bei Folgeruns wird RSS zuerst gelesen; die CSV wird nur wiederverwendet, wenn die gespeicherte `pubDate` zur aktuellen CSV-v1.1-`pubDate` passt, sonst neu geladen.
17. **Live-Fallback pro Dimension:** WGI, EU FSF und Comtrade laufen im normalen `--live`-Run unabhängig. Wenn eine Quelle scheitert, bleibt nur diese Dimension auf dem Seed-Wert; der Report läuft weiter. Probe-Modi bleiben bewusst strikt und dürfen Fehler sichtbar machen.
18. **Report dokumentiert Datenherkunft:** Markdown- und Konsolenreport enthalten `Datenquellen`. Dort steht, welche Dimension live ersetzt wurde und welche Dimension wegen Fehlern beim Seed-Fallback blieb.
19. **Request-Timeouts für Live-APIs:** WGI und Comtrade haben kurze Timeouts. Dadurch blockiert ein hängender Endpoint nicht den ganzen Report, sondern führt zu einem gefangenen Fallback.
20. **Comtrade-X/Y explizit geklärt:** `handels_exposure` ist `X / Y * 100`, wobei `X` die Summe der Comtrade-`primaryValue`-Importe des Reporter-Landes aus dem Supplier-Land für den HS-Code ist und `Y` die Summe der Reporter-Weltimporte für denselben HS-Code. Das Supplier-Feld `handelsvolumen_eur_jahr` fließt nicht in diese Live-Formel ein.
21. **Comtrade-Reporter auf Österreich gesetzt:** Das "where we are from" ist der Comtrade-Reporter. Der Default wurde von Deutschland (`276`) auf Österreich (`40`) geändert, damit ein normaler `--live`-Lauf die Importabhängigkeit aus österreichischer Sicht berechnet.
22. **Comtrade-Defaultjahr auf 2024 gesetzt:** WGI nutzt ohne `--wgi-year` weiterhin den neuesten verfügbaren World-Bank-Wert, EU FSF nutzt die aktuelle publizierte Liste ohne Jahrparameter, aber Comtrade hat ein fixes Defaultjahr. Dieses Defaultjahr wurde von `2023` auf `2024` geändert.

## LLM-/Ollama-Entscheidungen

1. **LLM bleibt Opt-in:** Ollama läuft nur mit `--llm`. Der normale CLI-Lauf bleibt schnell, deterministisch und ohne lokale Modell-Abhängigkeit prüfbar.
2. **LLM erklärt, scored aber nicht:** Scores, Ampeln, Top-Treiber und Datenqualitätsnotizen kommen ausschließlich aus der TypeScript-Scoring-Logik. Ollama erzeugt nur `KI-Kurzbrief`, `Begründung` und `Empfehlung`.
3. **Lokaler Backend-Fokus:** Für die Challenge reicht ein lokales Ollama-Backend. Multi-Provider-Support wäre mehr Oberfläche als Nutzen und wurde bewusst nicht gebaut.
4. **Prompts in Config:** Die Portfolio- und Supplier-Prompts liegen in `DEFAULT_LLM_CONFIG` in `src/config.ts`, damit Ton, Länge und Anforderungen ohne Code-Änderung angepasst werden können.
5. **Modell-Persistenz:** Wenn `--llm-model` gesetzt wird und vom Config-Default abweicht, wird `DEFAULT_LLM_CONFIG.model` aktualisiert. Ohne CLI-Modell nutzt `--llm` den Config-Default; nur wenn keiner existiert, wird `ollama list` interaktiv angeboten.
6. **Batching statt ein Prompt pro Supplier:** Supplier-Erklärungen werden in Batches generiert, damit der LLM-Lauf nicht 28 einzelne Prompts braucht und trotzdem überschaubar bleibt.
7. **Strukturierte Ollama-Ausgabe:** Die Requests nutzen Ollamas schema-basiertes `format` statt nur generischem JSON-Modus. Für den Portfolio-Brief und Supplier-Batches gibt es getrennte JSON-Schemas.
8. **Temperatur 0:** Die Ollama-Option `temperature: 0` reduziert Varianz, weil die Texte reportfähig und wiederholbarer sein sollen.
9. **Defensive Fallbacks:** Wenn Ollama nicht erreichbar ist, kein Modell gefunden wird, JSON ungültig ist oder ein Batch fehlschlägt, bleiben die regelbasierten Texte erhalten und der Report läuft weiter.
10. **AI-Kennzeichnung:** Jeder LLM-generierte Textblock endet mit `(AI generated)`, damit im Report transparent bleibt, welche Texte generiert wurden.
11. **Erklärungen müssen Werte nennen:** Der Supplier-Prompt verlangt Risiko-Score, Ampel sowie die zwei wichtigsten Top-Treiber mit Rohwert und gewichtetem Beitrag, damit die LLM-Texte nicht nur allgemein klingen.

## Schlüssel-Prompts / KI-Collaboration

KI wurde genutzt für:

- Strukturierung der offenen Anforderungen
- Refactoring in Module
- Diskussion der Gewichtung und Schwellen
- Review von Edge Cases bei Missing Values
- Generierung und Schärfung sinnvoller Tests
- README-/Decision-Log-Formulierung
- Ollama-Integration mit strukturiertem Output und klarer Trennung zwischen deterministischem Score und generiertem Text

Die fachlichen Entscheidungen wurden anschließend explizit im Code, in Tests und in der Dokumentation festgehalten. Das war bewusst wichtiger als eine größere UI oder eine breite Stretch-Implementierung.

Die folgenden Prompts sind sinngemäß aus dem Arbeitsverlauf zusammengefasst:

1. **Challenge-Verständnis:** "Take a look at my repo and tell me what you think they want from me for the dev challenge."
2. **Feature-Priorisierung:** "Let's come up with a Feature List or Todo List ranked from MUST to NICE TO HAVE, including CLI, snippet check, live APIs, UI, live news, deploy."
3. **Code-Verstehen:** "Take a look at the first vibe coded version. What is it doing and which core functionality is already handled?"
4. **Refactoring:** "Split the code into submodules: I/O, validation, scoring, config, report."
5. **CLI/Output:** "Make console printing, markdown report and file input argument dependent. Also support CSV and reject unsupported formats."
6. **Scoring-Kritik:** "Adapt top drivers to rank by weighted score and make that visible in the report."
7. **Missing Values:** "Implement missing values approach. Impute from same-country peers, but make it visible. If all entries are missing, make it red."
8. **Invalid Values:** "Treat NA/NaN as missing, numeric strings as numbers, but weird strings as red data-quality problems."
9. **Tests:** "Make one test file, run it on GitHub, reduce tests because they said no coverage theater, create an eval set."
10. **Documentation:** "Document usage in root README, document all dev decisions in dev README, keep Challenge.md instructions, and add decision log/key prompts/self-report."
11. **Live APIs:** "Research World Bank WGI, UN Comtrade Preview and EU FSF; add probe modes first; then integrate live values under `--live` with explicit caveats and logs."
12. **Score calibration:** "Question whether Comtrade and EU sanctions values make sense as direct replacements; adjust EU FSF from max-normalized counts to a conservative median/log country proxy."
13. **WGI score choice:** "I have no idea about the scores and I think I would just average all six." Daraus entstand die Entscheidung, nicht alle sechs WGI-Indikatoren gleich zu behandeln, sondern Rechtsstaatlichkeit und Korruptionskontrolle zu priorisieren.
14. **WGI/GCDDD fit:** "Sollen wir es adaptieren, weil im GCDDD geht es ja eigentlich um die Rechtsstaatlichkeit? Oder sollen wir auch noch Corruption mit rein nehme?" Daraus entstand `Rule of Law 60 % / Control of Corruption 40 %`.
15. **Live gating:** "The probing of the APIs should only happen if a flag --live is given with the cli execution" und "if I run npm start -- --live, it should use the API to get the score, if live is not present, it should only use the seed."
16. **ISO mapping:** "From another git project, that has MIT license, take this file: src/iso2-to-iso3-map.ts to have all iso2/iso3 codes. Cite it properly."
17. **Comtrade exploration:** "Can we next test how to integrate this API: UN Comtrade Preview..." und "can we integrate it to replace the score?"
18. **Comtrade performance/logging:** "Can the comtrade fetching be somehow sped up? Also add some logs that shows what is executed right now."
19. **Comtrade caveat:** "Somehow the new handels exposure values seem to not make much sense? I am not sure if all the exposure values make so much sense."
20. **EU FSF integration notes:** "Lets keep this in mind and first try to implement the EU sanctions list. Here are some notes..." inklusive RSS, CSV-v1.1, public token, Cache, Spalten und Länder-Proxy.
21. **EU FSF meaning:** "How are the sanctions exposure scores computed?" und "I dont know if this approach makes so much sense..." Daraus entstand die explizite Dokumentation, dass es ein Länder-Proxy und keine echte Sanktionsprüfung ist.
22. **EU FSF calibration:** "What if the sanction score is computed by a comparison to the median sanction score?" sowie "DE being 68..?" Daraus entstand die konservativere median/log-Formel mit Basis `25`.
23. **Seed should not override live:** "do not max it with the given seed. the api is supposed to get new data, not be overwritten by the seed, which is probably also AI generated..."
24. **Decision documentation:** "briefly Document all decisions and findings we made in the Decision log md."
25. **Live hardening:** "WGI and Comtrade should fail gracefully and fall back to seed values, like EU sanctions already does... Implement this fallback and some documentation in the detailed report on where the data came from."
26. **Sanctions cache freshness:** "Does the sanctions list update from time to time?" und "implement a validation for the cached file by publication date."
27. **Stretch-Priorisierung nach UI-Verzicht:** "I will not do UI, but I want to do LLM integration instead." Daraus entstand die Entscheidung, kein Frontend zu bauen und die vorhandene Markdown-/CLI-Strecke mit Ollama zu erweitern.
28. **Ollama-Anforderung:** "Add the Ollama integration. The brief at the begin of the report should also be generated by ollama... use the local ollama endpoint... model qwen3:14b." Daraus entstanden `--llm`, lokaler Ollama-Endpoint, Portfolio-Brief und batched Supplier-Texte.
29. **Flag-Korrektur:** "I did not mean to give you the flag lllm, just llm." Daraus wurde die CLI auf `--llm` / `--no-llm` bereinigt.
30. **Config-editierbare Prompts:** "I want the prompt to be editable in the config file." Daraus wurden `portfolioSystem`, `portfolioUser`, `supplierSystem` und `supplierUser` in `DEFAULT_LLM_CONFIG` verschoben.
31. **Default-Modell persistieren:** "the standard LLM shall be set to the last specified LLM..." Daraus entstand die Logik, `DEFAULT_LLM_CONFIG.model` nach explizitem `--llm-model` oder interaktiver Auswahl für Folgeruns zu aktualisieren.
32. **Strukturierte Outputs:** "Does the current implementation utilize the options of ollama to force json outputs... update this." Daraus wurde generisches `format: "json"` durch schema-basiertes `format` nach Ollama Structured Outputs ersetzt.
33. **Werte in LLM-Erklärungen:** "in the Explanations per Lieferant the model should mention the values, that justified the rating." Daraus entstand die Prompt-Regel, Score, Ampel und Top-Treiber-Werte in jeder Supplier-Begründung zu nennen.
34. **AI-Transparenz:** "add information to all LLM generated text, that it was AI generated.. like after each text block (AI generated)." Daraus wurde ein Marker an Portfolio-Brief, LLM-Begründung und LLM-Empfehlung angehängt.
35. **Comtrade-Formel klären:** "How is the handels_exposure computed in live mode? if X/Y what is X and what is Y?" Daraus wurde die Formel als Reporter-Importanteil dokumentiert: Partnerimporte durch Weltimporte für denselben HS-Code.
36. **Reporter-Land klären und ändern:** "Which country does it use for 'where we are from'?" und danach "Make it austria." Daraus wurde `DEFAULT_COMTRADE_REPORTER_CODE` von `276` auf `40` geändert.
37. **Live-Jahre klären:** "What are the standard years it fetches for the Live APIs?" Daraus wurde festgehalten: WGI = latest available, EU FSF = aktuelle Liste per RSS/CSV, Comtrade = fixes Defaultjahr.
38. **Comtrade-Jahr ändern:** "For comtrade change it to 2024." Daraus wurde `DEFAULT_COMTRADE_YEAR` von `2023` auf `2024` geändert und die README-Beispiele wurden angepasst.

## Trade-offs bewusst geschnitten

- **Live-API-Anbindung:** Als Stretch umgesetzt, aber weiterhin Opt-in. Der Seed-Lauf bleibt der deterministische Kern.
- **Ollama/LLM:** Als Opt-in-Stretch umgesetzt, aber nur für Begründungstexte und Portfolio-Brief. Der Kern bleibt regelbasiert und reproduzierbar.
- **UI:** Wäre demonstrativ, aber für die Challenge weniger wichtig als CLI, Review, Tests und Doku.
- **n8n:** Gute Erweiterungsidee für geplante Runs und Alerts, aber besser als Architektur-/Walkthrough-Idee statt voreiligem Custom Node.
- **Live-News:** Zu noisy für den Kern und nicht unter den konkret genannten Live-Quellen.
- **Echte Sanktionsprüfung:** Ohne reale Supplier-Namen, Eigentümer und Beneficial Owners bleibt EU FSF nur ein Länder-/Screening-Proxy, keine belastbare Sanktionsprüfung.
- **Comtrade als Score-Ersatz:** Der Comtrade-Wert ist als Live-Stretch akzeptiert, aber fachlich nur ein Importanteils-/Konzentrationssignal. Für eine echte Lieferkettenrisikobewertung wären zusätzliche Handelsdaten, Importabhängigkeit, Substituierbarkeit und kritische Materialien nötig.
- **Cache-Frische vs. Offline-Fallback:** EU FSF prüft für normale Live-Läufe RSS vor Cache-Nutzung. Wenn RSS nicht erreichbar ist, fällt der normale `--live`-Run auf Seed zurück statt blind eine eventuell veraltete CSV als frisch zu behandeln.

## Navigation

- [Root README](./README.md)
- [Developer Notes](./dev/README.md)
- [Self Report](./SELF_REPORT.md)
