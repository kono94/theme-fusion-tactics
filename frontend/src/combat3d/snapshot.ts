import type { RenderedUnit } from '../types'
import { resolveAbilityConfig, resolveAttackConfig } from '../utils/combatAnimationConfig'
import type { CombatUnit3d } from './types'

export function toCombatUnit3d(unit: RenderedUnit): CombatUnit3d {
  return {
    id: unit.id,
    definitionId: unit.definitionId,
    name: unit.name,
    ownerId: unit.ownerId,
    isMine: unit.isMine,
    starLevel: unit.starLevel || 1,
    range: unit.range,
    gridX: unit.visualX,
    gridY: unit.visualY,
    hp: Math.max(0, unit.currentHealth),
    maxHp: unit.maxHealth,
    shield: Math.max(0, unit.shield ?? 0),
    mana: unit.mana,
    maxMana: unit.maxMana,
    stunned: (unit.stunSecondsRemaining ?? 0) > 0,
    portraitUrl: unit.image,
    abilityType: unit.ability?.type ?? null,
    attack: resolveAttackConfig(unit),
    ability: resolveAbilityConfig(unit),
  }
}
