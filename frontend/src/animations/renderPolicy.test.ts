import { describe, expect, it } from 'vitest'
import {
    getAnimationRenderPolicy,
    getAttackParticleAllocation,
    getAttackParticleBudget
} from './renderPolicy'

describe('animation render policy', () => {
    it('damps crowded casts and disables shake for reduced motion', () => {
        expect(getAnimationRenderPolicy({ particleScale: 1.4, screenShake: 12 }, { crowded: true })).toMatchObject({
            screenShake: 6,
            durationScale: 1,
            particleCap: 90
        })
        expect(getAnimationRenderPolicy({ particleScale: 1.4, screenShake: 12 }, { crowded: true }).particleScale).toBeCloseTo(0.98)
        expect(getAnimationRenderPolicy({ particleScale: 1.4, screenShake: 12 }, { reducedMotion: true })).toMatchObject({
            screenShake: 0,
            durationScale: 0.35,
            particleCap: 24
        })
        expect(getAnimationRenderPolicy({ particleScale: 1.4, screenShake: 12 }, { reducedMotion: true }).particleScale).toBeCloseTo(0.252)
    })

    it('keeps attack particles within the plan budgets', () => {
        expect(getAttackParticleBudget({ particles: 24 })).toBe(24)
        expect(getAttackParticleBudget({ particles: 24 }, { crowded: true })).toBe(10)
        expect(getAttackParticleBudget({ particles: 24 }, { reducedMotion: true })).toBe(4)
    })

    it('lightly reduces crowded melee and ranged auto-attack particles', () => {
        expect(getAttackParticleAllocation({ particles: 18 }, true, 1)).toEqual({ trail: 2, impact: 3 })
        expect(getAttackParticleAllocation({ particles: 18 }, true, 3)).toEqual({ trail: 3, impact: 4 })
    })

    it('preserves configured and default uncrowded auto-attack particles', () => {
        expect(getAttackParticleAllocation({ particles: 18 }, false, 1)).toEqual({ trail: 18, impact: 14 })
        expect(getAttackParticleAllocation({}, false, 3)).toEqual({ trail: 10, impact: 14 })
    })
})
