import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LlmConfig, RiskConfig, RiskDimensionKey } from "./types";

// Central defaults used by the CLI, scoring, reports and optional Ollama enrichment.
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

const DEFAULT_LLM_CONFIG_BASE: LlmConfig = {
  backend: "ollama",
  baseUrl: "http://localhost:11434",
  model: "",
  batchSize: 6,
  timeoutMs: 120_000,
  prompts: {
    portfolioSystem:
      "Du bist ein knapper Risk-Analyst für ein First-Pass-Lieferketten-Screening. Antworte nur als valides JSON.",
    portfolioUser: [
      "Erstelle einen kurzen deutschen Portfolio-Brief für den Markdown-Report.",
      "Erwähne rote Lieferanten, die wichtigste Empfehlung und dass dies kein Compliance-Audit ist.",
      'Gib exakt dieses JSON-Format zurück: {"portfolio_brief":"..."}',
      "Portfolio-Daten: {portfolio_data}",
    ].join("\n"),
    supplierSystem:
      "Du formulierst kurze deutsche Risiko-Begründungen. Du darfst Score, Ampel und Datenqualität nicht verändern. Antworte nur als valides JSON.",
    supplierUser: [
      "Formuliere für jeden Lieferanten eine kurze Begründung und eine konkrete Handlungsempfehlung.",
      "Nutze die vorhandenen Scores als Fakten. Erfinde keine Live-Daten und keine Sanktions-Treffer.",
      "Die Begründung muss die Werte nennen, die die Einstufung rechtfertigen: mindestens Risiko-Score, Ampel, risiko-adjustiertes Exposure und die zwei wichtigsten Top-Treiber mit Rohwert und gewichtetem Beitrag.",
      "Bei rot: klare Eskalation. Bei gelb: vertiefte Prüfung. Bei grün: Monitoring.",
      'Gib exakt dieses JSON-Format zurück: {"supplier_texts":[{"lieferant_id":"...","begruendung":"...","handlungsempfehlung":"..."}]}',
      "Lieferanten: {supplier_data}",
    ].join("\n"),
  },
};

export const DEFAULT_LLM_CONFIG: LlmConfig = mergeLlmConfigWithLocalOverrides(
  DEFAULT_LLM_CONFIG_BASE,
  loadLocalLlmConfig()
);

type LocalConfigFile = {
  llm?: Partial<Omit<LlmConfig, "prompts">> & {
    prompts?: Partial<LlmConfig["prompts"]>;
  };
};

function loadLocalLlmConfig(configPath = "src/config.local.json"): LocalConfigFile["llm"] {
  const resolvedPath = resolve(process.cwd(), configPath);

  if (!existsSync(resolvedPath)) {
    return undefined;
  }

  const parsed = JSON.parse(readFileSync(resolvedPath, "utf-8")) as LocalConfigFile;
  return parsed.llm;
}

function mergeLlmConfigWithLocalOverrides(
  baseConfig: LlmConfig,
  localConfig?: LocalConfigFile["llm"]
): LlmConfig {
  if (!localConfig) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    ...localConfig,
    prompts: {
      ...baseConfig.prompts,
      ...localConfig.prompts,
    },
  };
}
