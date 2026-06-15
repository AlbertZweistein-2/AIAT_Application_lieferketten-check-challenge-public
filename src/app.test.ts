import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createAlertReport } from "./alerts";
import { parseCliArgs } from "./cli";
import { DEFAULT_CONFIG, DEFAULT_INPUT_PATH } from "./config";
import {
  loadSuppliers,
  writeTimestampedAlertReport,
  writeTimestampedJsonReport,
  writeTimestampedMarkdownReport,
} from "./io";
import { renderMarkdownReport } from "./report";
import { assessSupplier, assessSuppliers } from "./scoring";
import { validateSupplier } from "./validation";
import type { RiskConfig, RiskDimensionKey, Supplier, TrafficLight } from "./types";

const tempDirectories: string[] = [];

afterEach(() => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();

    if (directory) {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

describe("Lieferketten-Check-Challenge PoC", () => {
  it("loads the seed JSON input", () => {
    const jsonSuppliers = loadSuppliers("data/suppliers.json");

    expect(jsonSuppliers).toHaveLength(28);
    expect(jsonSuppliers.some((supplier) => supplier.lieferant_id === "LF-024")).toBe(true);
  });

  it("loads the seed CSV input", () => {
    const csvSuppliers = loadSuppliers("data/suppliers.csv");
    const firstSupplier = csvSuppliers.find((supplier) => supplier.lieferant_id === "LF-001");

    expect(csvSuppliers).toHaveLength(28);
    expect(firstSupplier).toMatchObject({
      name: "NordStahl GmbH",
      land_iso2: "AT",
      risiko_dimensionen: {
        geopolitik_governance: 12,
        sanktions_exposure: 2,
        handels_exposure: 10,
      },
    });
  });

  it("rejects unsupported input file formats", () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "lieferketten-check-"));
    tempDirectories.push(tempDirectory);

    const unsupportedPath = join(tempDirectory, "suppliers.txt");
    writeFileSync(unsupportedPath, "not a supported supplier file", "utf-8");

    expect(() => loadSuppliers(unsupportedPath)).toThrow(
      'Unsupported input file format ".txt". Use .json or .csv.'
    );
    expect(() => loadSuppliers("hlep")).toThrow(
      'Unsupported input file format "unknown". Use .json or .csv.'
    );
  });

  it("uses deterministic default CLI options and supports output toggles", () => {
    expect(parseCliArgs([], {})).toEqual({
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
      comtradeYear: 2023,
      comtradeReporterCode: 276,
      comtradeConcurrency: 3,
      llm: false,
      llmBackend: "ollama",
      llmBaseUrl: "http://localhost:11434",
      llmModel: "qwen3:14b",
      llmBatchSize: 6,
      llmTimeoutMs: 120000,
    });

    expect(
      parseCliArgs(["--input", "data/suppliers.csv", "--no-console", "--json"], {})
    ).toMatchObject({
      inputPath: "data/suppliers.csv",
      printConsole: false,
      writeMarkdown: true,
      writeJson: true,
      writeAlerts: false,
      alertThreshold: "rot",
      showHelp: false,
      live: false,
      wgiProbeCountries: [],
      euSanctionsProbeCountries: [],
      comtradeYear: 2023,
      comtradeReporterCode: 276,
      comtradeConcurrency: 3,
    });

    expect(parseCliArgs([], { npm_config_markdown: "" })).toMatchObject({
      writeMarkdown: false,
      printConsole: true,
      writeAlerts: false,
      alertThreshold: "rot",
      showHelp: false,
      live: false,
      wgiProbeCountries: [],
      euSanctionsProbeCountries: [],
      comtradeYear: 2023,
      comtradeReporterCode: 276,
      comtradeConcurrency: 3,
    });

    expect(parseCliArgs(["--alerts", "--alert-threshold", "gelb"], {})).toMatchObject({
      writeAlerts: true,
      alertThreshold: "gelb",
    });

    expect(() => parseCliArgs(["--alert-threshold", "grün"], {})).toThrow(
      'Invalid value for --alert-threshold. Use "rot" or "gelb".'
    );

    expect(() => parseCliArgs(["--no-console", "--no-markdown"], {})).toThrow(
      "At least one output must be enabled: console, markdown, json, or alerts."
    );
  });

  it("supports opt-in Ollama report enrichment options", () => {
    expect(
      parseCliArgs(
        [
          "--llm",
          "--llm-model",
          "qwen3:14b",
          "--llm-base-url",
          "http://localhost:11434",
          "--llm-batch-size",
          "4",
          "--llm-timeout-ms",
          "60000",
        ],
        {}
      )
    ).toMatchObject({
      llm: true,
      llmBackend: "ollama",
      llmModel: "qwen3:14b",
      llmBaseUrl: "http://localhost:11434",
      llmBatchSize: 4,
      llmTimeoutMs: 60000,
    });

    expect(parseCliArgs(["--llm", "--no-llm"], {})).toMatchObject({
      llm: false,
    });

    expect(() => parseCliArgs(["--llm-backend", "openai"], {})).toThrow(
      'Invalid value for --llm-backend. Only "ollama" is supported.'
    );
  });

  it("supports help arguments without treating them as input files", () => {
    expect(parseCliArgs(["--help"], {})).toMatchObject({ showHelp: true });
    expect(parseCliArgs(["-h"], {})).toMatchObject({ showHelp: true });
    expect(parseCliArgs(["help"], {})).toMatchObject({ showHelp: true });
  });

  it("supports a WGI-only probe mode", () => {
    expect(parseCliArgs(["--live", "--wgi-probe", "AT,DE,CHN", "--wgi-year", "2024"], {})).toMatchObject({
      live: true,
      wgiProbeCountries: ["AT", "DE", "CHN"],
      wgiYear: 2024,
    });

    expect(
      parseCliArgs(["--wgi-probe", "AT,DE", "--no-console", "--no-markdown"], {
        npm_config_live: "true",
      })
    ).toMatchObject({
      live: true,
      wgiProbeCountries: ["AT", "DE"],
      printConsole: false,
      writeMarkdown: false,
    });

    expect(() => parseCliArgs(["--wgi-probe", "AT,DE"], {})).toThrow(
      "Live API probing requires --live."
    );
  });

  it("supports an EU sanctions-only probe mode", () => {
    expect(parseCliArgs(["--live", "--eu-sanctions-probe", "RU,CN,DE"], {})).toMatchObject({
      live: true,
      euSanctionsProbeCountries: ["RU", "CN", "DE"],
    });

    expect(() => parseCliArgs(["--eu-sanctions-probe", "RU,CN"], {})).toThrow(
      "Live API probing requires --live."
    );
  });

  it("supports a UN Comtrade Preview probe mode", () => {
    expect(
      parseCliArgs(
        ["--live", "--comtrade-probe", "276,156,85", "--comtrade-year", "2023"],
        {}
      )
    ).toMatchObject({
      live: true,
      comtradeProbe: {
        reporterCode: 276,
        partnerCode: 156,
        cmdCode: "85",
      },
      comtradeYear: 2023,
    });

    expect(parseCliArgs(["--live", "--comtrade-reporter", "40"], {})).toMatchObject({
      live: true,
      comtradeReporterCode: 40,
    });
    expect(parseCliArgs(["--live", "--comtrade-concurrency", "2"], {})).toMatchObject({
      live: true,
      comtradeConcurrency: 2,
    });

    expect(() => parseCliArgs(["--comtrade-probe", "276,156,85"], {})).toThrow(
      "Live API probing requires --live."
    );

    expect(() => parseCliArgs(["--live", "--comtrade-probe", "276,156"], {})).toThrow(
      "Invalid --comtrade-probe value"
    );
    expect(() => parseCliArgs(["--live", "--comtrade-reporter", "DE"], {})).toThrow(
      "Invalid value for --comtrade-reporter"
    );
    expect(() => parseCliArgs(["--live", "--comtrade-concurrency", "0"], {})).toThrow(
      "Invalid value for --comtrade-concurrency"
    );
  });

  it("keeps high-risk suppliers at the top", () => {
    const suppliers = loadSuppliers("data/suppliers.json");
    const results = assessSuppliers(suppliers, DEFAULT_CONFIG);

    expect(results[0]).toMatchObject({
      risiko_score: 85.6,
      ampel: "rot",
    });
    expect(results[0].supplier.lieferant_id).toBe("LF-024");
  });

  it("ranks top drivers by weighted contribution, not raw risk value", () => {
    const config: RiskConfig = {
      ...DEFAULT_CONFIG,
      weights: {
        geopolitik_governance: 0.4,
        sanktions_exposure: 0.4,
        handels_exposure: 0.2,
      },
    };
    const dimensions = {
      geopolitik_governance: 58,
      sanktions_exposure: 20,
      handels_exposure: 72,
    };
    const supplier = createSupplier(dimensions);

    const expectedGovernanceContribution = round1(
      dimensions.geopolitik_governance * config.weights.geopolitik_governance
    );
    const expectedTradeContribution = round1(
      dimensions.handels_exposure * config.weights.handels_exposure
    );

    const result = assessSupplier(supplier, config);

    expect(result.treiber.map((driver) => driver.key)).toEqual([
      "geopolitik_governance",
      "handels_exposure",
    ]);
    expect(result.treiber.map((driver) => driver.contribution)).toEqual([
      expectedGovernanceContribution,
      expectedTradeContribution,
    ]);
  });

  it("uses configured trade exposure threshold for minimum yellow", () => {
    const supplier = createSupplier({
      geopolitik_governance: 5,
      sanktions_exposure: 5,
      handels_exposure: 80,
    });
    const config: RiskConfig = {
      ...DEFAULT_CONFIG,
      thresholds: {
        ...DEFAULT_CONFIG.thresholds,
        tradeExposureMinimumYellow: 80,
      },
    };

    const result = assessSupplier(supplier, config);

    expect(result.risiko_score).toBe(20);
    expect(result.ampel).toBe("gelb");
    expect(result.begruendung).toContain("Diversifikation");
  });

  it("imputes missing dimensions from same-country median and ignores peers missing that value", () => {
    const lowPeer = createSupplier(
      {
        geopolitik_governance: 20,
        sanktions_exposure: 10,
        handels_exposure: 30,
      },
      { lieferant_id: "PEER-LOW", land_iso2: "AT", land_name: "Österreich" }
    );
    const highPeer = createSupplier(
      {
        geopolitik_governance: 30,
        sanktions_exposure: 30,
        handels_exposure: 50,
      },
      { lieferant_id: "PEER-HIGH", land_iso2: "AT", land_name: "Österreich" }
    );
    const peerMissingSanctions = createSupplier(
      {
        geopolitik_governance: 40,
        handels_exposure: 70,
      },
      { lieferant_id: "PEER-MISSING", land_iso2: "AT", land_name: "Österreich" }
    );
    const missingSanctions = createSupplier(
      {
        geopolitik_governance: 25,
        handels_exposure: 35,
      },
      { lieferant_id: "MISSING-001", land_iso2: "AT", land_name: "Österreich" }
    );

    const results = assessSuppliers(
      [lowPeer, highPeer, peerMissingSanctions, missingSanctions],
      DEFAULT_CONFIG
    );
    const imputedResult = results.find(
      (result) => result.supplier.lieferant_id === "MISSING-001"
    );

    expect(imputedResult?.supplier.risiko_dimensionen.sanktions_exposure).toBe(20);
    expect(imputedResult?.datenqualitaet.join(" ")).toContain(
      "Sanktions-Exposure fehlte"
    );
    expect(imputedResult?.datenqualitaet.join(" ")).toContain("Länder-Median");
  });

  it("treats common missing markers as missing and casts numeric risk strings", () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "lieferketten-check-"));
    tempDirectories.push(tempDirectory);

    const inputPath = join(tempDirectory, "suppliers.json");
    writeFileSync(
      inputPath,
      JSON.stringify([
        {
          ...createSupplier(
            {
              geopolitik_governance: 20,
              sanktions_exposure: 10,
              handels_exposure: 30,
            },
            { lieferant_id: "PEER-001", land_iso2: "AT", land_name: "Österreich" }
          ),
          risiko_dimensionen: {
            geopolitik_governance: "20",
            sanktions_exposure: "10",
            handels_exposure: "30",
          },
        },
        {
          ...createSupplier(
            {},
            { lieferant_id: "MISSING-MARKERS", land_iso2: "AT", land_name: "Österreich" }
          ),
          risiko_dimensionen: {
            geopolitik_governance: "NA",
            sanktions_exposure: "NaN",
            handels_exposure: "30",
          },
        },
      ]),
      "utf-8"
    );

    const results = assessSuppliers(loadSuppliers(inputPath), DEFAULT_CONFIG);
    const imputedResult = results.find(
      (entry) => entry.supplier.lieferant_id === "MISSING-MARKERS"
    );
    const peerResult = results.find((entry) => entry.supplier.lieferant_id === "PEER-001");

    expect(peerResult?.supplier.risiko_dimensionen.geopolitik_governance).toBe(20);
    expect(imputedResult?.supplier.risiko_dimensionen).toMatchObject({
      geopolitik_governance: 20,
      sanktions_exposure: 10,
      handels_exposure: 30,
    });
    expect(imputedResult?.datenqualitaet).toHaveLength(2);
  });

  it("marks suppliers with invalid risk strings as red instead of imputing them", () => {
    const result = assessSupplier(
      createSupplier({
        geopolitik_governance: { status: "invalid", rawValue: "not-a-number" },
        sanktions_exposure: 5,
        handels_exposure: 5,
      }),
      DEFAULT_CONFIG
    );

    expect(result.ampel).toBe("rot");
    expect(result.risiko_score).toBe(100);
    expect(result.datenqualitaet.join(" ")).toContain("ungültig angegeben");
    expect(result.datenqualitaet.join(" ")).toContain("not-a-number");
  });

  it("writes Markdown, JSON, and alert reports for downstream processing", () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "lieferketten-check-"));
    tempDirectories.push(tempDirectory);

    const suppliers = loadSuppliers("data/suppliers.json");
    const results = assessSuppliers(suppliers, DEFAULT_CONFIG);
    const markdown = renderMarkdownReport(
      results,
      DEFAULT_CONFIG,
      new Date("2026-06-14T12:00:00.000Z"),
      [
        "Geopolitik/Governance: live aus World Bank WGI.",
        "Handels-Exposure: Seed-Fallback, weil UN Comtrade Preview fehlgeschlagen ist.",
      ],
      "KI-Brief: Zwei Lieferanten sind rot und sollten eskaliert werden."
    );

    const markdownPath = writeTimestampedMarkdownReport(
      tempDirectory,
      markdown,
      new Date("2026-06-14T12:00:00.000Z")
    );
    const jsonPath = writeTimestampedJsonReport(
      tempDirectory,
      results,
      new Date("2026-06-14T12:00:00.000Z")
    );
    const alertReport = createAlertReport(
      results,
      "rot",
      new Date("2026-06-14T12:00:00.000Z")
    );
    const alertPath = writeTimestampedAlertReport(
      tempDirectory,
      alertReport,
      new Date("2026-06-14T12:00:00.000Z")
    );

    expect(existsSync(markdownPath)).toBe(true);
    expect(readFileSync(markdownPath, "utf-8")).toContain("# Lieferketten-Check Report");
    expect(readFileSync(markdownPath, "utf-8")).toContain("## KI-Kurzbrief");
    expect(readFileSync(markdownPath, "utf-8")).toContain("KI-Brief: Zwei Lieferanten");
    expect(readFileSync(markdownPath, "utf-8")).toContain("## Datenquellen");
    expect(readFileSync(markdownPath, "utf-8")).toContain(
      "Geopolitik/Governance: live aus World Bank WGI."
    );
    expect(readFileSync(markdownPath, "utf-8")).toContain(
      "Handels-Exposure: Seed-Fallback"
    );
    expect(existsSync(jsonPath)).toBe(true);
    expect(JSON.parse(readFileSync(jsonPath, "utf-8"))[0]).toMatchObject({
      risiko_score: 85.6,
      ampel: "rot",
    });
    expect(existsSync(alertPath)).toBe(true);
    expect(JSON.parse(readFileSync(alertPath, "utf-8"))).toMatchObject({
      threshold: "rot",
      count: 2,
      alerts: [
        {
          lieferant_id: "LF-024",
          ampel: "rot",
          risiko_score: 85.6,
        },
        {
          lieferant_id: "LF-025",
          ampel: "rot",
          risiko_score: 85.6,
        },
      ],
    });
  });

  it("passes the explicit eval set scenarios", () => {
    const scenarios = loadEvalSet();

    for (const scenario of scenarios) {
      const supplier = validateSupplier(scenario.supplier, 0);
      const result = assessSupplier(supplier, DEFAULT_CONFIG);

      expect(result.ampel, scenario.id).toBe(scenario.expected_ampel);
      expect(result.risiko_score, scenario.id).toBeGreaterThanOrEqual(
        scenario.expected_score_min
      );
      expect(result.risiko_score, scenario.id).toBeLessThanOrEqual(
        scenario.expected_score_max
      );

      if (scenario.expected_top_driver) {
        expect(result.treiber[0]?.key, scenario.id).toBe(scenario.expected_top_driver);
      }

      if (scenario.expected_data_quality_contains) {
        expect(result.datenqualitaet.join(" "), scenario.id).toContain(
          scenario.expected_data_quality_contains
        );
      }

      if (scenario.expected_reasoning_contains) {
        expect(result.begruendung, scenario.id).toContain(
          scenario.expected_reasoning_contains
        );
      }
    }
  });
});

type EvalScenario = {
  id: string;
  name: string;
  rationale: string;
  expected_ampel: TrafficLight;
  expected_score_min: number;
  expected_score_max: number;
  expected_top_driver?: RiskDimensionKey;
  expected_data_quality_contains?: string;
  expected_reasoning_contains?: string;
  supplier: unknown;
};

function loadEvalSet(): EvalScenario[] {
  const raw = readFileSync("data/eval-set.json", "utf-8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Eval set must be a JSON array.");
  }

  return parsed.map((scenario, index) => {
    if (!isEvalScenario(scenario)) {
      throw new Error(`Invalid eval scenario at index ${index}.`);
    }

    return scenario;
  });
}

function isEvalScenario(value: unknown): value is EvalScenario {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const scenario = value as Partial<EvalScenario>;

  return (
    typeof scenario.id === "string" &&
    typeof scenario.name === "string" &&
    typeof scenario.rationale === "string" &&
    isTrafficLight(scenario.expected_ampel) &&
    typeof scenario.expected_score_min === "number" &&
    typeof scenario.expected_score_max === "number" &&
    scenario.supplier !== undefined
  );
}

function isTrafficLight(value: unknown): value is TrafficLight {
  return value === "grün" || value === "gelb" || value === "rot";
}

function createSupplier(
  risiko_dimensionen: Supplier["risiko_dimensionen"],
  overrides: Partial<Omit<Supplier, "risiko_dimensionen">> = {}
): Supplier {
  return {
    lieferant_id: "TEST-001",
    name: "Test Supplier",
    branche: "Test",
    land_iso2: "TS",
    land_m49: 999,
    land_name: "Testland",
    hs_code: "00",
    ware: "Testware",
    handelsvolumen_eur_jahr: 1000,
    risiko_dimensionen,
    ...overrides,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
