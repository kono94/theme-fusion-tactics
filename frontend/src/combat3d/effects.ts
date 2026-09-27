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

let softDot: THREE.CanvasTexture | null = null

// Round, soft-edged sprite for every particle system; unmapped PointsMaterial would render hard squares.
function softDotTexture(): THREE.CanvasTexture {
  if (softDot) return softDot
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    )
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.75)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
  }
  softDot = new THREE.CanvasTexture(canvas)
  softDot.colorSpace = THREE.SRGBColorSpace
  return softDot
}

function softenParticles(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Points)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (material instanceof THREE.PointsMaterial && !material.map) {
        material.map = softDotTexture()
        material.transparent = true
        material.depthWrite = false
        material.needsUpdate = true
      }
    }
  })
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
      softenParticles(effect.object)
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
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Points ||
      object instanceof THREE.Line
    ) {
      object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material: THREE.Material) => material.dispose())
    } else if (object instanceof THREE.Sprite) {
      object.material.dispose()
    }
  })
}

// Every ultimate may ask for a camera punch or shake; the rig directs them battle-wide so crowded fights stay calm.
const PUNCH_COOLDOWN_MS = 7000
const MAX_PUNCH = 0.6
const SHAKE_COOLDOWN_MS = 900
const MAX_SHAKE = 5

export class CameraRig {
  readonly base = new THREE.Vector3()
  readonly target = new THREE.Vector3()
  crowded = false
  private shakeStart = -1
  private shakeDuration = 0
  private shakeStrength = 0
  private lastShake = Number.NEGATIVE_INFINITY
  private punchStart = -1
  private punchDuration = 0
  private punchStrength = 0
  private lastPunch = Number.NEGATIVE_INFINITY
  private readonly focus = new THREE.Vector3()

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly reducedMotion: boolean,
  ) {}

  shake(now: number, strength: number, durationMs = 260): void {
    if (this.reducedMotion || strength <= 0) return
    const scaled = Math.min(MAX_SHAKE, strength) * (this.crowded ? 0.5 : 1)
    if (now - this.lastShake < SHAKE_COOLDOWN_MS && scaled <= this.shakeStrength) return
    this.lastShake = now
    this.shakeStart = now
    this.shakeDuration = Math.min(durationMs, 500)
    this.shakeStrength = scaled
  }

  punch(now: number, strength: number, focus: THREE.Vector3, durationMs = 520): void {
    if (this.reducedMotion || strength <= 0 || this.crowded) return
    if (now - this.lastPunch < PUNCH_COOLDOWN_MS) return
    this.lastPunch = now
    this.punchStart = now
    this.punchDuration = durationMs
    this.punchStrength = Math.min(MAX_PUNCH, strength)
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
      const amount =
        Math.sin(Math.PI * Math.min(1, punchP * 1.6)) * this.punchStrength * (1 - punchP * 0.4)
      // Punch in along the current viewing direction so it still works after the player orbits the camera.
      const viewOffset = this.base.clone().sub(this.target).setLength(5.5)
      this.camera.position.lerp(this.focus.clone().add(viewOffset), amount * 0.22)
      lookAt.lerp(this.focus, amount * 0.35)
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
