import { readFileSync, writeFileSync } from "node:fs";

const DEFAULT_CONFIG_PATH = "src/config.ts";

export function persistDefaultLlmModel(
  model: string,
  configPath = DEFAULT_CONFIG_PATH
): boolean {
  const trimmedModel = model.trim();

  if (trimmedModel.length === 0) {
    return false;
  }

  const source = readFileSync(configPath, "utf-8");
  const updated = updateDefaultLlmModelSource(source, trimmedModel);

  if (updated === source) {
    return false;
  }

  writeFileSync(configPath, updated, "utf-8");
  return true;
}

export function updateDefaultLlmModelSource(source: string, model: string): string {
  const blockMatch = source.match(
    /export const DEFAULT_LLM_CONFIG: LlmConfig = \{[\s\S]*?\n\};/
  );

  if (!blockMatch) {
    throw new Error("Could not find DEFAULT_LLM_CONFIG in src/config.ts.");
  }

  const block = blockMatch[0];
  const modelLine = `  model: ${JSON.stringify(model)},`;
  let updatedBlock: string;

  if (/\n\s*model:\s*(?:"[^"]*"|undefined),/.test(block)) {
    updatedBlock = block.replace(/\n\s*model:\s*(?:"[^"]*"|undefined),/, `\n${modelLine}`);
  } else {
    updatedBlock = block.replace(
      /(\n\s*baseUrl:\s*"[^"]*",)/,
      `$1\n${modelLine}`
    );
  }

  return source.replace(block, updatedBlock);
}
