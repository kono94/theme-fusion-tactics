import * as THREE from 'three'
import { chooseEffectEvictionIndex, type RenderEffectPriority } from '../animations/renderPolicy'

export interface TimedEffect {
  start: number
  duration: number
  priority: RenderEffectPriority
  object?: THREE.Object3D
  update: (p: number, now: number) => void
  finish?: () => void
}

export class EffectSystem {
  private readonly effects: TimedEffect[] = []

  constructor(
    private readonly scene: THREE.Scene,
    private readonly maxEffects: number,
  ) {}

  get size(): number {
    return this.effects.length
  }

  add(effect: TimedEffect): void {
    const evictIndex = chooseEffectEvictionIndex(this.effects, effect.priority, this.maxEffects)
    if (evictIndex >= 0) {
      this.remove(evictIndex)
    } else if (this.effects.length >= this.maxEffects) {
      if (effect.object) disposeObject(effect.object)
      return
    }
    if (effect.object) {
      effect.object.visible = false
      this.scene.add(effect.object)
    }
    this.effects.push(effect)
  }

  update(now: number): void {
    for (let index = this.effects.length - 1; index >= 0; index--) {
      const effect = this.effects[index]
      const p = (now - effect.start) / effect.duration
      if (p > 1) {
        this.remove(index)
        continue
      }
      if (effect.object) effect.object.visible = p >= 0
      if (p >= 0) effect.update(p, now)
    }
  }

  clear(): void {
    while (this.effects.length > 0) {
      this.remove(this.effects.length - 1)
    }
  }

  private remove(index: number): void {
    const [effect] = this.effects.splice(index, 1)
    effect.finish?.()
    if (effect.object) {
      this.scene.remove(effect.object)
      disposeObject(effect.object)
    }
  }
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
      object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material: THREE.Material) => material.dispose())
    } else if (object instanceof THREE.Sprite) {
      object.material.dispose()
    }
  })
}

export class CameraRig {
  readonly base = new THREE.Vector3()
  readonly target = new THREE.Vector3()
  private shakeStart = -1
  private shakeDuration = 0
  private shakeStrength = 0
  private punchStart = -1
  private punchDuration = 0
  private punchStrength = 0
  private readonly focus = new THREE.Vector3()

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly reducedMotion: boolean,
  ) {}

  shake(now: number, strength: number, durationMs = 260): void {
    if (this.reducedMotion || strength <= 0) return
    if (this.shakeStart >= 0 && now - this.shakeStart < this.shakeDuration && strength < this.shakeStrength) {
      return
    }
    this.shakeStart = now
    this.shakeDuration = durationMs
    this.shakeStrength = strength
  }

  punch(now: number, strength: number, focus: THREE.Vector3, durationMs = 520): void {
    if (this.reducedMotion || strength <= 0) return
    this.punchStart = now
    this.punchDuration = durationMs
    this.punchStrength = strength
    this.focus.copy(focus)
  }

  get quaternion(): THREE.Quaternion {
    return this.camera.quaternion
  }

  apply(now: number): void {
    this.camera.position.copy(this.base)
    const lookAt = this.target.clone()

    const punchP = this.punchStart < 0 ? 1 : (now - this.punchStart) / this.punchDuration
    if (punchP >= 0 && punchP < 1) {
      const amount = Math.sin(Math.PI * Math.min(1, punchP * 1.6)) * this.punchStrength * (1 - punchP * 0.4)
      // Punch in along the current viewing direction so it still works after the player orbits the camera.
      const viewOffset = this.base.clone().sub(this.target).setLength(5.5)
      this.camera.position.lerp(this.focus.clone().add(viewOffset), amount * 0.35)
      lookAt.lerp(this.focus, amount * 0.5)
    }

    const shakeP = this.shakeStart < 0 ? 1 : (now - this.shakeStart) / this.shakeDuration
    if (shakeP >= 0 && shakeP < 1) {
      const strength = (1 - shakeP) * this.shakeStrength * 0.012
      this.camera.position.x += Math.sin(now * 0.9) * strength
      this.camera.position.y += Math.cos(now * 1.3) * strength
    }
    this.camera.lookAt(lookAt)
  }

  restore(): void {
    this.camera.position.copy(this.base)
    this.camera.lookAt(this.target)
  }
}
