import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyEuSanctionsCountryRisksToSuppliers,
  fetchEuSanctionsCountryRisksForSuppliers,
  formatEuSanctionsCountryRisks,
  parseEuSanctionsCountryRisks,
  parseEuSanctionsRssCsv11Link,
} from "./euSanctions";
import type { Supplier } from "./types";

const tempDirectories: string[] = [];

afterEach(() => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();

    if (directory) {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

describe("EU FSF sanctions API client", () => {
  it("extracts the CSV v1.1 download URL from the RSS feed", () => {
    const rss = `
      <rss><channel>
        <item>
          <title>CSV - v1.0</title>
          <link>https://example.test/csv10?token=old&amp;checksum=old</link>
          <pubDate>Fri, 01 Jun 2026 12:00:00 GMT</pubDate>
        </item>
        <item>
          <title>CSV - v1.1</title>
          <link>https://example.test/csv11?token=public&amp;checksum=new</link>
          <pubDate>Fri, 05 Jun 2026 14:00:14 GMT</pubDate>
        </item>
      </channel></rss>
    `;

    expect(parseEuSanctionsRssCsv11Link(rss)).toEqual({
      url: "https://example.test/csv11?token=public&checksum=new",
      pubDate: "Fri, 05 Jun 2026 14:00:14 GMT",
    });
  });

  it("counts unique sanctioned entities by address or citizenship country and scores relative to the median count", () => {
    const csv = [
      "\uFEFFEntity_LogicalId;NameAlias_WholeName;Address_CountryIso2Code;Citizenship_CountryIso2Code;Entity_SubjectType;Entity_Regulation_Programme",
      "E1;Alias A;RU;;P;Russia",
      "E1;Alias A duplicate;RU;;P;Russia",
      "E2;Alias B;;RU;P;Russia",
      "E3;Alias C;BY;;E;Belarus",
      "E4;Alias D;DE;;E;Other",
      "E5;Alias E;CN;RU;P;Mixed",
    ].join("\n");

    expect(parseEuSanctionsCountryRisks(csv, ["RU", "BY", "CN"])).toEqual([
      {
        countryIso2: "RU",
        sanctionedEntityCount: 3,
        sanctionsExposure: 35,
      },
      {
        countryIso2: "BY",
        sanctionedEntityCount: 1,
        sanctionsExposure: 25,
      },
      {
        countryIso2: "CN",
        sanctionedEntityCount: 1,
        sanctionsExposure: 25,
      },
    ]);
  });

  it("validates the cached CSV by RSS pubDate before reusing it", async () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "eu-fsf-test-"));
    tempDirectories.push(tempDirectory);
    const cachePath = join(tempDirectory, "eu-fsf.csv");
    const calls: string[] = [];
    const fetch = async (input: string) => {
      calls.push(input);

      if (input.endsWith("/rss")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            `<rss><channel><item><title>CSV - v1.1</title><link>https://example.test/full.csv?token=public</link><pubDate>Fri, 05 Jun 2026 14:00:14 GMT</pubDate></item></channel></rss>`,
        };
      }

      return {
        ok: true,
        status: 200,
        text: async () =>
          [
            "Entity_LogicalId;NameAlias_WholeName;Address_CountryIso2Code;Citizenship_CountryIso2Code",
            "E1;Alias A;RU;",
            "E2;Alias B;CN;",
          ].join("\n"),
      };
    };
    const suppliers = [
      createSupplier("LF-001", "RU", 80),
      createSupplier("LF-002", "CN", 20),
    ];

    const first = await fetchEuSanctionsCountryRisksForSuppliers(suppliers, {
      cachePath,
      fetch,
      rssUrl: "https://example.test/rss",
    });
    const second = await fetchEuSanctionsCountryRisksForSuppliers(suppliers, {
      cachePath,
      fetch,
      rssUrl: "https://example.test/rss",
    });

    expect(calls).toEqual([
      "https://example.test/rss",
      "https://example.test/full.csv?token=public",
      "https://example.test/rss",
    ]);
    expect(first).toEqual([
      expect.objectContaining({ countryIso2: "RU", sanctionsExposure: 25 }),
      expect.objectContaining({ countryIso2: "CN", sanctionsExposure: 25 }),
    ]);
    expect(second).toEqual(first.map((risk) => expect.objectContaining({
      countryIso2: risk.countryIso2,
      sanctionsExposure: risk.sanctionsExposure,
      sourceLastUpdated: "Fri, 05 Jun 2026 14:00:14 GMT",
    })));
  });

  it("refreshes the cached CSV when the RSS pubDate changes", async () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "eu-fsf-test-"));
    tempDirectories.push(tempDirectory);
    const cachePath = join(tempDirectory, "eu-fsf.csv");
    const calls: string[] = [];
    const pubDates = [
      "Fri, 05 Jun 2026 14:00:14 GMT",
      "Fri, 12 Jun 2026 14:00:14 GMT",
    ];
    let rssCalls = 0;
    let csvDownloads = 0;
    const fetch = async (input: string) => {
      calls.push(input);

      if (input.endsWith("/rss")) {
        const pubDate = pubDates[Math.min(rssCalls, pubDates.length - 1)];
        rssCalls += 1;

        return {
          ok: true,
          status: 200,
          text: async () =>
            `<rss><channel><item><title>CSV - v1.1</title><link>https://example.test/full.csv?token=public</link><pubDate>${pubDate}</pubDate></item></channel></rss>`,
        };
      }

      csvDownloads += 1;

      return {
        ok: true,
        status: 200,
        text: async () =>
          csvDownloads === 1
            ? [
                "Entity_LogicalId;NameAlias_WholeName;Address_CountryIso2Code;Citizenship_CountryIso2Code",
                "E1;Alias A;RU;",
              ].join("\n")
            : [
                "Entity_LogicalId;NameAlias_WholeName;Address_CountryIso2Code;Citizenship_CountryIso2Code",
                "E1;Alias A;RU;",
                "E2;Alias B;CN;",
              ].join("\n"),
      };
    };
    const suppliers = [
      createSupplier("LF-001", "RU", 80),
      createSupplier("LF-002", "CN", 20),
    ];

    const first = await fetchEuSanctionsCountryRisksForSuppliers(suppliers, {
      cachePath,
      fetch,
      rssUrl: "https://example.test/rss",
    });
    const second = await fetchEuSanctionsCountryRisksForSuppliers(suppliers, {
      cachePath,
      fetch,
      rssUrl: "https://example.test/rss",
    });

    expect(calls).toEqual([
      "https://example.test/rss",
      "https://example.test/full.csv?token=public",
      "https://example.test/rss",
      "https://example.test/full.csv?token=public",
    ]);
    expect(first).toEqual([
      expect.objectContaining({
        countryIso2: "RU",
        sourceLastUpdated: "Fri, 05 Jun 2026 14:00:14 GMT",
      }),
      expect.objectContaining({
        countryIso2: "CN",
        sanctionedEntityCount: 0,
      }),
    ]);
    expect(second).toEqual([
      expect.objectContaining({
        countryIso2: "RU",
        sourceLastUpdated: "Fri, 12 Jun 2026 14:00:14 GMT",
      }),
      expect.objectContaining({
        countryIso2: "CN",
        sanctionedEntityCount: 1,
        sourceLastUpdated: "Fri, 12 Jun 2026 14:00:14 GMT",
      }),
    ]);
  });

  it("applies country sanctions risks to suppliers", () => {
    const suppliers = [
      createSupplier("LF-001", "RU", 80),
      createSupplier("LF-002", "CN", 20),
    ];
    const updated = applyEuSanctionsCountryRisksToSuppliers(suppliers, [
      {
        countryIso2: "RU",
        sanctionedEntityCount: 5,
        sanctionsExposure: 100,
      },
      {
        countryIso2: "CN",
        sanctionedEntityCount: 2,
        sanctionsExposure: 40,
      },
    ]);

    expect(updated.map((supplier) => supplier.risiko_dimensionen.sanktions_exposure)).toEqual([
      100,
      40,
    ]);
  });

  it("formats probe output", () => {
    expect(
      formatEuSanctionsCountryRisks([
        {
          countryIso2: "RU",
          sanctionedEntityCount: 5,
          sanctionsExposure: 25,
        },
      ])
    ).toContain("RU: 5 unique entities -> sanktions_exposure 25/100");
  });
});

function createSupplier(
  lieferantId: string,
  countryIso2: string,
  sanctionsExposure: number
): Supplier {
  return {
    lieferant_id: lieferantId,
    name: "Test Supplier",
    branche: "Test",
    land_iso2: countryIso2,
    land_m49: 999,
    land_name: "Testland",
    hs_code: "00",
    ware: "Testware",
    handelsvolumen_eur_jahr: 1000,
    risiko_dimensionen: {
      geopolitik_governance: 20,
      sanktions_exposure: sanctionsExposure,
      handels_exposure: 30,
    },
  };
}
