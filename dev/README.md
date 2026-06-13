# AI Developer Challenge: „Lieferketten-Check"

Version 1.0 · 2026-06 · Kontakt: AI:AT Hiring Team

Schön, dass du dabei bist. Das hier ist kein Trick-Test, sondern ein echtes Stück von dem, was wir im Venture Studio und n8n CoE täglich tun: mit KI schnell etwas Lauffähiges bauen, das Mehrwert schafft.

Es gibt keine Musterlösung, die du treffen musst. Uns interessiert, wie du ein unscharf spezifiziertes Problem zerlegst, Entscheidungen triffst und KI sinnvoll einsetzt.

## Die Mission

EU-Unternehmen mit Lieferkette müssen seit der **CSDDD** (Corporate Sustainability Due Diligence Directive) ihre Lieferanten auf Geopolitik-, Sanktions- und ESG-Risiken prüfen. Manuell ist das pro Lieferant Stunden Recherche aus heterogenen Quellen: Governance-Indizes, Sanktionslisten, Handelsstatistiken.

Bau einen „Lieferketten-Check"-Agent: ein TS/Node-Tool, das eine Lieferantenliste einliest und je Lieferant einen erklärbaren Risiko-Score samt Ampel erzeugt. Ein automatisierter CSDDD-First-Pass, der zeigt, welche Lieferanten grün (unkritisch) sind und welche eine vertiefte Prüfung (gelb/rot) brauchen.

Wir liefern dir ein Seed-Dataset mit 28 synthetischen Lieferanten aus 12 Ländern (JSON), je Lieferant Name, Land, Warengruppe, Handelsvolumen und drei bereits normalisierte Risiko-Dimensionen (Geopolitik/Governance, Sanktions-Exposure, Handels-Exposure). Kein Domänenwissen nötig: alles, was du brauchst, steckt im Dataset und in dieser Aufgabe.

> 📂 Im Repo: [`../data/`](../data/) mit `suppliers.json`, `suppliers.csv` und Beispiel-Profilen (Feld-Doku: [`../data/README.md`](../data/README.md)).
> Muster „fetch → enrich → aggregate → report": Lieferantenliste laden, Dimensionen aggregieren, Bericht ausgeben.

### Teil A: Bau den Agent (Pflicht)

- **Input:** `suppliers.json`, je Lieferant `lieferant_id`, `name`, `land_iso2`, `land_name`, `branche`, `hs_code`, `ware`, `handelsvolumen_eur_jahr` sowie drei Risiko-Dimensionen (alle 0–100, hoch = mehr Risiko).
- **Output:** für jeden Lieferanten ein erklärbarer Risiko-Report:
  - **Risiko-Score** 0–100 (aggregiert aus den drei Dimensionen)
  - **Ampel:** grün / gelb / rot
  - **Treiber-Begründung:** welche Dimensionen treiben den Score (mindestens 1–2 Sätze)
  - **Handlungsempfehlung** (First-Pass: z. B. „unkritisch", „vertiefte Prüfung empfohlen", „sofortige Eskalation")
  - Plus eine **Portfolio-Übersicht:** alle Lieferanten sortiert nach Risiko (höchstes zuerst), mit Ampel-Verteilung.
- **Form:** lauffähiges Git-Repo mit echtem Code und ein README, das uns das Ding in < 5 min zum Laufen bringt, ohne API-Key und deterministisch auf dem Seed. Stack ist dir überlassen (TypeScript/tsx ist naheliegend, aber nichts ist vorgeschrieben).

> Die interessante Design-Entscheidung: Die drei Risiko-Dimensionen haben unterschiedliche Relevanz. Wie gewichtest du sie zu einem Score, und wie begründest du das? (Geopolitik stärker als Handel? Sanktionen als Hard-Blocker?) Es gibt keine vorgegebene Formel, und genau das ist das Signal. Dokumentiere deine Gewichtung als explizite Annahme im README oder im Code-Kommentar. Ebenso: Was tust du, wenn eine Dimension fehlt oder 0 ist? Ignorieren, Default-Wert, oder den Score als „unzureichende Daten" markieren?

> Ein LLM-Call ist erlaubt, z. B. für die Begründungstexte oder Handlungsempfehlungen, aber nicht Pflicht. Regelbasierte Texte sind völlig okay, und es ist kein API-Key nötig. (Optionaler Stretch: Live-Anbindung an World Bank WGI / UN Comtrade / EU-Sanktionsliste über ein `--live`-Flag, mit deterministischem Fallback auf den Seed. Auf den öffentlichen Pfaden brauchst du keinen Key.)

### Teil B: Code-Review (~15 min)

Wir geben dir ein kurzes, KI-generiertes Code-Snippet (TypeScript, keine TS-Erfahrung nötig, der Bug ist sprachunabhängig verständlich). Tipp: vergleiche, was der Doc-Kommentar verspricht, mit dem, was der Code tut, und führe den Code im Kopf an einem Beispiel mit hohem Risiko durch. Es gibt einen zentralen funktionalen Bug. Finde ihn, fixe ihn, und begründe in 3–5 Sätzen, warum es einer ist. Sag uns auch, was dir sonst auffällt: fehlende Edge-Cases, fragwürdige Annahmen, fehlende Normalisierungs-Behandlung, fehlende Tests. Diese weiterführende Kritik zählt für uns genauso wie der Fix selbst. Wir wollen sehen, ob du KI-Output beurteilen kannst, nicht nur erzeugen.

> Das Snippet liegt als Datei unter [`code-review/snippet.ts`](./code-review/snippet.ts) und ist unten in **Anhang A** abgedruckt.

## Spielregeln

- **Aufwand: ~2–4 fokussierte Stunden.** Du hast eine Woche; die ist für Flexibilität da, nicht zum Durchgrinden. Bitte nicht überinvestieren: wir bewerten Denken und Urteil, nicht Politur. *(Die 2–4 h schließen Walkthrough und Decision-Log ein. Loom: 1 Take, 3–5 min; Decision-Log: 5–10 Zeilen Stichworte.)*
- **Nutze jede KI, jede Library, google frei.** Wird erwartet, nicht nur erlaubt. Cursor, Claude, Copilot, Coding-Agents: leg los.
- **Der Kern (A + B) ist die Latte.** Dazu gehören auch ein paar sinnvolle Tests (kein Coverage-Theater; zählen mit 10 %). Echte Stretch-Goals (UI, Live-API-Anbindung, Eval-Set gegen bekannte Hochrisiko-Länder, Alert-Export, Deployment) sind zum Glänzen, komplett optional.

> Ein rauer Kern mit klarem Denken schlägt eine polierte, aber oberflächliche Umsetzung. Wir meinen das ernst, bitte nicht überinvestieren. Mehr Stunden bedeuten bei uns nicht mehr Punkte; wir bewerten das Kern-Ergebnis, nicht den Zeitaufwand.

AI Factory Austria steht für Chancengleichheit. Brauchst du Unterstützung oder Anpassungen im Prozess, sag uns Bescheid, wir helfen. Ob Uni, Bootcamp oder self-taught: es zählt, wie du denkst und mit KI arbeitest.

## Was du abgibst

1. **Repo-Link** (GitHub/GitLab) mit Code und README.
2. **Code-Review-Antwort** (Teil B), als Datei im Repo oder kurzes Doc.
3. **Walkthrough (1 Take, 3–5 min, max. 5):** ein Loom/Screen-Recording. Zeig dein Ergebnis und erklär, wie du gebaut hast, vor allem die KI-Schritte. *(Kein Video möglich oder gewünscht? Ein knappes schriftliches Walkthrough-Skript zählt als gleichwertig, sag einfach Bescheid.)*
4. **Kurzes Decision-Log + Schlüssel-Prompts:** 5–10 Zeilen Entscheidungen und Trade-offs plus die KI-Prompts, die den Unterschied gemacht haben. Zeig uns, wie du mit KI zusammenarbeitest; das ist genau die Fähigkeit, für die wir die Rolle besetzen.
5. **Selbst-Report:** wie viele Stunden hast du investiert? (Ehrlich, kein Maluspunkt.)

## So bewerten wir (transparent)

| Dimension | Gewicht |
|---|---|
| Funktionalität (läuft es, erfüllt es den Kern) | 20% |
| Decomposition & Urteil (Aggregation begründet, Lücken sinnvoll behandelt, gute Trade-offs) | 20% |
| AI-Collaboration / Prozess (wie du KI gehebelt & geprüft hast) | 20% |
| Code-Qualität & Taste (lesbar, wartbar, KI-„Slop" erkannt) | 15% |
| Kommunikation / Doku (README, Decision-Log, Walkthrough) | 15% |
| Tests (sinnvolle Tests, kein Coverage-Theater) | 10% |

> Teil B (Code-Review) fließt nicht in die obige Gewichtung ein. Es ist ein separates Signal mit besonders hohem Informationsgehalt über dein Urteil zu KI-Code und kann bei knappen Entscheidungen den Ausschlag geben.

## Abgabe & Zeitplan

- **Deadline:** Die Begleit-E-Mail nennt das verbindliche Abgabedatum (Richtwert: 7 Kalendertage ab Erhalt).
- **Abgabe:** per E-Mail an aiandbusinessgrowth@ai-at.eu.
- **Rückmeldung:** Wir melden uns innerhalb von ~10 Werktagen, mit einem Termin für den Live-Teil oder einer kurzen Rückmeldung.

> Die konkreten Daten (Abgabedatum, ggf. Upload-Link) findest du in der Begleit-E-Mail zu diesem Brief.

## Danach

Kurzer **Live-Walkthrough (30–45 min):** du zeigst dein Ergebnis, wir setzen live eine neue Anforderung drauf und schauen, wie du deinen eigenen Code erweiterst. Die neue Anforderung ist bewusst klein; es geht darum, wie du laut denkst, nicht um ein perfektes Ergebnis in 10 Minuten. Deine gewohnten KI-Tools darfst du dabei nutzen, genau wie beim Bauen. Danach zeigen wir dir unsere eigene Lösung und reden ehrlich darüber. Jede:r bekommt Feedback, egal wie's ausgeht.

> **Fair & transparent.** Diese Challenge ist unbezahlt. Dafür bekommst du echten Gegenwert: nach dem Debrief zeigen wir dir unsere eigene Lösung, mit echten Entscheidungen, Prompts und Trade-offs. Das ist unser „Learn"-Versprechen in Aktion. Und: strukturiertes, ehrliches Feedback für jede:n, egal wie der Prozess ausgeht. Kein Ghosting, nie.

## Spielregeln zu den Daten

> Das Seed-Dataset ist synthetisch / vereinfacht (Stand 2026-06), keine offizielle AI:AT-Position. Die Lieferanten sind frei erfunden. Die je Land hinterlegten Risiko-Dimensionen sind an echte Worldwide-Governance-Indicators-Werte (World Bank, WGI 2023) angelehnt und vereinfacht; sie sind kein Audit-Ergebnis und keine Aussage über reale Unternehmen oder Länder. Das Ergebnis des Agents ist ein First-Pass-Screening, keine rechts- oder compliance-sichere CSDDD-Auskunft. Jeder JSON-Eintrag trägt ein `_hinweis`-Feld. Behandle die Zahlen als Spielmaterial, nicht als Compliance-Daten.

## Datenschutz

> **Datenschutz.** Deine Unterlagen (Repo-Link, Loom-Link, Dokumente, Prompts) nutzen wir ausschließlich für die Besetzungsentscheidung, geben sie nicht an unbeteiligte Dritte weiter und löschen sie spätestens **sechs Monate** nach Abschluss des Auswahlverfahrens (oder früher auf deinen Wunsch), gemäß DSGVO. Rechtsgrundlage ist die Anbahnung eines möglichen Arbeitsverhältnisses (Art. 6 DSGVO); du kannst jederzeit Auskunft oder Löschung verlangen. Was du erstellst, bleibt deins: wir verwenden es nur zur Bewertung, nie produktiv. Dein Repo kannst du auch privat halten und uns Zugriff geben; deinen Walkthrough sehen nur wir intern. Von dir gewählte Hosting-Dienste (z. B. GitHub, Loom) unterliegen deren eigenen Datenschutzbestimmungen. Fragen: aiandbusinessgrowth@ai-at.eu.

## Anhang A: Code-Snippet (Teil B)

Das ist das Snippet für Teil B: finde den Bug, fixe ihn, kritisiere kurz. (Auch als Datei: [`code-review/snippet.ts`](./code-review/snippet.ts).)

```ts
/**
 * aggregiereRisiko: Aggregiert die drei Risiko-Dimensionen eines Lieferanten zu
 * einem Gesamt-Risiko-Score (0–100) und leitet daraus eine Ampel ab.
 *
 * Konvention der Eingangsdaten (siehe Seed-Schema `data/README.md`):
 * Alle drei Dimensionen sind bereits auf **0–100, hoch = mehr Risiko** normalisiert.
 *   - geopolitik_governance: hoch = schlechtere Governance = mehr Risiko
 *   - sanktions_exposure:    hoch = mehr Sanktions-Treffer = mehr Risiko
 *   - handels_exposure:      hoch = stärkere Import-Konzentration = mehr Risiko
 *
 * Ergebnis: risiko_score 0–100 (hoch = mehr Risiko) + Ampel grün/gelb/rot.
 */

interface RisikoDimensionen {
  geopolitik_governance: number;
  sanktions_exposure: number;
  handels_exposure: number;
}

interface Gewichtung {
  geopolitik_governance: number;
  sanktions_exposure: number;
  handels_exposure: number;
}

type Ampel = "grün" | "gelb" | "rot";

interface RisikoErgebnis {
  risiko_score: number;
  ampel: Ampel;
}

function aggregiereRisiko(
  dim: RisikoDimensionen,
  gewichtung: Gewichtung
): RisikoErgebnis {
  const gewichtSumme =
    gewichtung.geopolitik_governance +
    gewichtung.sanktions_exposure +
    gewichtung.handels_exposure;

  // Gewichteter Score: je Dimension den (Governance-/Sanktions-/Handels-)Beitrag
  // bilden und über die Gewicht-Summe normalisieren, damit der Score in 0–100 bleibt.
  const gewichtet =
    (100 - dim.geopolitik_governance) * gewichtung.geopolitik_governance +
    (100 - dim.sanktions_exposure) * gewichtung.sanktions_exposure +
    (100 - dim.handels_exposure) * gewichtung.handels_exposure;

  const risiko_score = Math.round((gewichtet / gewichtSumme) * 10) / 10;

  let ampel: Ampel;
  if (risiko_score >= 60) {
    ampel = "rot";
  } else if (risiko_score >= 35) {
    ampel = "gelb";
  } else {
    ampel = "grün";
  }

  return { risiko_score, ampel };
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

// Demo-Daten: vereinfachte Illustration, NICHT der echte Datensatz (siehe ../data/suppliers.json).
const gewichtung: Gewichtung = {
  geopolitik_governance: 0.45,
  sanktions_exposure: 0.35,
  handels_exposure: 0.2,
};

const lieferanten: { name: string; land: string; dim: RisikoDimensionen }[] = [
  {
    name: "NordStahl GmbH",
    land: "Österreich",
    dim: { geopolitik_governance: 12, sanktions_exposure: 2, handels_exposure: 10 },
  },
  {
    name: "Ural Metall OOO",
    land: "Russland",
    dim: { geopolitik_governance: 82, sanktions_exposure: 92, handels_exposure: 80 },
  },
];

console.log("Risiko-Screening (First-Pass):");
for (const l of lieferanten) {
  const { risiko_score, ampel } = aggregiereRisiko(l.dim, gewichtung);
  console.log(`  • ${l.name} (${l.land}): Score ${risiko_score}/100 → ${ampel}`);
}
```
