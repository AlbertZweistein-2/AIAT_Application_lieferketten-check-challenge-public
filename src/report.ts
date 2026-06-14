import type { PortfolioDistribution, RiskConfig, RiskResult, TrafficLight } from "./types";

const AMPEL_MARKDOWN: Record<TrafficLight, string> = {
  grün: '<span style="color: #15803d; font-weight: 600;">grün</span>',
  gelb: '<span style="color: #ca8a04; font-weight: 600;">gelb</span>',
  rot: '<span style="color: #dc2626; font-weight: 600;">rot</span>',
};

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
} as const;

export type ReportPaths = {
  markdown?: string;
  json?: string;
};

export function printPortfolioReport(results: RiskResult[], reportPaths: ReportPaths = {}): void {
  const distribution = countTrafficLights(results);
  const color = createTerminalStyler();

  console.log(`\n${color.bold("Lieferketten-Check — Portfolio Summary")}`);
  console.log(color.dim("======================================"));
  console.log(`Lieferanten gesamt: ${results.length}`);
  console.log(
    `Ampel-Verteilung: ${color.ampel("grün")}=${distribution["grün"]}, ${color.ampel("gelb")}=${distribution["gelb"]}, ${color.ampel("rot")}=${distribution["rot"]}`
  );

  if (reportPaths.markdown) {
    console.log(`Markdown-Report: ${color.cyan(reportPaths.markdown)}`);
  }

  if (reportPaths.json) {
    console.log(`JSON-Report: ${color.cyan(reportPaths.json)}`);
  }

  console.log(`\n${color.bold("Top-Risiken")}`);
  console.log(color.dim("-----------"));

  for (const result of results) {
    const s = result.supplier;

    console.log(
      `${s.lieferant_id} | ${formatScore(result.risiko_score).padStart(5)} | ${color.ampel(result.ampel.padEnd(4))} | ${s.name} | ${s.land_name} | ${s.branche}`
    );
  }

  console.log(`\n${color.bold("Detailberichte")}`);
  console.log(color.dim("--------------"));

  for (const result of results) {
    const s = result.supplier;

    console.log(`\n${color.bold(`${s.lieferant_id} — ${s.name}`)}`);
    console.log(`Land: ${s.land_name} (${s.land_iso2})`);
    console.log(`Branche/Ware: ${s.branche} / ${s.ware} (HS ${s.hs_code})`);
    console.log(`Handelsvolumen: ${formatEuro(s.handelsvolumen_eur_jahr)}`);
    console.log(`Score: ${formatScore(result.risiko_score)}/100 → ${color.ampel(result.ampel)}`);
    console.log(`Treiber: ${formatDrivers(result)}`);
    if (result.datenqualitaet.length > 0) {
      console.log(`Datenqualität: ${result.datenqualitaet.join(" ")}`);
    }
    console.log(`Begründung: ${result.begruendung}`);
    console.log(`Empfehlung: ${result.handlungsempfehlung}`);
  }
}

export function renderMarkdownReport(
  results: RiskResult[],
  config: RiskConfig,
  generatedAt = new Date()
): string {
  const distribution = countTrafficLights(results);
  const totalVolume = results.reduce(
    (sum, result) => sum + result.supplier.handelsvolumen_eur_jahr,
    0
  );
  const lines: string[] = [
    "# Lieferketten-Check Report",
    "",
    `Erstellt am: ${formatDateTime(generatedAt)}`,
    "",
    "## Portfolio-Übersicht",
    "",
    `- Lieferanten gesamt: **${results.length}**`,
    `- Handelsvolumen gesamt: **${formatEuro(totalVolume)}**`,
    `- Ampel-Verteilung: ${AMPEL_MARKDOWN["grün"]} **${distribution["grün"]}**, ${AMPEL_MARKDOWN["gelb"]} **${distribution["gelb"]}**, ${AMPEL_MARKDOWN["rot"]} **${distribution["rot"]}**`,
    "",
    "## Scoring-Annahmen",
    "",
    `- Geopolitik/Governance: **${formatWeight(config.weights.geopolitik_governance)}**`,
    `- Sanktions-Exposure: **${formatWeight(config.weights.sanktions_exposure)}**`,
    `- Handels-Exposure: **${formatWeight(config.weights.handels_exposure)}**`,
    "- Top-Treiber werden nach **gewichteter Score-Beitrag** sortiert, nicht nach Rohwert.",
    `- Rot ab Score **${config.thresholds.redScore}** oder Sanktions-Exposure ab **${config.thresholds.sanctionsHardStop}**`,
    `- Gelb ab Score **${config.thresholds.yellowScore}**`,
    "",
    "## Risiko-Ranking",
    "",
    "| Rang | ID | Ampel | Score | Lieferant | Land | Branche | Handelsvolumen | Top-Treiber (gewichteter Beitrag) |",
    "|---:|---|---|---:|---|---|---|---:|---|",
  ];

  results.forEach((result, index) => {
    const s = result.supplier;
    lines.push(
      `| ${index + 1} | ${s.lieferant_id} | ${AMPEL_MARKDOWN[result.ampel]} | ${result.risiko_score.toFixed(1)} | ${escapeMarkdownTable(s.name)} | ${escapeMarkdownTable(s.land_name)} | ${escapeMarkdownTable(s.branche)} | ${formatEuro(s.handelsvolumen_eur_jahr)} | ${formatDriversForTable(result)} |`
    );
  });

  lines.push("", "## Detailberichte", "");

  for (const result of results) {
    const s = result.supplier;

    lines.push(
      `### ${s.lieferant_id} — ${s.name}`,
      "",
      `**Ampel:** ${AMPEL_MARKDOWN[result.ampel]}  `,
      `**Score:** ${result.risiko_score}/100  `,
      `**Land:** ${s.land_name} (${s.land_iso2})  `,
      `**Branche/Ware:** ${s.branche} / ${s.ware} (HS ${s.hs_code})  `,
      `**Handelsvolumen:** ${formatEuro(s.handelsvolumen_eur_jahr)}`,
      "",
      `**Treiber:** ${formatDrivers(result)}`,
      "",
      ...formatDataQualityForMarkdown(result),
      `**Begründung:** ${result.begruendung}`,
      "",
      `**Empfehlung:** ${result.handlungsempfehlung}`,
      ""
    );
  }

  return `${lines.join("\n")}\n`;
}

export function countTrafficLights(results: RiskResult[]): PortfolioDistribution {
  return results.reduce(
    (acc, result) => {
      acc[result.ampel] += 1;
      return acc;
    },
    { grün: 0, gelb: 0, rot: 0 }
  );
}

function formatDrivers(result: RiskResult): string {
  return result.treiber
    .map(
      (driver) =>
        `${driver.label} (Rohwert ${driver.value}/100 × Gewicht ${formatWeight(driver.weight)} = gewichteter Beitrag ${driver.contribution})`
    )
    .join(", ");
}

function formatDriversForTable(result: RiskResult): string {
  return result.treiber
    .map((driver) => `${escapeMarkdownTable(driver.label)}: ${driver.contribution}`)
    .join("<br>");
}

function formatDataQualityForMarkdown(result: RiskResult): string[] {
  if (result.datenqualitaet.length === 0) {
    return [];
  }

  return [
    "**Datenqualität:**",
    "",
    ...result.datenqualitaet.map((note) => `- ${note}`),
    "",
  ];
}

function createTerminalStyler() {
  const enabled = process.stdout.isTTY && process.env.NO_COLOR === undefined;

  function paint(value: string, colorCode: string): string {
    return enabled ? `${colorCode}${value}${ANSI.reset}` : value;
  }

  return {
    bold: (value: string) => paint(value, ANSI.bold),
    dim: (value: string) => paint(value, ANSI.dim),
    cyan: (value: string) => paint(value, ANSI.cyan),
    ampel: (value: string) => {
      if (value.trim() === "rot") {
        return paint(value, ANSI.red);
      }

      if (value.trim() === "gelb") {
        return paint(value, ANSI.yellow);
      }

      return paint(value, ANSI.green);
    },
  };
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("de-AT", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function formatWeight(value: number): string {
  return `${Math.round(value * 100)} %`;
}

function formatScore(value: number): string {
  return value.toFixed(1);
}

function escapeMarkdownTable(value: string): string {
  return value.replaceAll("|", "\\|");
}
