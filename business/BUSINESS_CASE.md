# Lieferketten-Check: Business Case

[Zurück zum Root README](../README.md)

Stand: `2026-06-16`

## Kurzfazit

Lieferketten-Check ist als eigenständiges Venture vor allem dann interessant, wenn es nicht als vollständiges CSDDD-/GRC-System positioniert wird, sondern als schneller First-Pass für große DACH-Unternehmen mit komplexer physischer Lieferkette.

Die kaufrelevante Frage ist:

> Welche Lieferanten müssen Compliance, Procurement oder Sustainability zuerst prüfen?

Der Prototyp passt dazu, weil er nicht nur eine Ampel erzeugt, sondern Risiko und Einkaufsvolumen über `risk_adjusted_exposure` verbindet. Damit priorisiert das Tool nicht nur "riskant", sondern "riskant und wirtschaftlich relevant".

## Lean Canvas

| Feld | Inhalt |
| --- | --- |
| Problem | Manuelle Lieferantenprüfung ist langsam, Quellen sind fragmentiert, und Teams priorisieren oft ohne klare Verbindung zwischen Risiko und Einkaufsvolumen. |
| Kundensegment | DACH-Unternehmen mit `5000+` Mitarbeitenden, `EUR 1,5 Mrd.+` Umsatz und internationaler physischer Lieferkette. Schwerpunkt: Automotive, Maschinenbau, Elektronik, Chemie/Pharma, Metall, Retail/Food und Bauzulieferer. |
| Early Adopter | Head of Procurement, Compliance Officer, Sustainability/ESG Lead oder Supply-Chain-Risk-Team. |
| Value Proposition | "In 10 Minuten sehen, welche Lieferanten wahrscheinlich unkritisch sind und wo Audit-/Compliance-Budget zuerst hin muss." |
| Lösung | Lieferantenliste hochladen, Risiko-Ampel, Top-Treiber, Sanktions-/Governance-/Handelsindikatoren, risk-adjusted exposure, Export für Review. |
| Kanäle | Manuell kuratierter DACH-Account-Outbound, LinkedIn an Procurement/Compliance, Partner über ESG-/Legal-/Supply-Chain-Beratungen. |
| Revenue | SaaS pro Unternehmen. Base: `EUR 990/Monat` inkl. wöchentlichem Check. Daily-Check-Upsell: `+EUR 200/Monat`. Live-API-Upsell: `+EUR 500/Monat`. News-/Early-Warning-Upsell: `+EUR 1.000/Monat`. |
| Kostenstruktur | Hosting, Daten-/API-Zugriffe, LLM-Kosten für Texte, Sales-Zeit, fachliche Pflege der Scoring-Logik, Security/Legal/Customer Success. |
| Metriken | Positive Antworten je Zielaccount, qualifizierte Gespräche, Pilot-/Snapshot-Runs, zahlende Kunden, geprüfte Lieferanten pro Kunde. |
| Unfair Advantage | Der First-Pass ist im Developer-Prototyp bereits lauffähig; `risk_adjusted_exposure` übersetzt Risiko in wirtschaftliche Priorisierung. |

## DACH-Absatzpotenzial

### Regulatorischer Ausgangspunkt

Die Europäische Kommission nennt nach Omnibus I ca. `6.000` EU-Unternehmen im CSDDD-Scope: mindestens `5.000` Mitarbeitende und `EUR 1,5 Mrd.` weltweiter Nettoumsatz. Für Nicht-EU-Unternehmen nennt sie ca. `900` Unternehmen mit mindestens `EUR 1,5 Mrd.` EU-Umsatz. Anwendung: ab `26. Juli 2029`, Reportingmaßnahmen ab Geschäftsjahren ab `1. Januar 2030`.

Quelle: [European Commission: Corporate sustainability due diligence](https://commission.europa.eu/topics/business-and-industry/doing-business-eu/sustainability-due-diligence-responsible-business/corporate-sustainability-due-diligence_en).

Für diesen Business Case ist DACH der primäre Beachhead. EU-weit ist sekundär, weil eine fokussierte DACH-Account-Liste operativ realistischer ist und besser zum ersten Sales-Test passt.

### Warum keine exakte DACH-Zahl?

Eine frei verfügbare, saubere Liste "alle DE/AT/CH-Unternehmen mit 5000+ Mitarbeitenden und EUR 1,5 Mrd.+ Umsatz" ist öffentlich nicht in einer einzigen belastbaren Quelle verfügbar. Deshalb wird hier keine Scheingenauigkeit behauptet.

Die Herleitung nutzt stattdessen drei Stufen:

1. Regulatorischer Scope über die EU-Kommission.
2. Nationale Top-Unternehmensrankings als Account-Quelle.
3. Branchen- und Lieferkettenfilter als Fit-Kriterium.

### Arbeitsfähige DACH-Schätzung

| Land | Recherchebasis | Grobe direkte Account-Zahl | Kommentar |
| --- | --- | ---: | --- |
| Deutschland | EU-Scope + deutsche Großunternehmen/Familienunternehmen/Forbes-Listen als Account-Quelle | `350-550` | Deutschland ist der größte DACH-Markt. Öffentliche Börsenlisten unterschätzen den Markt, weil viele relevante Familienunternehmen nicht enthalten sind. |
| Österreich | trend TOP 500 als Account-Quelle; Top-25 liegen bereits bei ca. EUR 4,5 Mrd.+ Umsatz | `35-60` | Viele Top-Unternehmen erfüllen Umsatz und Mitarbeiterzahl, nach Branchenfilter fallen Banken, lokale Utilities und reine Dienstleister teilweise raus. |
| Schweiz | Handelszeitung/Dun & Bradstreet Top 500; Umsatzschwelle von ca. CHF/EUR 1,5 Mrd. liegt grob bei Rang 120-125 | `45-90` | Schweiz ist Nicht-EU; rechtlich zählt EU-Umsatz. Für Go-to-Market trotzdem relevant wegen großer Pharma-, Maschinenbau-, Rohstoff-, Logistik- und Food-Unternehmen. |
| Summe DACH | Konsolidierte Hypothese | `430-700` | Das ist das geschätzte Named-Account-Universum, nicht eine amtliche Zahl. |

Quellen/Anker:

- EU-Kommission: `6.000` EU-Unternehmen im Scope.
- [trend TOP 500 Rankinghinweise](https://top500.trend.at/rankinghinweise): Ranking nach Nettoumsatz, Daten per Fragebogen/Recherche/KSV1870.
- [Österreich Top-500-Zusammenfassung](https://de.wikipedia.org/wiki/Liste_der_gr%C3%B6%C3%9Ften_Unternehmen_in_%C3%96sterreich): Top 500 kumuliert ca. EUR 646,3 Mrd. Umsatz, Mindestgrenze ca. EUR 221 Mio.; Top 25 zeigen Größenordnung.
- [Schweiz Top-500-Zusammenfassung](https://de.wikipedia.org/wiki/Liste_der_gr%C3%B6ssten_Unternehmen_in_der_Schweiz): Top-500-Liste von Handelszeitung/Dun & Bradstreet; ca. Rang 124 liegt noch bei CHF 1,5 Mrd. Umsatz.
- [Forbes-Deutschland-Liste](https://de.wikipedia.org/wiki/Liste_der_gr%C3%B6%C3%9Ften_Unternehmen_in_Deutschland_%28Forbes_2000%29): zeigt große börsennotierte deutsche Unternehmen, ist aber kein vollständiges Zielaccount-Register.

## Fit-Kriterium: Wer ist wirklich adressierbar?

Nicht jedes große Unternehmen ist ein guter Kunde. Ein guter Fit braucht:

1. Viele physische Lieferanten.
2. Internationale Beschaffung.
3. Relevante Warengruppen mit Governance-/Sanktions-/ESG-Risiko.
4. Ein internes Team, das Lieferanten priorisieren muss.

Praktischer Filter für die Account-Liste:

| Filter | Begründung |
| --- | --- |
| Einschluss: Automotive, Maschinenbau, Elektronik, Chemie/Pharma, Metall, Food/Retail, Bauzulieferer, Logistik | Hohe physische Lieferketten-Komplexität; passt zum Problem und zum Prototyp. |
| Ausschluss: Banken, Versicherungen, reine Software, lokale Immobilien, rein nationale Dienstleister | Haben zwar Lieferanten, aber der CSDDD-Lieferketten-Pain ist weniger direkt produktionsnah. |
| Global footprint: internationale Standorte, Exportquote, Einkaufs-/Produktionsnetzwerk | Proxy für Länder-, Sanktions- und Governance-Risiken. |
| Supplier count sichtbar oder plausibel `>500` | Ab dieser Größenordnung wird Priorisierung wertvoller als Einzelfallprüfung. |

Aus den `430-700` DACH-Großaccounts wird konservativ angenommen, dass `40-55%` für First-Pass-Screening passen:

`430-700 × 40-55% = ca. 170-385 passende Zielaccounts`

Diese Zahl ist bewusst als Hypothese formuliert. Sie müsste über eine manuell kuratierte Account-Liste validiert werden.

## Wie Supplier-Komplexität validiert wird

Für eine echte Validierung würde die Account-Liste so aufgebaut:

1. DACH-Top-Unternehmensrankings erfassen.
2. Unternehmen mit `5000+` Mitarbeitenden und `EUR 1,5 Mrd.+` Umsatz markieren.
3. Branche/NACE und "physical supply chain" taggen.
4. Nachhaltigkeitsberichte/Jahresberichte nach Begriffen wie `supplier`, `suppliers`, `Lieferanten`, `supply chain`, `procurement spend` durchsuchen.
5. Wenn ein Supplier Count nicht öffentlich ist, Proxy nutzen: Produktionsstandorte, Einkaufsvolumen, Anzahl Warengruppen, Internationalitätsgrad.
6. Für die ersten 30 Accounts manuell prüfen; daraus eine Trefferquote für den Rest ableiten.

Arbeitsannahme:

> Für große DACH-Hersteller sind `500-2.000` prüfpflichtige oder prüfrelevante Lieferanten eine konservative Hypothese. Das wird im Smoke-Test validiert, indem der kostenlose Snapshot auf 20-50 Lieferanten begrenzt und nach der Gesamtzahl aktiver Lieferanten gefragt wird.

## Preislogik

Base: `EUR 990/Monat` inkl. wöchentlichem Check der Lieferantenliste.

Begründung:

- Der Wert liegt nicht im Report selbst, sondern in gesparter Priorisierungszeit.
- Manuelle Erstprüfung umfasst typischerweise: Land/Warengruppe prüfen, Sanktions-/Governance-Indikatoren recherchieren, Dokumentationsnotiz schreiben, Eskalation entscheiden.
- Konservative Arbeitsannahme: `30-60 Minuten` First-Pass pro Lieferant.
- Bei `500` Lieferanten sind das `250-500 Stunden`.
- Bei internem blended Cost von `EUR 30-50/Stunde` sind das `EUR 7.500-25.000` interne Kosten.
- Jahrespreis Base: `EUR 11.880`.

Damit muss Lieferketten-Check nicht 100% der Arbeit ersetzen. Es reicht, wenn das Tool `25-40%` der manuellen Erstscreening-Zeit spart oder Eskalationen besser priorisiert.

Upsells:

| Paket | Preis | Nutzen |
| --- | ---: | --- |
| Base | EUR 990/Monat | Upload, deterministischer Score, Ampel, Top-Treiber, risk-adjusted exposure, Export, wöchentlicher Check. |
| Daily Check | +EUR 200/Monat | Täglicher Check der Lieferantenliste statt wöchentlichem Check; relevant für Unternehmen mit häufiger Lieferantenänderung oder höherem Sanktions-/Geopolitik-Risiko. |
| Live APIs | +EUR 500/Monat | Nutzt die bereits implementierten Live-Quellen für WGI, EU-Sanktionsdaten und Comtrade-Proxies. Mehr Aktualität, bessere Auditierbarkeit. |
| Live News / Early Warning | +EUR 1.000/Monat | Noch nicht implementiert, aber naheliegender Upsell: Monitoring von News, Sanktionen, geopolitischen Ereignissen, Push-Alerts bei Länder-/Warengruppen-Risiken. |


## Umsatzabschätzung Jahr 1

Formel:

`erreichbare Zielaccounts × Conversion × Monatspreis`

Jahr-1-Beachhead:

- Manuell kuratierte Named-Account-Liste: `100` DACH-Unternehmen.
- Erwarteter First-Pass-Fit nach Vorqualifikation: `70` Unternehmen.
- Pilot-/Kunden-Conversion auf passende Accounts: `10%`.
- Base-Preis: `EUR 990/Monat`.

Ergebnis Base:

`70 × 10% × EUR 990 = EUR 6.930 MRR`

`EUR 6.930 × 12 = EUR 83.160 ARR`

Upside mit naheliegenden Upsells:

- 7 Base-Kunden × EUR 990 = `EUR 6.930 MRR`
- 4 Kunden nehmen Daily-Check-Upsell × EUR 200 = `EUR 800 MRR`
- 4 Kunden nehmen Live-API-Upsell × EUR 500 = `EUR 2.000 MRR`
- 2 Kunden nehmen News-/Early-Warning-Upsell × EUR 1.000 = `EUR 2.000 MRR`

Ergebnis Upside:

`EUR 11.730 MRR = EUR 140.760 ARR`

Diese Schätzung ist bewusst klein. Sie beschreibt einen glaubwürdigen ersten Sales-Test, nicht den theoretischen Markt.

## Maximal adressierbarer Umsatz DACH

Konservative DACH-Fit-Range:

`170-385 passende Zielaccounts`

Base-only-Szenario:

`170-385 × EUR 990 × 12 = EUR 2,02 Mio. bis EUR 4,57 Mio. ARR`

Szenario mit durchschnittlichem Paketpreis von `EUR 1.690/Monat`:

Annahme: Ein relevanter Teil der Kunden nimmt Daily Check und Live-API-Upsell, aber nicht jeder Kunde nimmt News-/Early-Warning.

`170-385 × EUR 1.690 × 12 = EUR 3,45 Mio. bis EUR 7,81 Mio. ARR`

Interpretation:

Der direkt adressierbare DACH-Markt ist kein riesiger Massenmarkt. Das Venture kann trotzdem attraktiv sein, wenn:

1. der First-Pass klar genug spart,
2. die Sales-Zyklen kurz genug bleiben,
3. Live-Daten und Monitoring als Upsells funktionieren,
4. später indirekt betroffene Zulieferer oder EU-weite Accounts dazukommen.

## Riskanteste Annahme + Billiger Test

Riskanteste Annahme:

> Große DACH-Unternehmen zahlen für ein eigenständiges First-Pass-Screening, obwohl sie bereits ERP, GRC, ESG-Reporting oder Beratungen nutzen.

Billiger Test in 5 Arbeitstagen:

1. 100 DACH-Accounts manuell kuratieren.
2. Je Account eine Hypothese erfassen: Branche, Lieferketten-Komplexität, mögliche Trigger-Quelle, relevante Rolle.
3. Outbound an Procurement/Compliance/Sustainability mit Angebot: "20 Lieferanten kostenlos als anonymisierter First-Pass."
4. In jedem Gespräch fragen: Anzahl aktiver Lieferanten, bisheriger Prüfprozess, Zeit pro Erstprüfung, vorhandene Tools, Zahlungsbereitschaft.
5. Erfolg: `>5` echte Gespräche, `>2` Preis-/Pilotgespräche, mindestens ein Account liefert echte Lieferantendaten.

## Quellen

- [European Commission: Corporate sustainability due diligence](https://commission.europa.eu/topics/business-and-industry/doing-business-eu/sustainability-due-diligence-responsible-business/corporate-sustainability-due-diligence_en)
- [trend TOP 500 Rankinghinweise](https://top500.trend.at/rankinghinweise)
- [Liste der größten Unternehmen in Österreich](https://de.wikipedia.org/wiki/Liste_der_gr%C3%B6%C3%9Ften_Unternehmen_in_%C3%96sterreich)
- [Liste der grössten Unternehmen in der Schweiz](https://de.wikipedia.org/wiki/Liste_der_gr%C3%B6ssten_Unternehmen_in_der_Schweiz)
- [Liste der größten Unternehmen in Deutschland (Forbes 2000)](https://de.wikipedia.org/wiki/Liste_der_gr%C3%B6%C3%9Ften_Unternehmen_in_Deutschland_%28Forbes_2000%29)
- [Challenge-Brief](./Challenge.md)
- [Developer-Prototyp und Portfolio-Report](../README.md)
