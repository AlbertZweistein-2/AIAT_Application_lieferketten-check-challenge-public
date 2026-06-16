import { RISK_DIMENSION_LABELS } from "./config";
import type {
  CompleteRiskDimensions,
  RiskConfig,
  RiskDimensionKey,
  RiskDriver,
  RiskResult,
  Supplier,
  TrafficLight,
} from "./types";

const RISK_DIMENSIONS: RiskDimensionKey[] = [
  "geopolitik_governance",
  "sanktions_exposure",
  "handels_exposure",
];

/** Scores all suppliers and returns them sorted from highest to lowest risk. */
export function assessSuppliers(suppliers: Supplier[], config: RiskConfig): RiskResult[] {
  const imputationContext = createImputationContext(suppliers);

  return suppliers
    .map((supplier) => assessSupplier(supplier, config, imputationContext))
    .sort((a, b) => b.risiko_score - a.risiko_score);
}

/** Scores one supplier, including imputation, forced ampels, reasoning and recommendation text. */
export function assessSupplier(
  supplier: Supplier,
  config: RiskConfig,
  imputationContext = createImputationContext([supplier])
): RiskResult {
  const normalized = normalizeRiskDimensions(supplier, imputationContext);
  const dim = normalized.dimensions;
  const drivers = getRiskDrivers(dim, config);
  const weightedScore = drivers.reduce((sum, driver) => sum + driver.contribution, 0);
  const risiko_score = round1(weightedScore);
  const tradeExposureAmpel = getTradeExposureMinimumAmpel(dim.handels_exposure, config);
  const forcedAmpel = strongestForcedAmpel(normalized.forcedAmpel, tradeExposureAmpel);
  const ampel = applyForcedAmpel(classifyRisk(risiko_score, dim, config), forcedAmpel);
  const treiber = drivers.slice(0, 2);
  const scoredSupplier = {
    ...supplier,
    risiko_dimensionen: dim,
  };
  const begruendung = generateReasoning(
    scoredSupplier,
    risiko_score,
    ampel,
    treiber,
    tradeExposureAmpel !== undefined
  );
  const handlungsempfehlung = generateRecommendation(
    ampel,
    dim,
    config,
    normalized.forcedAmpel === "rot"
  );

  return {
    supplier: scoredSupplier,
    risiko_score,
    ampel,
    treiber,
    begruendung,
    handlungsempfehlung,
    datenqualitaet: normalized.notes,
  };
}

/** Classifies the weighted score into a traffic light, with sanctions as a hard-stop override. */
export function classifyRisk(
  score: number,
  dim: CompleteRiskDimensions,
  config: RiskConfig
): TrafficLight {
  if (dim.sanktions_exposure >= config.thresholds.sanctionsHardStop) {
    return "rot";
  }

  if (score >= config.thresholds.redScore) {
    return "rot";
  }

  if (score >= config.thresholds.yellowScore) {
    return "gelb";
  }

  return "grün";
}

type ImputationContext = {
  countryMedians: Map<string, Partial<Record<RiskDimensionKey, number>>>;
};

type NormalizedRiskDimensions = {
  dimensions: CompleteRiskDimensions;
  notes: string[];
  forcedAmpel?: TrafficLight;
};

function createImputationContext(suppliers: Supplier[]): ImputationContext {
  const countryValues = new Map<string, Record<RiskDimensionKey, number[]>>();
  for (const supplier of suppliers) {
    const valuesForCountry =
      countryValues.get(supplier.land_iso2) ??
      {
        geopolitik_governance: [],
        sanktions_exposure: [],
        handels_exposure: [],
      };

    for (const key of RISK_DIMENSIONS) {
      const value = supplier.risiko_dimensionen[key];

      if (isRiskNumber(value)) {
        valuesForCountry[key].push(value);
      }
    }

    countryValues.set(supplier.land_iso2, valuesForCountry);
  }

  const countryMedians = new Map<string, Partial<Record<RiskDimensionKey, number>>>();

  for (const [country, values] of countryValues.entries()) {
    countryMedians.set(country, {
      geopolitik_governance: median(values.geopolitik_governance),
      sanktions_exposure: median(values.sanktions_exposure),
      handels_exposure: median(values.handels_exposure),
    });
  }

  return { countryMedians };
}

/** Normalizes missing/invalid dimensions and records any data-quality notes for the report. */
function normalizeRiskDimensions(
  supplier: Supplier,
  context: ImputationContext
): NormalizedRiskDimensions {
  const invalidKeys = RISK_DIMENSIONS.filter((key) =>
    isInvalidRiskDimension(supplier.risiko_dimensionen[key])
  );

  if (invalidKeys.length > 0) {
    return createForcedRedResult(
      invalidKeys.map((key) => {
        const value = supplier.risiko_dimensionen[key];
        const rawValue = isInvalidRiskDimension(value) ? value.rawValue : "unknown";

        return `${RISK_DIMENSION_LABELS[key]} ist ungültig angegeben (${rawValue}); Ampel wird konservativ auf rot gesetzt und der Score als 100/100 behandelt. Bitte um Nachkorrektur der Daten für ${supplier.name}.`;
      })
    );
  }

  const missingKeys = RISK_DIMENSIONS.filter(
    (key) => supplier.risiko_dimensionen[key] === undefined
  );
  const allDimensionsMissing = missingKeys.length === RISK_DIMENSIONS.length;

  if (allDimensionsMissing) {
    return createForcedRedResult([
      `Alle Risiko-Dimensionen fehlen; Ampel wird konservativ auf rot gesetzt und der Score als 100/100 behandelt. Bitte um Nachkorrektur der Daten für ${supplier.name}.`,
    ]);
  }

  const dimensions = { ...supplier.risiko_dimensionen } as Partial<CompleteRiskDimensions>;
  const notes: string[] = [];
  let forceMinimumYellowForMissingTrade = false;

  for (const key of missingKeys) {
    const countryMedian = context.countryMedians.get(supplier.land_iso2)?.[key];

    if (countryMedian !== undefined) {
      dimensions[key] = countryMedian;
      notes.push(
        `${RISK_DIMENSION_LABELS[key]} fehlte und wurde mit dem Länder-Median für ${supplier.land_name} (${countryMedian}/100) imputiert.`
      );
      continue;
    }

    if (key === "handels_exposure") {
      dimensions[key] = 100;
      forceMinimumYellowForMissingTrade = true;
      notes.push(
        `${RISK_DIMENSION_LABELS[key]} fehlte; kein Länder-Peer für ${supplier.land_name} verfügbar. Der Wert wurde konservativ auf 100/100 gesetzt und die Ampel mindestens auf gelb angehoben.`
      );
      continue;
    }

    return createForcedRedResult([
      `${RISK_DIMENSION_LABELS[key]} fehlte; kein Länder-Peer für ${supplier.land_name} verfügbar. Ampel wird konservativ auf rot gesetzt und der Score als 100/100 behandelt.`,
    ]);
  }

  return {
    dimensions: dimensions as CompleteRiskDimensions,
    notes,
    forcedAmpel: forceMinimumYellowForMissingTrade ? "gelb" : undefined,
  };
}

function isRiskNumber(value: Supplier["risiko_dimensionen"][RiskDimensionKey]): value is number {
  return typeof value === "number";
}

function isInvalidRiskDimension(
  value: Supplier["risiko_dimensionen"][RiskDimensionKey]
): value is { status: "invalid"; rawValue: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    value.status === "invalid"
  );
}

function createForcedRedResult(notes: string[]): NormalizedRiskDimensions {
  return {
    dimensions: {
      geopolitik_governance: 100,
      sanktions_exposure: 100,
      handels_exposure: 100,
    },
    notes,
    forcedAmpel: "rot",
  };
}

/** Applies conservative minimum ampels without lowering a worse calculated result. */
function applyForcedAmpel(calculated: TrafficLight, forced: TrafficLight | undefined): TrafficLight {
  if (!forced) {
    return calculated;
  }

  const rank: Record<TrafficLight, number> = {
    grün: 0,
    gelb: 1,
    rot: 2,
  };

  return rank[calculated] >= rank[forced] ? calculated : forced;
}

function strongestForcedAmpel(
  first: TrafficLight | undefined,
  second: TrafficLight | undefined
): TrafficLight | undefined {
  if (!first) {
    return second;
  }

  if (!second) {
    return first;
  }

  return applyForcedAmpel(first, second);
}

function getTradeExposureMinimumAmpel(
  value: number,
  config: RiskConfig
): TrafficLight | undefined {
  return value >= config.thresholds.tradeExposureMinimumYellow ? "gelb" : undefined;
}

/** Computes each dimension's weighted contribution and orders drivers by actual score impact. */
function getRiskDrivers(dim: CompleteRiskDimensions, config: RiskConfig): RiskDriver[] {
  return RISK_DIMENSIONS.map((key) => {
    const value = dim[key];
    const weight = config.weights[key];

    return {
      key,
      label: RISK_DIMENSION_LABELS[key],
      value,
      weight,
      contribution: round1(value * weight),
    };
  }).sort((a, b) => b.contribution - a.contribution);
}

/** Produces the deterministic supplier explanation used when no LLM text is applied. */
function generateReasoning(
  supplier: Supplier,
  score: number,
  ampel: TrafficLight,
  drivers: RiskDriver[],
  highTradeExposure: boolean
): string {
  const driverText = formatDriverList(drivers);
  const tradeText = highTradeExposure
    ? " Wegen der sehr hohen Handels-Exposure sollte außerdem eine Diversifikation der Bezugsquellen geprüft werden."
    : "";

  if (ampel === "rot") {
    return `${supplier.name} wird im First-Pass als hohes Risiko eingestuft. Der Score von ${score}/100 wird vor allem durch ${driverText} getrieben.${tradeText}`;
  }

  if (ampel === "gelb") {
    return `${supplier.name} zeigt ein mittleres Risikoprofil. Der Score von ${score}/100 wird hauptsächlich durch ${driverText} beeinflusst.${tradeText}`;
  }

  return `${supplier.name} zeigt im First-Pass ein niedriges Risikoprofil. Die wichtigsten Treiber sind ${driverText}, liegen aber insgesamt unterhalb der Eskalationsschwellen.`;
}

/** Produces the deterministic next-action recommendation for the supplier. */
function generateRecommendation(
  ampel: TrafficLight,
  dim: CompleteRiskDimensions,
  config: RiskConfig,
  insufficientRiskData: boolean
): string {
  if (insufficientRiskData) {
    return "Sofortige Eskalation: unzureichende Risiko-Daten; fehlende Dimensionen müssen vor einer Freigabe nacherhoben werden.";
  }

  if (dim.sanktions_exposure >= config.thresholds.sanctionsHardStop) {
    return "Sofortige Eskalation: Sanktions-Exposure liegt über der Hard-Stop-Schwelle.";
  }

  if (
    dim.handels_exposure >= config.thresholds.tradeExposureMinimumYellow &&
    ampel === "gelb"
  ) {
    return "Vertiefte Prüfung empfohlen: sehr hohe Handels-Exposure; Diversifikation der Bezugsquellen sollte geprüft werden.";
  }

  if (ampel === "rot") {
    return "Sofortige Eskalation und vertiefte Prüfung vor neuen Bestellungen oder Vertragsverlängerungen.";
  }

  if (ampel === "gelb") {
    return "Vertiefte Prüfung empfohlen, z. B. zusätzliche Dokumente, Lieferantenfragebogen oder Compliance-Review.";
  }

  return "Unkritisch im First-Pass; regelmäßiges Monitoring ausreichend.";
}

function formatDriverList(drivers: RiskDriver[]): string {
  return drivers
    .map(
      (driver) =>
        `${driver.label} (Rohwert ${driver.value}/100 × Gewicht ${formatWeight(driver.weight)} = gewichteter Beitrag ${driver.contribution})`
    )
    .join(" und ");
}

function formatWeight(value: number): string {
  return `${Math.round(value * 100)} %`;
}

function median(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return round1((sorted[middle - 1] + sorted[middle]) / 2);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
