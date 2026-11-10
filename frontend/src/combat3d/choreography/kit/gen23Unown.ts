import * as THREE from 'three'
import type { UnitView } from '../../unitView'
import type { ColorInput, FxContext } from '../primitives'
import {
  billboard,
  bodyPoint,
  easeIn,
  easeOut,
  fadeInOut,
  flat,
  fx,
  phase,
  type PointSource,
  resolvePoint,
  scaledCount,
  setOpacity,
  standard,
} from './shared'

export const UNOWN_INK = '#111827'
const UNOWN_SCLERA = '#e5e7eb'

function capsule(length: number, width: number): THREE.ShapeGeometry {
  const radius = width / 2
  const half = Math.max(0, length / 2 - radius)
  const shape = new THREE.Shape()
  shape.moveTo(-half, -radius)
  shape.lineTo(half, -radius)
  shape.absarc(half, 0, radius, -Math.PI / 2, Math.PI / 2, false)
  shape.lineTo(-half, radius)
  shape.absarc(-half, 0, radius, Math.PI / 2, (Math.PI * 3) / 2, false)
  return new THREE.ShapeGeometry(shape, 6)
}

// Stroke layouts [angle, x, y, length] around the eye, loosely echoing different Unown letters.
const STROKES: readonly (readonly [number, number, number, number])[][] = [
  [
    [1.2, -0.08, -0.03, 0.26],
    [-1.2, 0.08, -0.03, 0.26],
  ],
  [
    [Math.PI / 2, -0.11, 0, 0.32],
    [0, 0.02, 0.13, 0.2],
  ],
  [
    [0, 0.01, -0.13, 0.28],
    [Math.PI / 2, 0.13, 0.02, 0.22],
  ],
  [
    [Math.PI / 2, -0.12, 0, 0.3],
    [Math.PI / 2, 0.12, 0, 0.3],
  ],
  [
    [0.6, 0.1, 0.11, 0.18],
    [-0.6, -0.1, 0.11, 0.18],
    [Math.PI / 2, 0, -0.14, 0.14],
  ],
  [
    [0, 0, 0.13, 0.26],
    [0, 0, -0.13, 0.26],
  ],
]

function eye(group: THREE.Group, rim: ColorInput, x = 0, y = 0): void {
  const parts = [
    new THREE.Mesh(new THREE.CircleGeometry(0.088, 20).translate(x, y, -0.002), flat(rim, 0.9)),
    new THREE.Mesh(new THREE.CircleGeometry(0.07, 20).translate(x, y, 0), flat(UNOWN_INK, 1)),
    new THREE.Mesh(
      new THREE.CircleGeometry(0.044, 16).translate(x, y, 0.002),
      flat(UNOWN_SCLERA, 0.95),
    ),
    new THREE.Mesh(
      new THREE.CircleGeometry(0.021, 12).translate(x + 0.006, y, 0.004),
      flat(UNOWN_INK, 1),
    ),
  ]
  group.add(...parts)
}

// A flat ink-black Unown letter: an eye with letter strokes, rimmed in the element color.
export function unownGlyph(index: number, rim: ColorInput, size = 1): THREE.Group {
  const group = new THREE.Group()
  const layout = index % (STROKES.length + 1)
  if (layout === STROKES.length) {
    group.add(
      new THREE.Mesh(
        new THREE.RingGeometry(0.11, 0.14, 24, 1, 0.7, Math.PI * 2 - 1.4),
        flat(UNOWN_INK, 0.95),
      ),
    )
  } else {
    STROKES[layout].forEach(([angle, x, y, length]) => {
      const stroke = new THREE.Mesh(capsule(length, 0.046), flat(UNOWN_INK, 0.95))
      stroke.position.set(x, y, -0.001)
      stroke.rotation.z = angle
      group.add(stroke)
    })
  }
  eye(group, rim)
  group.scale.setScalar(size)
  return group
}

// Unown !: a tall tapered bar with the eye near its top and a round dot below.
export function exclamationGlyph(rim: ColorInput, size = 1): THREE.Group {
  const group = new THREE.Group()
  const bar = new THREE.Shape()
  bar.moveTo(-0.06, 0.2)
  bar.lineTo(0.06, 0.2)
  bar.lineTo(0.025, -0.08)
  bar.lineTo(-0.025, -0.08)
  bar.closePath()
  group.add(new THREE.Mesh(new THREE.ShapeGeometry(bar).translate(0, 0, -0.003), flat(rim, 0.9)))
  group.add(
    new THREE.Mesh(
      new THREE.ShapeGeometry(bar).scale(0.8, 0.94, 1).translate(0, 0.006, -0.001),
      flat(UNOWN_INK, 1),
    ),
  )
  eye(group, rim, 0, 0.1)
  group.add(
    new THREE.Mesh(new THREE.CircleGeometry(0.045, 16).translate(0, -0.17, -0.002), flat(rim, 0.9)),
    new THREE.Mesh(new THREE.CircleGeometry(0.034, 16).translate(0, -0.17, 0), flat(UNOWN_INK, 1)),
  )
  group.scale.setScalar(size)
  return group
}

// The elemental Hidden Power orb: a solid element-colored core inside a faceted cage and an ink band.
export function hiddenPowerOrb(
  primary: ColorInput,
  secondary: ColorInput,
  size: number,
): THREE.Group {
  const group = new THREE.Group()
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(size, 2),
    standard(primary, {
      roughness: 0.35,
      metalness: 0.1,
      emissive: primary,
      emissiveIntensity: 0.25,
    }),
  )
  const cage = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(size * 1.35, 0)),
    new THREE.LineBasicMaterial({ color: secondary, transparent: true, opacity: 0.8 }),
  )
  cage.name = 'cage'
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(size * 1.15, size * 0.09, 6, 28),
    standard(UNOWN_INK, { roughness: 0.6 }),
  )
  band.name = 'band'
  band.rotation.x = Math.PI / 2.6
  group.add(core, cage, band)
  return group
}

function spinOrb(orb: THREE.Object3D, p: number): void {
  const cage = orb.getObjectByName('cage')
  const band = orb.getObjectByName('band')
  if (cage) cage.rotation.set(p * 2.4, p * 3.1, 0)
  if (band) band.rotation.z = p * 5
}

export interface GlyphRingOptions {
  rim: ColorInput
  count: number
  radius?: number
  heightFactor?: number
  turns?: number
  size?: number
  convergeStart?: number
  delay?: number
  duration?: number
  build?: (index: number) => THREE.Object3D
}

// Glyphs orbit the caster on a tilted ring, then spiral into `converge` and shrink away.
export function glyphRing(
  ctx: FxContext,
  source: UnitView,
  converge: PointSource,
  options: GlyphRingOptions,
): void {
  const count = scaledCount(ctx, options.count)
  const radius = options.radius ?? 0.62
  const turns = ctx.reducedMotion ? 0.4 : (options.turns ?? 1.2)
  const convergeStart = options.convergeStart ?? 0.62
  const group = new THREE.Group()
  const holders = Array.from({ length: count }, (_, index) => {
    const holder = new THREE.Group()
    holder.add(options.build?.(index) ?? unownGlyph(index, options.rim, options.size ?? 0.9))
    group.add(holder)
    return holder
  })
  const center = new THREE.Vector3()
  const orbitPoint = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration ?? 600, group, (p) => {
    bodyPoint(source, options.heightFactor ?? 0.6, center)
    const target = resolvePoint(converge)
    const pull = easeIn(phase(p, convergeStart, 1))
    holders.forEach((holder, index) => {
      const appear = easeOut(phase(p, (index / count) * 0.25, (index / count) * 0.25 + 0.15))
      const angle = (index / count) * Math.PI * 2 + p * turns * Math.PI * 2
      orbitPoint.set(
        center.x + Math.cos(angle) * radius,
        center.y + Math.sin(angle) * radius * 0.28 + Math.sin(p * 9 + index) * 0.03,
        center.z + Math.sin(angle) * radius,
      )
      holder.position.lerpVectors(orbitPoint, target, pull)
      billboard(ctx, holder)
      holder.rotation.z += Math.sin(angle) * 0.25
      holder.scale.setScalar(appear * (1 - 0.75 * pull))
    })
    setOpacity(group, 1 - phase(p, 0.92, 1))
  })
}

export interface OrbChargeOptions {
  primary: ColorInput
  secondary: ColorInput
  size: number
  delay?: number
  duration?: number
}

// The orb condenses at a point and swells, held until it launches or pulses.
export function orbCharge(ctx: FxContext, point: PointSource, options: OrbChargeOptions): void {
  const orb = hiddenPowerOrb(options.primary, options.secondary, options.size)
  fx(ctx, options.delay ?? 0, options.duration ?? 300, orb, (p) => {
    orb.position.copy(resolvePoint(point))
    orb.scale.setScalar(0.2 + 0.8 * easeOut(phase(p, 0, 0.6)) + 0.06 * Math.sin(p * 18))
    spinOrb(orb, p)
  })
}

export interface OrbFlightOptions extends OrbChargeOptions {
  rim: ColorInput
  arc?: number
  trail?: number
}

// The orb flies from `from` to `to` trailing a few small glyphs along its path.
export function orbFlight(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: OrbFlightOptions,
): void {
  const group = new THREE.Group()
  const orb = hiddenPowerOrb(options.primary, options.secondary, options.size)
  group.add(orb)
  const trail = Array.from({ length: options.trail ?? 3 }, (_, index) => {
    const holder = new THREE.Group()
    holder.add(unownGlyph(index + 2, options.rim, 0.55 - index * 0.1))
    group.add(holder)
    return holder
  })
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  let resolved = false
  const pathAt = (t: number, out: THREE.Vector3) =>
    out.lerpVectors(start, end, t).setY(out.y + Math.sin(Math.PI * t) * (options.arc ?? 0.35))
  fx(ctx, options.delay ?? 0, options.duration ?? 280, group, (p) => {
    if (!resolved) {
      start.copy(resolvePoint(from))
      resolved = true
    }
    end.copy(resolvePoint(to))
    const t = easeIn(p) * 0.4 + p * 0.6
    pathAt(t, orb.position)
    spinOrb(orb, p)
    trail.forEach((holder, index) => {
      const lag = Math.max(0, t - 0.12 * (index + 1))
      pathAt(lag, holder.position)
      billboard(ctx, holder)
      holder.rotation.z = p * 4 + index
      holder.visible = t > 0.12 * (index + 1)
    })
  })
}

export interface ScatterOptions {
  rim: ColorInput
  count?: number
  speed?: number
  size?: number
  delay?: number
  duration?: number
}

// Glyph shards burst outward from a point, tumbling and shrinking as they fade.
export function glyphScatter(ctx: FxContext, point: PointSource, options: ScatterOptions): void {
  const count = scaledCount(ctx, options.count ?? 6)
  const speed = (options.speed ?? 1.1) * (ctx.reducedMotion ? 0.5 : 1)
  const group = new THREE.Group()
  const shards = Array.from({ length: count }, (_, index) => {
    const holder = new THREE.Group()
    holder.add(unownGlyph(index * 3 + 1, options.rim, options.size ?? 0.6))
    group.add(holder)
    const angle = (index / count) * Math.PI * 2 + Math.random() * 0.4
    return {
      holder,
      velocity: new THREE.Vector3(Math.cos(angle), 0.5 + Math.random() * 0.6, Math.sin(angle)),
      spin: (Math.random() - 0.5) * 6,
    }
  })
  const origin = new THREE.Vector3()
  let resolved = false
  fx(ctx, options.delay ?? 0, options.duration ?? 520, group, (p) => {
    if (!resolved) {
      origin.copy(resolvePoint(point))
      resolved = true
    }
    const travel = easeOut(p) * speed
    shards.forEach(({ holder, velocity, spin }) => {
      holder.position.copy(origin).addScaledVector(velocity, travel)
      billboard(ctx, holder)
      holder.rotation.z = spin * p
      holder.scale.setScalar(1 - 0.6 * p)
    })
    setOpacity(group, fadeInOut(p, 0.05, 0.4))
  })
}

export interface InkLineOptions {
  primary: ColorInput
  length: number
  width?: number
  delay?: number
  duration?: number
}

// A flat ink strip with element-colored edges that unrolls along the ground from `from` toward `toward`.
export function inkLine(
  ctx: FxContext,
  from: PointSource,
  toward: PointSource,
  options: InkLineOptions,
): void {
  const width = options.width ?? 0.42
  const group = new THREE.Group()
  const strip = new THREE.Group()
  strip.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(width, 1).translate(0, 0.5, 0).rotateX(-Math.PI / 2),
      flat(UNOWN_INK, 0.7),
    ),
  )
  ;[-1, 1].forEach((side) => {
    strip.add(
      new THREE.Mesh(
        new THREE.PlaneGeometry(width * 0.12, 1)
          .translate(side * width * 0.5, 0.5, 0.001)
          .rotateX(-Math.PI / 2),
        flat(options.primary, 0.85),
      ),
    )
  })
  group.add(strip)
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  let resolved = false
  fx(ctx, options.delay ?? 0, options.duration ?? 600, group, (p) => {
    if (!resolved) {
      start.copy(resolvePoint(from)).setY(0.07)
      end.copy(resolvePoint(toward)).setY(0.07)
      resolved = true
    }
    strip.position.copy(start)
    strip.lookAt(end)
    strip.rotateY(Math.PI)
    strip.scale.set(1 - 0.4 * phase(p, 0.6, 1), 1, options.length * easeOut(phase(p, 0, 0.35)))
    setOpacity(group, 1 - phase(p, 0.65, 1))
  })
}
