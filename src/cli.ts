import { DEFAULT_CONFIG, DEFAULT_INPUT_PATH } from "./config";

export type CliOptions = {
  inputPath: string;
  outputDirectory: string;
  printConsole: boolean;
  writeMarkdown: boolean;
  writeJson: boolean;
  showHelp: boolean;
};

export function parseCliArgs(args: string[], env: NodeJS.ProcessEnv = process.env): CliOptions {
  const options: CliOptions = {
    inputPath: DEFAULT_INPUT_PATH,
    outputDirectory: DEFAULT_CONFIG.outputDirectory,
    printConsole: true,
    writeMarkdown: true,
    writeJson: false,
    showHelp: false,
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

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option "${arg}".\n\n${getUsageText()}`);
    }

    options.inputPath = arg;
  }

  if (
    !options.showHelp &&
    !options.printConsole &&
    !options.writeMarkdown &&
    !options.writeJson
  ) {
    throw new Error("At least one output must be enabled: console, markdown, or json.");
  }

  return options;
}

function applyNpmConfigArgs(options: CliOptions, env: NodeJS.ProcessEnv): void {
  // Supports common npm usage mistakes like `npm start --no-markdown`.
  // The preferred form is still `npm start -- --no-markdown`.
  const markdown = readNpmBoolean(env, "npm_config_markdown");
  const consoleOutput = readNpmBoolean(env, "npm_config_console");
  const json = readNpmBoolean(env, "npm_config_json");

  if (markdown !== undefined) {
    options.writeMarkdown = markdown;
  }

  if (consoleOutput !== undefined) {
    options.printConsole = consoleOutput;
  }

  if (json !== undefined) {
    options.writeJson = json;
  }

  if (env.npm_config_input) {
    options.inputPath = env.npm_config_input;
  }

  if (env.npm_config_output_dir) {
    options.outputDirectory = env.npm_config_output_dir;
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
  ].join("\n");
}
