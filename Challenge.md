# Lieferketten-Check: AI:AT Challenge

Schön, dass du dabei bist. Dieses Repo enthält alles, was du zum Loslegen brauchst: Aufgabenstellung, Daten und (für die Dev-Rolle) das Code-Snippet.

> Das hier ist kein Trick-Test, sondern ein kleines, echtes Stück Venture-Studio-Arbeit: mit KI schnell etwas Wertvolles bauen bzw. eine Idee auf Marktreife prüfen. Es gibt keine Musterlösung, die du treffen musst. Uns interessiert, wie du ein unscharf spezifiziertes Problem zerlegst, Entscheidungen triffst und KI sinnvoll einsetzt.

## Das Szenario: „Lieferketten-Check"

EU-Unternehmen mit Lieferkette müssen seit der **CSDDD** (Corporate Sustainability Due Diligence Directive) ihre Lieferanten auf Geopolitik-, Sanktions- und ESG-Risiken prüfen. Manuell ist das pro Lieferant Stunden Recherche aus heterogenen Quellen: Governance-Indizes, Sanktionslisten, Handelsstatistiken. „Lieferketten-Check" nimmt eine Lieferantenliste und erzeugt je Lieferant in Sekunden einen erklärbaren Risiko-Score samt Ampel. Ein automatisierter First-Pass, der zeigt, welche Lieferanten grün (unkritisch) sind und welche eine vertiefte Prüfung (gelb/rot) brauchen.

## Wähle deine Challenge

| Rolle | Worum geht's | Start hier |
|---|---|---|
| **AI Developer** | Bau den Lieferketten-Check-Agent + ein kurzes Code-Review | 📂 [`dev/`](./dev/) |
| **AI Business Analyst & Venture Builder** | Ist das ein Geschäft? Business Case + Go-to-Market | 📂 [`business/`](./business/) |

> Du weißt aus dem Gespräch mit uns, welche Rolle deine ist. Leg einfach im passenden Ordner los. Falls unklar, frag kurz per Mail nach. (Neugierig auf die andere Seite? Gern reinschauen, für deine Abgabe zählt nur dein Ordner.)

## Die Daten (`data/`)

Beide Rollen teilen sich dieselbe Datengrundlage:

- [`data/suppliers.json`](./data/suppliers.json): 28 synthetische Lieferanten aus 12 Ländern mit Branchen, Warengruppen, Handelsvolumen und drei normierten Risiko-Dimensionen (Felder dokumentiert in [`data/README.md`](./data/README.md))
- [`data/suppliers.csv`](./data/suppliers.csv): dieselben Daten, bequem in Excel/Sheets zu öffnen
- [`data/examples/`](./data/examples/): 3 Beispiel-Lieferanten-Profile als Ausgangspunkt

> ⚠️ Synthetisch / vereinfacht, Stand 2026-06, keine offizielle AI:AT-Position. Die Lieferanten sind frei erfunden. Die je Land hinterlegten Risiko-Dimensionen sind an echte Worldwide-Governance-Indicators-Werte (World Bank, WGI 2023) angelehnt und vereinfacht; sie sind kein Audit-Ergebnis und keine Aussage über reale Unternehmen oder Länder. Das Ergebnis des Agents ist ein First-Pass-Screening, keine rechts- oder compliance-sichere CSDDD-Auskunft. Kein Domänenwissen nötig, die Felder sind selbsterklärend. *(Business-Rolle: die Markt-/Preis-/Conversion-Zahlen fürs Sizing stecken nicht in den Daten. Die recherchierst du frei, siehe deinen Brief.)*

## Das Wichtigste in Kürze

- **Aufwand:** ~2–4 fokussierte Stunden. Du hast 7 Kalendertage ab Erhalt; das Fenster ist für Flexibilität da, nicht zum Durchgrinden.
- **KI:** Nutze jede KI, jede Library, google frei. Das wird erwartet, nicht nur erlaubt.
- **Abgabe:** per E-Mail an **aiandbusinessgrowth@ai-at.eu**. Für deinen Code und deine Doku erstellst du ein eigenes Repo (z. B. `git init` in deinem Arbeitsordner, oder dieses Repo als Vorlage klonen und zu deinem GitHub/GitLab pushen) und schickst uns den Link. Die konkreten Daten (Abgabedatum, ggf. Upload-Link) stehen in deiner Begleit-E-Mail.
- **Bewertung:** transparent. Die Gewichtung findest du in deinem Rollen-Brief.
- Ein rauer Kern mit klarem Denken schlägt eine polierte, oberflächliche Umsetzung. Mehr Stunden bedeuten bei uns nicht mehr Punkte.

## Fair & transparent

AI Factory Austria steht für Chancengleichheit. Ob Uni, Bootcamp oder self-taught: es zählt, wie du denkst und mit KI arbeitest. Brauchst du Unterstützung oder Anpassungen im Prozess, sag uns Bescheid. Die Challenge ist unbezahlt. Dafür bekommst du echten Gegenwert: nach dem Debrief zeigen wir dir unsere eigene Lösung (mit echten Entscheidungen, Prompts und Trade-offs) und strukturiertes, ehrliches Feedback für jede:n. Kein Ghosting, nie.

> Was du hier nicht findest, ist unsere eigene Referenzlösung. Die heben wir bewusst für den gemeinsamen Debrief auf, damit du frei und ohne Anchoring an die Aufgabe gehst.

*AI:AT Hiring Team*
