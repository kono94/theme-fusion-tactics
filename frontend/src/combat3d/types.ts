import type { AbilityAnimationConfig, AttackAnimationConfig } from '../data/animationConfig'
import type { CombatEvent } from '../types'

export const ARENA_COLUMNS = 9
export const ARENA_ROWS = 6

// Grid coordinates are the already-projected view coordinates (viewer's board in rows 3-5, nearest the camera).
export interface CombatUnit3d {
  id: string
  definitionId: string
  name: string
  ownerId: string
  isMine: boolean
  starLevel: number
  range: number
  gridX: number
  gridY: number
  hp: number
  maxHp: number
  shield: number
  mana: number
  maxMana: number
  stunned: boolean
  portraitUrl: string
  abilityType: string | null
  abilityName: string | null
  abilityPattern: string | null
  attack: AttackAnimationConfig
  ability: AbilityAnimationConfig
}

export type CombatEvent3d = Pick<
  CombatEvent,
  'type' | 'sourceId' | 'targetId' | 'value' | 'skillName'
>

export function gridToWorld(x: number, y: number): { x: number; z: number } {
  return { x: x - (ARENA_COLUMNS - 1) / 2, z: y - (ARENA_ROWS - 1) / 2 }
}
