import type { CombatEvent, FieldConditionView, GameState } from '../types'

// Visual families the board knows how to draw. Condition ids come from mode data, so unknown ids fall back to
// no particles instead of guessing.
export type FieldConditionVisual = 'rain' | 'sun' | 'sand' | 'hail'

const VISUALS: Record<string, FieldConditionVisual> = {
  rain: 'rain',
  sun: 'sun',
  sandstorm: 'sand',
  hail: 'hail',
}

export function fieldConditionVisual(
  conditionId: string | null | undefined,
): FieldConditionVisual | null {
  return conditionId ? (VISUALS[conditionId] ?? null) : null
}

export interface FieldConditionChipData {
  condition: FieldConditionView
  forecast: boolean
}

// Combat shows the viewed player's active condition; planning shows the upcoming forecast.
export function fieldConditionChip(
  state: Pick<GameState, 'phase' | 'fieldConditions' | 'fieldForecast'> | null | undefined,
  viewedPlayerId: string | null | undefined,
): FieldConditionChipData | null {
  if (!state) return null
  if (state.phase === 'COMBAT') {
    const condition = viewedPlayerId ? state.fieldConditions?.[viewedPlayerId] : undefined
    return condition ? { condition, forecast: false } : null
  }
  if (state.phase === 'PLANNING' && state.fieldForecast) {
    return { condition: state.fieldForecast, forecast: true }
  }
  return null
}

export interface BoardWeather {
  visual: FieldConditionVisual
  forecast: boolean
}

// The board surface takes on the active weather in combat and a fainter forecast look in planning.
export function boardWeather(
  state: Pick<GameState, 'phase' | 'fieldConditions' | 'fieldForecast'> | null | undefined,
  viewedPlayerId: string | null | undefined,
): BoardWeather | null {
  const chip = fieldConditionChip(state, viewedPlayerId)
  const visual = fieldConditionVisual(chip?.condition.id)
  return chip && visual ? { visual, forecast: chip.forecast } : null
}

export function viewedFieldConditionId(
  state: Pick<GameState, 'phase' | 'fieldConditions'> | null | undefined,
  viewedPlayerId: string | null | undefined,
): string | null {
  if (!state || state.phase !== 'COMBAT' || !viewedPlayerId) return null
  return state.fieldConditions?.[viewedPlayerId]?.id ?? null
}

export function formatFieldConditionTime(remainingMs: number | null): string | null {
  return remainingMs === null ? null : `${Math.max(0, Math.ceil(remainingMs / 1000))}s`
}

export function isFieldEvent(event: Pick<CombatEvent, 'type'>): boolean {
  return event.type === 'FIELD' || event.type === 'FIELD_DAMAGE'
}

// Field damage is a number on the hit unit only; it never animates an attacker.
export function fieldDamageLabel(event: Pick<CombatEvent, 'type' | 'value'>): string | null {
  return event.type === 'FIELD_DAMAGE' && event.value > 0 ? `-${event.value}` : null
}
