# AI Business Analyst & Venture Builder Challenge: „Lieferketten-Check"

Version 1.0 · 2026-06 · Kontakt: AI:AT Hiring Team

Schön, dass du dabei bist. Das hier ist ein echtes Stück Venture-Studio-Arbeit: eine Idee in einer Woche auf Marktreife prüfen und verkaufsfähig machen, mit KI als Hebel.

Es gibt keine Musterlösung, die du treffen musst. Uns interessiert, wie du ein unscharf spezifiziertes Problem zerlegst, Entscheidungen triffst und KI sinnvoll einsetzt.

## Das Szenario

Unser Tech-Team baut einen Prototyp: „Lieferketten-Check", ein KI-Agent, der eine Lieferantenliste einliest und je Lieferant einen erklärbaren Geopolitik-/Sanktions-/ESG-Risiko-Score erzeugt. Hintergrund: die **CSDDD** (Corporate Sustainability Due Diligence Directive, EU-Lieferketten-Sorgfaltspflicht) verpflichtet immer mehr EU-Unternehmen dazu, ihre Lieferketten systematisch zu prüfen, und manuell ist das pro Lieferant Stunden Recherche aus heterogenen Quellen. Deine Aufgabe: Ist das ein Geschäft? Und wie bringen wir es an den Markt?

Wir liefern dir als Orientierung ein Seed-Dataset (synthetische Lieferantenliste als JSON, 28 Lieferanten aus 12 Ländern mit Branchen, Warengruppen und Risiko-Dimensionen). Dasselbe Dataset bekommt auch die Dev-Rolle. *Das Dataset zeigt das Problem (heterogene Risiko-Expositionen quer durch die Lieferkette); deine zahlenden Kund:innen sind die Unternehmen, die CSDDD-Sorgfaltspflichten erfüllen müssen.*

> ⚠️ Wichtig fürs Sizing: Die Daten liefern bewusst keine Markt-, Preis- oder Conversion-Zahlen, sie zeigen nur synthetische Lieferanten-Profile. Anzahl erreichbarer Kund:innen (z. B. wie viele österreichische/europäische Unternehmen ab welcher Größe unter CSDDD fallen), Produktpreis und Conversion recherchierst/schätzt du selbst. KI und Web sind genau dafür da (gern mit Quelle). Die Lieferanten-Profile dienen dazu, dein ICP/Segment zu schärfen (z. B. welche Branchen die höchste CSDDD-Dringlichkeit haben), nicht zur Mengen-Herleitung.

> 📂 Im Repo: [`../data/`](../data/) mit `suppliers.json` und `suppliers.csv` (Feld-Doku: [`../data/README.md`](../data/README.md)).

Für diese Analyse behandelst du Lieferketten-Check als eigenständiges, kommerzielles Venture, losgelöst vom (selbst nicht-kommerziellen, EU-geförderten) AI:AT-Kontext.

## Deine Deliverables (gedeckelt, wir bewerten Denken, nicht Folien-Design)

1. **Lean Canvas** für „Lieferketten-Check" (problem-first).
2. **1-Seiten-Business-Case** mit:
   - **Marktgröße bottom-up.** Die Form zählt: `‹erreichbare Unternehmen mit CSDDD-Pflicht› × ‹Monatspreis› × ‹Conversion›`. *Bitte kein „1 % von einem Riesenmarkt"; eine hergeleitete Zahl schlägt eine große ohne Herleitung.* Leite jeden Faktor sichtbar her. Auch der Preis ist Teil deiner Analyse: begründe ihn, statt ihn anzunehmen, gern relativ zum Aufwand, den das Tool dem Unternehmen einspart. *(Form-Beispiel aus einer ganz anderen Branche, nur zur Struktur-Illustration: 800 regionale Handwerksbetriebe × €29/Monat × 5 %.)*
   - **Grobe Unit Economics** (CAC, ARPU/LTV, Payback). *Kurz: Was kostet ein:e Kund:in (CAC) gegenüber dem, was sie bringt (ARPU pro Monat, LTV über die Lebensdauer), und nach wie vielen Monaten ist der CAC zurückverdient (Payback)? Grobe, begründete Schätzungen genügen.*
   - **Die riskanteste Annahme benannt + ein billiger Test dafür.**
3. **ICP + Value Proposition** für ein Segment (z. B. nur österreichische Mittelstand-Hersteller, oder nur Textil-/Modeketten). Markiere jede Annahme als *validiert* oder *Hypothese*. Schon 2–3 schnelle Signale (kurze Gespräche mit Procurement-/Compliance-Verantwortlichen oder ein Landing-Page-Smoke-Test) heben dieses Deliverable von *solide* auf *stark*; ohne sie taggst du einfach sauber als Hypothese. (Im Zeitfenster nicht machbar? Dann genügt sauberes Taggen, wir erwarten keine Marktforschung.)
4. **Marketing-Mini-Brief:** ein ICP, ein Kanal, **3 hypothetische Ads** (Headline + Body + Visual-Idee), ein **Landing-Page-Hero** (Headline, Subhead, CTA, 3 Value-Bullets) und eine **Mess-Zeile pro Asset** („Erfolg = …").

### Optionaler Stretch (so glänzt du)

Bau eine lauffähige Mini-Automation (n8n, Make, Zapier oder ein Custom-GPT), die einen Teil deiner eigenen Arbeit erledigt hat, z. B. Markt-/Wettbewerbs-Recherche zu CSDDD-Tools, Generierung von Ad-Varianten, Auswertung von Branchenquellen. Erklär kurz das System. Das zeigt uns „automatisiere dich selbst" konkret.

> Zur 20-%-Dimension „AI-Leverage": Schon wie du KI im Arbeitsprozess einsetzt und prüfst (sichtbar in Decision-Log + Prompts) zählt hier voll. Die optionale Automation ist der Weg an die Spitze dieser Dimension, nicht die Eintrittskarte.

## Spielregeln

- **Aufwand: ~2–4 fokussierte Stunden.** Eine Woche Fenster für Flexibilität; bitte nicht überinvestieren. Wir bewerten Schärfe des Denkens, nicht Hochglanz. *(Die 2–4 h schließen Walkthrough und Decision-Log ein. Loom: 1 Take, 3–5 min; Decision-Log: 5–10 Zeilen Stichworte.)*
- **Nutze KI offensiv** (ChatGPT/Claude für Recherche, Sizing, Copy, Analyse). Wird erwartet.
- Deliverables 1–4 sind die Latte; der Stretch ist optional.

> Ein rauer Kern mit klarem Denken schlägt eine polierte, aber oberflächliche Umsetzung. Wir meinen das ernst, bitte nicht überinvestieren. Mehr Stunden bedeuten bei uns nicht mehr Punkte; wir bewerten das Kern-Ergebnis, nicht den Zeitaufwand.

Das Seed-Dataset ist synthetisch/vereinfacht (Stand 2026-06); kein Compliance-Fachwissen nötig. Die Lieferanten-Profile verstehst du ohne Vorwissen (die Markt-/Preis-/Conversion-Zahlen fürs Sizing recherchierst du selbst, siehe oben).

AI Factory Austria steht für Chancengleichheit. Brauchst du Unterstützung oder Anpassungen im Prozess, sag uns Bescheid, wir helfen. Ob Uni, Bootcamp oder self-taught: es zählt, wie du denkst und mit KI arbeitest.

## Was du abgibst

1. **Lean Canvas + Business-Case + ICP/VP + Ads-Brief** (ein PDF oder ein Doc, gern knapp; max. ~5 Slides falls du Slides nutzt).
2. **Walkthrough (1 Take, 3–5 min, max. 5):** ein Loom/Screen-Recording. Führ uns durch dein Denken (Recherche → Insight → Empfehlung) und erklär, wie du KI eingesetzt hast. *(Kein Video möglich oder gewünscht? Ein knappes schriftliches Walkthrough-Skript zählt als gleichwertig.)*
3. **Decision-Log + Schlüssel-Prompts / KI-Workflow:** Schlüssel-Entscheidungen, Trade-offs, was du gecuttet hast, plus die KI-Prompts, die den Unterschied gemacht haben. Zeig uns, wie du mit KI arbeitest.
4. **(Falls Stretch)** Link/Export der Automation plus 3–5 Sätze System-Erklärung.
5. **Selbst-Report:** investierte Stunden (ehrlich).

## So bewerten wir (transparent)

| Dimension | Gewicht |
|---|---|
| Commercial Reasoning (bottom-up, Unit Economics, konsistente Annahmen) | 25% |
| Customer Insight / ICP (scharfes Segment, Annahmen getaggt) | 20% |
| AI-Leverage / „automatisiere dich selbst" | 20% |
| Priorisierung / Scrappiness (was du gecuttet hast & warum) | 15% |
| Marketing / Positioning (ICP-Fit, Kanal-Fit, Mess-Trigger) | 10% |
| Kommunikation / Storytelling | 10% |

## Abgabe & Zeitplan

- **Deadline:** Die Begleit-E-Mail nennt das verbindliche Abgabedatum (Richtwert: 7 Kalendertage ab Erhalt).
- **Abgabe:** per E-Mail an aiandbusinessgrowth@ai-at.eu.
- **Rückmeldung:** Wir melden uns innerhalb von ~10 Werktagen, mit einem Termin für den Live-Teil oder einer kurzen Rückmeldung.

> Die konkreten Daten (Abgabedatum, ggf. Upload-Link) findest du in der Begleit-E-Mail zu diesem Brief.

## Danach

Kurzer **Live-Debrief (30–45 min):** du präsentierst, wir challengen 2–3 deiner Annahmen und schauen, ob du mit neuer Info deine Sicht updatest. Wir spielen ein paar neue Datenpunkte durch: wie würdest du deine Sicht anpassen? Kein Prüfungstrick, sondern wie wir täglich arbeiten.

> **Fair & transparent.** Diese Challenge ist unbezahlt. Dafür bekommst du echten Gegenwert: nach dem Debrief zeigen wir dir unsere eigene Lösung, mit echten Entscheidungen, Prompts und Trade-offs. Das ist unser „Learn"-Versprechen in Aktion. Und: strukturiertes, ehrliches Feedback für jede:n, egal wie der Prozess ausgeht. Kein Ghosting, nie.

## Spielregeln zu den Daten

> Das Seed-Dataset ist synthetisch / vereinfacht (Stand 2026-06), keine offizielle AI:AT-Position. Die Lieferanten sind frei erfunden. Die je Land hinterlegten Risiko-Dimensionen sind an echte Worldwide-Governance-Indicators-Werte (World Bank, WGI 2023) angelehnt und vereinfacht; sie sind kein Audit-Ergebnis und keine Aussage über reale Unternehmen oder Länder. Das Ergebnis ist ein First-Pass-Screening, keine rechts- oder compliance-sichere CSDDD-Auskunft. Behandle die Zahlen als Spielmaterial, nicht als Compliance-Daten.

## Datenschutz

> **Datenschutz.** Deine Unterlagen (Repo-Link, Loom-Link, Dokumente, Prompts) nutzen wir ausschließlich für die Besetzungsentscheidung, geben sie nicht an unbeteiligte Dritte weiter und löschen sie spätestens **sechs Monate** nach Abschluss des Auswahlverfahrens (oder früher auf deinen Wunsch), gemäß DSGVO. Rechtsgrundlage ist die Anbahnung eines möglichen Arbeitsverhältnisses (Art. 6 DSGVO); du kannst jederzeit Auskunft oder Löschung verlangen. Was du erstellst, bleibt deins: wir verwenden es nur zur Bewertung, nie produktiv. Dein Repo kannst du auch privat halten und uns Zugriff geben; deinen Walkthrough sehen nur wir intern. Von dir gewählte Hosting-Dienste (z. B. GitHub, Loom) unterliegen deren eigenen Datenschutzbestimmungen. Fragen: aiandbusinessgrowth@ai-at.eu.
