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
