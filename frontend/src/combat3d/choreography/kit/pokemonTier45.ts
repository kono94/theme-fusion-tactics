import * as THREE from 'three'
import type { UnitView } from '../../unitView'
import { type ColorInput, type FxContext, glow, starGeometry } from '../primitives'
import {
  clamp01,
  easeOut,
  fadeInOut,
  flat,
  fx,
  phase,
  type PointSource,
  resolvePoint,
  scratchColor,
  setOpacity,
  snowflakeGeometry,
  standard,
} from './shared'

export interface FrostFloorOptions {
  radius?: number
  delay?: number
  duration?: number
}

// A frost disc that crystallizes outward with a giant slowly turning snowflake etched into it.
export function frostFloor(ctx: FxContext, center: PointSource, options: FrostFloorOptions): void {
  const radius = options.radius ?? 1.8
  const group = new THREE.Group()
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), flat('#bae6fd', 0.2))
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.94, radius, 64),
    glow('#38bdf8', 0.55),
  )
  const innerRim = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.6, radius * 0.63, 48),
    glow('#7dd3fc', 0.4),
  )
  const flake = new THREE.Mesh(snowflakeGeometry(radius * 0.9), glow('#60a5fa', 0.45))
  flake.position.z = 0.005
  group.add(disc, rim, innerRim, flake)
  group.rotation.x = -Math.PI / 2
  fx(ctx, options.delay ?? 0, options.duration ?? 1200, group, (p) => {
    const position = resolvePoint(center)
    group.position.set(position.x, 0.07, position.z)
    group.scale.setScalar(Math.max(0.01, easeOut(phase(p, 0, 0.25))))
    flake.rotation.z = p * 0.8
    innerRim.rotation.z = -p * 1.2
    setOpacity(group, fadeInOut(p, 0.05, 0.3))
  })
}

export interface PrisonOptions {
  size?: number
  // Phase at which the ice shatters into shards.
  shatterAt?: number
  delay?: number
  duration?: number
}

// Hexagonal ice crystals that grow around a unit, glint, crack, and burst into tumbling glitter shards.
export function iceCrystalPrison(ctx: FxContext, view: UnitView, options: PrisonOptions): void {
  const size = options.size ?? 1
  const shatterAt = options.shatterAt ?? 0.6
  const group = new THREE.Group()
  const cluster = new THREE.Group()
  const ice = standard('#bae6fd', {
    opacity: 0.5,
    metalness: 0.35,
    roughness: 0.12,
    emissive: '#38bdf8',
    emissiveIntensity: 0.45,
    flatShading: true,
  })
  ice.depthWrite = false
  const veins = glow('#7dd3fc', 0.3)
  const crystal = (radius: number, height: number, x: number, z: number, lean: number) => {
    const piece = new THREE.Group()
    piece.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius * 0.9, height, 6).translate(0, height / 2, 0),
        ice,
      ),
      new THREE.Mesh(
        new THREE.ConeGeometry(radius, radius * 1.6, 6).translate(0, height + radius * 0.8, 0),
        ice,
      ),
      new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.3, radius * 0.3, height * 0.95, 6).translate(
          0,
          height / 2,
          0,
        ),
        veins,
      ),
    )
    const angle = Math.atan2(z, x)
    piece.position.set(x, 0, z)
    piece.rotation.set(Math.sin(angle) * lean, Math.random(), -Math.cos(angle) * lean)
    cluster.add(piece)
  }
  crystal(0.46 * size, 0.9 * size, 0, 0, 0)
  for (let index = 0; index < 6; index++) {
    const angle = (index / 6) * Math.PI * 2 + Math.random() * 0.4
    const distance = 0.5 * size
    crystal(
      (0.09 + Math.random() * 0.06) * size,
      (0.4 + Math.random() * 0.45) * size,
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      0.5,
    )
  }
  const glints = Array.from({ length: 5 }, (_, index) => {
    const glint = new THREE.Mesh(starGeometry(4, 0.13 * size, 0.018), glow('#bae6fd', 0.8))
    const angle = (index / 5) * Math.PI * 2
    glint.position.set(Math.cos(angle) * 0.42 * size, (0.3 + (index % 3) * 0.3) * size, 0)
    glint.position.z = Math.sin(angle) * 0.42 * size
    group.add(glint)
    return { glint, seed: Math.random() * 10 }
  })
  const shardMaterial = glow('#38bdf8', 0.7)
  const shardCore = glow('#bae6fd', 0.8)
  const shards = Array.from({ length: Math.max(8, Math.round(18 * ctx.particleScale)) }, (_, i) => {
    const shard = new THREE.Mesh(
      new THREE.TetrahedronGeometry((0.04 + Math.random() * 0.06) * size),
      i % 3 === 0 ? shardCore : shardMaterial,
    )
    shard.visible = false
    group.add(shard)
    const angle = Math.random() * Math.PI * 2
    const speed = 0.9 + Math.random() * 1.4
    return {
      shard,
      start: new THREE.Vector3(
        Math.cos(angle) * 0.3,
        0.2 + Math.random() * 0.9,
        Math.sin(angle) * 0.3,
      ),
      velocity: new THREE.Vector3(
        Math.cos(angle) * speed,
        0.8 + Math.random() * 1.8,
        Math.sin(angle) * speed,
      ),
      spin: Math.random() * 12,
    }
  })
  group.add(cluster)
  const duration = options.duration ?? 1000
  fx(ctx, options.delay ?? 0, duration, group, (p, now) => {
    group.position.copy(view.root.position).setY(0.02)
    const shattered = p >= shatterAt
    const grow = easeOut(phase(p, 0, 0.16))
    const strain = phase(p, shatterAt - 0.12, shatterAt)
    cluster.visible = !shattered
    cluster.children.forEach((piece, index) => {
      const stagger = easeOut(phase(p, index * 0.012, 0.16 + index * 0.012))
      piece.scale.set(1 + strain * 0.06, Math.max(0.001, stagger), 1 + strain * 0.06)
    })
    veins.opacity = 0.3 + strain * 0.5
    ice.opacity = 0.5 * grow
    glints.forEach(({ glint, seed }) => {
      glint.visible = !shattered && grow > 0.9
      glint.quaternion.copy(ctx.camera.quaternion)
      const twinkle = Math.max(0, Math.sin(now * 0.01 + seed))
      glint.scale.setScalar(0.2 + twinkle * (1 + strain))
      glint.rotateZ(now * 0.002)
    })
    const q = phase(p, shatterAt, 1)
    const t = (q * (1 - shatterAt) * duration) / 1000
    shards.forEach(({ shard, start, velocity, spin }) => {
      shard.visible = shattered
      if (!shattered) return
      shard.position.set(
        start.x + velocity.x * t,
        Math.max(0.04, start.y + velocity.y * t - 4.5 * t * t),
        start.z + velocity.z * t,
      )
      shard.rotation.set(spin + t * 9, spin * 2 + t * 7, t * 5)
    })
    shardMaterial.opacity = 0.7 * (1 - q)
    shardCore.opacity = 0.8 * (1 - q) * (0.6 + 0.4 * Math.sin(now * 0.03))
  })
}

// Vertical gradient (bottom color to top color, fading to black = transparent under additive blending).
export function paintVertical(
  geometry: THREE.BufferGeometry,
  bottom: ColorInput,
  top: ColorInput,
  height: number,
): THREE.BufferGeometry {
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  const low = new THREE.Color(bottom)
  const high = new THREE.Color(top)
  for (let index = 0; index < position.count; index++) {
    const t = clamp01(position.getY(index) / height)
    scratchColor
      .copy(low)
      .lerp(high, t)
      .multiplyScalar(1 - t * t)
    colors.set([scratchColor.r, scratchColor.g, scratchColor.b], index * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

export function gradientGlow(opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
}
