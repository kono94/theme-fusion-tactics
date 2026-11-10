import type { RoundTimeSettings } from '../types'

export interface RoundTimeLimit {
  min: number
  max: number
  defaultValue: number
}

export const ROUND_TIME_LIMITS: Record<keyof RoundTimeSettings, RoundTimeLimit> = {
  planningSeconds: { min: 5, max: 60, defaultValue: 15 },
  combatSeconds: { min: 15, max: 60, defaultValue: 32 },
}

export const DEFAULT_ROUND_TIME: RoundTimeSettings = {
  planningSeconds: ROUND_TIME_LIMITS.planningSeconds.defaultValue,
  combatSeconds: ROUND_TIME_LIMITS.combatSeconds.defaultValue,
}

function clampSeconds(value: number, limit: RoundTimeLimit): number {
  if (!Number.isFinite(value)) return limit.defaultValue
  return Math.min(limit.max, Math.max(limit.min, Math.round(value)))
}

export function normalizeRoundTime(settings: Partial<RoundTimeSettings> | null | undefined): RoundTimeSettings {
  return {
    planningSeconds: clampSeconds(
      settings?.planningSeconds ?? Number.NaN,
      ROUND_TIME_LIMITS.planningSeconds,
    ),
    combatSeconds: clampSeconds(settings?.combatSeconds ?? Number.NaN, ROUND_TIME_LIMITS.combatSeconds),
  }
}
