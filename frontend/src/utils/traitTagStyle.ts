import { getTraitData } from '../data/traitData'

export const NEUTRAL_TRAIT_COLOR = '#94a3b8'

export type TraitTagStyle = {
  color: string
  borderColor: string
  backgroundColor: string
}

export function traitTagStyle(trait: string): TraitTagStyle {
  const color = getTraitData(trait)?.iconColor || NEUTRAL_TRAIT_COLOR
  const hex = color.match(/^#([0-9a-f]{6})$/i)?.[1]
  const backgroundColor = hex
    ? `rgba(${Number.parseInt(hex.slice(0, 2), 16)}, ${Number.parseInt(hex.slice(2, 4), 16)}, ${Number.parseInt(hex.slice(4, 6), 16)}, 0.14)`
    : 'rgba(148, 163, 184, 0.14)'

  return { color, borderColor: color, backgroundColor }
}
