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

export interface TraitChoice {
  branchId: string
  trait: string
}

// A trait choice keeps the unit itself: every option shares one definition and differs by one trait.
export function traitChoices(options: EvolutionOption[] | null | undefined): TraitChoice[] | null {
  if (!options || options.length < 2) return null
  const first = options[0]!
  if (options.some((option) => option.definitionId !== first.definitionId)) return null
  const shared = first.traits.filter((trait) => options.every((option) => option.traits.includes(trait)))
  const choices: TraitChoice[] = []
  for (const option of options) {
    const added = option.traits.filter((trait) => !shared.includes(trait))
    if (added.length !== 1) return null
    choices.push({ branchId: option.branchId, trait: added[0]! })
  }
  return choices
}

export function evolutionHint(unit: EvolvableUnit | null | undefined): string | null {
  if (!isEvolutionPending(unit)) return null
  if (traitChoices(unit!.evolutionOptions)) return 'Press Evolve to choose a second type'
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
