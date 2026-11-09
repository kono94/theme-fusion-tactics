import { getAbilityConfig, getAttackConfig } from '../data/animationConfig'
import type { GameUnit } from '../types'

type AnimatedUnit = Pick<GameUnit, 'definitionId' | 'traits'>

export const resolveAttackConfig = (unit: AnimatedUnit) =>
    getAttackConfig(unit.definitionId, unit.traits ?? [])

export const resolveAbilityConfig = (unit: AnimatedUnit) =>
    getAbilityConfig(unit.definitionId, unit.traits ?? [])
