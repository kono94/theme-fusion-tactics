import * as THREE from 'three'
import { easeInOut, type UnitView } from '../../unitView'
import { type ColorInput, type FxContext, glow, leafMesh, orbit, starGeometry } from '../primitives'
import {
  ahead,
  bodyAt,
  bodyPoint,
  cameraYaw,
  clamp01,
  easeOut,
  fadeInOut,
  flames,
  flat,
  fx,
  palmMesh,
  phase,
  type PointSource,
  type PositionAt,
  pulse,
  resolvePoint,
  scaledCount,
  setOpacity,
  standard,
  tube,
} from './shared'

const UP = new THREE.Vector3(0, 1, 0)

// Cyndaquil-line back flames: a crest of flame tongues flaring from behind the head (away from the target).
export function backFlames(
  ctx: FxContext,
  view: UnitView,
  toward: UnitView,
  options: {
    color: ColorInput
    core?: ColorInput
    height?: number
    count?: number
    radius?: number
    delay?: number
    duration?: number
  },
): void {
  flames(ctx, ahead(view, toward, -0.16, 0.85), {
    color: options.color,
    core: options.core ?? '#fde047',
    count: options.count ?? 6,
    radius: options.radius ?? 0.2,
    height: options.height ?? 0.55,
    delay: options.delay,
    duration: options.duration ?? 900,
  })
}

export interface JawOptions {
  color: ColorInput
  rim?: ColorInput
  teeth?: number
  size?: number
  solid?: boolean
  delay?: number
  duration?: number
  // Fraction of the duration at which the jaws slam shut.
  snapAt?: number
}

// Camera-facing upper and lower jaws (water, ice or shadow) that gape open and slam shut on a unit.
export function jaws(ctx: FxContext, view: UnitView, options: JawOptions): void {
  const size = options.size ?? 0.42
  const teeth = options.teeth ?? 4
  const snapAt = options.snapAt ?? 0.45
  const group = new THREE.Group()
  const halves = [1, -1].map((sign) => {
    const jaw = new THREE.Group()
    const shell = new THREE.Mesh(
      new THREE.CircleGeometry(size, 20, 0, Math.PI).scale(1, 0.45, 1),
      options.solid
        ? standard(options.color, { roughness: 0.6 })
        : standard(options.color, { opacity: 0.78, roughness: 0.15, metalness: 0.1 }),
    )
    jaw.add(shell)
    if (options.rim) {
      jaw.add(
        new THREE.Mesh(
          new THREE.RingGeometry(size * 0.9, size, 20, 1, 0, Math.PI).scale(1, 0.45, 1),
          flat(options.rim, 0.75),
        ),
      )
    }
    for (let index = 0; index < teeth; index++) {
      const long = index === 0 || index === teeth - 1
      const height = size * (long ? 0.42 : 0.26)
      const tooth = new THREE.Mesh(
        new THREE.ConeGeometry(size * 0.08, height, 6)
          .rotateZ(Math.PI)
          .translate(0, -height / 2, 0.01),
        flat('#f8fafc'),
      )
      tooth.position.x = (index / (teeth - 1) - 0.5) * size * 1.5
      jaw.add(tooth)
    }
    if (sign < 0) jaw.rotation.z = Math.PI
    group.add(jaw)
    return { jaw, sign }
  })
  fx(ctx, options.delay ?? 0, options.duration ?? 520, group, (p) => {
    group.position.copy(view.root.position).setY(view.height * 0.55 + view.pose.lift)
    group.rotation.set(0, cameraYaw(ctx), 0)
    const open = easeOut(phase(p, 0, snapAt * 0.7))
    const close = easeInOut(phase(p, snapAt * 0.7, snapAt))
    const gap = size * (0.12 + 0.75 * open * (1 - close))
    halves.forEach(({ jaw, sign }) => {
      jaw.position.y = sign * gap
      jaw.rotation.x = sign * 0.35 * open * (1 - close)
    })
    group.scale.setScalar(0.7 + 0.3 * open + (p > snapAt ? 0.12 * pulse(phase(p, snapAt, 1)) : 0))
    setOpacity(group, fadeInOut(p, 0.08, 0.25))
  })
}

// A leaf-shaped arm blade (Treecko line), grip at the origin and extending along +y, for `swing`.
export function leafBladeMesh(length: number, color: ColorInput, rib: ColorInput): THREE.Group {
  const width = length * 0.22
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(width, length * 0.25, width * 0.9, length * 0.7, 0, length)
  shape.bezierCurveTo(-width * 0.5, length * 0.7, -width * 0.6, length * 0.25, 0, 0)
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(new THREE.ShapeGeometry(shape, 10), standard(color, { roughness: 0.45 })),
    new THREE.Mesh(
      new THREE.PlaneGeometry(0.015, length * 0.9).translate(width * 0.12, length * 0.46, 0.005),
      flat(rib, 0.9),
    ),
  )
  return group
}

export interface RingOptions {
  colors: ColorInput[]
  count?: number
  size?: number
  grow?: number
  delay?: number
  duration?: number
  // Fraction of the duration each ring spends travelling.
  travel?: number
}

// Concentric rings that travel from `from` to `to` and widen: Supersonic, Hypnosis, Extrasensory waves.
export function soundRings(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: RingOptions,
): void {
  const count = options.count ?? 5
  const size = options.size ?? 0.16
  const travel = options.travel ?? 0.5
  const group = new THREE.Group()
  const rings = Array.from({ length: count }, (_, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(size, size * 0.12, 6, 28),
      glow(options.colors[index % options.colors.length], 0.6),
    )
    group.add(ring)
    return ring
  })
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration ?? 700, group, (p) => {
    start.copy(resolvePoint(from))
    end.copy(resolvePoint(to))
    rings.forEach((ring, index) => {
      const local = clamp01((p - (index / count) * (1 - travel)) / travel)
      ring.visible = local > 0 && local < 1
      ring.position.lerpVectors(start, end, local)
      ring.lookAt(end)
      ring.scale.setScalar(1 + local * (options.grow ?? 1.6))
      ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.6 * pulse(local)
    })
  })
}

export interface WingOptions {
  upper: ColorInput
  lower: ColorInput
  spots: ColorInput[]
  edge?: ColorInput
  span?: number
  delay?: number
  duration: number
  flaps?: number
}

// Beautifly / Dustox wings behind the body: patterned upper and lower wings with eye spots, beating.
export function mothWings(ctx: FxContext, view: UnitView, options: WingOptions): void {
  const span = options.span ?? 0.36
  const group = new THREE.Group()
  const wings = [1, -1].map((sign) => {
    const pivot = new THREE.Group()
    const upper = new THREE.Mesh(
      new THREE.CircleGeometry(span, 22).scale(1, 0.72, 1).translate(span * sign, span * 0.35, 0),
      standard(options.upper, { opacity: 0.9, roughness: 0.5 }),
    )
    const lower = new THREE.Mesh(
      new THREE.CircleGeometry(span * 0.62, 18)
        .scale(0.9, 1, 1)
        .translate(span * 0.62 * sign, -span * 0.5, 0),
      standard(options.lower, { opacity: 0.9, roughness: 0.5 }),
    )
    pivot.add(upper, lower)
    if (options.edge) {
      pivot.add(
        new THREE.Mesh(
          new THREE.RingGeometry(span * 0.92, span, 22)
            .scale(1, 0.72, 1)
            .translate(span * sign, span * 0.35, 0.004),
          standard(options.edge, { opacity: 0.95 }),
        ),
      )
    }
    options.spots.forEach((spot, index) => {
      const dot = new THREE.Mesh(
        new THREE.CircleGeometry(span * (0.16 - index * 0.03), 12),
        standard(spot),
      )
      dot.position.set(span * sign * (1.15 - index * 0.45), span * (0.45 - index * 0.75), 0.008)
      pivot.add(dot)
    })
    group.add(pivot)
    return { pivot, sign }
  })
  const anchor = bodyAt(view, 0.6)
  const flaps = options.flaps ?? 6
  fx(ctx, options.delay ?? 0, options.duration, group, (p) => {
    group.position.copy(anchor())
    group.rotation.set(0, cameraYaw(ctx), 0)
    group.translateZ(-0.12)
    wings.forEach(({ pivot, sign }) => {
      pivot.rotation.y = sign * Math.sin(p * Math.PI * 2 * flaps) * 0.8
    })
    group.scale.setScalar(Math.max(0.01, fadeInOut(p, 0.1, 0.15)))
  })
}

// Lotad / Ludicolo lily pad floating over the head, slowly turning and bobbing.
export function lilyPad(
  ctx: FxContext,
  view: UnitView,
  options: { size?: number; color?: ColorInput; delay?: number; duration: number; spins?: number },
): void {
  const size = options.size ?? 0.34
  const group = new THREE.Group()
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(size, 28, 0.3, Math.PI * 2 - 0.3).rotateX(-Math.PI / 2),
    standard(options.color ?? '#4ade80', { roughness: 0.35 }),
  )
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(size, size * 0.06, 6, 28, Math.PI * 2 - 0.3)
      .rotateZ(0.3)
      .rotateX(-Math.PI / 2),
    standard('#15803d', { roughness: 0.5 }),
  )
  const vein = new THREE.Mesh(
    new THREE.RingGeometry(size * 0.35, size * 0.4, 20)
      .rotateX(-Math.PI / 2)
      .translate(0, 0.004, 0),
    flat('#bbf7d0', 0.6),
  )
  group.add(pad, rim, vein)
  fx(ctx, options.delay ?? 0, options.duration, group, (p, now) => {
    group.position.copy(view.root.position).add(view.pose.offset)
    group.position.y = view.height + 0.08 + view.pose.lift + Math.sin(now * 0.008) * 0.03
    group.rotation.set(Math.sin(now * 0.006) * 0.12, p * Math.PI * 2 * (options.spins ?? 0.5), 0)
    group.scale.setScalar(Math.max(0.01, easeOut(phase(p, 0, 0.15))))
    setOpacity(group, 1 - phase(p, 0.8, 1))
  })
}

// Silcoon / Cascoon cocoon: a smooth shell that closes over the body while silk bands wind around it.
export function cocoon(
  ctx: FxContext,
  view: UnitView,
  options: {
    color: ColorInput
    band: ColorInput
    metal?: number
    delay?: number
    duration: number
  },
): void {
  const group = new THREE.Group()
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 20, 16).scale(0.85, 1.25, 0.85),
    standard(options.color, {
      opacity: 0.72,
      metalness: options.metal ?? 0,
      roughness: options.metal ? 0.25 : 0.7,
    }),
  )
  group.add(shell)
  const bands = [-0.3, -0.05, 0.2, 0.42].map((y, index) => {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.36 * Math.cos(y * 1.6), 0.025, 6, 26),
      standard(options.band, { roughness: 0.8 }),
    )
    band.rotation.set(Math.PI / 2 + (index % 2 ? 0.25 : -0.25), 0, 0)
    band.position.y = y
    group.add(band)
    return band
  })
  fx(ctx, options.delay ?? 0, options.duration, group, (p) => {
    group.position.copy(view.root.position).setY(view.height * 0.5 + view.pose.lift)
    const close = easeOut(phase(p, 0, 0.3))
    shell.scale.set(0.85 * close + 0.01, 1.25 * close + 0.01, 0.85 * close + 0.01)
    bands.forEach((band, index) => {
      const wind = easeOut(phase(p, 0.1 + index * 0.08, 0.35 + index * 0.08))
      band.scale.setScalar(Math.max(0.01, wind))
      band.rotation.z = (1 - wind) * 3 + p * (index % 2 ? 1 : -1)
    })
    setOpacity(group, 1 - phase(p, 0.78, 1))
  })
}

// Pelipper's downpour: rain streaks looping down inside a column over `center`.
export function rainfall(
  ctx: FxContext,
  center: PointSource,
  options: {
    color?: ColorInput
    count?: number
    radius?: number
    height?: number
    delay?: number
    duration?: number
  },
): void {
  const count = scaledCount(ctx, options.count ?? 60)
  const radius = options.radius ?? 1.6
  const height = options.height ?? 2.2
  const positions = new Float32Array(count * 6)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.LineBasicMaterial({
    color: options.color ?? '#93c5fd',
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  })
  const lines = new THREE.LineSegments(geometry, material)
  const drops = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const distance = Math.sqrt(Math.random()) * radius
    return { x: Math.cos(angle) * distance, z: Math.sin(angle) * distance, seed: Math.random() }
  })
  fx(ctx, options.delay ?? 0, options.duration ?? 1200, lines, (p) => {
    const base = resolvePoint(center)
    drops.forEach((drop, index) => {
      const y = height * (1 - ((drop.seed + p * 3.2) % 1))
      positions.set(
        [base.x + drop.x, y, base.z + drop.z, base.x + drop.x + 0.02, y + 0.22, base.z + drop.z],
        index * 6,
      )
    })
    geometry.attributes.position.needsUpdate = true
    material.opacity = 0.55 * fadeInOut(p, 0.15, 0.3)
  })
}

// Soft sunlight shafts slanting down onto a unit (Synthesis).
export function sunShafts(
  ctx: FxContext,
  view: UnitView,
  options: { color?: ColorInput; count?: number; delay?: number; duration?: number },
): void {
  const count = options.count ?? 4
  const group = new THREE.Group()
  const shafts = Array.from({ length: count }, (_, index) => {
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.16, 2.6, 10, 1, true).translate(0, 1.3, 0),
      flat(options.color ?? '#fde68a', 0.28),
    )
    const angle = (index / count) * Math.PI * 2
    shaft.position.set(Math.cos(angle) * 0.18, 0, Math.sin(angle) * 0.18)
    shaft.rotation.set(Math.sin(angle) * 0.18, 0, -Math.cos(angle) * 0.18 - 0.2)
    group.add(shaft)
    return shaft
  })
  fx(ctx, options.delay ?? 0, options.duration ?? 1000, group, (p, now) => {
    group.position.copy(view.root.position)
    group.rotation.y = p * 0.8
    shafts.forEach((shaft, index) => {
      shaft.scale.set(1, Math.max(0.01, easeOut(phase(p, index * 0.06, 0.3 + index * 0.06))), 1)
      ;(shaft.material as THREE.MeshBasicMaterial).opacity =
        0.28 * fadeInOut(p, 0.15, 0.35) * (0.75 + 0.25 * Math.sin(now * 0.01 + index * 2))
    })
  })
}

// Seedot acorn: a brown seed body under a darker cap, nose along +y.
export function acornMesh(size = 0.07): THREE.Group {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(size, 12, 10),
    standard('#a16207', { roughness: 0.4 }),
  )
  body.scale.set(0.8, 1.15, 0.8)
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(size * 0.85, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    standard('#422006', { roughness: 0.9 }),
  )
  cap.position.y = -size * 0.35
  cap.rotation.x = Math.PI
  group.add(body, cap)
  return group
}

// Quilava's Flame Wheel: a rolling torus of fire with flame tongues on its rim, glued to a rushing body.
export function flameWheel(
  ctx: FxContext,
  position: PositionAt,
  facing: THREE.Vector3,
  options: { radius?: number; delay?: number; duration: number },
): void {
  const radius = options.radius ?? 0.42
  const group = new THREE.Group()
  const wheel = new THREE.Group()
  wheel.add(
    new THREE.Mesh(new THREE.TorusGeometry(radius, 0.07, 8, 32), glow('#f97316', 0.7)),
    new THREE.Mesh(new THREE.TorusGeometry(radius * 0.92, 0.035, 6, 32), glow('#fde047', 0.6)),
  )
  for (let index = 0; index < 8; index++) {
    const angle = (index / 8) * Math.PI * 2
    const tongue = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.24, 6, 1, true).translate(0, 0.12, 0),
      glow(index % 2 ? '#ef4444' : '#fb923c', 0.65),
    )
    tongue.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
    tongue.rotation.z = angle - Math.PI / 2 + 0.6
    wheel.add(tongue)
  }
  group.add(wheel)
  const point = new THREE.Vector3()
  const yaw = Math.atan2(facing.x, facing.z) + Math.PI / 2
  fx(ctx, options.delay ?? 0, options.duration, group, (p, now) => {
    group.position.copy(position(now, point))
    group.rotation.set(0, yaw, 0)
    wheel.rotation.z = -p * Math.PI * 8
    group.scale.setScalar(Math.max(0.01, fadeInOut(p, 0.12, 0.2)))
  })
}

// Feraligatr's Waterfall: a heavy column of water pouring down onto a point, then breaking.
export function waterfallColumn(
  ctx: FxContext,
  point: PointSource,
  options: { radius?: number; height?: number; delay?: number; duration?: number },
): void {
  const radius = options.radius ?? 0.38
  const height = options.height ?? 3
  const group = new THREE.Group()
  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.25, 1, 18, 1, true).translate(0, -0.5, 0),
    standard('#2563eb', { opacity: 0.6, roughness: 0.1 }),
  )
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.55, radius * 0.7, 1, 14, 1, true).translate(0, -0.5, 0),
    standard('#93c5fd', { opacity: 0.55, roughness: 0.1 }),
  )
  group.add(outer, inner)
  fx(ctx, options.delay ?? 0, options.duration ?? 700, group, (p, now) => {
    const base = resolvePoint(point)
    const pour = easeInOut(phase(p, 0, 0.35))
    const drain = phase(p, 0.55, 1)
    const top = height
    const bottom = height - (height - base.y) * pour
    group.position.set(base.x, top - drain * (height - base.y), base.z)
    const length = Math.max(0.01, (top - bottom) * (1 - drain))
    group.scale.set(1 + Math.sin(now * 0.04) * 0.04, length, 1 + Math.cos(now * 0.04) * 0.04)
    inner.rotation.y = now * 0.01
    setOpacity(group, 1 - phase(p, 0.75, 1))
  })
}

// Dizzy stars circling a stunned unit's head.
export function dizzy(
  ctx: FxContext,
  view: UnitView,
  options: { color?: ColorInput; delay?: number; duration?: number; count?: number } = {},
): void {
  orbit(ctx, view, {
    color: options.color ?? '#fde047',
    count: options.count ?? 3,
    radius: 0.28,
    heightFactor: 1.05,
    turns: 2,
    billboard: true,
    build: () =>
      new THREE.Mesh(starGeometry(5, 0.075, 0.032), glow(options.color ?? '#fde047', 0.85)),
    delay: options.delay,
    duration: options.duration ?? 900,
  })
}

// Zigzagoon's zig-zag charge: the body weaves side to side on its way into the target and bounces back.
export function zigzagCharge(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: { delay?: number; duration: number; zigs?: number },
): void {
  const travel = new THREE.Vector3()
  const side = new THREE.Vector3()
  const reach = ctx.reducedMotion || source.unit.range > 1 ? 0.25 : 0.82
  const zigs = options.zigs ?? 3
  fx(ctx, options.delay ?? 0, options.duration, undefined, (p) => {
    travel.subVectors(target.root.position, source.root.position).setY(0)
    side.crossVectors(travel, UP).normalize()
    const out = p < 0.6 ? easeInOut(p / 0.6) : 1 - easeInOut((p - 0.6) / 0.4)
    const weave = p < 0.6 ? Math.sin((p / 0.6) * Math.PI * zigs) * 0.28 * (1 - p / 0.6) : 0
    source.pose.offset.addScaledVector(travel, out * reach).addScaledVector(side, weave)
    source.pose.lift += Math.abs(Math.sin((p / 0.6) * Math.PI * zigs)) * 0.08 * (p < 0.6 ? 1 : 0)
  })
}

// A small four-point glint on a unit's face (eye shine before a strike).
export function bodyGlint(ctx: FxContext, view: UnitView, color: ColorInput, delay: number): void {
  const glint = new THREE.Mesh(starGeometry(4, 0.12, 0.025), flat(color, 0.9))
  const point = new THREE.Vector3()
  fx(ctx, delay, 320, glint, (p) => {
    bodyPoint(view, 0.8, point)
    glint.position.copy(point)
    glint.rotation.set(0, cameraYaw(ctx), p * 1.5)
    glint.scale.setScalar(Math.max(0.01, pulse(p)))
  })
}

// Chikorita's head leaf: a large leaf sprouting above the head that sways like a fan.
export function headLeaf(
  ctx: FxContext,
  view: UnitView,
  options: { color?: ColorInput; size?: number; delay?: number; duration: number; sway?: number },
): void {
  const size = options.size ?? 0.3
  const pivot = new THREE.Group()
  const leaf = leafMesh(options.color ?? '#65a30d', size)
  leaf.geometry.translate(0, size, 0)
  pivot.add(leaf)
  fx(ctx, options.delay ?? 0, options.duration, pivot, (p, now) => {
    pivot.position.copy(view.root.position).add(view.pose.offset)
    pivot.position.y = view.height * 0.95 + view.pose.lift
    pivot.rotation.set(0, cameraYaw(ctx), Math.sin(now * 0.012) * (options.sway ?? 0.5))
    pivot.scale.setScalar(Math.max(0.01, easeOut(phase(p, 0, 0.2))))
    setOpacity(pivot, 1 - phase(p, 0.8, 1))
  })
}

// Treecko's broad tail, built along +y for `swing`: a dark fan-shaped leaf with a paler rib.
export function tailPaddle(size: number): THREE.Group {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(size * 0.55, size * 0.3, size * 0.6, size * 0.9, 0.05 * size, size * 1.1)
  shape.bezierCurveTo(-size * 0.5, size * 0.95, -size * 0.45, size * 0.35, 0, 0)
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), standard('#166534', { roughness: 0.6 })),
    new THREE.Mesh(
      new THREE.PlaneGeometry(0.02, size).translate(0, size * 0.5, 0.005),
      flat('#4ade80', 0.85),
    ),
  )
  return group
}

// Wurmple / Silcoon silk: a few thin strands that shoot from the mouth, sag slightly and wrap the target.
export function silkStrands(
  ctx: FxContext,
  from: PointSource,
  target: UnitView,
  options: { color: ColorInput; lanes?: number[]; delay?: number; duration?: number },
): void {
  const lanes = options.lanes ?? [-1, 1]
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  const side = new THREE.Vector3()
  lanes.forEach((lane, index) => {
    tube(ctx, {
      material: standard(options.color, { opacity: 0.95, roughness: 0.85 }),
      delay: (options.delay ?? 0) + index * 40,
      duration: options.duration ?? 700,
      radius: 0.012,
      controlPoints: 8,
      tubularSegments: 24,
      radialSegments: 4,
      path: (p, points) => {
        start.copy(resolvePoint(from))
        end.copy(target.root.position).setY(target.height * (0.35 + index * 0.2))
        side.subVectors(end, start).cross(UP).normalize()
        const reach = Math.min(1, p / 0.28)
        const sag = p < 0.28 ? 0.12 : 0.12 * (1 - phase(p, 0.28, 0.4))
        points.forEach((point, pointIndex) => {
          const t = (pointIndex / (points.length - 1)) * reach
          point.lerpVectors(start, end, t)
          point.addScaledVector(side, lane * 0.12 * Math.sin(Math.PI * t))
          point.y -= Math.sin(Math.PI * t) * sag
        })
      },
      opacity: (p) => 0.95 * fadeInOut(p, 0.02, 0.2),
    })
  })
}

// Owl eyes: a pair of camera-facing eye rings that open wide and pulse (Hoothoot's red rims, Noctowl's glare).
export function eyeRings(
  ctx: FxContext,
  view: UnitView,
  options: { rim: ColorInput; iris: ColorInput; delay?: number; duration?: number },
): void {
  const group = new THREE.Group()
  ;[-1, 1].forEach((sign) => {
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.105, 20), flat(options.rim, 0.95))
    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), glow(options.iris, 0.7))
    rim.position.x = iris.position.x = sign * 0.12
    group.add(rim, iris)
  })
  const point = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration ?? 700, group, (p, now) => {
    group.position.copy(bodyPoint(view, 0.78, point))
    group.rotation.set(0, cameraYaw(ctx), 0)
    group.translateZ(0.25)
    const open = easeOut(phase(p, 0, 0.25))
    group.scale.set(1 + 0.1 * Math.sin(now * 0.03), Math.max(0.01, open), 1)
    setOpacity(group, 1 - phase(p, 0.8, 1))
  })
}

// Lombre's Fake Out: two webbed hands appear either side of the target's face and clap together.
export function clap(
  ctx: FxContext,
  view: UnitView,
  options: { color: ColorInput; delay?: number; duration?: number },
): void {
  const group = new THREE.Group()
  const hands = [-1, 1].map((sign) => {
    const hand = palmMesh(0.18, () => standard(options.color, { roughness: 0.5 }))
    hand.rotation.y = (sign * Math.PI) / 2
    group.add(hand)
    return { hand, sign }
  })
  fx(ctx, options.delay ?? 0, options.duration ?? 520, group, (p) => {
    group.position.copy(view.root.position).setY(view.height * 0.7)
    group.rotation.set(0, cameraYaw(ctx), 0)
    const close = easeInOut(phase(p, 0.15, 0.5))
    hands.forEach(({ hand, sign }) => {
      hand.position.x = sign * (0.6 - close * 0.5)
      hand.rotation.z = -sign * 0.3 * (1 - close)
    })
    group.scale.setScalar(Math.max(0.01, easeOut(phase(p, 0, 0.15))))
    setOpacity(group, 1 - phase(p, 0.75, 1))
  })
}

// Mudkip's head fin: a translucent blue fin on the crown that flicks up as it senses the target.
export function headFin(
  ctx: FxContext,
  view: UnitView,
  options: { color?: ColorInput; delay?: number; duration: number },
): void {
  const shape = new THREE.Shape()
  shape.moveTo(-0.12, 0)
  shape.quadraticCurveTo(-0.02, 0.32, 0.1, 0.26)
  shape.quadraticCurveTo(0.04, 0.12, 0.12, 0)
  shape.closePath()
  const fin = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 8),
    standard(options.color ?? '#60a5fa', { opacity: 0.85, roughness: 0.3 }),
  )
  const point = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration, fin, (p, now) => {
    fin.position.copy(bodyPoint(view, 0.98, point))
    fin.rotation.set(0, cameraYaw(ctx), Math.sin(now * 0.025) * 0.15)
    fin.scale.setScalar(
      Math.max(0.01, easeOut(phase(p, 0, 0.2)) * (1 + 0.25 * pulse(phase(p, 0.2, 0.45)))),
    )
    setOpacity(fin, 1 - phase(p, 0.8, 1))
  })
}
