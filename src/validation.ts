import type { RiskDimensionValue, RiskDimensions, Supplier } from "./types";

const MISSING_RISK_MARKERS = new Set([
  "",
  "na",
  "n/a",
  "nan",
  "null",
  "none",
  "missing",
  "unknown",
  "unbekannt",
  "k.a.",
  "ka",
  "-",
  "--",
]);

/** Validates raw supplier input and normalizes risk dimensions for scoring. */
export function validateSupplier(value: unknown, index: number): Supplier {
  if (!isObject(value)) {
    throw new Error(`Supplier at index ${index} is not an object.`);
  }

  const requiredStringFields = [
    "lieferant_id",
    "name",
    "branche",
    "land_iso2",
    "land_name",
    "hs_code",
    "ware",
  ] as const;

  for (const field of requiredStringFields) {
    if (typeof value[field] !== "string") {
      throw new Error(`Supplier at index ${index}: missing or invalid field "${field}".`);
    }
  }

  const requiredNumberFields = ["land_m49", "handelsvolumen_eur_jahr"] as const;

  for (const field of requiredNumberFields) {
    if (typeof value[field] !== "number") {
      throw new Error(`Supplier at index ${index}: missing or invalid field "${field}".`);
    }
  }

  const rawDim = isObject(value.risiko_dimensionen) ? value.risiko_dimensionen : {};
  const dim: RiskDimensions = {
    geopolitik_governance: normalizeRiskDimension(
      rawDim.geopolitik_governance
    ),
    sanktions_exposure: normalizeRiskDimension(
      rawDim.sanktions_exposure
    ),
    handels_exposure: normalizeRiskDimension(
      rawDim.handels_exposure
    ),
  };

  return {
    ...value,
    risiko_dimensionen: removeUndefinedValues(dim),
  } as Supplier;
}

/** Converts missing markers and numeric strings while preserving invalid values for later escalation. */
function normalizeRiskDimension(value: unknown): RiskDimensionValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (MISSING_RISK_MARKERS.has(trimmed.toLowerCase())) {
      return undefined;
    }

    const parsed = Number(trimmed);

    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
      return parsed;
    }

    return {
      status: "invalid",
      rawValue: value,
    };
  }

  if (typeof value === "number") {
    if (Number.isNaN(value)) {
      return undefined;
    }

    if (Number.isFinite(value) && value >= 0 && value <= 100) {
      return value;
    }

    return {
      status: "invalid",
      rawValue: String(value),
    };
  }

  return {
    status: "invalid",
    rawValue: String(value),
  };
}

function removeUndefinedValues(values: RiskDimensions): RiskDimensions {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined)
  ) as RiskDimensions;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
