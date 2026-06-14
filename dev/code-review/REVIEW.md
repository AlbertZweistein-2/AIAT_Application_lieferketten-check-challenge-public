## Teil B: Code Review

[Zurueck zu dev/README.md](../README.md)

Review-Datei zum Snippet [snippet.ts](./snippet.ts) aus der Developer-Challenge [dev/Challenge.md](../Challenge.md).

### Zentraler Bug
Der Bug, der diese Implementierung tatsächlich **falsch** macht, ist, dass die Variable `const gewichtet` wie folgt berechnet wird

```typescript
  const gewichtet =
    (100 - dim.geopolitik_governance) * gewichtung.geopolitik_governance +
    (100 - dim.sanktions_exposure) * gewichtung.sanktions_exposure +
    (100 - dim.handels_exposure) * gewichtung.handels_exposure;
```
Im Vergleich zu der korrekten Berechnung, die wie folgt aussieht:

```typescript
  const gewichtet =
    dim.geopolitik_governance * gewichtung.geopolitik_governance +
    dim.sanktions_exposure * gewichtung.sanktions_exposure +
    dim.handels_exposure * gewichtung.handels_exposure;
```
Die falsche Berechnung führt dazu, dass die Werte für `geopolitik_governance`, `sanktions_exposure` und `handels_exposure` invertiert werden, was zu einem völlig falschen Ergebnis führt und "low risk" Unternehmen als "high risk" und umgekehrt klassifiziert.

An den Demo-Daten sieht man den Effekt sehr deutlich:
- `NordStahl GmbH` hätte korrekt einen Score von `8.1` und wäre `grün`. Durch die fehlerhafte Invertierung kommt sie auf `91.9` und wird `rot`.
- `Ural Metall OOO` hätte korrekt einen Score von `85.1` und wäre `rot`. Durch die fehlerhafte Invertierung kommt sie auf `14.9` und wird `grün`.

Das ist kritisch, weil der First-Pass-Check genau die Lieferanten priorisieren soll, die eine vertiefte Prüfung brauchen. Mit dieser Logik würde die Priorisierung fachlich auf den Kopf gestellt.

### Weitere Bugs oder Verbesserungsmöglichkeiten
1. **Fehlende Validierung der Eingabedaten:** Es gibt keine Validierung der Eingabedaten, um sicherzustellen, dass die Werte für `geopolitik_governance`, `sanktions_exposure` und `handels_exposure` tatsächlich vorhanden, numerisch und zwischen `0` und `100` liegen. Wichtig ist dabei: `0` ist ein gültiger Risikowert und darf nicht als fehlender Wert interpretiert werden.
2. **Gewichte werden nicht überprüft:** Die Gewichte müssen nicht zwingend auf `1` summieren, weil die Berechnung durch `gewichtSumme` normalisiert, aber sollten trotzdem validiert werden: `gewichtSumme <= 0` würde zu ungültigen Scores bzw. Division durch Null führen, negative Gewichte würden die fachliche Bedeutung der Risiko-Dimensionen verfälschen, und `NaN`/nicht-numerische Werte würden den Score unbrauchbar machen.
3. **Fehlende Tests:** Sinnvoll wären mindestens Tests für klare Low-Risk- und High-Risk-Beispiele sowie für Grenzwerte der Ampel-Klassifizierung. Genau so ein Test mit den Demo-Daten hätte den Invertierungsfehler sofort sichtbar gemacht.
4. **Rundung vor Klassifizierung:** Die Rundung des `risk_score` ist eine kleine Anmerkung, denn dies kann an Grenzwerten zu Fehlklassifizierungen führen. Beispiel: Ein roher Score von `59.96` würde auf `60.0` gerundet und dadurch als `rot` klassifiziert. Besser wäre es, die Ampel auf Basis des ungerundeten Scores zu bestimmen und nur den Ausgabewert zu runden.
5. **Undokumentierte Schwellenwerte:** Die Ampel-Grenzen `35` und `60` sind plausible Annahmen, werden aber nicht begründet. Gerade bei einem Compliance-First-Pass sollte dokumentiert sein, warum ab welchem Score `gelb` oder `rot` vergeben wird. Zusätzlich könnte man überlegen, ob sehr hohe `sanktions_exposure` unabhängig vom Durchschnitt mindestens `rot` sein sollte, weil Sanktionen fachlich eher ein Hard-Blocker als nur ein gewichteter Faktor sein können.

## Navigation

- [Zurueck zu dev/README.md](../README.md)
- [Zurueck zum Root README](../../README.md)
- [Zum reviewed Snippet](./snippet.ts)
- [Zur Scoring-Implementierung](../../src/scoring.ts)
- [Zu den Tests](../../src/app.test.ts)
