# Seed-Dataset: Felder & Hinweise

[Zurück zum Root README](../README.md)

> ⚠️ Das Dataset ist synthetisch und vereinfacht (Stand 2026-06) und keine offizielle AI:AT-Position. Die Lieferanten sind frei erfunden. Die je Land hinterlegten Risiko-Dimensionen sind an echte Worldwide-Governance-Indicators-Werte (World Bank, WGI 2023) angelehnt und vereinfacht; sie sind kein Audit-Ergebnis und keine Aussage über reale Unternehmen oder Länder. Das Ergebnis des Agents ist ein First-Pass-Screening, keine rechts- oder compliance-sichere CSDDD-Auskunft. Kein Domänenwissen nötig: die Felder unten verstehst du ohne Vorwissen. Behandle die Zahlen als Spielmaterial, nicht als Compliance-Daten.

## [suppliers.json](./suppliers.json) / [suppliers.csv](./suppliers.csv) (Lieferantenliste)

[suppliers.json](./suppliers.json) und [suppliers.csv](./suppliers.csv) enthalten dieselben Daten: eine synthetische Lieferantenliste mit 28 Einträgen aus 12 Ländern. Die CSV öffnest du bequem in Excel/Sheets; die JSON ist praktisch zum Einlesen im Code.

| Feld | Typ | Bedeutung |
|---|---|---|
| `_hinweis` | string | Synthetik-Disclaimer (Kurzform) |
| `lieferant_id` | string | Stabile ID, z. B. `LF-013` |
| `name` | string | Lieferantenname (synthetisch) |
| `branche` | string | Branche (Textil, Elektronik, Metallverarbeitung, Chemie, …) |
| `land_iso2` | string | ISO-3166-Alpha-2-Code, z. B. `CN` |
| `land_m49` | number | UN-M49-Code (für UN Comtrade, nicht ISO!) |
| `land_name` | string | Klartext-Land (Deutsch) |
| `hs_code` | string | HS-Warencode (2-stelliges Kapitel), z. B. `85` |
| `ware` | string | Klartext zur Warengruppe |
| `handelsvolumen_eur_jahr` | number | Jährliches Handelsvolumen in EUR (**Zahl**, kein String) |
| `risiko_dimensionen.geopolitik_governance` | number | 0–100, **hoch = mehr Risiko** |
| `risiko_dimensionen.sanktions_exposure` | number | 0–100, **hoch = mehr Risiko** |
| `risiko_dimensionen.handels_exposure` | number | 0–100, **hoch = mehr Risiko** |

> **Skalen-Hinweis:** Alle drei Risiko-Dimensionen sind auf 0–100 normalisiert, hoch = mehr Risiko. Die Werte für `geopolitik_governance` orientieren sich an invertierten Worldwide-Governance-Indicators (World Bank, WGI 2023): hoch bedeutet schlechtere Governance und damit mehr Risiko.

**Überblick über die Lieferanten:** 28 Einträge aus 12 Ländern (AT, DE, IT, PL, TR, CN, IN, VN, BD, RU, MY, BR) mit kontrastierenden Risiko-Profilen, von niedrig (Westeuropa) über mittel (Südostasien, Indien) bis hoch (Russland).

[suppliers.json](./suppliers.json) trägt in jedem Eintrag ein `_hinweis`-Feld mit dem Synthetik-Vermerk. *(Die [suppliers.csv](./suppliers.csv) führt den Hinweis ebenfalls je Zeile; der Disclaimer steht zusätzlich hier im README.)*

## [examples/](./examples/) (Beispiel-Lieferanten-Profile)

Drei Beispiel-Profile aus dem Dataset als eigenständige JSON-Dateien, Ausgangspunkt für deine Arbeit:

- [profil_LF-001.json](./examples/profil_LF-001.json): niedriges Risiko (Österreich, Metallverarbeitung)
- [profil_LF-013.json](./examples/profil_LF-013.json): mittleres Risiko (China, Elektronik)
- [profil_LF-024.json](./examples/profil_LF-024.json): hohes Risiko (Russland, Metallverarbeitung)

Die drei Profile sind bewusst kontrastierend gewählt, damit sie das volle Risiko-Spektrum des Datensatzes repräsentieren.

## Echte Datenquellen (optionaler Live-Pfad, Dev-Stretch)

Wer den Live-Pfad bauen möchte, kann folgende offene APIs nutzen; auf den genutzten Pfaden ist kein API-Key erforderlich:

- **World Bank WGI:** `api.worldbank.org/v2` (Governance-Indikator als Proxy)
- **UN Comtrade Preview:** `comtradeapi.un.org/public/v1/preview` (Handels-Exposition, M49-Codes)
- **EU Consolidated Sanctions List:** `webgate.ec.europa.eu/fsd/fsf` (Sanktions-Screening)

Das ist ein optionaler Stretch; der mitgelieferte Seed reicht für die Aufgabe vollständig aus.

## Navigation

- [Zurück zum Root README](../README.md)
- [Zu den Developer-Notizen](../dev/README.md)
- [Zum Eval-Set](./eval-set.json)
