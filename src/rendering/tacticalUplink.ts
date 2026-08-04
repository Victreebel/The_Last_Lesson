import { getBattalionRank, type BattalionState, type SettlementState } from "../simulation/state/WorldState";
import { getBattalionReadinessPresentation } from "./battalionReadinessPresentation";
import type { ReconnaissanceContact } from "./reconnaissancePresentation";

export interface TacticalUplinkStatusInput {
  readonly order: string;
  readonly settlement: SettlementState;
  readonly citizenCapacity: number;
  readonly captiveCapacity: number;
  readonly selectedBattalion?: BattalionState;
  readonly selectedCaravan: boolean;
  readonly selectedBattalionCount: number;
  readonly activeControlGroup?: number;
  readonly reconnaissanceContact?: ReconnaissanceContact;
}

/**
 * The Uplink is a reactive battlefield readout. Durable civic history belongs
 * in the Book of Lessons and reign report, leaving this surface room for an
 * order, force status, labor, stability, and Faith at a single glance.
 */
export function getTacticalUplinkStatusLines(input: TacticalUplinkStatusInput): readonly string[] {
  const { settlement } = input;
  const population = settlement.population;
  const controlGroup = input.activeControlGroup === undefined ? "" : ` // GROUP ${input.activeControlGroup}`;
  const selection = input.reconnaissanceContact
    ? `CONTACT ${input.reconnaissanceContact.heading}`
    : input.selectedBattalion
    ? (() => {
        const readiness = getBattalionReadinessPresentation(input.selectedBattalion);
        const stance = input.selectedBattalion.stance === "hold" ? " // HOLD" : "";
        return `${getBattalionRank(input.selectedBattalion.experience).toUpperCase()} ${input.selectedBattalion.specialization.toUpperCase()} // H${readiness.defense} M${readiness.morale} S${readiness.supply}${stance}`;
      })()
    : input.selectedCaravan
      ? "SUPPLY CARAVAN"
      : input.selectedBattalionCount > 0
        ? `${input.selectedBattalionCount} BATTALIONS${controlGroup}`
        : "NO UNIT SELECTED";

  return [
    `ORDER: ${input.order} // ${selection}`,
    `PEOPLE: ${population.citizens}/${input.citizenCapacity} CIV // ${population.militarizedCitizens} MIL // GROWTH ${population.growthProgress}/80`,
    `LABOR: F${population.farmers} B${population.builders} W${population.lumberjacks} I${population.miners} L${population.luxuryWorkers}`,
    `STABILITY: CAPTIVES ${population.captives}/${input.captiveCapacity} // REBELLION ${settlement.pressures.rebellion}% // HEALTH ${population.health} // PLAGUE ${settlement.plagueTicks ?? 0}`,
    `FAITH: INTERNAL ${settlement.internalFaith} // RIVAL PRESSURE ${settlement.externalReligiousPressure}`
  ];
}
