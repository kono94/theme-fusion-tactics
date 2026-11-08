import { getGalleryModeConfig } from '../data/galleryModeConfig'
import type { GalleryGameMode } from '../data/ultimateGalleryRoster'

export function getGalleryRoster(mode: GalleryGameMode) {
    return getGalleryModeConfig(mode).roster
}

export function getGalleryAbilityRoster(mode: GalleryGameMode) {
    return getGalleryRoster(mode)
}

export function getGalleryAttackRoster(mode: GalleryGameMode) {
    const seen = new Set<string>()
    return getGalleryRoster(mode).filter((unit) => {
        const key = unit.attackAnimationKey ?? unit.id
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
}
