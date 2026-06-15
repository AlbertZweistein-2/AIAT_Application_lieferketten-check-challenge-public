import { describe, expect, it } from "vitest";
import {
  applyComtradeImportExposuresToSuppliers,
  fetchComtradeImportExposure,
  fetchComtradeImportExposuresForSuppliers,
  formatComtradeImportExposure,
  parseComtradeProbeValue,
} from "./unComtradePreview";
import type { Supplier } from "./types";

describe("UN Comtrade Preview API client", () => {
  it("fetches world and partner import rows and computes partner import share", async () => {
    const calls: string[] = [];
    const fetch = createFakeComtradeFetch(calls, {
      0: [
        { primaryValue: 1000, partnerDesc: "World" },
        { primaryValue: 500, partnerDesc: "World" },
      ],
      156: [
        { primaryValue: 150, partnerDesc: "China" },
        { primaryValue: 150, partnerDesc: "China" },
      ],
    });

    const result = await fetchComtradeImportExposure(
      {
        reporterCode: 276,
        partnerCode: 156,
        cmdCode: "85",
        period: 2023,
      },
      {
        baseUrl: "https://example.test/public/v1/preview",
        fetch,
      }
    );

    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain("/public/v1/preview/C/A/HS");
    expect(calls[0]).toContain("partnerCode=0");
    expect(calls[1]).toContain("partnerCode=156");
    expect(calls.every((call) => call.includes("reporterCode=276"))).toBe(true);
    expect(calls.every((call) => call.includes("period=2023"))).toBe(true);
    expect(calls.every((call) => call.includes("cmdCode=85"))).toBe(true);
    expect(calls.every((call) => call.includes("flowCode=M"))).toBe(true);
    expect(calls.every((call) => call.includes("includeDesc=true"))).toBe(true);

    expect(result).toMatchObject({
      reporterCode: 276,
      reporterDesc: "Germany",
      partnerCode: 156,
      partnerDesc: "China",
      cmdCode: "85",
      cmdDesc: "Electrical machinery and equipment",
      period: "2023",
      flowCode: "M",
      partnerValue: 300,
      totalValue: 1500,
      importSharePercent: 20,
      handelsExposureRisk: 20,
      rowCounts: {
        partner: 2,
        total: 2,
      },
    });
  });

  it("parses probe values with comma, semicolon, or colon separators", () => {
    expect(parseComtradeProbeValue("276,156,85")).toEqual({
      reporterCode: 276,
      partnerCode: 156,
      cmdCode: "85",
    });
    expect(parseComtradeProbeValue("276;156;8501")).toEqual({
      reporterCode: 276,
      partnerCode: 156,
      cmdCode: "8501",
    });
    expect(parseComtradeProbeValue("276:156:85")).toEqual({
      reporterCode: 276,
      partnerCode: 156,
      cmdCode: "85",
    });
  });

  it("rejects malformed probe values", () => {
    expect(() => parseComtradeProbeValue("276,156")).toThrow(
      "Invalid --comtrade-probe value"
    );
    expect(() => parseComtradeProbeValue("DE,156,85")).toThrow(
      "Invalid reporterM49"
    );
    expect(() => parseComtradeProbeValue("276,156,HS85")).toThrow("Invalid hsCode");
  });

  it("fails on API error payloads", async () => {
    const fetch = async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [], error: "Rate limit is exceeded." }),
    });

    await expect(
      fetchComtradeImportExposure(
        {
          reporterCode: 276,
          partnerCode: 156,
          cmdCode: "85",
          period: 2023,
        },
        {
          fetch,
        }
      )
    ).rejects.toThrow("UN Comtrade Preview API error: Rate limit is exceeded.");
  });

  it("retries HTTP 429 preview responses", async () => {
    const calls: string[] = [];
    let returnedRateLimit = false;
    const successfulFetch = createFakeComtradeFetch(calls, {
      0: [{ primaryValue: 1000 }],
      156: [{ primaryValue: 100 }],
    });
    const fetch = async (input: string) => {
      if (!returnedRateLimit) {
        returnedRateLimit = true;
        calls.push(input);

        return {
          ok: false,
          status: 429,
          text: async () =>
            JSON.stringify({
              statusCode: 429,
              message: "Rate limit is exceeded. Try again in 1 seconds.",
            }),
        };
      }

      return successfulFetch(input);
    };

    const result = await fetchComtradeImportExposure(
      {
        reporterCode: 276,
        partnerCode: 156,
        cmdCode: "85",
        period: 2023,
      },
      {
        fetch,
        maxRetries: 1,
        retryDelayMs: 0,
      }
    );

    expect(calls).toHaveLength(3);
    expect(result.importSharePercent).toBe(10);
  });

  it("fetches unique supplier country and HS pairs, caches world totals, and replaces trade exposure", async () => {
    const suppliers: Supplier[] = [
      createSupplier("LF-001", 156, "85", 72),
      createSupplier("LF-002", 156, "85", 72),
      createSupplier("LF-003", 356, "85", 55),
    ];
    const calls: string[] = [];
    const logs: string[] = [];
    const fetch = createFakeComtradeFetch(calls, {
      0: [{ primaryValue: 1000 }],
      156: [{ primaryValue: 250 }],
      356: [{ primaryValue: 100 }],
    });

    const exposures = await fetchComtradeImportExposuresForSuppliers(suppliers, {
      reporterCode: 276,
      period: 2023,
      fetch,
      logger: (message) => logs.push(message),
    });
    const updated = applyComtradeImportExposuresToSuppliers(suppliers, exposures);

    expect(calls).toHaveLength(3);
    expect(calls.filter((call) => call.includes("partnerCode=0"))).toHaveLength(1);
    expect(calls.filter((call) => call.includes("partnerCode=156"))).toHaveLength(1);
    expect(calls.filter((call) => call.includes("partnerCode=356"))).toHaveLength(1);
    expect(exposures.map((exposure) => exposure.handelsExposureRisk)).toEqual([25, 10]);
    expect(updated.map((supplier) => supplier.risiko_dimensionen.handels_exposure)).toEqual([
      25,
      25,
      10,
    ]);
    expect(logs.join("\n")).toContain(
      "UN Comtrade Preview: fetching 1 world totals and 2 partner exposures with concurrency 3, request spacing 0ms."
    );
    expect(logs.join("\n")).toContain(
      "UN Comtrade Preview: [world 1/1] reporter=276, HS=85, year=2023."
    );
    expect(logs.join("\n")).toContain(
      "UN Comtrade Preview: [partner 1/2] reporter=276, partner=156, HS=85, year=2023."
    );
  });

  it("formats a concise diagnostic probe result", () => {
    const text = formatComtradeImportExposure({
      reporterCode: 276,
      reporterDesc: "Germany",
      partnerCode: 156,
      partnerDesc: "China",
      cmdCode: "85",
      cmdDesc: "Electrical machinery",
      period: "2023",
      flowCode: "M",
      partnerValue: 300,
      totalValue: 1500,
      importSharePercent: 20,
      handelsExposureRisk: 20,
      rowCounts: {
        partner: 2,
        total: 2,
      },
    });

    expect(text).toContain("UN Comtrade Preview import exposure probe");
    expect(text).toContain("Germany (276)");
    expect(text).toContain("Import share: 20/100 -> handels_exposure diagnostic 20/100");
    expect(text).toContain("Rows summed: partner=2, world=2");
  });
});

function createFakeComtradeFetch(
  calls: string[],
  rowsByPartnerCode: Record<number, Array<Partial<Record<string, unknown>>>>
) {
  return async (input: string) => {
    calls.push(input);

    const url = new URL(input);
    const partnerCode = Number(url.searchParams.get("partnerCode"));
    const rows = (rowsByPartnerCode[partnerCode] ?? []).map((row) => ({
      reporterCode: 276,
      reporterDesc: "Germany",
      partnerCode,
      partnerDesc: partnerCode === 0 ? "World" : "China",
      cmdCode: "85",
      cmdDesc: "Electrical machinery and equipment",
      period: "2023",
      flowCode: "M",
      ...row,
    }));

    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          elapsedTime: "0.01 secs",
          count: rows.length,
          data: rows,
          error: "",
        }),
    };
  };
}

function createSupplier(
  lieferantId: string,
  landM49: number,
  hsCode: string,
  handelsExposure: number
): Supplier {
  return {
    lieferant_id: lieferantId,
    name: "Test Supplier",
    branche: "Test",
    land_iso2: "TS",
    land_m49: landM49,
    land_name: "Testland",
    hs_code: hsCode,
    ware: "Testware",
    handelsvolumen_eur_jahr: 1000,
    risiko_dimensionen: {
      geopolitik_governance: 20,
      sanktions_exposure: 5,
      handels_exposure: handelsExposure,
    },
  };
}
