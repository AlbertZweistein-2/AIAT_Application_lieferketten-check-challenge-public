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
  // REVIEW: Risiko-Dimensionen sollten validiert werden (Zahl, 0–100, nicht fehlend).
  //         Der Wert 0 ist gültig und darf nicht als fehlend behandelt werden.
  //         Fehlende oder ungültige Werte sollten dokumentiert und konservativ geflaggt werden.

  // REVIEW: Gewichtungen sollten geprüft werden. Die Summe muss nicht 1 sein,
  //         weil unten durch gewichtSumme normalisiert wird; negative,
  //         nicht-numerische oder insgesamt <= 0 gewichtete Eingaben sind aber ungültig.
  const gewichtSumme =
    gewichtung.geopolitik_governance +
    gewichtung.sanktions_exposure +
    gewichtung.handels_exposure;

  // Gewichteter Score: je Dimension den (Governance-/Sanktions-/Handels-)Beitrag
  // bilden und über die Gewicht-Summe normalisieren, damit der Score in 0–100 bleibt.

  // ---------------------------------------------------------------------------
  // REVIEW:
  // 100 - X ist falsch, wenn die Dimensionen bereits so normiert sind, dass hoch = mehr Risiko.
  // const gewichtet =
  //   (100 - dim.geopolitik_governance) * gewichtung.geopolitik_governance +
  //   (100 - dim.sanktions_exposure) * gewichtung.sanktions_exposure +
  //   (100 - dim.handels_exposure) * gewichtung.handels_exposure;

  // FIX:
  const gewichtet =
    dim.geopolitik_governance * gewichtung.geopolitik_governance +
    dim.sanktions_exposure * gewichtung.sanktions_exposure +
    dim.handels_exposure * gewichtung.handels_exposure;

  // ---------------------------------------------------------------------------

  // REVIEW: Rundung vor Kategorisierung kann Grenzwerte kippen; besser wäre:
  //         Ampel mit ungerundetem Score bestimmen, Ausgabe danach runden.
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
