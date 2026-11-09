import type { EvolutionOption, GameAction, GamePhase } from '../types'

interface EvolvableUnit {
  ownerId?: string
  evolutionOptions?: EvolutionOption[] | null
}

export interface EvolutionChoiceContext {
  phase: GamePhase | null | undefined
  actingPlayerId: string | null | undefined
  readOnly: boolean
}

export function isEvolutionPending(unit: EvolvableUnit | null | undefined): boolean {
  return !!unit?.evolutionOptions?.length
}

export function canChooseEvolution(
  unit: EvolvableUnit | null | undefined,
  context: EvolutionChoiceContext,
): boolean {
  return (
    context.phase === 'PLANNING' &&
    !context.readOnly &&
    !!context.actingPlayerId &&
    unit?.ownerId === context.actingPlayerId &&
    isEvolutionPending(unit)
  )
}

export function evolutionHint(unit: EvolvableUnit | null | undefined): string | null {
  if (!isEvolutionPending(unit)) return null
  return `Choose an evolution: ${unit!.evolutionOptions!.map((option) => option.name).join(', ')}`
}

export function laterFormsLabel(option: EvolutionOption): string | null {
  if (!option.laterForms.length) return null
  return `then: ${option.laterForms.map((form) => form.name).join(' → ')}`
}

export function buildChooseEvolutionAction(
  playerId: string,
  unitId: string,
  branchId: string,
): GameAction {
  return { type: 'CHOOSE_EVOLUTION', playerId, unitId, branchId }
}
