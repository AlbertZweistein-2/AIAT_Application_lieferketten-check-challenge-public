import type { RiskConfig, RiskDimensionKey } from "./types";

export const DEFAULT_INPUT_PATH = "data/suppliers.json";

export const RISK_DIMENSION_LABELS: Record<RiskDimensionKey, string> = {
  geopolitik_governance: "Geopolitik/Governance",
  sanktions_exposure: "Sanktions-Exposure",
  handels_exposure: "Handels-Exposure",
};

export const DEFAULT_CONFIG: RiskConfig = {
  weights: {
    geopolitik_governance: 0.4,
    sanktions_exposure: 0.4,
    handels_exposure: 0.2,
  },
  thresholds: {
    redScore: 65,
    yellowScore: 35,
    sanctionsHardStop: 85,
    tradeExposureMinimumYellow: 90,
  },
  outputDirectory: "reports",
};
