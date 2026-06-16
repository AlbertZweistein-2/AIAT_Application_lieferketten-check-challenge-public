// Unit tests for World Bank WGI country normalization, fetching and supplier application.
import { describe, expect, it } from "vitest";
import {
  WGI_GOVERNANCE_INDICATORS,
  applyWgiGovernanceRisksToSuppliers,
  fetchWorldBankWgiGovernanceRisks,
  normalizeCountryCodes,
} from "./worldBankWgi";
import type { Supplier } from "./types";

describe("World Bank WGI API client", () => {
  it("fetches each WGI indicator for all requested countries in one country batch", async () => {
    const calls: string[] = [];
    const fetch = createFakeWgiFetch(calls, {
      DEU: {
        "GOV_WGI_RL.SC": 70,
        "GOV_WGI_CC.SC": 40,
      },
      AUT: {
        "GOV_WGI_RL.SC": 90,
        "GOV_WGI_CC.SC": 60,
      },
    });

    const results = await fetchWorldBankWgiGovernanceRisks(["DE", "AT"], {
      baseUrl: "https://example.test/v2",
      fetch,
      year: 2024,
    });

    expect(calls).toHaveLength(WGI_GOVERNANCE_INDICATORS.length);
    expect(calls.every((call) => call.includes("/country/DEU;AUT/indicator/"))).toBe(
      true
    );
    expect(calls.every((call) => call.includes("date=2024"))).toBe(true);
    expect(calls.every((call) => !call.includes("mrnev=1"))).toBe(true);

    expect(results).toEqual([
      expect.objectContaining({
        countryIso2: "DE",
        countryIso3: "DEU",
        governanceScore: 58,
        geopolitikGovernanceRisk: 42,
      }),
      expect.objectContaining({
        countryIso2: "AT",
        countryIso3: "AUT",
        governanceScore: 78,
        geopolitikGovernanceRisk: 22,
      }),
    ]);
    expect(results[0]?.indicators).toHaveLength(WGI_GOVERNANCE_INDICATORS.length);
    expect(results[0]?.indicators.filter((indicator) => indicator.weight > 0)).toEqual([
      expect.objectContaining({ id: "GOV_WGI_RL.SC", weight: 0.6 }),
      expect.objectContaining({ id: "GOV_WGI_CC.SC", weight: 0.4 }),
    ]);
  });

  it("uses latest available values by default", async () => {
    const calls: string[] = [];
    const fetch = createFakeWgiFetch(calls, { DEU: {} });

    await fetchWorldBankWgiGovernanceRisks(["DEU"], {
      baseUrl: "https://example.test/v2",
      fetch,
    });

    expect(calls.every((call) => call.includes("mrnev=1"))).toBe(true);
    expect(calls.every((call) => !call.includes("date="))).toBe(true);
  });

  it("rejects unsupported ISO2 country codes instead of guessing", () => {
    expect(() => normalizeCountryCodes(["XX"])).toThrow(
      'Unsupported ISO2 country code "XX"'
    );
  });

  it("supports ISO2 codes beyond the seed dataset", () => {
    expect(normalizeCountryCodes(["US", "JP", "ZA"])).toEqual([
      { input: "US", iso2: "US", iso3: "USA" },
      { input: "JP", iso2: "JP", iso3: "JPN" },
      { input: "ZA", iso2: "ZA", iso3: "ZAF" },
    ]);
  });

  it("applies live WGI governance risk to suppliers while preserving other seed dimensions", () => {
    const suppliers: Supplier[] = [
      createSupplier("LF-001", "DE", {
        geopolitik_governance: 99,
        sanktions_exposure: 5,
        handels_exposure: 10,
      }),
      createSupplier("LF-002", "AT", {
        sanktions_exposure: 6,
        handels_exposure: 11,
      }),
    ];

    const updated = applyWgiGovernanceRisksToSuppliers(suppliers, [
      createRisk("DEU", 19.8),
      createRisk("AUT", 21.2),
    ]);

    expect(updated[0]?.risiko_dimensionen).toEqual({
      geopolitik_governance: 19.8,
      sanktions_exposure: 5,
      handels_exposure: 10,
    });
    expect(updated[1]?.risiko_dimensionen).toEqual({
      geopolitik_governance: 21.2,
      sanktions_exposure: 6,
      handels_exposure: 11,
    });
  });

  it("fails if a fetched WGI dimension is missing for a requested country", async () => {
    const missingIndicator = WGI_GOVERNANCE_INDICATORS[0]?.id;
    const fetch = createFakeWgiFetch(
      [],
      { DEU: {} },
      missingIndicator
    );

    await expect(
      fetchWorldBankWgiGovernanceRisks(["DE"], {
        baseUrl: "https://example.test/v2",
        fetch,
        year: 2024,
      })
    ).rejects.toThrow(`Missing WGI indicator ${missingIndicator} for DEU`);
  });
});

function createFakeWgiFetch(
  calls: string[],
  scoresByCountry: Record<string, Partial<Record<string, number>>>,
  missingIndicator?: string
) {
  return async (input: string) => {
    calls.push(input);

    const url = new URL(input);
    const countryPath = readPathSegmentAfter(url.pathname, "country");
    const indicatorId = readPathSegmentAfter(url.pathname, "indicator");
    const year = url.searchParams.get("date") ?? "2024";
    const rows =
      indicatorId === missingIndicator
        ? []
        : countryPath.split(";").map((countryIso3) => ({
            indicator: {
              id: indicatorId,
              value: indicatorId,
            },
            country: {
              id: countryIso3.slice(0, 2),
              value: countryIso3,
            },
            countryiso3code: countryIso3,
            date: year,
            value: scoresByCountry[countryIso3]?.[indicatorId] ?? 80,
          }));

    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify([
          {
            page: 1,
            pages: 1,
            total: rows.length,
            sourceid: "3",
            lastupdated: "2026-03-18",
          },
          rows,
        ]),
    };
  };
}

function createSupplier(
  lieferantId: string,
  landIso2: string,
  risikoDimensionen: Supplier["risiko_dimensionen"]
): Supplier {
  return {
    lieferant_id: lieferantId,
    name: "Test Supplier",
    branche: "Test",
    land_iso2: landIso2,
    land_m49: 999,
    land_name: "Testland",
    hs_code: "00",
    ware: "Testware",
    handelsvolumen_eur_jahr: 1000,
    risiko_dimensionen: risikoDimensionen,
  };
}

function createRisk(countryIso3: string, geopolitikGovernanceRisk: number) {
  return {
    countryIso3,
    countryName: countryIso3,
    year: "2024",
    governanceScore: 100 - geopolitikGovernanceRisk,
    geopolitikGovernanceRisk,
    indicators: [],
  };
}

function readPathSegmentAfter(pathname: string, marker: string): string {
  const segments = pathname.split("/");
  const markerIndex = segments.indexOf(marker);
  const value = segments[markerIndex + 1];

  if (!value) {
    throw new Error(`Missing ${marker} path segment in ${pathname}.`);
  }

  return value;
}
