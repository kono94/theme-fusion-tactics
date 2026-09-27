import type { CombatEvent } from '../types'

export interface GridPositioned {
  ownerId: string
  currentHealth: number
  visualX: number
  visualY: number
}

export interface NewCombatEvents {
  events: CombatEvent[]
  lastTimestamp: number
}

// recentEvents is a rolling window re-sent with every state update; timestamps are the combat clock.
export function takeNewCombatEvents(
  recentEvents: readonly CombatEvent[] | null | undefined,
  lastTimestamp: number,
): NewCombatEvents {
  const events = (recentEvents ?? []).filter((event) => event.timestamp > lastTimestamp)
  const newest = events.reduce((max, event) => Math.max(max, event.timestamp), lastTimestamp)
  return { events, lastTimestamp: newest }
}

export function latestCombatEventTimestamp(recentEvents: readonly CombatEvent[] | null | undefined) {
  return (recentEvents ?? []).reduce((max, event) => Math.max(max, event.timestamp), 0)
}

export function findNearestEnemy<T extends GridPositioned>(unit: T, allUnits: readonly T[]): T | null {
  let nearest: T | null = null
  let minDistance = Number.POSITIVE_INFINITY
  for (const candidate of allUnits) {
    if (candidate.ownerId === unit.ownerId || candidate.currentHealth <= 0) continue
    const distance = Math.max(
      Math.abs(candidate.visualX - unit.visualX),
      Math.abs(candidate.visualY - unit.visualY),
    )
    if (distance < minDistance) {
      minDistance = distance
      nearest = candidate
    }
  }
  return nearest
}
