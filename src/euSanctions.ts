import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Supplier } from "./types";

export type EuSanctionsCountryRisk = {
  countryIso2: string;
  sanctionedEntityCount: number;
  sanctionsExposure: number;
  sourceLastUpdated?: string;
  sourceUrl?: string;
  cachePath?: string;
};

export type FetchEuSanctionsOptions = {
  cachePath?: string;
  fetch?: FetchLike;
  logger?: (message: string) => void;
  rssUrl?: string;
};

type FetchLike = (
  input: string,
  init?: RequestInit
) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

type EuSanctionsCsvSource = {
  csvText: string;
  lastUpdated?: string;
  sourceUrl?: string;
  cachePath?: string;
  source: "cache" | "download";
};

type EuSanctionsCsvLink = {
  url: string;
  pubDate?: string;
};

type EuSanctionsCacheMetadata = {
  pubDate?: string;
  sourceUrl?: string;
  cachedAt?: string;
};

const EU_SANCTIONS_RSS_URL = "https://webgate.ec.europa.eu/fsd/fsf/public/rss";
const DEFAULT_EU_SANCTIONS_CACHE_PATH = join(
  ".cache",
  "eu-fsf",
  "csvFullSanctionsList_1_1.csv"
);

export async function fetchEuSanctionsCountryRisksForSuppliers(
  suppliers: Supplier[],
  options: FetchEuSanctionsOptions = {}
): Promise<EuSanctionsCountryRisk[]> {
  return fetchEuSanctionsCountryRisks(getUniqueSupplierCountryCodes(suppliers), options);
}

export async function fetchEuSanctionsCountryRisks(
  countryCodes: string[],
  options: FetchEuSanctionsOptions = {}
): Promise<EuSanctionsCountryRisk[]> {
  const countries = normalizeCountryCodes(countryCodes);

  if (countries.length === 0) {
    return [];
  }

  const source = await loadEuSanctionsCsv(options);
  options.logger?.(
    `EU FSF sanctions: parsing ${source.source} CSV for ${countries.length} supplier countries.`
  );

  return parseEuSanctionsCountryRisks(source.csvText, countries).map((risk) => ({
    ...risk,
    sourceLastUpdated: source.lastUpdated,
    sourceUrl: source.sourceUrl,
    cachePath: source.cachePath,
  }));
}

export function applyEuSanctionsCountryRisksToSuppliers(
  suppliers: Supplier[],
  risks: EuSanctionsCountryRisk[]
): Supplier[] {
  const riskByCountry = new Map(
    risks.map((risk) => [risk.countryIso2, risk.sanctionsExposure])
  );

  return suppliers.map((supplier) => {
    const sanctionsExposure = riskByCountry.get(supplier.land_iso2.toUpperCase());

    if (sanctionsExposure === undefined) {
      throw new Error(
        `Missing EU FSF sanctions exposure for supplier ${supplier.lieferant_id} country ${supplier.land_iso2}.`
      );
    }

    return {
      ...supplier,
      risiko_dimensionen: {
        ...supplier.risiko_dimensionen,
        sanktions_exposure: sanctionsExposure,
      },
    };
  });
}

export function parseEuSanctionsCountryRisks(
  csvText: string,
  countryCodes: string[]
): EuSanctionsCountryRisk[] {
  const countries = countryCodes.map((country) => country.trim().toUpperCase());
  const countrySet = new Set(countries);
  const entityIdsByCountry = new Map(countries.map((country) => [country, new Set<string>()]));
  let header: string[] | undefined;
  let entityIdIndex = -1;
  let addressCountryIndex = -1;
  let citizenshipCountryIndex = -1;

  parseDelimitedCsv(csvText, ";", (row, rowIndex) => {
    if (rowIndex === 0) {
      header = row.map(stripBom);
      entityIdIndex = header.indexOf("Entity_LogicalId");
      addressCountryIndex = header.indexOf("Address_CountryIso2Code");
      citizenshipCountryIndex = header.indexOf("Citizenship_CountryIso2Code");

      if (entityIdIndex < 0 || addressCountryIndex < 0 || citizenshipCountryIndex < 0) {
        throw new Error("EU FSF CSV is missing required country/entity columns.");
      }

      return;
    }

    const entityId = row[entityIdIndex]?.trim();

    if (!entityId) {
      return;
    }

    const rowCountries = [
      row[addressCountryIndex]?.trim().toUpperCase(),
      row[citizenshipCountryIndex]?.trim().toUpperCase(),
    ].filter((country): country is string => Boolean(country && countrySet.has(country)));

    for (const country of new Set(rowCountries)) {
      entityIdsByCountry.get(country)?.add(entityId);
    }
  });

  const counts = countries.map((country) => entityIdsByCountry.get(country)?.size ?? 0);
  const medianCount = median(counts);

  return countries.map((country) => {
    const sanctionedEntityCount = entityIdsByCountry.get(country)?.size ?? 0;

    return {
      countryIso2: country,
      sanctionedEntityCount,
      sanctionsExposure: calculateMedianLogSanctionsExposure(
        sanctionedEntityCount,
        medianCount
      ),
    };
  });
}

export function parseEuSanctionsRssCsv11Link(rssXml: string): EuSanctionsCsvLink {
  const itemBlocks = rssXml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  for (const block of itemBlocks) {
    const title = readXmlTag(block, "title");

    if (title !== "CSV - v1.1") {
      continue;
    }

    const url = readXmlTag(block, "link");

    if (!url) {
      break;
    }

    return {
      url: decodeXmlEntities(url),
      pubDate: readXmlTag(block, "pubDate"),
    };
  }

  throw new Error("EU FSF RSS feed did not contain a CSV - v1.1 item.");
}

export function formatEuSanctionsCountryRisks(results: EuSanctionsCountryRisk[]): string {
  const lines = [
    "EU FSF sanctions exposure probe",
    "===============================",
    "Formula: clamp(25 + 10 * log2((country_count + 1) / (median_count + 1)), 0, 100).",
    "",
  ];

  for (const result of results) {
    lines.push(
      `${result.countryIso2}: ${result.sanctionedEntityCount} unique entities -> sanktions_exposure ${result.sanctionsExposure}/100`
    );
  }

  return lines.join("\n");
}

async function loadEuSanctionsCsv(
  options: FetchEuSanctionsOptions
): Promise<EuSanctionsCsvSource> {
  const cachePath = options.cachePath ?? DEFAULT_EU_SANCTIONS_CACHE_PATH;
  const fetchImpl = options.fetch ?? globalThis.fetch;

  if (!fetchImpl) {
    throw new Error("No fetch implementation available for EU FSF sanctions lookup.");
  }

  const rssUrl = options.rssUrl ?? EU_SANCTIONS_RSS_URL;
  options.logger?.(`EU FSF sanctions: fetching RSS feed ${rssUrl}.`);
  const rssResponse = await fetchImpl(rssUrl);
  const rssText = await rssResponse.text();

  if (!rssResponse.ok) {
    throw new Error(`EU FSF RSS request failed with HTTP ${rssResponse.status}: ${rssText}`);
  }

  const csvLink = parseEuSanctionsRssCsv11Link(rssText);

  if (existsSync(cachePath)) {
    const metadata = readCacheMetadata(getCacheMetadataPath(cachePath));

    if (isCacheFreshForPublicationDate(metadata, csvLink)) {
      options.logger?.(
        `EU FSF sanctions: using cached CSV at ${cachePath}; pubDate ${metadata.pubDate}.`
      );

      return {
        csvText: readFileSync(cachePath, "utf-8"),
        lastUpdated: metadata.pubDate,
        sourceUrl: metadata.sourceUrl,
        cachePath,
        source: "cache",
      };
    }

    options.logger?.(
      `EU FSF sanctions: cached CSV is stale or missing pubDate metadata; refreshing from RSS pubDate ${csvLink.pubDate ?? "unknown"}.`
    );
  }

  options.logger?.(`EU FSF sanctions: downloading CSV v1.1 from ${csvLink.url}.`);
  const csvResponse = await fetchImpl(csvLink.url);
  const csvText = await csvResponse.text();

  if (!csvResponse.ok) {
    throw new Error(`EU FSF CSV request failed with HTTP ${csvResponse.status}: ${csvText}`);
  }

  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, csvText, "utf-8");
  writeCacheMetadata(getCacheMetadataPath(cachePath), {
    pubDate: csvLink.pubDate,
    sourceUrl: csvLink.url,
    cachedAt: new Date().toISOString(),
  });
  options.logger?.(`EU FSF sanctions: cached CSV at ${cachePath}.`);

  return {
    csvText,
    lastUpdated: csvLink.pubDate,
    sourceUrl: csvLink.url,
    cachePath,
    source: "download",
  };
}

function getCacheMetadataPath(cachePath: string): string {
  return `${cachePath}.metadata.json`;
}

function readCacheMetadata(metadataPath: string): EuSanctionsCacheMetadata | undefined {
  if (!existsSync(metadataPath)) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(readFileSync(metadataPath, "utf-8"));

    if (typeof parsed !== "object" || parsed === null) {
      return undefined;
    }

    return {
      pubDate: readString((parsed as EuSanctionsCacheMetadata).pubDate),
      sourceUrl: readString((parsed as EuSanctionsCacheMetadata).sourceUrl),
      cachedAt: readString((parsed as EuSanctionsCacheMetadata).cachedAt),
    };
  } catch {
    return undefined;
  }
}

function writeCacheMetadata(
  metadataPath: string,
  metadata: EuSanctionsCacheMetadata
): void {
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf-8");
}

function isCacheFreshForPublicationDate(
  metadata: EuSanctionsCacheMetadata | undefined,
  csvLink: EuSanctionsCsvLink
): metadata is EuSanctionsCacheMetadata {
  return Boolean(metadata?.pubDate && csvLink.pubDate && metadata.pubDate === csvLink.pubDate);
}

function getUniqueSupplierCountryCodes(suppliers: Supplier[]): string[] {
  return normalizeCountryCodes(suppliers.map((supplier) => supplier.land_iso2));
}

function normalizeCountryCodes(countryCodes: string[]): string[] {
  return Array.from(
    new Set(countryCodes.map((country) => country.trim().toUpperCase()).filter(Boolean))
  );
}

function parseDelimitedCsv(
  raw: string,
  delimiter: string,
  onRow: (row: string[], rowIndex: number) => void
): void {
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let rowIndex = 0;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const nextChar = raw[index + 1];

    if (char === '"' && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(cell);
      onRow(row, rowIndex);
      rowIndex += 1;
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    onRow(row, rowIndex);
  }
}

function readXmlTag(block: string, tagName: string): string | undefined {
  const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`);
  const match = block.match(pattern);

  return match?.[1] ? decodeXmlEntities(match[1].trim()) : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripBom(value: string): string {
  return value.replace(/^\uFEFF/, "");
}

function calculateMedianLogSanctionsExposure(count: number, medianCount: number): number {
  const score = 25 + 10 * Math.log2((count + 1) / (medianCount + 1));

  return round1(clamp(score, 0, 100));
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0;
  }

  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
