import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createInterface } from "node:readline/promises";
import type { LlmConfig, RiskResult } from "./types";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;
type ExecFileLike = (
  file: string,
  args: string[]
) => Promise<{ stdout: string; stderr: string }>;
type PromptForModel = (models: string[]) => Promise<string>;

export type OllamaDependencies = {
  fetch?: FetchLike;
  execFile?: ExecFileLike;
  promptForModel?: PromptForModel;
  onResolvedModel?: (model: string) => void;
  logger?: (message: string) => void;
};

export type SupplierLlmText = {
  lieferant_id: string;
  begruendung: string;
  handlungsempfehlung: string;
};

export type LlmReportEnhancement = {
  backend: "ollama";
  model: string;
  portfolioBrief: string;
  supplierTexts: Map<string, SupplierLlmText>;
  warnings: string[];
};

type PortfolioBriefResponse = {
  portfolio_brief: string;
};

type SupplierTextBatchResponse = {
  supplier_texts: SupplierLlmText[];
};

type JsonSchema = {
  type: "object" | "array" | "string";
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
};

const PORTFOLIO_BRIEF_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    portfolio_brief: { type: "string" },
  },
  required: ["portfolio_brief"],
};

const SUPPLIER_TEXT_BATCH_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    supplier_texts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          lieferant_id: { type: "string" },
          begruendung: { type: "string" },
          handlungsempfehlung: { type: "string" },
        },
        required: ["lieferant_id", "begruendung", "handlungsempfehlung"],
      },
    },
  },
  required: ["supplier_texts"],
};

const AI_GENERATED_MARKER = " (AI generated)";

const execFileAsync = promisify(execFile) as ExecFileLike;

/** Generates the optional Ollama portfolio brief and batched supplier explanation texts. */
export async function generateOllamaReportEnhancement(
  results: RiskResult[],
  config: LlmConfig,
  dependencies: OllamaDependencies = {}
): Promise<LlmReportEnhancement> {
  if (config.backend !== "ollama") {
    throw new Error(`Unsupported LLM backend "${config.backend}". Only "ollama" is supported.`);
  }

  const fetchImpl = dependencies.fetch ?? globalThis.fetch;

  if (!fetchImpl) {
    throw new Error("No fetch implementation available for Ollama requests.");
  }

  const model = await resolveOllamaModel(config, dependencies);
  dependencies.onResolvedModel?.(model);
  const portfolioBrief = await requestPortfolioBrief(results, config, model, fetchImpl);
  const supplierTexts = new Map<string, SupplierLlmText>();
  const warnings: string[] = [];
  const resultIds = new Set(results.map((result) => result.supplier.lieferant_id));

  for (const batch of chunk(results, config.batchSize)) {
    try {
      const response = await requestSupplierTextBatch(batch, config, model, fetchImpl);

      for (const text of response.supplier_texts) {
        if (!resultIds.has(text.lieferant_id)) {
          warnings.push(`Ollama returned an unknown supplier id: ${text.lieferant_id}.`);
          continue;
        }

        if (isUsableText(text.begruendung) && isUsableText(text.handlungsempfehlung)) {
          supplierTexts.set(text.lieferant_id, {
            lieferant_id: text.lieferant_id,
            begruendung: markAiGenerated(cleanModelText(text.begruendung)),
            handlungsempfehlung: markAiGenerated(cleanModelText(text.handlungsempfehlung)),
          });
        }
      }
    } catch (error) {
      warnings.push(`Ollama batch failed; rule-based texts kept. ${formatErrorMessage(error)}`);
    }
  }

  return {
    backend: "ollama",
    model,
    portfolioBrief,
    supplierTexts,
    warnings,
  };
}

/** Replaces rule-based supplier texts with available LLM texts, leaving missing batches untouched. */
export function applyLlmSupplierTexts(
  results: RiskResult[],
  enhancement: LlmReportEnhancement
): RiskResult[] {
  return results.map((result) => {
    const text = enhancement.supplierTexts.get(result.supplier.lieferant_id);

    if (!text) {
      return result;
    }

    return {
      ...result,
      begruendung: text.begruendung,
      handlungsempfehlung: text.handlungsempfehlung,
    };
  });
}

/** Parses `ollama list` output into installed model names. */
export function parseOllamaListOutput(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.toLowerCase().startsWith("name "))
    .map((line) => line.split(/\s+/)[0])
    .filter((name) => name.length > 0);
}

/** Extracts a JSON object from model output, tolerating thinking tags and fenced JSON. */
export function parseJsonObjectFromModelOutput<T>(content: string): T {
  const withoutThinking = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const withoutFence = withoutThinking
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence) as T;
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Ollama response did not contain valid JSON.");
    }

    return JSON.parse(withoutFence.slice(start, end + 1)) as T;
  }
}

/** Chooses the configured model or asks the user to pick from installed Ollama models. */
async function resolveOllamaModel(
  config: LlmConfig,
  dependencies: OllamaDependencies
): Promise<string> {
  if (config.model && config.model.trim().length > 0) {
    return config.model.trim();
  }

  let models: string[];

  try {
    models = await listInstalledOllamaModels(dependencies.execFile);
  } catch (error) {
    throw new Error(
      `No Ollama model configured and "ollama list" failed. Pass --llm-model or set DEFAULT_LLM_CONFIG.model in src/config.ts. ${formatErrorMessage(error)}`
    );
  }

  if (models.length === 0) {
    throw new Error(
      "No Ollama model configured and `ollama list` returned no installed models. Install a model or pass --llm-model."
    );
  }

  const promptForModel = dependencies.promptForModel ?? promptForModelSelection;
  return promptForModel(models);
}

async function listInstalledOllamaModels(execImpl = execFileAsync): Promise<string[]> {
  const { stdout } = await execImpl("ollama", ["list"]);
  return parseOllamaListOutput(stdout);
}

async function promptForModelSelection(models: string[]): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      "Ollama model selection needs an interactive terminal. Pass --llm-model to run non-interactively."
    );
  }

  console.error("Installed Ollama models:");
  models.forEach((model, index) => {
    console.error(`  ${index + 1}. ${model}`);
  });

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = (await readline.question("Choose model by number or name: ")).trim();
    const numericChoice = Number(answer);

    if (Number.isInteger(numericChoice) && numericChoice >= 1 && numericChoice <= models.length) {
      return models[numericChoice - 1];
    }

    if (answer.length > 0) {
      return answer;
    }

    throw new Error("No Ollama model selected.");
  } finally {
    readline.close();
  }
}

async function requestPortfolioBrief(
  results: RiskResult[],
  config: LlmConfig,
  model: string,
  fetchImpl: FetchLike
): Promise<string> {
  const portfolioData = JSON.stringify(results.map(toPromptSupplierSummary));
  const response = await callOllamaJson<PortfolioBriefResponse>(
    config,
    model,
    [
      {
        role: "system",
        content: config.prompts.portfolioSystem,
      },
      {
        role: "user",
        content: renderPromptTemplate(config.prompts.portfolioUser, "portfolio_data", portfolioData),
      },
    ],
    PORTFOLIO_BRIEF_SCHEMA,
    fetchImpl
  );

  if (!isUsableText(response.portfolio_brief)) {
    throw new Error("Ollama portfolio brief was empty or invalid.");
  }

  return markAiGenerated(cleanModelText(response.portfolio_brief));
}

/** Requests generated text for a small supplier batch using Ollama structured outputs. */
async function requestSupplierTextBatch(
  results: RiskResult[],
  config: LlmConfig,
  model: string,
  fetchImpl: FetchLike
): Promise<SupplierTextBatchResponse> {
  const supplierData = JSON.stringify(results.map(toPromptSupplierSummary));
  const response = await callOllamaJson<SupplierTextBatchResponse>(
    config,
    model,
    [
      {
        role: "system",
        content: config.prompts.supplierSystem,
      },
      {
        role: "user",
        content: renderPromptTemplate(config.prompts.supplierUser, "supplier_data", supplierData),
      },
    ],
    SUPPLIER_TEXT_BATCH_SCHEMA,
    fetchImpl
  );

  if (!Array.isArray(response.supplier_texts)) {
    throw new Error("Ollama supplier response did not contain supplier_texts.");
  }

  return response;
}

/** Calls Ollama's chat API with a JSON schema and returns the parsed content object. */
async function callOllamaJson<T>(
  config: LlmConfig,
  model: string,
  messages: Array<{ role: "system" | "user"; content: string }>,
  format: JsonSchema,
  fetchImpl: FetchLike
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetchImpl(new URL("/api/chat", config.baseUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: false,
        format,
        messages,
        options: {
          temperature: 0,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}: ${await response.text()}`);
    }

    const payload = (await response.json()) as unknown;
    const content = readOllamaContent(payload);

    return parseJsonObjectFromModelOutput<T>(content);
  } finally {
    clearTimeout(timeout);
  }
}

function readOllamaContent(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Ollama response was not an object.");
  }

  const maybePayload = payload as {
    message?: { content?: unknown };
    response?: unknown;
  };

  if (typeof maybePayload.message?.content === "string") {
    return maybePayload.message.content;
  }

  if (typeof maybePayload.response === "string") {
    return maybePayload.response;
  }

  throw new Error("Ollama response did not contain message.content.");
}

function toPromptSupplierSummary(result: RiskResult) {
  return {
    lieferant_id: result.supplier.lieferant_id,
    name: result.supplier.name,
    land: result.supplier.land_name,
    branche: result.supplier.branche,
    ware: result.supplier.ware,
    handelsvolumen_eur_jahr: result.supplier.handelsvolumen_eur_jahr,
    risiko_score: result.risiko_score,
    ampel: result.ampel,
    top_treiber: result.treiber.map((driver) => ({
      name: driver.label,
      rohwert: driver.value,
      gewicht: driver.weight,
      beitrag: driver.contribution,
    })),
    datenqualitaet: result.datenqualitaet,
  };
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  const safeSize = Math.max(1, size);

  for (let index = 0; index < values.length; index += safeSize) {
    chunks.push(values.slice(index, index + safeSize));
  }

  return chunks;
}

function isUsableText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanModelText(value: string): string {
  return value.trim().replaceAll('\\"', '"');
}

function markAiGenerated(value: string): string {
  return value.endsWith(AI_GENERATED_MARKER) ? value : `${value}${AI_GENERATED_MARKER}`;
}

function renderPromptTemplate(template: string, placeholder: string, value: string): string {
  const token = `{${placeholder}}`;

  if (template.includes(token)) {
    return template.replaceAll(token, value);
  }

  return `${template}\n\n${placeholder}: ${value}`;
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
