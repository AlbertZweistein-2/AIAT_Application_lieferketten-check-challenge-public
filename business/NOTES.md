# Business Notes

[Zurück zum Root README](../README.md)

Erste, bewusst knappe Notizen für den Business-Teil. Noch kein ausgearbeiteter Business-Case.

## Ausgangspunkt

Der Developer-Teil liefert einen reproduzierbaren First-Pass-Check:

- Supplier-Daten einlesen
- Risiko-Score und Ampel berechnen
- Top-Treiber und Handlungsempfehlung ausgeben
- Reports und Alerts für Follow-up erzeugen

Business-seitig wäre der Nutzen vor allem ein früher Screening-Schritt, bevor Compliance, Einkauf oder Supply-Chain-Teams tiefer recherchieren.

## Mögliche Zielgruppe

- Einkauf / Supplier Management
- Compliance / Legal
- Supply Chain Risk Management
- kleine und mittlere Unternehmen, die keine grosse GRC-Suite betreiben

## Nutzenversprechen

- schnelle Priorisierung auffälliger Lieferanten
- nachvollziehbare Ampel statt Black-Box-Rating
- dokumentierte Datenqualität und klare Fallbacks
- exportierbare Reports für manuelle Prüfung oder Eskalation

## Vorsichtige Grenzen

- kein Ersatz für echte Sanktions-, UBO- oder Legal-Prüfung
- synthetische Seed-Daten sind nur Demo-/Testdaten
- Live-Daten sind Proxies und müssen fachlich eingeordnet werden
- LLM-Texte dürfen nur erklären, nicht entscheiden

## Nächste Business-Ideen

- n8n-Workflow für werktags morgendliche Risiko-Checks und Alert-Versand
- einfache Review-Oberfläche für Einkauf/Compliance
- Live-News- oder Risk-Intelligence-Quelle für Frühwarnungen
- Deployment als kleiner interner Service mit Report-Archiv
- später: Rollen, Audit-Trail und Freigabeprozess
