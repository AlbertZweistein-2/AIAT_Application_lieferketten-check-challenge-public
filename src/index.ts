import { DEFAULT_CONFIG } from "./config";
import { getUsageText, parseCliArgs } from "./cli";
import { loadSuppliers, writeTimestampedJsonReport, writeTimestampedMarkdownReport } from "./io";
import { printPortfolioReport, renderMarkdownReport } from "./report";
import { assessSuppliers } from "./scoring";

function main(): void {
  const options = parseCliArgs(process.argv.slice(2));

  if (options.showHelp) {
    console.log(getUsageText());
    return;
  }

  const config = {
    ...DEFAULT_CONFIG,
    outputDirectory: options.outputDirectory,
  };
  const suppliers = loadSuppliers(options.inputPath);
  const results = assessSuppliers(suppliers, config);
  const generatedAt = new Date();
  let markdownPath: string | undefined;
  let jsonPath: string | undefined;

  if (options.writeMarkdown) {
    const markdown = renderMarkdownReport(results, config, generatedAt);
    markdownPath = writeTimestampedMarkdownReport(config.outputDirectory, markdown, generatedAt);
  }

  if (options.writeJson) {
    jsonPath = writeTimestampedJsonReport(config.outputDirectory, results, generatedAt);
  }

  if (options.printConsole) {
    printPortfolioReport(results, { markdown: markdownPath, json: jsonPath });
  }
}

try {
  main();
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
}
