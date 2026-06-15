import { iso2ToIso3Map } from "./iso2-to-iso3-map";
import type { Supplier } from "./types";

export const WGI_GOVERNANCE_INDICATORS = [
  {
    id: "GOV_WGI_VA.SC",
    label: "Voice and Accountability",
  },
  {
    id: "GOV_WGI_PV.SC",
    label: "Political Stability",
  },
  {
    id: "GOV_WGI_GE.SC",
    label: "Government Effectiveness",
  },
  {
    id: "GOV_WGI_RQ.SC",
    label: "Regulatory Quality",
  },
  {
    id: "GOV_WGI_RL.SC",
    label: "Rule of Law",
  },
  {
    id: "GOV_WGI_CC.SC",
    label: "Control of Corruption",
  },
] as const;

export type WgiGovernanceIndicatorId =
  (typeof WGI_GOVERNANCE_INDICATORS)[number]["id"];

export type WgiIndicatorScore = {
  id: WgiGovernanceIndicatorId;
  label: string;
  score: number;
  weight: number;
};

export type WgiGovernanceRisk = {
  countryIso2?: string;
  countryIso3: string;
  countryName: string;
  year: string;
  governanceScore: number;
  geopolitikGovernanceRisk: number;
  indicators: WgiIndicatorScore[];
  sourceLastUpdated?: string;
};

export type FetchWorldBankWgiOptions = {
  year?: number;
  baseUrl?: string;
  fetch?: FetchLike;
  requestTimeoutMs?: number;
};

type FetchLike = (
  input: string,
  init?: RequestInit
) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

type NormalizedCountryCode = {
  input: string;
  iso2?: string;
  iso3: string;
};

type WgiApiMetadata = {
  lastupdated?: unknown;
};

type WgiApiRow = {
  indicator?: {
    id?: unknown;
    value?: unknown;
  };
  country?: {
    id?: unknown;
    value?: unknown;
  };
  countryiso3code?: unknown;
  date?: unknown;
  value?: unknown;
};

type IndicatorFetchResult = {
  indicatorId: WgiGovernanceIndicatorId;
  rows: WgiApiRow[];
  sourceLastUpdated?: string;
};

const WORLD_BANK_WGI_BASE_URL = "https://api.worldbank.org/v2";
const DEFAULT_WGI_REQUEST_TIMEOUT_MS = 10000;

const WGI_GOVERNANCE_PROXY_WEIGHTS: Record<WgiGovernanceIndicatorId, number> = {
  "GOV_WGI_VA.SC": 0,
  "GOV_WGI_PV.SC": 0,
  "GOV_WGI_GE.SC": 0,
  "GOV_WGI_RQ.SC": 0,
  "GOV_WGI_RL.SC": 0.6,
  "GOV_WGI_CC.SC": 0.4,
};

export async function fetchWorldBankWgiGovernanceRisks(
  countryCodes: string[],
  options: FetchWorldBankWgiOptions = {}
): Promise<WgiGovernanceRisk[]> {
  const normalizedCountries = normalizeCountryCodes(countryCodes);

  if (normalizedCountries.length === 0) {
    throw new Error("At least one country code is required for WGI lookup.");
  }

  const fetchImpl = options.fetch ?? globalThis.fetch;

  if (!fetchImpl) {
    throw new Error("No fetch implementation available for WGI lookup.");
  }

  const fetchResults = await Promise.all(
    WGI_GOVERNANCE_INDICATORS.map((indicator) =>
      fetchIndicatorScores(indicator.id, normalizedCountries, {
        ...options,
        fetch: fetchImpl,
      })
    )
  );

  return buildGovernanceRisks(normalizedCountries, fetchResults);
}

export function getUniqueSupplierCountryCodes(suppliers: Supplier[]): string[] {
  return Array.from(new Set(suppliers.map((supplier) => supplier.land_iso2)));
}

export function applyWgiGovernanceRisksToSuppliers(
  suppliers: Supplier[],
  risks: WgiGovernanceRisk[]
): Supplier[] {
  const riskByIso3 = new Map(
    risks.map((risk) => [risk.countryIso3, risk.geopolitikGovernanceRisk])
  );

  return suppliers.map((supplier) => {
    const country = normalizeCountryCodes([supplier.land_iso2])[0];

    if (!country) {
      throw new Error(`Supplier ${supplier.lieferant_id} has no country code.`);
    }

    const governanceRisk = riskByIso3.get(country.iso3);

    if (governanceRisk === undefined) {
      throw new Error(
        `Missing WGI governance risk for supplier ${supplier.lieferant_id} country ${supplier.land_iso2}.`
      );
    }

    return {
      ...supplier,
      risiko_dimensionen: {
        ...supplier.risiko_dimensionen,
        geopolitik_governance: governanceRisk,
      },
    };
  });
}

export function formatWgiGovernanceRisks(results: WgiGovernanceRisk[]): string {
  const lines = [
    "World Bank WGI governance risk probe",
    "====================================",
    "Formula: GOV_WGI_RL.SC * 60% + GOV_WGI_CC.SC * 40%, then invert to local risk scale.",
    "",
  ];

  for (const result of results) {
    lines.push(
      `${result.countryName} (${result.countryIso3}), ${result.year}: governance ${result.governanceScore}/100 -> geopolitik_governance ${result.geopolitikGovernanceRisk}/100`
    );
    lines.push(
      `  indicators: ${result.indicators
        .map((indicator) => `${indicator.id}=${indicator.score}${indicator.weight > 0 ? ` (weight ${formatPercent(indicator.weight)})` : ""}`)
        .join(", ")}`
    );
  }

  return lines.join("\n");
}

export function normalizeCountryCodes(countryCodes: string[]): NormalizedCountryCode[] {
  const seen = new Set<string>();
  const normalized: NormalizedCountryCode[] = [];

  for (const rawCode of countryCodes) {
    const input = rawCode.trim().toUpperCase();

    if (input === "") {
      continue;
    }

    const country =
      input.length === 2
        ? { input, iso2: input, iso3: iso2ToIso3Map[input] }
        : { input, iso3: input };

    if (!country.iso3) {
      throw new Error(
        `Unsupported ISO2 country code "${input}" for WGI lookup. Add it to ISO2_TO_ISO3 or pass ISO3 directly.`
      );
    }

    if (country.iso3.length !== 3) {
      throw new Error(`Country code "${rawCode}" must be ISO2 or ISO3.`);
    }

    if (!seen.has(country.iso3)) {
      seen.add(country.iso3);
      normalized.push(country);
    }
  }

  return normalized;
}

async function fetchIndicatorScores(
  indicatorId: WgiGovernanceIndicatorId,
  countries: NormalizedCountryCode[],
  options: Required<Pick<FetchWorldBankWgiOptions, "fetch">> &
    Pick<FetchWorldBankWgiOptions, "baseUrl" | "requestTimeoutMs" | "year">
): Promise<IndicatorFetchResult> {
  const baseUrl = options.baseUrl ?? WORLD_BANK_WGI_BASE_URL;
  const countryPath = countries.map((country) => country.iso3).join(";");
  const url = new URL(
    `${baseUrl.replace(/\/$/, "")}/country/${countryPath}/indicator/${indicatorId}`
  );

  url.searchParams.set("format", "json");
  url.searchParams.set("per_page", String(Math.max(countries.length, 50)));

  if (options.year !== undefined) {
    url.searchParams.set("date", String(options.year));
  } else {
    url.searchParams.set("mrnev", "1");
  }

  const response = await options.fetch(
    url.toString(),
    createRequestInit(options.requestTimeoutMs ?? DEFAULT_WGI_REQUEST_TIMEOUT_MS)
  );
  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`World Bank WGI request failed with HTTP ${response.status}: ${raw}`);
  }

  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`Unexpected World Bank WGI response for ${indicatorId}.`);
  }

  if (isWorldBankErrorResponse(parsed)) {
    const message = parsed[0].message
      .map((entry) => `${entry.key}: ${entry.value}`)
      .join("; ");
    throw new Error(`World Bank WGI API error for ${indicatorId}: ${message}`);
  }

  const [metadata, rows] = parsed;

  if (!Array.isArray(rows)) {
    throw new Error(`World Bank WGI response for ${indicatorId} did not contain data rows.`);
  }

  return {
    indicatorId,
    rows: rows as WgiApiRow[],
    sourceLastUpdated: readLastUpdated(metadata),
  };
}

function buildGovernanceRisks(
  countries: NormalizedCountryCode[],
  indicatorResults: IndicatorFetchResult[]
): WgiGovernanceRisk[] {
  const byCountry = new Map<
    string,
    {
      countryIso2?: string;
      countryIso3: string;
      countryName?: string;
      year?: string;
      sourceLastUpdated?: string;
      scores: Partial<Record<WgiGovernanceIndicatorId, number>>;
    }
  >();

  for (const country of countries) {
    byCountry.set(country.iso3, {
      countryIso2: country.iso2,
      countryIso3: country.iso3,
      scores: {},
    });
  }

  for (const indicatorResult of indicatorResults) {
    for (const row of indicatorResult.rows) {
      const countryIso3 = readString(row.countryiso3code);
      const value = readNumber(row.value);

      if (!countryIso3 || value === undefined) {
        continue;
      }

      const country = byCountry.get(countryIso3);

      if (!country) {
        continue;
      }

      country.countryName = readString(row.country?.value) ?? country.countryName;
      country.year = readString(row.date) ?? country.year;
      country.sourceLastUpdated =
        indicatorResult.sourceLastUpdated ?? country.sourceLastUpdated;
      country.scores[indicatorResult.indicatorId] = value;
    }
  }

  return countries.map((country) => {
    const entry = byCountry.get(country.iso3);

    if (!entry) {
      throw new Error(`No WGI data container created for ${country.iso3}.`);
    }

    const indicators = WGI_GOVERNANCE_INDICATORS.map((indicator) => {
      const score = entry.scores[indicator.id];

      if (score === undefined) {
        throw new Error(`Missing WGI indicator ${indicator.id} for ${country.iso3}.`);
      }

      return {
        id: indicator.id,
        label: indicator.label,
        score: round1(score),
        weight: WGI_GOVERNANCE_PROXY_WEIGHTS[indicator.id],
      };
    });

    const governanceScore =
      WGI_GOVERNANCE_INDICATORS.reduce((sum, indicator) => {
        const score = entry.scores[indicator.id];

        if (score === undefined) {
          throw new Error(`Missing WGI indicator ${indicator.id} for ${country.iso3}.`);
        }

        return sum + score * WGI_GOVERNANCE_PROXY_WEIGHTS[indicator.id];
      }, 0);

    return {
      countryIso2: entry.countryIso2,
      countryIso3: entry.countryIso3,
      countryName: entry.countryName ?? entry.countryIso3,
      year: entry.year ?? "unknown",
      governanceScore: round1(governanceScore),
      geopolitikGovernanceRisk: round1(100 - governanceScore),
      indicators,
      sourceLastUpdated: entry.sourceLastUpdated,
    };
  });
}

function isWorldBankErrorResponse(
  parsed: unknown[]
): parsed is [{ message: { key: string; value: string }[] }] {
  const first = parsed[0];

  return (
    typeof first === "object" &&
    first !== null &&
    "message" in first &&
    Array.isArray((first as { message: unknown }).message)
  );
}

function readLastUpdated(metadata: unknown): string | undefined {
  if (typeof metadata !== "object" || metadata === null) {
    return undefined;
  }

  return readString((metadata as WgiApiMetadata).lastupdated);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function createRequestInit(requestTimeoutMs: number): RequestInit {
  return {
    signal: AbortSignal.timeout(requestTimeoutMs),
  };
}
