import { DEFAULT_CONFIG, DEFAULT_LLM_CONFIG } from "./config";
import { getUsageText, parseCliArgs } from "./cli";
import { createAlertReport } from "./alerts";
import {
  loadSuppliers,
  writeTimestampedAlertReport,
  writeTimestampedJsonReport,
  writeTimestampedMarkdownReport,
} from "./io";
import { printPortfolioReport, renderMarkdownReport } from "./report";
import { assessSuppliers } from "./scoring";
import {
  applyEuSanctionsCountryRisksToSuppliers,
  fetchEuSanctionsCountryRisks,
  fetchEuSanctionsCountryRisksForSuppliers,
  formatEuSanctionsCountryRisks,
} from "./euSanctions";
import {
  applyComtradeImportExposuresToSuppliers,
  fetchComtradeImportExposure,
  fetchComtradeImportExposuresForSuppliers,
  formatComtradeImportExposure,
} from "./unComtradePreview";
import {
  applyWgiGovernanceRisksToSuppliers,
  fetchWorldBankWgiGovernanceRisks,
  formatWgiGovernanceRisks,
  getUniqueSupplierCountryCodes,
} from "./worldBankWgi";
import { persistDefaultLlmModel } from "./llmConfigFile";
import { applyLlmSupplierTexts, generateOllamaReportEnhancement } from "./ollama";

/** Main CLI flow: parse options, optionally enrich live/LLM data, score suppliers and write outputs. */
async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));

  if (options.showHelp) {
    console.log(getUsageText());
    return;
  }

  if (options.wgiProbeCountries.length > 0) {
    if (!options.live) {
      throw new Error("Live API probing requires --live.");
    }

    logLive(`World Bank WGI: fetching governance for ${options.wgiProbeCountries.join(", ")}.`);
    const results = await fetchWorldBankWgiGovernanceRisks(options.wgiProbeCountries, {
      year: options.wgiYear,
    });
    console.log(formatWgiGovernanceRisks(results));
    return;
  }

  if (options.euSanctionsProbeCountries.length > 0) {
    if (!options.live) {
      throw new Error("Live API probing requires --live.");
    }

    logLive(
      `EU FSF sanctions: fetching country exposure for ${options.euSanctionsProbeCountries.join(", ")}.`
    );
    const results = await fetchEuSanctionsCountryRisks(options.euSanctionsProbeCountries, {
      logger: logLive,
    });
    console.log(formatEuSanctionsCountryRisks(results));
    return;
  }

  if (options.comtradeProbe) {
    if (!options.live) {
      throw new Error("Live API probing requires --live.");
    }

    logLive(
      `UN Comtrade Preview: probing reporter=${options.comtradeProbe.reporterCode}, partner=${options.comtradeProbe.partnerCode}, HS=${options.comtradeProbe.cmdCode}, year=${options.comtradeYear}.`
    );
    const result = await fetchComtradeImportExposure({
      ...options.comtradeProbe,
      period: options.comtradeYear,
    }, {
      concurrency: options.comtradeConcurrency,
      logger: logLive,
    });
    console.log(formatComtradeImportExposure(result));
    return;
  }

  const config = {
    ...DEFAULT_CONFIG,
    outputDirectory: options.outputDirectory,
  };
  let suppliers = loadSuppliers(options.inputPath);
  const dataSourceNotes = options.live
    ? ["Live-Modus: Seed-Werte bleiben Fallback, wenn ein Live-API-Schritt fehlschlägt."]
    : ["Seed: alle Risiko-Dimensionen stammen aus der Eingabedatei."];

  if (options.live) {
    const countryCodes = getUniqueSupplierCountryCodes(suppliers);

    try {
      logLive(
        `World Bank WGI: fetching governance for ${countryCodes.length} supplier countries (${countryCodes.join(", ")}).`
      );
      const wgiRisks = await fetchWorldBankWgiGovernanceRisks(countryCodes, {
        year: options.wgiYear,
      });
      logLive(`World Bank WGI: received governance risks for ${wgiRisks.length} countries.`);
      suppliers = applyWgiGovernanceRisksToSuppliers(suppliers, wgiRisks);
      dataSourceNotes.push(
        "Geopolitik/Governance: live aus World Bank WGI (Rule of Law 60 %, Control of Corruption 40 %)."
      );
    } catch (error) {
      const message = formatErrorMessage(error);
      logLive(`World Bank WGI: live enrichment failed; keeping seed geopolitik_governance. ${message}`);
      dataSourceNotes.push(
        `Geopolitik/Governance: Seed-Fallback, weil World Bank WGI fehlgeschlagen ist (${message}).`
      );
    }

    try {
      logLive(`EU FSF sanctions: fetching live country sanctions exposure.`);
      const euSanctionsRisks = await fetchEuSanctionsCountryRisksForSuppliers(suppliers, {
        logger: logLive,
      });
      logLive(
        `EU FSF sanctions: received exposure for ${euSanctionsRisks.length} countries.`
      );
      suppliers = applyEuSanctionsCountryRisksToSuppliers(suppliers, euSanctionsRisks);
      dataSourceNotes.push(
        "Sanktions-Exposure: live aus EU FSF als Länder-Proxy (median/log-kalibrierte Entity-Counts)."
      );
    } catch (error) {
      const message = formatErrorMessage(error);
      logLive(
        `EU FSF sanctions: live enrichment failed; keeping seed sanktions_exposure. ${message}`
      );
      dataSourceNotes.push(
        `Sanktions-Exposure: Seed-Fallback, weil EU FSF fehlgeschlagen ist (${message}).`
      );
    }

    try {
      logLive(
        `UN Comtrade Preview: fetching live trade exposure for ${suppliers.length} suppliers, reporter=${options.comtradeReporterCode}, year=${options.comtradeYear}, concurrency=${options.comtradeConcurrency}.`
      );
      const comtradeExposures = await fetchComtradeImportExposuresForSuppliers(suppliers, {
        reporterCode: options.comtradeReporterCode,
        period: options.comtradeYear,
        concurrency: options.comtradeConcurrency,
        logger: logLive,
      });
      logLive(
        `UN Comtrade Preview: received ${comtradeExposures.length} unique country/HS exposure results.`
      );
      suppliers = applyComtradeImportExposuresToSuppliers(suppliers, comtradeExposures);
      dataSourceNotes.push(
        `Handels-Exposure: live aus UN Comtrade Preview (Reporter M49 ${options.comtradeReporterCode}, Jahr ${options.comtradeYear}).`
      );
    } catch (error) {
      const message = formatErrorMessage(error);
      logLive(
        `UN Comtrade Preview: live enrichment failed; keeping seed handels_exposure. ${message}`
      );
      dataSourceNotes.push(
        `Handels-Exposure: Seed-Fallback, weil UN Comtrade Preview fehlgeschlagen ist (${message}).`
      );
    }
  }

  let results = assessSuppliers(suppliers, config);
  const generatedAt = new Date();
  let portfolioBrief: string | undefined;
  let markdownPath: string | undefined;
  let jsonPath: string | undefined;
  let alertsPath: string | undefined;

  if (options.llm) {
    if (options.llmModel && options.llmModel !== DEFAULT_LLM_CONFIG.model) {
      persistLlmModelForNextRuns(options.llmModel);
    }

    try {
      logLlm(
        `Ollama: generating portfolio brief and supplier explanations via ${options.llmBaseUrl}.`
      );
      const enhancement = await generateOllamaReportEnhancement(results, {
        ...DEFAULT_LLM_CONFIG,
        backend: options.llmBackend,
        baseUrl: options.llmBaseUrl,
        model: options.llmModel,
        batchSize: options.llmBatchSize,
        timeoutMs: options.llmTimeoutMs,
      }, {
        logger: logLlm,
        onResolvedModel: (model) => {
          if (!DEFAULT_LLM_CONFIG.model && model !== DEFAULT_LLM_CONFIG.model) {
            persistLlmModelForNextRuns(model);
          }
        },
      });
      results = applyLlmSupplierTexts(results, enhancement);
      portfolioBrief = enhancement.portfolioBrief;
      dataSourceNotes.push(
        `LLM-Texte: lokal mit Ollama (${enhancement.model}); Scores und Ampeln bleiben deterministisch.`
      );

      for (const warning of enhancement.warnings) {
        logLlm(warning);
      }
    } catch (error) {
      const message = formatErrorMessage(error);
      logLlm(`Ollama enrichment skipped; keeping rule-based texts. ${message}`);
      dataSourceNotes.push(
        `LLM-Texte: nicht erzeugt; regelbasierte Texte wurden beibehalten (${message}).`
      );
    }
  }

  if (options.writeMarkdown) {
    const markdown = renderMarkdownReport(
      results,
      config,
      generatedAt,
      dataSourceNotes,
      portfolioBrief
    );
    markdownPath = writeTimestampedMarkdownReport(config.outputDirectory, markdown, generatedAt);
  }

  if (options.writeJson) {
    jsonPath = writeTimestampedJsonReport(config.outputDirectory, results, generatedAt);
  }

  if (options.writeAlerts) {
    const alertReport = createAlertReport(results, options.alertThreshold, generatedAt);
    alertsPath = writeTimestampedAlertReport(config.outputDirectory, alertReport, generatedAt);
  }

  if (options.printConsole) {
    printPortfolioReport(results, {
      markdown: markdownPath,
      json: jsonPath,
      alerts: alertsPath,
      dataSources: dataSourceNotes,
      portfolioBrief,
    });
  }
}

main().catch((error: unknown) => {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
});

function logLive(message: string): void {
  console.error(`[live] ${message}`);
}

function logLlm(message: string): void {
  console.error(`[llm] ${message}`);
}

/** Persists the selected Ollama model as a convenience default, but never blocks the report. */
function persistLlmModelForNextRuns(model: string): void {
  try {
    if (persistDefaultLlmModel(model)) {
      logLlm(`Saved ${model} as DEFAULT_LLM_CONFIG.model for future runs.`);
    }
  } catch (error) {
    logLlm(
      `Could not update DEFAULT_LLM_CONFIG.model in src/config.ts. ${formatErrorMessage(error)}`
    );
  }
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
