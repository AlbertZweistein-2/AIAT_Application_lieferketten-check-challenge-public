import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, DEFAULT_LLM_CONFIG } from "./config";
import {
  applyLlmSupplierTexts,
  generateOllamaReportEnhancement,
  parseJsonObjectFromModelOutput,
  parseOllamaListOutput,
} from "./ollama";
import { updateDefaultLlmModelSource } from "./llmConfigFile";
import { assessSuppliers } from "./scoring";
import type { Supplier } from "./types";

describe("Ollama report enrichment", () => {
  it("parses installed model names from ollama list output", () => {
    expect(
      parseOllamaListOutput([
        "NAME              ID              SIZE      MODIFIED",
        "qwen3:14b         abc123          9.3 GB    2 days ago",
        "llama3.2:latest   def456          2.0 GB    1 week ago",
      ].join("\n"))
    ).toEqual(["qwen3:14b", "llama3.2:latest"]);
  });

  it("parses JSON even when a model wraps it with thinking or fences", () => {
    expect(
      parseJsonObjectFromModelOutput<{ portfolio_brief: string }>(
        '<think>kurz planen</think>\n```json\n{"portfolio_brief":"ok"}\n```'
      )
    ).toEqual({ portfolio_brief: "ok" });
  });

  it("generates a portfolio brief and applies supplier texts without changing scores", async () => {
    const results = assessSuppliers([createSupplier()], DEFAULT_CONFIG);
    const originalScore = results[0].risiko_score;
    const responses = [
      {
        message: {
          content: JSON.stringify({
            portfolio_brief: "Ein roter Lieferant sollte sofort eskaliert werden.",
          }),
        },
      },
      {
        message: {
          content: JSON.stringify({
            supplier_texts: [
              {
                lieferant_id: "LLM-001",
                begruendung: "LLM-Begruendung auf Basis der roten Ampel.",
                handlungsempfehlung: "LLM-Empfehlung: sofort eskalieren.",
              },
            ],
          }),
        },
      },
    ];
    const requestBodies: Array<Record<string, unknown>> = [];
    const fetchMock = async (_input: string | URL, init?: RequestInit) => {
      requestBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);

      return new Response(JSON.stringify(responses.shift()), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const enhancement = await generateOllamaReportEnhancement(
      results,
      {
        ...DEFAULT_LLM_CONFIG,
        model: "qwen3:14b",
        batchSize: 3,
      },
      { fetch: fetchMock }
    );
    const enhancedResults = applyLlmSupplierTexts(results, enhancement);

    expect(enhancement.portfolioBrief).toContain("roter Lieferant");
    expect(enhancement.portfolioBrief).toContain("(AI generated)");
    expect(requestBodies[0].format).toMatchObject({
      type: "object",
      required: ["portfolio_brief"],
    });
    expect(requestBodies[1].format).toMatchObject({
      type: "object",
      required: ["supplier_texts"],
    });
    expect(requestBodies[0].options).toMatchObject({ temperature: 0 });
    expect(enhancedResults[0].risiko_score).toBe(originalScore);
    expect(enhancedResults[0].begruendung).toBe(
      "LLM-Begruendung auf Basis der roten Ampel. (AI generated)"
    );
    expect(enhancedResults[0].handlungsempfehlung).toBe(
      "LLM-Empfehlung: sofort eskalieren. (AI generated)"
    );
  });

  it("updates the default model inside DEFAULT_LLM_CONFIG source", () => {
    const source = [
      'import type { LlmConfig } from "./types";',
      "",
      "export const DEFAULT_LLM_CONFIG: LlmConfig = {",
      '  backend: "ollama",',
      '  baseUrl: "http://localhost:11434",',
      '  model: "old:model",',
      "  batchSize: 6,",
      "  timeoutMs: 120_000,",
      "  prompts: {",
      '    portfolioSystem: "x",',
      '    portfolioUser: "x",',
      '    supplierSystem: "x",',
      '    supplierUser: "x",',
      "  },",
      "};",
    ].join("\n");

    expect(updateDefaultLlmModelSource(source, "qwen3:14b")).toContain(
      '  model: "qwen3:14b",'
    );
  });
});

function createSupplier(): Supplier {
  return {
    lieferant_id: "LLM-001",
    name: "LLM Test Supplier",
    branche: "Metall",
    land_iso2: "RU",
    land_m49: 643,
    land_name: "Russland",
    hs_code: "72",
    ware: "Stahl",
    handelsvolumen_eur_jahr: 100000,
    risiko_dimensionen: {
      geopolitik_governance: 80,
      sanktions_exposure: 90,
      handels_exposure: 20,
    },
  };
}
