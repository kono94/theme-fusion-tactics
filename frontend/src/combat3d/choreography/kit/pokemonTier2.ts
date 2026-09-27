import * as THREE from 'three'
import type { RenderEffectPriority } from '../../../animations/renderPolicy'
import { easeInOut, type UnitView } from '../../unitView'
import { glow, type ColorInput, type FxContext } from '../primitives'
import {
  bodyPoint,
  clamp01,
  easeOut,
  fadeInOut,
  flat,
  fx,
  phase,
  resolvePoint,
  scaledCount,
  setOpacity,
  standard,
  type PointSource,
} from './shared'

export type PositionAt = (now: number, out: THREE.Vector3) => THREE.Vector3

const fadeTail = (p: number, from = 0.7): number => (p < from ? 1 : 1 - (p - from) / (1 - from))

export interface RushOptions {
  delay?: number
  duration: number
  reach?: number
  hold?: number
  outEnd?: number
  lift?: number
  priority?: RenderEffectPriority
}

// Like `dash`, but returns a sampler of the body position so props (water sheath, flame wheel, horn, boulder)
// stay glued to the rushing Pokemon regardless of effect update order.
export function rush(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: RushOptions,
): PositionAt {
  const delay = options.delay ?? 0
  const start = ctx.now + delay
  const travel = new THREE.Vector3().subVectors(target.root.position, source.root.position).setY(0)
  const ranged = source.unit.range > 1 ? 0.35 / Math.max(0.35, travel.length()) : Infinity
  const reach = Math.min(ranged, (options.reach ?? 0.8) * (ctx.reducedMotion ? 0.3 : 1))
  const outEnd = options.outEnd ?? 0.3
  const backStart = outEnd + (options.hold ?? 0.25)
  const amount = (p: number) =>
    p < outEnd
      ? easeInOut(p / outEnd)
      : p < backStart
        ? 1
        : 1 - easeInOut((p - backStart) / Math.max(0.01, 1 - backStart))
  const lift = options.lift ?? 0
  fx(
    ctx,
    delay,
    options.duration,
    undefined,
    (p) => {
      source.pose.offset.addScaledVector(travel, amount(p) * reach)
      source.pose.lift += Math.sin(Math.PI * p) * lift
    },
    options.priority,
  )
  return (now, out) => {
    const p = clamp01((now - start) / options.duration)
    return out
      .copy(source.root.position)
      .addScaledVector(travel, amount(p) * reach)
      .setY(source.height * 0.55 + Math.sin(Math.PI * p) * lift)
  }
}

export interface BoltOptions {
  color: ColorInput
  core?: ColorInput
  width?: number
  segments?: number
  jitter?: number
  delay?: number
  duration?: number
}

// Raichu's Thunder: a thick jagged bolt of cylinder links whose kinks re-randomise so it crackles.
export function thickBolt(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: BoltOptions,
): void {
  const segments = options.segments ?? 7
  const width = options.width ?? 0.08
  const jitter = options.jitter ?? 0.5
  const group = new THREE.Group()
  const links: THREE.Mesh[] = []
  for (let index = 0; index < segments; index++) {
    const link = new THREE.Mesh(
      new THREE.CylinderGeometry(width, width, 1, 6, 1, true),
      glow(options.color),
    )
    link.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(width * 0.4, width * 0.4, 1, 6, 1, true),
        glow(options.core ?? '#ffffff'),
      ),
    )
    links.push(link)
    group.add(link)
  }
  const nodes = Array.from({ length: segments + 1 }, () => new THREE.Vector3())
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const dir = new THREE.Vector3()
  let last = -1
  fx(ctx, options.delay ?? 0, options.duration ?? 320, group, (p, now) => {
    if (now - last > 55) {
      last = now
      a.copy(resolvePoint(from))
      b.copy(resolvePoint(to))
      nodes.forEach((node, index) => {
        const wobble = index === 0 || index === segments ? 0 : jitter
        node.lerpVectors(a, b, index / segments)
        node.x += (Math.random() - 0.5) * wobble
        node.z += (Math.random() - 0.5) * wobble
      })
      links.forEach((link, index) => {
        const start = nodes[index]
        const end = nodes[index + 1]
        link.position.lerpVectors(start, end, 0.5)
        link.quaternion.setFromUnitVectors(up, dir.subVectors(end, start).normalize())
        link.scale.set(1, Math.max(0.01, start.distanceTo(end)), 1)
      })
    }
    setOpacity(group, fadeTail(p, 0.55) * (0.75 + 0.25 * Math.sin(now * 0.08)))
  })
}

export function flameMesh(
  color: ColorInput,
  core: ColorInput = '#fff7d6',
  size = 0.2,
): THREE.Group {
  const group = new THREE.Group()
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), glow(color, 0.85))
  const tongue = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.3, 12, 1, true), glow(color, 0.75))
  tongue.position.y = 0.62
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), glow(core))
  heart.position.y = 0.05
  group.add(body, tongue, heart)
  group.scale.setScalar(size)
  return group
}

export interface StreakOptions {
  color: ColorInput
  count?: number
  spread?: number
  delay?: number
  duration?: number
  thickness?: number
  priority?: RenderEffectPriority
}

// Point-to-point speed lines that zip along a path with staggered starts (for moves where the user vanishes).
export function speedStreaks(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: StreakOptions,
): void {
  const count = Math.max(3, scaledCount(ctx, options.count ?? 10))
  const spread = options.spread ?? 0.5
  const thickness = options.thickness ?? 0.02
  const group = new THREE.Group()
  const lines = Array.from({ length: count }, (_, index) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, thickness, 1),
      glow(index % 3 === 0 ? '#ffffff' : options.color, 0.9),
    )
    group.add(mesh)
    return {
      mesh,
      lateral: new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, 0),
      offset: Math.random() * 0.35,
      length: 0.6 + Math.random() * 0.9,
    }
  })
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  let resolved = false
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 320,
    group,
    (p) => {
      if (!resolved) {
        a.copy(resolvePoint(from))
        b.copy(resolvePoint(to))
        group.position.copy(a)
        group.lookAt(b)
        resolved = true
      }
      const distance = a.distanceTo(b)
      lines.forEach((line) => {
        const local = clamp01((p - line.offset) / 0.6)
        const length = Math.max(0.01, line.length * Math.sin(Math.PI * local))
        line.mesh.position.copy(line.lateral)
        line.mesh.position.z = local * distance - length / 2
        line.mesh.scale.z = length
      })
      setOpacity(group, 1 - p * 0.5)
    },
    options.priority,
  )
}

export interface SheathOptions {
  color: ColorInput
  radius?: number
  stretch?: number
  axis?: THREE.Vector3
  opacity?: number
  delay?: number
  duration: number
  wire?: boolean
}

// Translucent sheath that follows a position sampler (water jet, flare shroud, psychic hold).
export function sheath(ctx: FxContext, position: PositionAt, options: SheathOptions): void {
  const material = glow(options.color, options.opacity ?? 0.35)
  material.wireframe = options.wire ?? false
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(options.radius ?? 0.55, 20, 14), material)
  if (options.axis) mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), options.axis)
  const stretch = options.stretch ?? 1
  fx(ctx, options.delay ?? 0, options.duration, mesh, (p, now) => {
    position(now, mesh.position)
    const grow = easeInOut(phase(p, 0, 0.2))
    mesh.scale.set(grow, grow * stretch, grow)
    setOpacity(mesh, fadeTail(p, 0.75))
  })
}

export interface WaveOptions {
  color: ColorInput
  crest?: ColorInput
  radius?: number
  height?: number
  delay?: number
  duration?: number
}

// Sludge Wave: an expanding ring wall with a lumpy crest.
export function waveWall(ctx: FxContext, point: PointSource, options: WaveOptions): void {
  const height = options.height ?? 0.8
  const geometry = new THREE.CylinderGeometry(1, 1.08, height, 40, 1, true).translate(
    0,
    height / 2,
    0,
  )
  const positions = geometry.attributes.position
  for (let index = 0; index < positions.count; index++) {
    if (positions.getY(index) > height / 2) {
      const angle = Math.atan2(positions.getZ(index), positions.getX(index))
      positions.setY(index, height * (0.75 + 0.25 * Math.sin(angle * 7)))
    }
  }
  const wall = new THREE.Mesh(geometry, glow(options.color, 0.6))
  const crest = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.07, 6, 40),
    glow(options.crest ?? '#ffffff', 0.8),
  )
  crest.rotation.x = Math.PI / 2
  crest.position.y = height * 0.85
  const group = new THREE.Group()
  group.add(wall, crest)
  const radius = options.radius ?? 2
  let resolved = false
  fx(ctx, options.delay ?? 0, options.duration ?? 700, group, (p) => {
    if (!resolved) {
      const center = resolvePoint(point)
      group.position.set(center.x, 0, center.z)
      resolved = true
    }
    const spread = 0.15 + easeInOut(p) * radius
    group.scale.set(spread, Math.sin(Math.PI * Math.min(1, p * 1.3)) + 0.05, spread)
    setOpacity(group, 1 - p * p)
  })
}

export interface TailOptions {
  base: ColorInput
  tip: ColorInput
  core: ColorInput
  delay?: number
  duration: number
  length?: number
}

// Ninetales' nine tails: bushy chains of soft puffs fanned behind the portrait in the camera plane, with a
// travelling sine wave so they flow like flame, graded from the base colour to a bright tip.
export function kitsuneTails(ctx: FxContext, view: UnitView, options: TailOptions): void {
  const segments = 9
  const length = options.length ?? 0.95
  const group = new THREE.Group()
  const base = new THREE.Color(options.base)
  const tip = new THREE.Color(options.tip)
  const tails = Array.from({ length: 9 }, () =>
    Array.from({ length: segments }, (_, index) => {
      const s = (index + 1) / segments
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(1, 10, 8),
        flat(base.clone().lerp(tip, s * s), 0.5 + 0.3 * s),
      )
      if (index === segments - 1) {
        puff.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), glow(options.core, 0.6)))
      }
      group.add(puff)
      return { puff, s }
    }),
  )
  const origin = new THREE.Vector3()
  const right = new THREE.Vector3()
  const back = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const dir = new THREE.Vector3()
  const normal = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration, group, (p, now) => {
    right.set(1, 0, 0).applyQuaternion(ctx.camera.quaternion)
    back.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion)
    bodyPoint(view, 0.32, origin).addScaledVector(back, 0.14)
    const open = easeOut(phase(p, 0, 0.32))
    tails.forEach((tail, tailIndex) => {
      const theta = (tailIndex / 8 - 0.5) * 2.5 * (0.3 + 0.7 * open)
      dir.copy(up).multiplyScalar(Math.cos(theta)).addScaledVector(right, Math.sin(theta))
      normal.copy(right).multiplyScalar(Math.cos(theta)).addScaledVector(up, -Math.sin(theta))
      const sway = Math.sin(now * 0.004 + tailIndex * 0.9) * 0.06
      tail.forEach(({ puff, s }) => {
        const grown = clamp01((open * 1.15 - s * 0.9) / 0.25)
        const wave = Math.sin(s * 4.2 - now * 0.008 + tailIndex * 0.7) * 0.11 * s
        const curl = Math.sign(theta) * 0.22 * s * s
        puff.position
          .copy(origin)
          .addScaledVector(dir, length * s * (0.35 + 0.65 * open))
          .addScaledVector(normal, wave + curl + sway * s)
          .addScaledVector(back, 0.06 * s)
        const flicker = 1 + 0.12 * Math.sin(now * 0.02 + tailIndex + s * 6)
        const radius =
          (0.035 + 0.065 * Math.sin(Math.PI * Math.min(0.92, s * 0.95 + 0.08))) * flicker
        puff.scale.setScalar(Math.max(0.001, radius * grown))
      })
    })
    setOpacity(group, fadeInOut(p, 0.08, 0.28))
  })
}

// A jagged floating shard pointing along +y: faceted slate with glowing seam edges and a soft halo.
export function jaggedStone(stone: ColorInput, seam: ColorInput, size: number): THREE.Group {
  const geometry = new THREE.OctahedronGeometry(size, 0)
  const position = geometry.attributes.position
  // Octahedron faces don't share vertices, so jitter per corner to keep the shell closed.
  const jitters = new Map<string, number>()
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`
    const jitter = jitters.get(key) ?? 0.75 + Math.random() * 0.5
    jitters.set(key, jitter)
    position.setXYZ(index, x * jitter, y * 2.1, z * jitter)
  }
  geometry.computeVertexNormals()
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(
      geometry,
      standard(stone, {
        roughness: 0.85,
        flatShading: true,
        emissive: seam,
        emissiveIntensity: 0.12,
      }),
    ),
    new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: seam,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
    new THREE.Mesh(new THREE.SphereGeometry(size * 1.6, 12, 8), glow(seam, 0.14)),
  )
  return group
}

function batWingGeometry(span: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(0, span * 0.08)
  shape.lineTo(span * 0.5, span * 0.36)
  shape.lineTo(span, span * 0.16)
  shape.quadraticCurveTo(span * 0.84, span * 0.04, span * 0.74, -span * 0.14)
  shape.quadraticCurveTo(span * 0.6, -span * 0.04, span * 0.46, -span * 0.25)
  shape.quadraticCurveTo(span * 0.3, -span * 0.1, span * 0.13, -span * 0.2)
  shape.lineTo(0, -span * 0.06)
  shape.closePath()
  return new THREE.ShapeGeometry(shape, 6)
}

export interface BatWingOptions {
  membrane: ColorInput
  edge: ColorInput
  span?: number
  hover?: number
  tilt?: number
  flapMs?: number
  delay?: number
  duration: number
}

// Zubat line: scalloped bat wings flap beside the portrait while it hovers in place (no travel).
export function batWings(ctx: FxContext, view: UnitView, options: BatWingOptions): void {
  const span = options.span ?? 0.5
  const hover = (options.hover ?? 0.2) * (ctx.reducedMotion ? 0.4 : 1)
  const flapMs = options.flapMs ?? 180
  const group = new THREE.Group()
  const wings = [1, -1].map((side) => {
    const pivot = new THREE.Group()
    const geometry = batWingGeometry(span)
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: options.edge,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    pivot.add(new THREE.Mesh(geometry, glow(options.membrane, 0.5)), edge)
    pivot.scale.x = side
    pivot.position.x = side * 0.18
    group.add(pivot)
    return { pivot, side }
  })
  const back = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration, group, (p, now) => {
    const envelope = fadeInOut(p, 0.12, 0.2)
    const beat = Math.sin((now / flapMs) * Math.PI * 2)
    view.pose.lift += envelope * (hover + beat * 0.04)
    view.pose.scale *= 1 + beat * 0.025 * envelope
    view.pose.tilt += (options.tilt ?? 0) * envelope
    back.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion).multiplyScalar(0.08)
    bodyPoint(view, 0.55, group.position).add(back)
    group.quaternion.copy(ctx.camera.quaternion)
    wings.forEach(({ pivot, side }) => {
      pivot.rotation.z = side * beat * 0.55
      pivot.rotation.y = side * Math.abs(beat) * 0.45
    })
    group.scale.setScalar(0.3 + 0.7 * easeOut(phase(p, 0, 0.15)))
    setOpacity(group, envelope)
  })
}
