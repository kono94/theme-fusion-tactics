import * as THREE from 'three'
import type { RenderEffectPriority } from '../../../animations/renderPolicy'
import { easeInOut, type UnitView } from '../../unitView'
import { type ColorInput, type FxContext, glow } from '../primitives'
import {
  bodyPoint,
  easeOut,
  fadeInOut,
  flat,
  flatDirection,
  fx,
  phase,
  type PointSource,
  pulse,
  resolvePoint,
  setOpacity,
  standard,
  teardropGeometry,
  tube,
} from './shared'

const UP = new THREE.Vector3(0, 1, 0)

// Dark type palette: shadowy violets over near-black, never a white glow.
export const DARK_BODY = '#1e1029'
export const DARK_SHADE = '#3b0764'
export const DARK_RIM = '#7c3aed'
export const DARK_SMOKE = '#211a2e'

// A crescent in the XY plane opening toward -x, horns pointing up and down.
export function crescentGeometry(size: number, thickness = 0.42): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  shape.absarc(0, 0, size, -Math.PI / 2, Math.PI / 2, false)
  shape.absarc(
    -size * thickness,
    0,
    size * Math.hypot(1, thickness) * 0.94,
    Math.PI * 0.42,
    -Math.PI * 0.42,
    true,
  )
  shape.closePath()
  return new THREE.ShapeGeometry(shape, 16)
}

// Solid shadow crescent with a thin violet rim behind it.
export function darkCrescent(
  size: number,
  body: ColorInput = DARK_BODY,
  rim: ColorInput = DARK_RIM,
): THREE.Group {
  const group = new THREE.Group()
  const edge = new THREE.Mesh(crescentGeometry(size * 1.08, 0.38), glow(rim, 0.4))
  edge.position.z = -0.01
  group.add(edge, new THREE.Mesh(crescentGeometry(size), flat(body, 0.92)))
  return group
}

export interface CrescentSlashOptions {
  size?: number
  angle?: number
  sweep?: number
  body?: ColorInput
  rim?: ColorInput
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// A camera-facing shadow crescent that sweeps across a point and dissolves.
export function crescentSlash(
  ctx: FxContext,
  point: PointSource,
  options: CrescentSlashOptions = {},
): void {
  const holder = new THREE.Group()
  const blade = darkCrescent(options.size ?? 0.42, options.body, options.rim)
  holder.add(blade)
  const angle = options.angle ?? 0
  const sweep = options.sweep ?? 1.6
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 320,
    holder,
    (p) => {
      holder.position.copy(resolvePoint(point))
      holder.quaternion.copy(ctx.camera.quaternion)
      holder.rotateZ(angle - sweep / 2 + sweep * easeOut(phase(p, 0, 0.6)))
      blade.position.x = 0.12 * (1 - p)
      blade.scale.setScalar(0.6 + 0.5 * easeOut(phase(p, 0, 0.4)))
      setOpacity(holder, 1 - phase(p, 0.55, 1))
    },
    options.priority,
  )
}

export interface ClawMarkOptions {
  color: ColorInput
  edge?: ColorInput
  count?: number
  length?: number
  angle?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Parallel claw rakes revealed one after another across a point (Zangoose, Sableye, Groudon).
export function clawMarks(ctx: FxContext, point: PointSource, options: ClawMarkOptions): void {
  const count = options.count ?? 3
  const length = options.length ?? 0.7
  const holder = new THREE.Group()
  const rakes = Array.from({ length: count }, (_, index) => {
    const rake = new THREE.Group()
    const offset = (index - (count - 1) / 2) * 0.14
    const body = new THREE.Mesh(
      new THREE.PlaneGeometry(length, 0.05).translate(length / 2, 0, 0),
      flat(options.color, 0.95),
    )
    const edge = new THREE.Mesh(
      new THREE.PlaneGeometry(length, 0.1).translate(length / 2, 0, -0.005),
      glow(options.edge ?? options.color, 0.35),
    )
    rake.add(edge, body)
    rake.position.set(-length / 2, offset, 0)
    holder.add(rake)
    return rake
  })
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 360,
    holder,
    (p) => {
      holder.position.copy(resolvePoint(point))
      holder.quaternion.copy(ctx.camera.quaternion)
      holder.rotateZ(options.angle ?? -0.7)
      rakes.forEach((rake, index) => {
        const reveal = easeOut(phase(p, index * 0.08, 0.35 + index * 0.08))
        rake.scale.set(Math.max(0.001, reveal), 1 - 0.6 * phase(p, 0.6, 1), 1)
      })
      setOpacity(holder, 1 - phase(p, 0.65, 1))
    },
    options.priority,
  )
}

// Scizor's pincer: two rounded red jaws with the black-and-cream eye markings, opening along +z.
export function scizorPincer(size: number): { group: THREE.Group; open: (amount: number) => void } {
  const group = new THREE.Group()
  const jaws = [1, -1].map((sign) => {
    const jaw = new THREE.Group()
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(size, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(
        0.75,
        0.55,
        1.35,
      ),
      standard('#dc2626', { metalness: 0.55, roughness: 0.3 }),
    )
    shell.rotation.x = sign > 0 ? 0 : Math.PI
    const eye = new THREE.Mesh(new THREE.CircleGeometry(size * 0.28, 16), flat('#111827'))
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(size * 0.28, size * 0.4, 16),
      flat('#fde68a'),
    )
    for (const mark of [eye, ring]) {
      mark.position.set(size * 0.76, sign * size * 0.18, size * 0.2)
      mark.rotation.y = Math.PI / 2
    }
    jaw.add(shell, eye, ring)
    group.add(jaw)
    return { jaw, sign }
  })
  const open = (amount: number) =>
    jaws.forEach(({ jaw, sign }) => (jaw.rotation.x = -sign * amount * 0.6))
  return { group, open }
}

// Heracross' forked horn, base at the origin pointing along +z.
export function heracrossHorn(size: number): THREE.Group {
  const material = () => standard('#1e3a8a', { metalness: 0.3, roughness: 0.35, flatShading: true })
  const group = new THREE.Group()
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(size * 0.08, size * 0.18, size, 8)
      .rotateX(Math.PI / 2)
      .translate(0, 0, size / 2),
    material(),
  )
  const crown = new THREE.Mesh(
    new THREE.BoxGeometry(size * 0.5, size * 0.07, size * 0.12).translate(0, 0, size * 0.98),
    material(),
  )
  group.add(shaft, crown)
  for (const sign of [1, -1]) {
    const prong = new THREE.Mesh(
      new THREE.ConeGeometry(size * 0.06, size * 0.36, 6)
        .rotateX(Math.PI / 2)
        .translate(sign * size * 0.24, 0, size * 1.14),
      material(),
    )
    group.add(prong)
  }
  return group
}

export function caltrop(size: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.TetrahedronGeometry(size, 0),
    standard('#94a3b8', { metalness: 0.85, roughness: 0.25, flatShading: true }),
  )
}

export function eggMesh(size: number, shell: ColorInput = '#fef3c7'): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(size, 16, 12).scale(1, 1.3, 1),
    standard(shell, { roughness: 0.35, emissive: '#fde68a', emissiveIntensity: 0.15 }),
  )
}

// Moomoo Milk: a glass bottle with milk inside, a pink label band and a red cap.
export function milkBottle(size: number): THREE.Group {
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.42, size * 0.45, size * 1.1, 14),
      standard('#e0f2fe', { opacity: 0.45, roughness: 0.05, metalness: 0.1 }),
    ),
    new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.38, size * 0.41, size * 0.85, 14).translate(
        0,
        -size * 0.1,
        0,
      ),
      standard('#fafaf9', { roughness: 0.6 }),
    ),
    new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.44, size * 0.44, size * 0.3, 14, 1, true),
      standard('#f9a8d4', { roughness: 0.6 }),
    ),
    new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.22, size * 0.4, size * 0.35, 14).translate(
        0,
        size * 0.72,
        0,
      ),
      standard('#e0f2fe', { opacity: 0.5, roughness: 0.05 }),
    ),
    new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.25, size * 0.25, size * 0.12, 14).translate(
        0,
        size * 0.95,
        0,
      ),
      standard('#dc2626', { roughness: 0.4 }),
    ),
  )
  return group
}

// Sableye's faceted gem eye.
export function gemMesh(color: ColorInput, size: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.OctahedronGeometry(size, 0).scale(1, 1.3, 0.8),
    standard(color, {
      roughness: 0.1,
      metalness: 0.3,
      flatShading: true,
      emissive: color,
      emissiveIntensity: 0.35,
    }),
  )
}

// Mawile's huge steel jaw: an upper and lower half with pale fangs, hinging around the origin, biting along +z.
export function mawileJaw(size: number): {
  group: THREE.Group
  bite: (open: number) => void
} {
  const group = new THREE.Group()
  const halves = [1, -1].map((sign) => {
    const half = new THREE.Group()
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(size, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.8, 0.45, 1.25),
      standard('#292524', { metalness: 0.5, roughness: 0.35 }),
    )
    shell.rotation.x = sign > 0 ? 0 : Math.PI
    half.add(shell)
    for (let index = 0; index < 4; index++) {
      const angle = -0.9 + (index / 3) * 1.8
      const fang = new THREE.Mesh(
        new THREE.ConeGeometry(size * 0.11, size * 0.38, 5).translate(0, -size * 0.19, 0),
        standard('#e7e5e4', { roughness: 0.4 }),
      )
      fang.rotation.x = sign > 0 ? 0 : Math.PI
      fang.position.set(Math.sin(angle) * size * 0.68, 0, Math.cos(angle) * size * 1.0)
      half.add(fang)
    }
    group.add(half)
    return { half, sign }
  })
  const bite = (open: number) =>
    halves.forEach(({ half, sign }) => (half.rotation.x = -sign * open * 0.7))
  return { group, bite }
}

export function tearMesh(size: number, color: ColorInput = '#7dd3fc'): THREE.Mesh {
  const mesh = new THREE.Mesh(teardropGeometry(size * 0.7, size * 1.6), flat(color, 0.85))
  mesh.rotation.z = Math.PI
  return mesh
}

// Precipice Blade: a tall jagged stone fin with glowing magma seams, base at the origin, rising along +y.
export function stoneBlade(height: number, width: number): THREE.Group {
  const group = new THREE.Group()
  const shape = new THREE.Shape()
  shape.moveTo(-width, 0)
  shape.lineTo(-width * 0.7, height * 0.4)
  shape.lineTo(-width * 0.85, height * 0.55)
  shape.lineTo(-width * 0.2, height)
  shape.lineTo(width * 0.4, height * 0.7)
  shape.lineTo(width * 0.25, height * 0.55)
  shape.lineTo(width, height * 0.3)
  shape.lineTo(width * 0.8, 0)
  shape.closePath()
  group.add(
    new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: width * 0.5, bevelEnabled: false }).translate(
        0,
        0,
        -width * 0.25,
      ),
      standard('#7c2d12', { roughness: 0.85, flatShading: true }),
    ),
  )
  for (const side of [1, -1]) {
    const seam = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.12, height * 0.75).translate(
        width * 0.05,
        height * 0.42,
        0,
      ),
      glow('#f97316', 0.75),
    )
    seam.position.z = side * (width * 0.26 + 0.004)
    seam.rotation.z = 0.12 * side
    group.add(seam)
  }
  return group
}

export interface HelixOptions {
  colors: ColorInput[]
  radius?: number
  turns?: number
  thickness?: number
  opacity?: number
  spin?: number
  delay?: number
  duration?: number
  grow?: number
  priority?: RenderEffectPriority
}

// Spiralling strands wound around a line (Aeroblast's air vortex, Origin Pulse currents): one tube per color.
export function helixStrands(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: HelixOptions,
): void {
  const radius = options.radius ?? 0.2
  const turns = options.turns ?? 3
  const grow = options.grow ?? 0.25
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  const axis = new THREE.Vector3()
  const side = new THREE.Vector3()
  const lift = new THREE.Vector3()
  const control = 26
  const startTime = ctx.now + (options.delay ?? 0)
  const duration = options.duration ?? 520
  options.colors.forEach((color, strand) => {
    const material = glow(color, options.opacity ?? 0.6)
    const offset = (strand / options.colors.length) * Math.PI * 2
    tube(ctx, {
      material,
      controlPoints: control,
      radius: options.thickness ?? 0.03,
      tubularSegments: 60,
      radialSegments: 5,
      delay: options.delay,
      duration,
      priority: options.priority,
      opacity: (p) => (options.opacity ?? 0.6) * fadeInOut(p, 0.05, 0.3),
      path: (p, points) => {
        start.copy(resolvePoint(from))
        end.copy(resolvePoint(to))
        axis.subVectors(end, start)
        const length = axis.length()
        axis.normalize()
        side.crossVectors(axis, UP)
        if (side.lengthSq() < 1e-4) side.set(1, 0, 0)
        side.normalize()
        lift.crossVectors(side, axis).normalize()
        const reach = easeInOut(phase(p, 0, grow))
        const roll = p * (options.spin ?? 8) + offset
        const now = startTime + p * duration
        points.forEach((point, index) => {
          const t = (index / (control - 1)) * reach
          const angle = roll + t * turns * Math.PI * 2
          const r = radius * (0.5 + 0.5 * t) * (1 + 0.06 * Math.sin(now * 0.02 + index))
          point
            .copy(start)
            .addScaledVector(axis, t * length)
            .addScaledVector(side, Math.cos(angle) * r)
            .addScaledVector(lift, Math.sin(angle) * r)
        })
      },
    })
  })
}

export interface TailSweepOptions {
  color: ColorInput
  tip: THREE.Object3D
  segments?: number
  size?: number
  height?: number
  delay?: number
  duration?: number
  material?: () => THREE.Material
  priority?: RenderEffectPriority
}

// A segmented tail (Steelix's boulders, Seviper's coils) that rears up behind the caster and whips down onto
// the target in an arc; `tip` rides the last segment. Returns nothing; the slam lands at 62% of the duration.
export function tailSweep(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: TailSweepOptions,
): void {
  const count = options.segments ?? 7
  const size = options.size ?? 0.16
  const height = options.height ?? 1.6
  const group = new THREE.Group()
  const make =
    options.material ??
    (() => standard(options.color, { metalness: 0.6, roughness: 0.35, flatShading: true }))
  const links = Array.from({ length: count }, (_, index) => {
    const link = new THREE.Mesh(new THREE.IcosahedronGeometry(size * (1 - index * 0.06), 0), make())
    group.add(link)
    return link
  })
  group.add(options.tip)
  const base = new THREE.Vector3()
  const goal = new THREE.Vector3()
  const back = new THREE.Vector3()
  const apex = new THREE.Vector3()
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  )
  const tipPoint = new THREE.Vector3()
  const before = new THREE.Vector3()
  const heading = new THREE.Vector3()
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 700,
    group,
    (p) => {
      bodyPoint(source, 0.3, base)
      const direction = flatDirection(source, target, back)
      target.focusPoint(goal, 0.35)
      // Rear back overhead, then whip forward onto the target.
      const rear = easeOut(phase(p, 0, 0.45))
      const strike = easeInOut(phase(p, 0.45, 0.62))
      apex.copy(base).addScaledVector(direction, -0.6 * rear + 0.8 * strike)
      apex.y += height * (0.4 + 0.6 * rear) * (1 - 0.6 * strike)
      const reachEnd = before
        .copy(base)
        .addScaledVector(direction, -0.3)
        .setY(base.y + height * rear)
      reachEnd.lerp(goal, strike)
      curve.v0.copy(base)
      curve.v1.copy(apex)
      curve.v2.copy(reachEnd)
      links.forEach((link, index) => {
        curve.getPoint((index + 1) / (count + 1), link.position)
        link.rotation.set(index * 0.7, p * 3 + index, 0)
      })
      curve.getPoint(1, tipPoint)
      options.tip.position.copy(tipPoint)
      curve.getPoint(0.9, heading)
      options.tip.lookAt(heading.multiplyScalar(-1).addScaledVector(tipPoint, 2))
      setOpacity(group, 1 - phase(p, 0.85, 1))
    },
    options.priority,
  )
}

// Seviper's tail blade: a curved crimson sickle along +z.
export function sickleBlade(size: number): THREE.Group {
  const group = new THREE.Group()
  const blade = new THREE.Mesh(
    new THREE.TorusGeometry(size, size * 0.12, 5, 16, Math.PI * 0.7).rotateY(Math.PI / 2),
    standard('#9f1239', { metalness: 0.5, roughness: 0.3, flatShading: true }),
  )
  blade.scale.set(1, 1, 0.35)
  group.add(blade)
  return group
}

export interface BloomRingOptions {
  color: ColorInput
  count?: number
  radius?: number
  delay?: number
  duration?: number
}

// Pulsing ground ring that expands while thin columns of soft color rise (heal or mist bloom under an ally).
export function bloomRing(ctx: FxContext, view: UnitView, options: BloomRingOptions): void {
  const radius = options.radius ?? 0.5
  const group = new THREE.Group()
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.82, radius, 40),
    glow(options.color, 0.5),
  )
  ring.rotation.x = -Math.PI / 2
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.82, 32),
    flat(options.color, 0.16),
  )
  disc.rotation.x = -Math.PI / 2
  group.add(ring, disc)
  fx(ctx, options.delay ?? 0, options.duration ?? 700, group, (p) => {
    group.position.copy(view.root.position).setY(0.03)
    group.scale.setScalar(0.4 + 0.6 * easeOut(phase(p, 0, 0.35)) + 0.06 * pulse(phase(p, 0.35, 1)))
    setOpacity(group, fadeInOut(p, 0.1, 0.35))
  })
}
