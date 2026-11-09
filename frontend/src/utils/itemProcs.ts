import type { CombatEvent } from '../types'

export const ITEM_PROC_REPEAT_WINDOW_MS = 3000

export interface ItemProcLabel {
  unitId: string
  itemName: string
  text: string
  // Repeating procs (regeneration, heal-on-damage) are throttled so they do not flood the board.
  repeating: boolean
}

type ItemProcEvent = Pick<CombatEvent, 'type' | 'sourceId' | 'targetId'> & {
  skillName?: string | null
}

export function resolveItemProc(
  event: ItemProcEvent,
  itemNamesFor: (unitId: string) => readonly string[] | undefined,
): ItemProcLabel | null {
  const itemName = event.skillName
  if (!itemName) return null
  if (event.type === 'ITEM') {
    const unitId = event.targetId || event.sourceId
    if (!unitId) return null
    return {
      unitId,
      itemName,
      text: `${itemName}!`,
      repeating: false,
    }
  }
  if (event.type === 'HEAL' && event.sourceId && itemNamesFor(event.sourceId)?.includes(itemName)) {
    return { unitId: event.sourceId, itemName, text: `${itemName}!`, repeating: true }
  }
  return null
}

export function createItemProcThrottle(windowMs = ITEM_PROC_REPEAT_WINDOW_MS) {
  const lastShownAt = new Map<string, number>()
  return (label: ItemProcLabel, now: number): boolean => {
    if (!label.repeating) return true
    const key = `${label.unitId}:${label.itemName}`
    const last = lastShownAt.get(key)
    if (last !== undefined && now >= last && now - last < windowMs) return false
    lastShownAt.set(key, now)
    return true
  }
}
