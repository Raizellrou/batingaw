import { Hazard, Severity, type AlertBody } from '@ligtas/core'

const HAZARD_LABEL: Record<number, string> = {
  [Hazard.TEST]: 'Test alert',
  [Hazard.RIVER_FLOOD]: 'River flood',
  [Hazard.FLASH_FLOOD]: 'Flash flood',
  [Hazard.STORM_SURGE]: 'Storm surge',
}

const SEVERITY_LABEL: Record<number, string> = {
  [Severity.TIER_1]: 'Tier 1',
  [Severity.TIER_2]: 'Tier 2',
  [Severity.TIER_3]: 'Tier 3',
}

/**
 * Placeholder evacuation copy, deterministic from hazard + severity. Real
 * per-barangay instruction text (which building, which route) is a Stage 4+
 * concern once a registry exists -- this exists so Stage 3 has something
 * real to show on screen rather than a lorem-ipsum stand-in.
 */
export function instructionFor(body: AlertBody): string {
  const hazard = HAZARD_LABEL[body.hazard] ?? `Unknown hazard (${body.hazard})`
  if (body.severity >= Severity.TIER_3) {
    return `${hazard}: Evacuate now to the designated elementary school. Do not wait for the siren to stop.`
  }
  if (body.severity === Severity.TIER_2) {
    return `${hazard}: Prepare to evacuate. Gather essentials and move to higher ground if you are near the river.`
  }
  return `${hazard}: Monitor conditions. No evacuation needed yet.`
}

export function severityLabel(severity: number): string {
  return SEVERITY_LABEL[severity] ?? `Unknown (${severity})`
}

export function purokBitSet(purokBitmap: number, purokNumber: number): boolean {
  return (purokBitmap & (1 << (purokNumber - 1))) !== 0
}
