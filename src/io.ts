import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { validateSupplier } from "./validation";
import type { AlertReport } from "./alerts";
import type { RiskResult, Supplier } from "./types";

export function loadSuppliers(path: string): Supplier[] {
  const extension = extname(path).toLowerCase();

  if (extension === ".json") {
    const raw = readFileSync(path, "utf-8");
    return loadSuppliersFromJson(raw);
  }

  if (extension === ".csv") {
    const raw = readFileSync(path, "utf-8");
    return loadSuppliersFromCsv(raw);
  }

  throw new Error(`Unsupported input file format "${extension || "unknown"}". Use .json or .csv.`);
}

function loadSuppliersFromJson(raw: string): Supplier[] {
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Expected suppliers.json to contain an array.");
  }

  return parsed.map(validateSupplier);
}

function loadSuppliersFromCsv(raw: string): Supplier[] {
  const rows = parseCsv(raw.trim());

  if (rows.length < 2) {
    throw new Error("Expected suppliers.csv to contain a header row and at least one supplier row.");
  }

  const [header, ...records] = rows;

  return records.map((record, index) => {
    const normalizedRecord = normalizeCsvRecord(header, record, index + 2);
    const row = Object.fromEntries(header.map((field, fieldIndex) => [field, normalizedRecord[fieldIndex]]));

    return validateSupplier(
      {
        _hinweis: row._hinweis,
        lieferant_id: row.lieferant_id,
        name: row.name,
        branche: row.branche,
        land_iso2: row.land_iso2,
        land_m49: parseCsvNumber(row.land_m49, "land_m49", index + 2),
        land_name: row.land_name,
        hs_code: row.hs_code,
        ware: row.ware,
        handelsvolumen_eur_jahr: parseCsvNumber(
          row.handelsvolumen_eur_jahr,
          "handelsvolumen_eur_jahr",
          index + 2
        ),
        risiko_dimensionen: {
          geopolitik_governance: row.geopolitik_governance,
          sanktions_exposure: row.sanktions_exposure,
          handels_exposure: row.handels_exposure,
        },
      },
      index
    );
  });
}

function normalizeCsvRecord(header: string[], record: string[], rowNumber: number): string[] {
  if (record.length === header.length) {
    return record;
  }

  if (record.length > header.length && header[0] === "_hinweis") {
    const extraCellCount = record.length - header.length;
    return [
      record.slice(0, extraCellCount + 1).join(", "),
      ...record.slice(extraCellCount + 1),
    ];
  }

  throw new Error(
    `CSV row ${rowNumber}: expected ${header.length} columns, got ${record.length}.`
  );
}

function parseCsvNumber(value: unknown, field: string, rowNumber: number): number {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`CSV row ${rowNumber}: missing numeric field "${field}".`);
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`CSV row ${rowNumber}: field "${field}" must be numeric.`);
  }

  return parsed;
}

function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

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

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows.filter((csvRow) => csvRow.some((value) => value.length > 0));
}

export function writeTimestampedMarkdownReport(
  outputDirectory: string,
  markdown: string,
  now = new Date()
): string {
  mkdirSync(outputDirectory, { recursive: true });

  const fileName = `${createReportBaseName(now)}.md`;
  const reportPath = join(outputDirectory, fileName);

  writeFileSync(reportPath, markdown, "utf-8");

  return reportPath;
}

export function writeTimestampedJsonReport(
  outputDirectory: string,
  results: RiskResult[],
  now = new Date()
): string {
  mkdirSync(outputDirectory, { recursive: true });

  const fileName = `${createReportBaseName(now)}.json`;
  const reportPath = join(outputDirectory, fileName);

  writeFileSync(reportPath, `${JSON.stringify(results, null, 2)}\n`, "utf-8");

  return reportPath;
}

export function writeTimestampedAlertReport(
  outputDirectory: string,
  report: AlertReport,
  now = new Date()
): string {
  mkdirSync(outputDirectory, { recursive: true });

  const fileName = `lieferketten-alerts-${formatTimestampForFileName(now)}.json`;
  const reportPath = join(outputDirectory, fileName);

  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");

  return reportPath;
}

function createReportBaseName(date: Date): string {
  return `lieferketten-check-${formatTimestampForFileName(date)}`;
}

function formatTimestampForFileName(date: Date): string {
  const parts = [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
    pad2(date.getHours()),
    pad2(date.getMinutes()),
    pad2(date.getSeconds()),
  ];

  return `${parts[0]}-${parts[1]}-${parts[2]}_${parts[3]}-${parts[4]}-${parts[5]}`;
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}
