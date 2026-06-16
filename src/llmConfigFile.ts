import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { LlmConfig } from "./types";

const DEFAULT_CONFIG_PATH = "src/config.local.json";

type LocalConfigFile = {
  llm?: Partial<Omit<LlmConfig, "prompts">> & {
    prompts?: Partial<LlmConfig["prompts"]>;
  };
};

/** Persists the selected Ollama model in the local gitignored config for later CLI runs. */
export function persistDefaultLlmModel(
  model: string,
  configPath = DEFAULT_CONFIG_PATH
): boolean {
  const trimmedModel = model.trim();

  if (trimmedModel.length === 0) {
    return false;
  }

  const source = existsSync(configPath) ? readFileSync(configPath, "utf-8") : "{}\n";
  const currentConfig = parseLocalConfigSource(source);

  if (currentConfig.llm?.model === trimmedModel) {
    return false;
  }

  const updated = updateLocalLlmModelSource(source, trimmedModel);
  writeFileSync(configPath, updated, "utf-8");
  return true;
}

/** Rewrites only llm.model in the local JSON config while preserving other keys. */
export function updateLocalLlmModelSource(source: string, model: string): string {
  const config = parseLocalConfigSource(source);

  config.llm = {
    ...config.llm,
    model,
  };

  return `${JSON.stringify(config, null, 2)}\n`;
}

function parseLocalConfigSource(source: string): LocalConfigFile {
  const trimmed = source.trim();
  return trimmed.length > 0 ? (JSON.parse(trimmed) as LocalConfigFile) : {};
}
