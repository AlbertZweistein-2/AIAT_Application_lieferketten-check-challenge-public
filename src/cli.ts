import { DEFAULT_CONFIG, DEFAULT_INPUT_PATH, DEFAULT_LLM_CONFIG } from "./config";
import type { AlertThreshold } from "./alerts";
import {
  DEFAULT_COMTRADE_CONCURRENCY,
  DEFAULT_COMTRADE_REPORTER_CODE,
  DEFAULT_COMTRADE_YEAR,
  parseComtradeProbeValue,
  type ComtradeProbeInput,
} from "./unComtradePreview";

export type CliOptions = {
  inputPath: string;
  outputDirectory: string;
  printConsole: boolean;
  writeMarkdown: boolean;
  writeJson: boolean;
  writeAlerts: boolean;
  alertThreshold: AlertThreshold;
  showHelp: boolean;
  live: boolean;
  wgiProbeCountries: string[];
  euSanctionsProbeCountries: string[];
  wgiYear?: number;
  comtradeProbe?: ComtradeProbeInput;
  comtradeYear: number;
  comtradeReporterCode: number;
  comtradeConcurrency: number;
  llm: boolean;
  llmBackend: "ollama";
  llmBaseUrl: string;
  llmModel?: string;
  llmBatchSize: number;
  llmTimeoutMs: number;
};

/** Parses CLI flags and npm-provided options into one validated runtime configuration. */
export function parseCliArgs(args: string[], env: NodeJS.ProcessEnv = process.env): CliOptions {
  const options: CliOptions = {
    inputPath: DEFAULT_INPUT_PATH,
    outputDirectory: DEFAULT_CONFIG.outputDirectory,
    printConsole: true,
    writeMarkdown: true,
    writeJson: false,
    writeAlerts: false,
    alertThreshold: "rot",
    showHelp: false,
    live: false,
    wgiProbeCountries: [],
    euSanctionsProbeCountries: [],
    comtradeYear: DEFAULT_COMTRADE_YEAR,
    comtradeReporterCode: DEFAULT_COMTRADE_REPORTER_CODE,
    comtradeConcurrency: DEFAULT_COMTRADE_CONCURRENCY,
    llm: false,
    llmBackend: DEFAULT_LLM_CONFIG.backend,
    llmBaseUrl: DEFAULT_LLM_CONFIG.baseUrl,
    llmModel: DEFAULT_LLM_CONFIG.model,
    llmBatchSize: DEFAULT_LLM_CONFIG.batchSize,
    llmTimeoutMs: DEFAULT_LLM_CONFIG.timeoutMs,
  };

  applyNpmConfigArgs(options, env);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h" || arg === "help") {
      options.showHelp = true;
      continue;
    }

    if (arg === "--input" || arg === "-i") {
      options.inputPath = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--output-dir" || arg === "-o") {
      options.outputDirectory = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--console") {
      options.printConsole = true;
      continue;
    }

    if (arg === "--no-console") {
      options.printConsole = false;
      continue;
    }

    if (arg === "--markdown") {
      options.writeMarkdown = true;
      continue;
    }

    if (arg === "--no-markdown") {
      options.writeMarkdown = false;
      continue;
    }

    if (arg === "--json") {
      options.writeJson = true;
      continue;
    }

    if (arg === "--no-json") {
      options.writeJson = false;
      continue;
    }

    if (arg === "--alerts") {
      options.writeAlerts = true;
      continue;
    }

    if (arg === "--no-alerts") {
      options.writeAlerts = false;
      continue;
    }

    if (arg === "--alert-threshold") {
      options.alertThreshold = readAlertThreshold(readOptionValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === "--live") {
      options.live = true;
      continue;
    }

    if (arg === "--llm") {
      options.llm = true;
      continue;
    }

    if (arg === "--no-llm") {
      options.llm = false;
      continue;
    }

    if (arg === "--llm-backend") {
      options.llmBackend = readLlmBackend(readOptionValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === "--llm-model" || arg === "--ollama-model") {
      options.llmModel = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--llm-base-url" || arg === "--ollama-url") {
      options.llmBaseUrl = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--llm-batch-size") {
      options.llmBatchSize = readPositiveInteger(readOptionValue(args, index, arg), arg, 1, 20);
      index += 1;
      continue;
    }

    if (arg === "--llm-timeout-ms") {
      options.llmTimeoutMs = readPositiveInteger(
        readOptionValue(args, index, arg),
        arg,
        1_000,
        600_000
      );
      index += 1;
      continue;
    }

    if (arg === "--wgi-probe") {
      options.wgiProbeCountries = readCountryList(readOptionValue(args, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--wgi-year") {
      options.wgiYear = readYear(readOptionValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === "--eu-sanctions-probe") {
      options.euSanctionsProbeCountries = readCountryList(readOptionValue(args, index, arg), "--eu-sanctions-probe");
      index += 1;
      continue;
    }

    if (arg === "--comtrade-probe") {
      options.comtradeProbe = parseComtradeProbeValue(readOptionValue(args, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--comtrade-year") {
      options.comtradeYear = readYear(readOptionValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === "--comtrade-reporter") {
      options.comtradeReporterCode = readM49Code(readOptionValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === "--comtrade-concurrency") {
      options.comtradeConcurrency = readConcurrency(readOptionValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option "${arg}".\n\n${getUsageText()}`);
    }

    options.inputPath = arg;
  }

  if (
    !options.showHelp &&
    (options.wgiProbeCountries.length > 0 ||
      options.euSanctionsProbeCountries.length > 0 ||
      options.comtradeProbe) &&
    !options.live
  ) {
    throw new Error("Live API probing requires --live.");
  }

  if (
    !options.showHelp &&
    options.wgiProbeCountries.length === 0 &&
    options.euSanctionsProbeCountries.length === 0 &&
    !options.comtradeProbe &&
    !options.printConsole &&
    !options.writeMarkdown &&
    !options.writeJson &&
    !options.writeAlerts
  ) {
    throw new Error("At least one output must be enabled: console, markdown, json, or alerts.");
  }

  return options;
}

/** Reads selected npm_config_* values so common `npm start --flag` mistakes still work. */
function applyNpmConfigArgs(options: CliOptions, env: NodeJS.ProcessEnv): void {
  // The preferred form is still `npm start -- --no-markdown`.
  const markdown = readNpmBoolean(env, "npm_config_markdown");
  const consoleOutput = readNpmBoolean(env, "npm_config_console");
  const json = readNpmBoolean(env, "npm_config_json");
  const alerts = readNpmBoolean(env, "npm_config_alerts");
  const live = readNpmBoolean(env, "npm_config_live");
  const llm = readNpmBoolean(env, "npm_config_llm");

  if (markdown !== undefined) {
    options.writeMarkdown = markdown;
  }

  if (consoleOutput !== undefined) {
    options.printConsole = consoleOutput;
  }

  if (json !== undefined) {
    options.writeJson = json;
  }

  if (alerts !== undefined) {
    options.writeAlerts = alerts;
  }

  if (live !== undefined) {
    options.live = live;
  }

  if (llm !== undefined) {
    options.llm = llm;
  }

  if (env.npm_config_input) {
    options.inputPath = env.npm_config_input;
  }

  if (env.npm_config_output_dir) {
    options.outputDirectory = env.npm_config_output_dir;
  }

  if (env.npm_config_alert_threshold) {
    options.alertThreshold = readAlertThreshold(
      env.npm_config_alert_threshold,
      "--alert-threshold"
    );
  }

  if (env.npm_config_llm_model) {
    options.llmModel = env.npm_config_llm_model;
  }

  if (env.npm_config_ollama_model) {
    options.llmModel = env.npm_config_ollama_model;
  }

  if (env.npm_config_llm_base_url) {
    options.llmBaseUrl = env.npm_config_llm_base_url;
  }

  if (env.npm_config_ollama_url) {
    options.llmBaseUrl = env.npm_config_ollama_url;
  }
}

function readNpmBoolean(env: NodeJS.ProcessEnv, key: string): boolean | undefined {
  if (!Object.prototype.hasOwnProperty.call(env, key)) {
    return undefined;
  }

  const value = env[key];

  return value === "true";
}

function readOptionValue(args: string[], index: number, optionName: string): string {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${optionName}.`);
  }

  return value;
}

function readCountryList(value: string, optionName = "--wgi-probe"): string[] {
  const countries = value
    .split(/[;,]/)
    .map((country) => country.trim())
    .filter((country) => country.length > 0);

  if (countries.length === 0) {
    throw new Error(`Missing country codes for ${optionName}.`);
  }

  return countries;
}

function readYear(value: string, optionName: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1996 || parsed > 2100) {
    throw new Error(`Invalid value for ${optionName}. Use a four-digit year, e.g. 2024.`);
  }

  return parsed;
}

function readM49Code(value: string, optionName: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 999) {
    throw new Error(`Invalid value for ${optionName}. Use a UN M49 numeric code, e.g. 276.`);
  }

  return parsed;
}

function readConcurrency(value: string, optionName: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    throw new Error(`Invalid value for ${optionName}. Use an integer from 1 to 10.`);
  }

  return parsed;
}

function readPositiveInteger(
  value: string,
  optionName: string,
  min: number,
  max: number
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid value for ${optionName}. Use an integer from ${min} to ${max}.`);
  }

  return parsed;
}

function readAlertThreshold(value: string, optionName: string): AlertThreshold {
  if (value === "rot" || value === "gelb") {
    return value;
  }

  throw new Error(`Invalid value for ${optionName}. Use "rot" or "gelb".`);
}

function readLlmBackend(value: string, optionName: string): "ollama" {
  if (value === "ollama") {
    return value;
  }

  throw new Error(`Invalid value for ${optionName}. Only "ollama" is supported.`);
}

/** Renders the built-in CLI help text shown by `--help` and parse errors. */
export function getUsageText(): string {
  return [
    "Usage:",
    "  npm start -- [input-file] [options]",
    "  npm start -- --help",
    "",
    "Direct:",
    "  npx tsx src/index.ts [input-file] [options]",
    "",
    "Defaults:",
    `  input-file: ${DEFAULT_INPUT_PATH}`,
    `  output-dir: ${DEFAULT_CONFIG.outputDirectory}`,
    "  console output: enabled",
    "  markdown report: enabled",
    "  json report: disabled",
    "",
    "Options:",
    "  -i, --input <file>        Supplier input file (.json or .csv)",
    "  -o, --output-dir <dir>    Directory for timestamped Markdown reports",
    "      --console             Print report to terminal",
    "      --no-console          Skip terminal report",
    "      --markdown            Write timestamped Markdown report",
    "      --no-markdown         Skip Markdown report",
    "      --json                Write timestamped JSON results",
    "      --no-json             Skip JSON results",
    "      --alerts             Write timestamped JSON alerts for suppliers needing attention",
    "      --no-alerts          Skip alert export",
    "      --alert-threshold    Alert threshold: rot or gelb; defaults to rot",
    "      --live                Use live World Bank WGI governance risk for supplier scoring",
    "      --wgi-probe <codes>   With --live: fetch only World Bank WGI governance risk for comma-separated ISO2/ISO3 countries",
    "      --wgi-year <year>     WGI year for --live/--wgi-probe; defaults to latest available",
    "      --eu-sanctions-probe <codes>",
    "                            With --live: fetch only EU FSF country sanctions exposure for comma-separated ISO2 countries",
    "      --comtrade-probe <reporter,partner,hs>",
    "                            With --live: fetch only UN Comtrade Preview import exposure for M49 reporter/partner and HS code",
    `      --comtrade-year <year> Comtrade year for live scoring/--comtrade-probe; defaults to ${DEFAULT_COMTRADE_YEAR}`,
    `      --comtrade-reporter <m49> Reporter M49 for live Comtrade scoring; defaults to ${DEFAULT_COMTRADE_REPORTER_CODE}`,
    `      --comtrade-concurrency <n> Parallel Comtrade requests for live scoring; defaults to ${DEFAULT_COMTRADE_CONCURRENCY}`,
    "      --llm                Enrich report text with local Ollama JSON output",
    "      --no-llm             Disable LLM enrichment",
    "      --llm-backend <name>  LLM backend; currently only ollama",
    "      --llm-model <model>   Ollama model name, e.g. qwen3:14b",
    `      --llm-base-url <url>  Ollama endpoint; defaults to ${DEFAULT_LLM_CONFIG.baseUrl}`,
    `      --llm-batch-size <n>  Suppliers per explanation batch; defaults to ${DEFAULT_LLM_CONFIG.batchSize}`,
    `      --llm-timeout-ms <n>  Ollama request timeout; defaults to ${DEFAULT_LLM_CONFIG.timeoutMs}`,
  ].join("\n");
}
