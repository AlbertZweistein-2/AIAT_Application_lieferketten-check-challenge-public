import type { Supplier } from "./types";

export type ComtradeProbeInput = {
  reporterCode: number;
  partnerCode: number;
  cmdCode: string;
};

export type ComtradeExposureQuery = ComtradeProbeInput & {
  period: number;
  flowCode?: "M" | "X";
};

export type ComtradeExposureResult = {
  reporterCode: number;
  reporterDesc?: string;
  partnerCode: number;
  partnerDesc?: string;
  cmdCode: string;
  cmdDesc?: string;
  period: string;
  flowCode: "M" | "X";
  partnerValue: number;
  totalValue: number;
  importSharePercent: number;
  handelsExposureRisk: number;
  rowCounts: {
    partner: number;
    total: number;
  };
};

export type FetchComtradePreviewOptions = {
  baseUrl?: string;
  concurrency?: number;
  fetch?: FetchLike;
  logger?: (message: string) => void;
  maxRetries?: number;
  requestTimeoutMs?: number;
  requestSpacingMs?: number;
  retryDelayMs?: number;
};

export type FetchSupplierComtradeExposureOptions = FetchComtradePreviewOptions & {
  reporterCode?: number;
  period?: number;
  flowCode?: "M" | "X";
};

type FetchLike = (
  input: string,
  init?: RequestInit
) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

type ComtradePreviewResponse = {
  count?: unknown;
  data?: unknown;
  error?: unknown;
  statusCode?: unknown;
  message?: unknown;
};

type ComtradePreviewRow = {
  reporterCode?: unknown;
  reporterDesc?: unknown;
  partnerCode?: unknown;
  partnerDesc?: unknown;
  cmdCode?: unknown;
  cmdDesc?: unknown;
  period?: unknown;
  flowCode?: unknown;
  primaryValue?: unknown;
};

type PreviewFetchResult = {
  rows: ComtradePreviewRow[];
};

export const DEFAULT_COMTRADE_YEAR = 2024;
export const DEFAULT_COMTRADE_REPORTER_CODE = 40;
export const DEFAULT_COMTRADE_CONCURRENCY = 3;

const COMTRADE_PREVIEW_BASE_URL = "https://comtradeapi.un.org/public/v1/preview";
const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_REQUEST_SPACING_MS = 1100;
const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_RETRY_DELAY_MS = 1200;

export async function fetchComtradeImportExposure(
  query: ComtradeExposureQuery,
  options: FetchComtradePreviewOptions = {}
): Promise<ComtradeExposureResult> {
  const results = await fetchComtradeImportExposures([query], options);
  const result = results[0];

  if (!result) {
    throw new Error("UN Comtrade Preview lookup returned no result.");
  }

  return result;
}

export async function fetchComtradeImportExposures(
  queries: ComtradeExposureQuery[],
  options: FetchComtradePreviewOptions = {}
): Promise<ComtradeExposureResult[]> {
  const uniqueQueries = dedupeExposureQueries(queries);

  if (uniqueQueries.length === 0) {
    return [];
  }

  const fetchImpl = options.fetch ?? globalThis.fetch;

  if (!fetchImpl) {
    throw new Error("No fetch implementation available for UN Comtrade lookup.");
  }

  const concurrency = normalizeConcurrency(options.concurrency);
  const requestSpacingMs =
    options.requestSpacingMs ?? (options.fetch ? 0 : DEFAULT_REQUEST_SPACING_MS);
  const scheduleRequest = createRequestScheduler(requestSpacingMs);
  const totalRowsByKey = new Map<string, PreviewFetchResult>();
  const totalRequests = getUniqueTotalRequests(uniqueQueries);

  options.logger?.(
    `UN Comtrade Preview: fetching ${totalRequests.length} world totals and ${uniqueQueries.length} partner exposures with concurrency ${concurrency}, request spacing ${requestSpacingMs}ms.`
  );

  const totalResults = await mapWithConcurrency(
    totalRequests,
    concurrency,
    async (request, index) => {
      options.logger?.(
        `UN Comtrade Preview: [world ${index + 1}/${totalRequests.length}] reporter=${request.query.reporterCode}, HS=${request.query.cmdCode}, year=${request.query.period}.`
      );
      const result = await fetchPreviewRows(request.query, {
        ...options,
        fetch: fetchImpl,
        scheduleRequest,
      });
      options.logger?.(
        `UN Comtrade Preview: [world ${index + 1}/${totalRequests.length}] received ${result.rows.length} rows.`
      );

      return [request.key, result] as const;
    }
  );

  for (const [key, result] of totalResults) {
    totalRowsByKey.set(key, result);
  }

  return mapWithConcurrency(uniqueQueries, concurrency, async (query, index) => {
    const flowCode = query.flowCode ?? "M";
    const commonQuery = {
      reporterCode: query.reporterCode,
      cmdCode: query.cmdCode,
      period: query.period,
      flowCode,
    };
    const totalKey = createTotalKey(commonQuery);
    const total = totalRowsByKey.get(totalKey);

    if (!total) {
      throw new Error(
        `Missing UN Comtrade world total for reporter ${query.reporterCode} HS ${query.cmdCode} year ${query.period}.`
      );
    }

    options.logger?.(
      `UN Comtrade Preview: [partner ${index + 1}/${uniqueQueries.length}] reporter=${query.reporterCode}, partner=${query.partnerCode}, HS=${query.cmdCode}, year=${query.period}.`
    );
    const partner = await fetchPreviewRows(
      {
        ...commonQuery,
        partnerCode: query.partnerCode,
      },
      {
        ...options,
        fetch: fetchImpl,
        scheduleRequest,
      }
    );
    const result = buildExposureResult(query, flowCode, total.rows, partner.rows);

    options.logger?.(
      `UN Comtrade Preview: [partner ${index + 1}/${uniqueQueries.length}] received ${partner.rows.length} rows, exposure=${result.handelsExposureRisk}/100.`
    );

    return result;
  });
}

export async function fetchComtradeImportExposuresForSuppliers(
  suppliers: Supplier[],
  options: FetchSupplierComtradeExposureOptions = {}
): Promise<ComtradeExposureResult[]> {
  return fetchComtradeImportExposures(
    getUniqueSupplierExposureQueries(suppliers, options),
    options
  );
}

export function applyComtradeImportExposuresToSuppliers(
  suppliers: Supplier[],
  exposures: ComtradeExposureResult[]
): Supplier[] {
  const exposureBySupplierKey = new Map(
    exposures.map((exposure) => [
      createSupplierExposureKey(exposure.partnerCode, exposure.cmdCode),
      exposure.handelsExposureRisk,
    ])
  );

  return suppliers.map((supplier) => {
    const risk = exposureBySupplierKey.get(
      createSupplierExposureKey(supplier.land_m49, supplier.hs_code)
    );

    if (risk === undefined) {
      throw new Error(
        `Missing UN Comtrade import exposure for supplier ${supplier.lieferant_id} country ${supplier.land_m49} HS ${supplier.hs_code}.`
      );
    }

    return {
      ...supplier,
      risiko_dimensionen: {
        ...supplier.risiko_dimensionen,
        handels_exposure: risk,
      },
    };
  });
}

export function parseComtradeProbeValue(value: string): ComtradeProbeInput {
  const parts = value
    .split(/[,:;]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length !== 3) {
    throw new Error(
      "Invalid --comtrade-probe value. Use reporterM49,partnerM49,hsCode, e.g. 276,156,85."
    );
  }

  const reporterCode = readM49Code(parts[0], "reporterM49");
  const partnerCode = readM49Code(parts[1], "partnerM49");
  const cmdCode = parts[2];

  if (!/^\d{2,6}$/.test(cmdCode)) {
    throw new Error("Invalid hsCode for --comtrade-probe. Use digits, e.g. 85.");
  }

  return {
    reporterCode,
    partnerCode,
    cmdCode,
  };
}

export function formatComtradeImportExposure(result: ComtradeExposureResult): string {
  return [
    "UN Comtrade Preview import exposure probe",
    "==========================================",
    "Formula: sum partner primaryValue / sum world primaryValue * 100.",
    "Note: Preview rows are summed because the public endpoint returns slices by partner2/customs/transport.",
    "",
    `Reporter: ${result.reporterDesc ?? result.reporterCode} (${result.reporterCode})`,
    `Partner: ${result.partnerDesc ?? result.partnerCode} (${result.partnerCode})`,
    `HS: ${result.cmdCode}${result.cmdDesc ? ` - ${result.cmdDesc}` : ""}`,
    `Year: ${result.period}, flow: ${result.flowCode}`,
    `Partner value: ${formatNumber(result.partnerValue)}`,
    `World value: ${formatNumber(result.totalValue)}`,
    `Import share: ${result.importSharePercent}/100 -> handels_exposure diagnostic ${result.handelsExposureRisk}/100`,
    `Rows summed: partner=${result.rowCounts.partner}, world=${result.rowCounts.total}`,
  ].join("\n");
}

function getUniqueSupplierExposureQueries(
  suppliers: Supplier[],
  options: FetchSupplierComtradeExposureOptions
): ComtradeExposureQuery[] {
  const reporterCode = options.reporterCode ?? DEFAULT_COMTRADE_REPORTER_CODE;
  const period = options.period ?? DEFAULT_COMTRADE_YEAR;
  const flowCode = options.flowCode ?? "M";
  const seen = new Set<string>();
  const queries: ComtradeExposureQuery[] = [];

  for (const supplier of suppliers) {
    const key = createSupplierExposureKey(supplier.land_m49, supplier.hs_code);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    queries.push({
      reporterCode,
      partnerCode: supplier.land_m49,
      cmdCode: supplier.hs_code,
      period,
      flowCode,
    });
  }

  return queries;
}

function buildExposureResult(
  query: ComtradeExposureQuery,
  flowCode: "M" | "X",
  totalRows: ComtradePreviewRow[],
  partnerRows: ComtradePreviewRow[]
): ComtradeExposureResult {
  const totalValue = sumPrimaryValue(totalRows);
  const partnerValue = sumPrimaryValue(partnerRows);
  const importSharePercent = totalValue > 0 ? (partnerValue / totalValue) * 100 : 0;
  const sampleRow = partnerRows[0] ?? totalRows[0];

  return {
    reporterCode: query.reporterCode,
    reporterDesc: readString(sampleRow?.reporterDesc),
    partnerCode: query.partnerCode,
    partnerDesc: readString(sampleRow?.partnerDesc),
    cmdCode: query.cmdCode,
    cmdDesc: readString(sampleRow?.cmdDesc),
    period: String(query.period),
    flowCode,
    partnerValue: round2(partnerValue),
    totalValue: round2(totalValue),
    importSharePercent: round1(importSharePercent),
    handelsExposureRisk: round1(Math.min(100, importSharePercent)),
    rowCounts: {
      partner: partnerRows.length,
      total: totalRows.length,
    },
  };
}

function dedupeExposureQueries(queries: ComtradeExposureQuery[]): ComtradeExposureQuery[] {
  const seen = new Set<string>();
  const uniqueQueries: ComtradeExposureQuery[] = [];

  for (const query of queries) {
    const key = createExposureKey({
      ...query,
      flowCode: query.flowCode ?? "M",
    });

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueQueries.push(query);
  }

  return uniqueQueries;
}

async function fetchPreviewRows(
  query: Required<ComtradeExposureQuery>,
  options: Required<Pick<FetchComtradePreviewOptions, "fetch">> &
    Pick<
      FetchComtradePreviewOptions,
      "baseUrl" | "logger" | "maxRetries" | "requestTimeoutMs" | "retryDelayMs"
    > & {
      scheduleRequest: () => Promise<void>;
    }
): Promise<PreviewFetchResult> {
  const baseUrl = options.baseUrl ?? COMTRADE_PREVIEW_BASE_URL;
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/C/A/HS`);

  url.searchParams.set("reporterCode", String(query.reporterCode));
  url.searchParams.set("period", String(query.period));
  url.searchParams.set("partnerCode", String(query.partnerCode));
  url.searchParams.set("cmdCode", query.cmdCode);
  url.searchParams.set("flowCode", query.flowCode);
  url.searchParams.set("includeDesc", "true");

  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  let response: Awaited<ReturnType<FetchLike>>;
  let raw = "";

  for (let attempt = 0; ; attempt += 1) {
    await options.scheduleRequest();
    response = await options.fetch(
      url.toString(),
      createRequestInit(options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS)
    );
    raw = await response.text();

    if (response.status !== 429 || attempt >= maxRetries) {
      break;
    }

    options.logger?.(
      `UN Comtrade Preview: HTTP 429 for reporter=${query.reporterCode}, partner=${query.partnerCode}, HS=${query.cmdCode}; retry ${attempt + 1}/${maxRetries} in ${retryDelayMs}ms.`
    );
    await sleep(retryDelayMs);
  }

  if (!response.ok) {
    throw new Error(`UN Comtrade Preview request failed with HTTP ${response.status}: ${raw}`);
  }

  const parsed = JSON.parse(raw) as ComtradePreviewResponse;
  const error = readString(parsed.error);

  if (error) {
    throw new Error(`UN Comtrade Preview API error: ${error}`);
  }

  const statusCode = readNumber(parsed.statusCode);

  if (statusCode !== undefined && statusCode >= 400) {
    const message = readString(parsed.message) ?? raw;
    throw new Error(`UN Comtrade Preview API error ${statusCode}: ${message}`);
  }

  if (!Array.isArray(parsed.data)) {
    throw new Error("UN Comtrade Preview response did not contain data rows.");
  }

  return {
    rows: parsed.data as ComtradePreviewRow[],
  };
}

function sumPrimaryValue(rows: ComtradePreviewRow[]): number {
  return rows.reduce((sum, row) => sum + (readNumber(row.primaryValue) ?? 0), 0);
}

function createExposureKey(query: Required<ComtradeExposureQuery>): string {
  return [
    query.reporterCode,
    query.partnerCode,
    query.cmdCode,
    query.period,
    query.flowCode,
  ].join(":");
}

function getUniqueTotalRequests(
  queries: ComtradeExposureQuery[]
): Array<{ key: string; query: Required<ComtradeExposureQuery> }> {
  const requestsByKey = new Map<string, { key: string; query: Required<ComtradeExposureQuery> }>();

  for (const query of queries) {
    const totalQuery = {
      reporterCode: query.reporterCode,
      partnerCode: 0,
      cmdCode: query.cmdCode,
      period: query.period,
      flowCode: query.flowCode ?? "M",
    };
    const key = createTotalKey(totalQuery);

    if (!requestsByKey.has(key)) {
      requestsByKey.set(key, {
        key,
        query: totalQuery,
      });
    }
  }

  return Array.from(requestsByKey.values());
}

function createTotalKey(
  query: Omit<Required<ComtradeExposureQuery>, "partnerCode">
): string {
  return [query.reporterCode, query.cmdCode, query.period, query.flowCode].join(":");
}

function createSupplierExposureKey(partnerCode: number, cmdCode: string): string {
  return `${partnerCode}:${cmdCode}`;
}

async function mapWithConcurrency<Input, Output>(
  items: Input[],
  concurrency: number,
  worker: (item: Input, index: number) => Promise<Output>
): Promise<Output[]> {
  const results: Output[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];

      if (item === undefined) {
        continue;
      }

      results[index] = await worker(item, index);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return results;
}

function normalizeConcurrency(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_COMTRADE_CONCURRENCY;
  }

  return Math.max(1, Math.min(10, Math.floor(value)));
}

function createRequestScheduler(spacingMs: number): () => Promise<void> {
  let nextRequestAt = 0;

  return async () => {
    if (spacingMs <= 0) {
      return;
    }

    const now = Date.now();
    const waitMs = Math.max(0, nextRequestAt - now);
    nextRequestAt = Math.max(now, nextRequestAt) + spacingMs;

    if (waitMs > 0) {
      await sleep(waitMs);
    }
  };
}

function readM49Code(value: string | undefined, label: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 999) {
    throw new Error(`Invalid ${label} for --comtrade-probe. Use a UN M49 numeric code.`);
  }

  return parsed;
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function createRequestInit(requestTimeoutMs: number): RequestInit {
  return {
    signal: AbortSignal.timeout(requestTimeoutMs),
  };
}
