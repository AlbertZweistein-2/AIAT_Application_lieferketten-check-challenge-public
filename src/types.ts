export type TrafficLight = "grün" | "gelb" | "rot";

export type RiskDimensionKey =
  | "geopolitik_governance"
  | "sanktions_exposure"
  | "handels_exposure";

export type InvalidRiskDimension = {
  status: "invalid";
  rawValue: string;
};

export type RiskDimensionValue = number | InvalidRiskDimension;

export type RiskDimensions = Partial<Record<RiskDimensionKey, RiskDimensionValue>>;

export type CompleteRiskDimensions = Record<RiskDimensionKey, number>;

export type RiskWeights = Record<RiskDimensionKey, number>;

export type RiskThresholds = {
  redScore: number;
  yellowScore: number;
  sanctionsHardStop: number;
  tradeExposureMinimumYellow: number;
};

export type RiskConfig = {
  weights: RiskWeights;
  thresholds: RiskThresholds;
  outputDirectory: string;
};

export type LlmBackend = "ollama";

export type LlmConfig = {
  backend: LlmBackend;
  baseUrl: string;
  model?: string;
  batchSize: number;
  timeoutMs: number;
  prompts: {
    portfolioSystem: string;
    portfolioUser: string;
    supplierSystem: string;
    supplierUser: string;
  };
};

export type Supplier = {
  _hinweis?: string;
  lieferant_id: string;
  name: string;
  branche: string;
  land_iso2: string;
  land_m49: number;
  land_name: string;
  hs_code: string;
  ware: string;
  handelsvolumen_eur_jahr: number;
  risiko_dimensionen: RiskDimensions;
};

export type ScoredSupplier = Omit<Supplier, "risiko_dimensionen"> & {
  risiko_dimensionen: CompleteRiskDimensions;
};

export type RiskDriver = {
  key: RiskDimensionKey;
  label: string;
  value: number;
  weight: number;
  contribution: number;
};

export type RiskResult = {
  supplier: ScoredSupplier;
  risiko_score: number;
  ampel: TrafficLight;
  treiber: RiskDriver[];
  begruendung: string;
  handlungsempfehlung: string;
  datenqualitaet: string[];
};

export type PortfolioDistribution = Record<TrafficLight, number>;
