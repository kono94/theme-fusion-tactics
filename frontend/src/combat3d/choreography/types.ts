import type { FxContext } from './primitives'
import type { UnitView } from '../unitView'

export interface CastInput {
  source: UnitView
  target: UnitView
  primary: string
  secondary: string
  shake: number
}

// Returns the delay (ms) at which the main hit lands, used for hit flashes and floating numbers.
export type Choreography = (ctx: FxContext, cast: CastInput) => number

export interface AttackInput {
  source: UnitView
  target: UnitView
  color: string
  secondary: string
}

// Auto-attack choreography: returns the delay (ms) at which the hit lands.
export type AttackChoreography = (ctx: FxContext, attack: AttackInput) => number

// Keys are a unit definitionId, or `definitionId:Ability Name` when one form has several abilities by star level.
export type UltimateSet = Record<string, Choreography>
export type AttackSet = Record<string, AttackChoreography>
