# Self Report

[Zurück zum Root README](./README.md)

## Investierte Zeit

Gesamtzeit: ca. `10 Stunden`

Zeitraum: `2026-06-14` bis `2026-06-16`

Die Challenge nennt bewusst 2-4 fokussierte Stunden als Richtwert. Ich habe mehr Zeit investiert, weil es für mich um eine Bewerbung geht und ich die freie Zeit neben der Uni genutzt habe, um die Lösung sauberer zu machen, Stretches gezielt auszuprobieren und die Entscheidungen nachvollziehbar zu dokumentieren.

## Zeitaufteilung

| Bereich | Zeit |
| --- | ---: |
| Challenge-Verständnis und Priorisierung | ca. 1 h |
| Core-Implementierung | ca. 3 h |
| Teil B / Code Review | ca. 0,5 h |
| Live-API-Stretch | ca. 1,5 h |
| Ollama-/LLM-Stretch | ca. 1 h |
| Input-/Output-Erweiterungen | ca. 0,5 h |
| Dokumentation | ca. 1 h |
| Walkthrough-Vorbereitung und Aufnahme | ca. 0,5 h |
| Puffer für Debugging, Refactoring, Tests | ca. 1 h |

## KI-Nutzung

Genutzte Tools:

- OpenAI Codex
- Claude Code
- GitHub Copilot

Wichtigstes Tool war OpenAI Codex. Codex wurde vor allem genutzt für:
- Implementierung von Funktionen und Modulen
- Vorschläge für Scoring-Formeln und Logik
- Verstehen und Priorisieren der Challenge-Anforderungen
- Refactoring in kleinere Module
- Diskussion von Scoring-Formeln, Schwellen und Edge Cases
- Implementierung von CLI-Flags, Reports, Tests, Live-APIs und Ollama-Integration
- Überprüfung von Datenqualitätsfällen und Dokumentation

Manuell entschieden, geprüft und mit LLM diskutiert wurden insbesondere:

- welche Features umgesetzt und welche bewusst nicht weiterverfolgt werden
- die Gewichtung `40/40/20`
- die Ampel-Schwellen und Hard Stops
- die Behandlung von Missing/Invalid Values
- die Imputationslogik für Governance, Sanktionen und Handels-Exposure
- die Entscheidung, LLMs nur für Text und nicht für Scoring zu verwenden
- die Interpretation der Live-APIs als Proxies statt als belastbare Compliance-Prüfung

## Navigation

- [Root README](./README.md)
- [Decision Log](./DECISION_LOG.md)
- [Developer Notes](./dev/README.md)
