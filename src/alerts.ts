import type { RiskResult, TrafficLight } from "./types";

export type AlertThreshold = Extract<TrafficLight, "gelb" | "rot">;

export type SupplierAlert = {
  lieferant_id: string;
  name: string;
  land_iso2: string;
  land_name: string;
  branche: string;
  ampel: TrafficLight;
  risiko_score: number;
  top_treiber: Array<{
    key: string;
    label: string;
    value: number;
    contribution: number;
  }>;
  begruendung: string;
  handlungsempfehlung: string;
  datenqualitaet: string[];
};

export type AlertReport = {
  generated_at: string;
  threshold: AlertThreshold;
  count: number;
  alerts: SupplierAlert[];
};

const TRAFFIC_LIGHT_RANK: Record<TrafficLight, number> = {
  grün: 0,
  gelb: 1,
  rot: 2,
};

/** Builds the compact alert export for suppliers at or above the selected traffic-light threshold. */
export function createAlertReport(
  results: RiskResult[],
  threshold: AlertThreshold,
  generatedAt = new Date()
): AlertReport {
  const alerts = results
    .filter((result) => TRAFFIC_LIGHT_RANK[result.ampel] >= TRAFFIC_LIGHT_RANK[threshold])
    .map(toSupplierAlert);

  return {
    generated_at: generatedAt.toISOString(),
    threshold,
    count: alerts.length,
    alerts,
  };
}

/** Converts a full scoring result into the smaller downstream alert payload. */
function toSupplierAlert(result: RiskResult): SupplierAlert {
  const supplier = result.supplier;

  return {
    lieferant_id: supplier.lieferant_id,
    name: supplier.name,
    land_iso2: supplier.land_iso2,
    land_name: supplier.land_name,
    branche: supplier.branche,
    ampel: result.ampel,
    risiko_score: result.risiko_score,
    top_treiber: result.treiber.map((driver) => ({
      key: driver.key,
      label: driver.label,
      value: driver.value,
      contribution: driver.contribution,
    })),
    begruendung: result.begruendung,
    handlungsempfehlung: result.handlungsempfehlung,
    datenqualitaet: result.datenqualitaet,
  };
}
