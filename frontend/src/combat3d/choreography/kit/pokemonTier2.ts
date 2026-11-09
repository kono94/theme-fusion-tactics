import * as THREE from 'three'
import { easeInOut, type UnitView } from '../../unitView'
import { type ColorInput, type FxContext, glow } from '../primitives'
import {
  bodyPoint,
  clamp01,
  easeOut,
  fadeInOut,
  fadeTail,
  flat,
  fx,
  phase,
  type PositionAt,
  setOpacity,
  standard,
} from './shared'

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
