import type { LlmConfig, RiskConfig, RiskDimensionKey } from "./types";

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

export const DEFAULT_LLM_CONFIG: LlmConfig = {
  backend: "ollama",
  baseUrl: "http://localhost:11434",
  model: "qwen3:4b",
  batchSize: 6,
  timeoutMs: 120_000,
  prompts: {
    portfolioSystem:
      "Du bist ein knapper Risk-Analyst fuer ein First-Pass-Lieferketten-Screening. Antworte nur als valides JSON.",
    portfolioUser: [
      "Erstelle einen kurzen deutschen Portfolio-Brief fuer den Markdown-Report.",
      "Erwaehne rote Lieferanten, die wichtigste Empfehlung und dass dies kein Compliance-Audit ist.",
      'Gib exakt dieses JSON-Format zurueck: {"portfolio_brief":"..."}',
      "Portfolio-Daten: {portfolio_data}",
    ].join("\n"),
    supplierSystem:
      "Du formulierst kurze deutsche Risiko-Begruendungen. Du darfst Score, Ampel und Datenqualitaet nicht veraendern. Antworte nur als valides JSON.",
    supplierUser: [
      "Formuliere fuer jeden Lieferanten eine kurze Begruendung und eine konkrete Handlungsempfehlung.",
      "Nutze die vorhandenen Scores als Fakten. Erfinde keine Live-Daten und keine Sanktions-Treffer.",
      "Die Begruendung muss die Werte nennen, die die Einstufung rechtfertigen: mindestens Risiko-Score, Ampel und die zwei wichtigsten Top-Treiber mit Rohwert und gewichtetem Beitrag.",
      "Bei rot: klare Eskalation. Bei gelb: vertiefte Pruefung. Bei gruen: Monitoring.",
      'Gib exakt dieses JSON-Format zurueck: {"supplier_texts":[{"lieferant_id":"...","begruendung":"...","handlungsempfehlung":"..."}]}',
      "Lieferanten: {supplier_data}",
    ].join("\n"),
  },
};
