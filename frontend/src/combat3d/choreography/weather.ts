import * as THREE from 'three'
import type { FieldConditionVisual } from '../../utils/fieldConditions'

// Persistent weather particles for the 3D arena. The layer lives outside the effect budget, owns its geometry and
// materials, and only uses normal (non-additive) blending at low opacity so it never brightens the scene.

interface WeatherProfile {
  count: number
  reducedCount: number
  color: string
  opacity: number
  size: number
  minY: number
  maxY: number
  velocity: readonly [number, number, number]
  streak: number
}

const PROFILES: Record<FieldConditionVisual, WeatherProfile> = {
  rain: {
    count: 420,
    reducedCount: 120,
    color: '#8fb8e8',
    opacity: 0.45,
    size: 0,
    minY: 0,
    maxY: 5.5,
    velocity: [-0.5, -8.5, 0],
    streak: 0.28,
  },
  sun: {
    count: 90,
    reducedCount: 30,
    color: '#f0b46a',
    opacity: 0.4,
    size: 0.07,
    minY: 0.2,
    maxY: 3.2,
    velocity: [0.12, 0.3, 0.05],
    streak: 0,
  },
  sand: {
    count: 360,
    reducedCount: 100,
    color: '#c9a26b',
    opacity: 0.5,
    size: 0.045,
    minY: 0.05,
    maxY: 1.8,
    velocity: [3, -0.15, 0.35],
    streak: 0,
  },
  hail: {
    count: 200,
    reducedCount: 60,
    color: '#cfe3f2',
    opacity: 0.6,
    size: 0.075,
    minY: 0,
    maxY: 5,
    velocity: [-0.3, -5.5, 0],
    streak: 0,
  },
}

const HALF_WIDTH = 5.6
const HALF_DEPTH = 3.6
const REDUCED_SPEED = 0.35
const MAX_STEP_SECONDS = 0.1

export class WeatherLayer {
  private current: FieldConditionVisual | null = null
  private object: THREE.Points | THREE.LineSegments | null = null
  private heads = new Float32Array(0)
  private speeds = new Float32Array(0)
  private profile: WeatherProfile | null = null
  private lastUpdate: number | null = null
  private seed = 1

  constructor(
    private readonly scene: THREE.Scene,
    private readonly reducedMotion: boolean,
  ) {}

  get kind(): FieldConditionVisual | null {
    return this.current
  }

  get particleCount(): number {
    return this.speeds.length
  }

  get root(): THREE.Object3D | null {
    return this.object
  }

  set(kind: FieldConditionVisual | null): void {
    if (kind === this.current) return
    this.clear()
    this.current = kind
    if (!kind) return
    const profile = PROFILES[kind]
    const count = this.reducedMotion ? profile.reducedCount : profile.count
    this.profile = profile
    this.seed = 1
    this.heads = new Float32Array(count * 3)
    this.speeds = new Float32Array(count)
    for (let index = 0; index < count; index++) {
      this.heads[index * 3] = (this.random() * 2 - 1) * HALF_WIDTH
      this.heads[index * 3 + 1] = profile.minY + this.random() * (profile.maxY - profile.minY)
      this.heads[index * 3 + 2] = (this.random() * 2 - 1) * HALF_DEPTH
      this.speeds[index] = 0.75 + this.random() * 0.5
    }

    const geometry = new THREE.BufferGeometry()
    const vertices = new Float32Array(count * 3 * (profile.streak > 0 ? 2 : 1))
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    if (profile.streak > 0) {
      const material = new THREE.LineBasicMaterial({
        color: profile.color,
        transparent: true,
        opacity: profile.opacity,
        depthWrite: false,
      })
      this.object = new THREE.LineSegments(geometry, material)
    } else {
      const material = new THREE.PointsMaterial({
        color: profile.color,
        size: profile.size,
        transparent: true,
        opacity: profile.opacity,
        depthWrite: false,
        sizeAttenuation: true,
      })
      this.object = new THREE.Points(geometry, material)
    }
    this.object.name = `weather-${kind}`
    this.object.frustumCulled = false
    this.object.renderOrder = 5
    this.writeVertices()
    this.scene.add(this.object)
  }

  update(now: number): void {
    const profile = this.profile
    if (!profile || !this.object) {
      this.lastUpdate = now
      return
    }
    const elapsed = this.lastUpdate === null ? 0 : (now - this.lastUpdate) / 1000
    this.lastUpdate = now
    const step =
      Math.min(Math.max(elapsed, 0), MAX_STEP_SECONDS) * (this.reducedMotion ? REDUCED_SPEED : 1)
    if (step === 0) return
    const [vx, vy, vz] = profile.velocity
    for (let index = 0; index < this.speeds.length; index++) {
      const speed = this.speeds[index]!
      const offset = index * 3
      this.heads[offset] = wrap(this.heads[offset]! + vx * speed * step, -HALF_WIDTH, HALF_WIDTH)
      this.heads[offset + 1] = wrap(
        this.heads[offset + 1]! + vy * speed * step,
        profile.minY,
        profile.maxY,
      )
      this.heads[offset + 2] = wrap(
        this.heads[offset + 2]! + vz * speed * step,
        -HALF_DEPTH,
        HALF_DEPTH,
      )
    }
    this.writeVertices()
  }

  dispose(): void {
    this.clear()
    this.current = null
  }

  private writeVertices(): void {
    const profile = this.profile
    if (!profile || !this.object) return
    const attribute = this.object.geometry.getAttribute('position') as THREE.BufferAttribute
    const vertices = attribute.array as Float32Array
    if (profile.streak > 0) {
      const [vx, vy, vz] = profile.velocity
      const length = Math.hypot(vx, vy, vz)
      for (let index = 0; index < this.speeds.length; index++) {
        const head = index * 3
        const tail = index * 6
        vertices[tail] = this.heads[head]!
        vertices[tail + 1] = this.heads[head + 1]!
        vertices[tail + 2] = this.heads[head + 2]!
        vertices[tail + 3] = this.heads[head]! - (vx / length) * profile.streak
        vertices[tail + 4] = this.heads[head + 1]! - (vy / length) * profile.streak
        vertices[tail + 5] = this.heads[head + 2]! - (vz / length) * profile.streak
      }
    } else {
      vertices.set(this.heads)
    }
    attribute.needsUpdate = true
  }

  private clear(): void {
    if (this.object) {
      this.scene.remove(this.object)
      this.object.geometry.dispose()
      ;(this.object.material as THREE.Material).dispose()
    }
    this.object = null
    this.profile = null
    this.heads = new Float32Array(0)
    this.speeds = new Float32Array(0)
  }

  // Deterministic layout so the same condition always looks the same and tests stay stable.
  private random(): number {
    this.seed = (this.seed * 16807) % 2147483647
    return (this.seed - 1) / 2147483646
  }
}

function wrap(value: number, min: number, max: number): number {
  const range = max - min
  if (range <= 0) return min
  if (value < min) return max - ((min - value) % range)
  if (value > max) return min + ((value - max) % range)
  return value
}
