import * as THREE from 'three'
import type { RenderEffectPriority } from '../../../animations/renderPolicy'
import { easeInOut, type UnitView } from '../../unitView'
import { glow, starGeometry, type ColorInput, type FxContext } from '../primitives'
import {
  bodyPoint,
  clamp01,
  easeOut,
  fadeInOut,
  flat,
  fx,
  phase,
  resolvePoint,
  setOpacity,
  standard,
  type PointSource,
} from './shared'

export interface ExtendOptions {
  color: ColorInput
  tip: THREE.Object3D
  delay?: number
  duration?: number
  thickness?: number
  side?: number
  rise?: number
  material?: THREE.Material
  // Reach (0..1) over the effect's progress; defaults to a snappy out-and-back.
  profile?: (p: number) => number
  priority?: RenderEffectPriority
}

// A limb, tongue or leg that shoots from the caster's current pose to the target with a custom tip;
// unlike stretchLimb it takes any tip mesh, a reach profile (for holds) and a render priority.
export function extend(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: ExtendOptions,
): void {
  const thickness = options.thickness ?? 0.07
  const group = new THREE.Group()
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(thickness, thickness, 1, 8, 1, true),
    options.material ?? standard(options.color, { roughness: 0.5, flatShading: true }),
  )
  group.add(arm, options.tip)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const tip = new THREE.Vector3()
  const side = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const axis = new THREE.Vector3()
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 240,
    group,
    (p) => {
      source.focusPoint(from, 0.55).add(source.pose.offset)
      from.y += source.pose.lift + (options.rise ?? 0)
      target.focusPoint(to, 0.5)
      side
        .subVectors(to, from)
        .cross(up)
        .normalize()
        .multiplyScalar(options.side ?? 0)
      from.add(side)
      const reach = options.profile
        ? options.profile(p)
        : p < 0.45
          ? 1 - (1 - p / 0.45) ** 3
          : 1 - (p - 0.45) / 0.55
      tip.lerpVectors(from, to, reach)
      const length = Math.max(0.01, from.distanceTo(tip))
      arm.position.lerpVectors(from, tip, 0.5)
      axis.subVectors(tip, from).normalize()
      arm.quaternion.setFromUnitVectors(up, axis)
      arm.scale.set(1, length, 1)
      options.tip.position.copy(tip)
      options.tip.quaternion.setFromUnitVectors(up, axis)
    },
    options.priority,
  )
}

const scratchA = new THREE.Vector3()
const scratchB = new THREE.Vector3()
const scratchSide = new THREE.Vector3()
const scratchColor = new THREE.Color()

export function cameraAxes(
  ctx: FxContext,
  right: THREE.Vector3,
  up: THREE.Vector3,
  forward: THREE.Vector3,
): void {
  right.set(1, 0, 0).applyQuaternion(ctx.camera.quaternion)
  up.set(0, 1, 0).applyQuaternion(ctx.camera.quaternion)
  forward.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion)
}

export type FeatherStyle = 'crystal' | 'spike' | 'flame'

function featherShape(style: FeatherStyle, length: number, width: number): THREE.Shape {
  const shape = new THREE.Shape()
  const w = width / 2
  shape.moveTo(0, 0)
  if (style === 'crystal') {
    shape.lineTo(w, length * 0.32)
    shape.lineTo(w * 0.35, length * 0.86)
    shape.lineTo(0, length)
    shape.lineTo(-w * 0.35, length * 0.86)
    shape.lineTo(-w, length * 0.32)
  } else if (style === 'spike') {
    shape.lineTo(w * 1.1, length * 0.26)
    shape.lineTo(w * 0.3, length * 0.34)
    shape.lineTo(w * 0.9, length * 0.62)
    shape.lineTo(w * 0.1, length * 0.66)
    shape.lineTo(0, length)
    shape.lineTo(-w * 0.55, length * 0.58)
    shape.lineTo(-w * 0.15, length * 0.54)
    shape.lineTo(-w * 0.9, length * 0.22)
  } else {
    shape.bezierCurveTo(w * 1.4, length * 0.2, w * 0.9, length * 0.62, w * 0.15, length)
    shape.quadraticCurveTo(0, length * 0.8, -w * 0.3, length * 0.86)
    shape.bezierCurveTo(-w * 0.2, length * 0.6, -w * 1.2, length * 0.35, 0, 0)
  }
  shape.closePath()
  return shape
}

export interface LegendaryWingOptions {
  style: FeatherStyle
  color: ColorInput
  core: ColorInput
  accent?: ColorInput
  span?: number
  feathers?: number
  heightFactor?: number
  flapRate?: number
  flapAmount?: number
  // Phase window of one powerful downbeat that throws the attack.
  thrust?: [number, number]
  delay?: number
  duration?: number
}

// Two fanned wings of layered feathers (colored halo, bright inner vane, covert row) spread behind the portrait.
export function legendaryWings(
  ctx: FxContext,
  view: UnitView,
  options: LegendaryWingOptions,
): void {
  const span = options.span ?? 1.2
  const count = options.feathers ?? 8
  const duration = options.duration ?? 1500
  const halo = glow(options.color, 0.5)
  const core = glow(options.core, 0.65)
  const accent = glow(options.accent ?? options.core, 0.5)
  const group = new THREE.Group()
  const feathers: { feather: THREE.Object3D; base: number; seed: number }[] = []
  const wings = [1, -1].map((side) => {
    const wing = new THREE.Group()
    for (let index = 0; index < count; index++) {
      const t = index / (count - 1)
      const length = span * (0.55 + 0.45 * Math.sin(Math.PI * (0.25 + 0.6 * t)))
      const width = span * (options.style === 'spike' ? 0.28 : 0.2)
      const feather = new THREE.Group()
      const vane = new THREE.Mesh(
        new THREE.ShapeGeometry(featherShape(options.style, length, width)),
        halo,
      )
      const inner = new THREE.Mesh(
        new THREE.ShapeGeometry(featherShape(options.style, length * 0.82, width * 0.36)),
        core,
      )
      inner.position.z = 0.01
      feather.add(vane, inner)
      const base = -(0.2 + t * 1.65)
      feather.rotation.z = base
      wing.add(feather)
      feathers.push({ feather, base, seed: Math.random() * 10 })
    }
    const coverts = Math.ceil(count / 2)
    for (let index = 0; index < coverts; index++) {
      const t = index / Math.max(1, coverts - 1)
      const covert = new THREE.Mesh(
        new THREE.ShapeGeometry(featherShape(options.style, span * 0.42, span * 0.17)),
        accent,
      )
      covert.position.set(span * 0.06, span * 0.03, 0.02)
      covert.rotation.z = -(0.35 + t * 1.3)
      wing.add(covert)
    }
    group.add(wing)
    return { wing, side }
  })
  const rate = options.flapRate ?? 1.2
  const amount = options.flapAmount ?? 0.2
  const position = new THREE.Vector3()
  const back = new THREE.Vector3()
  let lastCrackle = -1
  fx(ctx, options.delay ?? 0, duration, group, (p, now) => {
    bodyPoint(view, options.heightFactor ?? 0.62, position)
    back.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion).multiplyScalar(0.14)
    group.position.copy(position).add(back)
    group.quaternion.copy(ctx.camera.quaternion)
    const open = easeOut(phase(p, 0, 0.2)) * (1 - easeInOut(phase(p, 0.84, 1)))
    const seconds = (p * duration) / 1000
    const flap = Math.sin(seconds * Math.PI * 2 * rate) * amount * (ctx.reducedMotion ? 0.3 : 1)
    const thrust = options.thrust
      ? Math.sin(Math.PI * phase(p, options.thrust[0], options.thrust[1])) * 0.7
      : 0
    const size = 0.25 + 0.75 * open
    wings.forEach(({ wing, side }) => {
      wing.position.x = side * 0.14
      wing.rotation.z = (1 - open) * 0.9 + flap - thrust
      wing.scale.set(side * size, size, size)
    })
    const crackle = options.style === 'spike' && now - lastCrackle > 50
    if (crackle) lastCrackle = now
    feathers.forEach(({ feather, base, seed }) => {
      if (options.style === 'crystal') {
        feather.scale.setScalar(1 + 0.04 * Math.sin(now * 0.004 + seed))
      } else if (options.style === 'flame') {
        feather.scale.y = 0.85 + 0.18 * Math.sin(now * 0.03 + seed) + 0.07 * Math.sin(now * 0.07)
        feather.rotation.z = base + 0.07 * Math.sin(now * 0.02 + seed)
      } else if (crackle) {
        feather.scale.y = 0.88 + Math.random() * 0.26
        feather.rotation.z = base + (Math.random() - 0.5) * 0.12
      }
    })
    const shimmer =
      options.style === 'spike'
        ? crackle
          ? 0.55 + Math.random() * 0.45
          : 1
        : 0.8 + 0.2 * Math.sin(now * 0.012)
    halo.opacity = 0.5 * open * (options.style === 'spike' ? shimmer : 1)
    core.opacity = 0.65 * open * (options.style === 'spike' ? 1 : shimmer)
    accent.opacity = 0.5 * open
  })
}

export function ribbonMesh(segments: number): THREE.Mesh {
  const geometry = new THREE.BufferGeometry()
  const vertices = (segments + 1) * 2
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3))
  const index: number[] = []
  for (let segment = 0; segment < segments; segment++) {
    const a = segment * 2
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  geometry.setIndex(index)
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  )
  mesh.frustumCulled = false
  return mesh
}

// Rewrites a camera-facing strip along `points` (segments + 1 of them); additive, so darker color = more transparent.
export function writeRibbon(
  mesh: THREE.Mesh,
  points: THREE.Vector3[],
  viewDirection: THREE.Vector3,
  width: (t: number) => number,
  color: (t: number, out: THREE.Color) => void,
): void {
  const position = mesh.geometry.attributes.position as THREE.BufferAttribute
  const colors = mesh.geometry.attributes.color as THREE.BufferAttribute
  const last = points.length - 1
  points.forEach((point, index) => {
    const t = index / last
    scratchA.copy(points[Math.min(last, index + 1)]).sub(points[Math.max(0, index - 1)])
    scratchSide.crossVectors(scratchA, viewDirection)
    if (scratchSide.lengthSq() < 1e-8) scratchSide.set(0, 1, 0)
    scratchSide.normalize().multiplyScalar(width(t) / 2)
    scratchB.copy(point).add(scratchSide)
    position.setXYZ(index * 2, scratchB.x, scratchB.y, scratchB.z)
    scratchB.copy(point).sub(scratchSide)
    position.setXYZ(index * 2 + 1, scratchB.x, scratchB.y, scratchB.z)
    color(t, scratchColor)
    colors.setXYZ(index * 2, scratchColor.r, scratchColor.g, scratchColor.b)
    colors.setXYZ(index * 2 + 1, scratchColor.r, scratchColor.g, scratchColor.b)
  })
  position.needsUpdate = true
  colors.needsUpdate = true
}

export interface TailRibbonOptions {
  from: ColorInput
  to: ColorInput
  count?: number
  length?: number
  width?: number
  // Distance along the camera's right axis between the outermost ribbon roots.
  spread?: number
  droop?: number
  heightFactor?: number
  delay?: number
  duration?: number
}

// Long gradient streamers that ripple away behind a hovering unit: tail plumes, fire trails off wingtips.
export function tailRibbons(ctx: FxContext, view: UnitView, options: TailRibbonOptions): void {
  const segments = 22
  const count = options.count ?? 3
  const length = options.length ?? 1.6
  const width = options.width ?? 0.16
  const spread = options.spread ?? 0.2
  const droop = options.droop ?? 0.5
  const group = new THREE.Group()
  const ribbons = Array.from({ length: count }, () => {
    const mesh = ribbonMesh(segments)
    group.add(mesh)
    return mesh
  })
  const points = Array.from({ length: segments + 1 }, () => new THREE.Vector3())
  const anchor = new THREE.Vector3()
  const right = new THREE.Vector3()
  const up = new THREE.Vector3()
  const forward = new THREE.Vector3()
  const start = new THREE.Color(options.from)
  const end = new THREE.Color(options.to)
  const wave = ctx.reducedMotion ? 0.4 : 1
  fx(ctx, options.delay ?? 0, options.duration ?? 1400, group, (p, now) => {
    bodyPoint(view, options.heightFactor ?? 0.45, anchor)
    cameraAxes(ctx, right, up, forward)
    const grow = easeOut(phase(p, 0, 0.3))
    const fade = 1 - phase(p, 0.72, 1)
    ribbons.forEach((mesh, ribbon) => {
      const side = count === 1 ? 0 : (ribbon / (count - 1)) * 2 - 1
      points.forEach((point, index) => {
        const t = index / segments
        const reach = length * t * grow
        point
          .copy(anchor)
          .addScaledVector(right, side * (spread / 2 + reach * 0.5))
          .addScaledVector(
            up,
            -reach * droop + Math.sin(t * 5 - now * 0.006 + ribbon * 1.7) * 0.16 * t * wave,
          )
          .addScaledVector(forward, reach * 0.4)
          .addScaledVector(right, Math.cos(t * 4 - now * 0.005 + ribbon) * 0.1 * t * wave)
      })
      writeRibbon(
        mesh,
        points,
        forward,
        (t) => width * (1 - t * 0.8) * (0.5 + 0.5 * grow),
        (t, out) => {
          out
            .copy(start)
            .lerp(end, t)
            .multiplyScalar((1 - t) ** 0.7 * fade)
        },
      )
    })
  })
}

// Six-armed snowflake with two pairs of side branches per arm, in the XY plane.
export function snowflakeGeometry(size: number): THREE.BufferGeometry {
  const vertices: number[] = []
  const rhombus = (ax: number, ay: number, bx: number, by: number, width: number) => {
    const mx = (ax + bx) / 2
    const my = (ay + by) / 2
    const length = Math.hypot(bx - ax, by - ay) || 1
    const px = (-(by - ay) / length) * width
    const py = ((bx - ax) / length) * width
    vertices.push(ax, ay, 0, mx + px, my + py, 0, bx, by, 0)
    vertices.push(ax, ay, 0, bx, by, 0, mx - px, my - py, 0)
  }
  for (let arm = 0; arm < 6; arm++) {
    const angle = (arm / 6) * Math.PI * 2
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    rhombus(0, 0, cos * size, sin * size, size * 0.09)
    ;[
      [0.45, 0.32],
      [0.7, 0.22],
    ].forEach(([along, branch]) => {
      const x = cos * size * along
      const y = sin * size * along
      for (const turn of [0.9, -0.9]) {
        rhombus(
          x,
          y,
          x + Math.cos(angle + turn) * size * branch,
          y + Math.sin(angle + turn) * size * branch,
          size * 0.045,
        )
      }
    })
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  return geometry
}

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

interface BoltPath {
  points: THREE.Vector3[]
  width: number
}

// Camera-facing quads along each path; unused slots collapse to zero-area triangles.
function writeBoltQuads(
  array: Float32Array,
  paths: BoltPath[],
  visible: number[],
  scale: number,
  viewDirection: THREE.Vector3,
): void {
  array.fill(0)
  let offset = 0
  paths.forEach((path, pathIndex) => {
    const count = path.points.length - 1
    for (let segment = 0; segment < count; segment++, offset += 18) {
      if (segment >= visible[pathIndex]) continue
      const a = path.points[segment]
      const b = path.points[segment + 1]
      const width = path.width * scale * (1 - (segment / count) * 0.45)
      scratchSide.subVectors(b, a).cross(viewDirection)
      if (scratchSide.lengthSq() < 1e-8) scratchSide.set(1, 0, 0)
      scratchSide.normalize().multiplyScalar(width / 2)
      const sx = scratchSide.x
      const sy = scratchSide.y
      const sz = scratchSide.z
      array.set(
        [
          a.x + sx,
          a.y + sy,
          a.z + sz,
          a.x - sx,
          a.y - sy,
          a.z - sz,
          b.x + sx,
          b.y + sy,
          b.z + sz,
          b.x + sx,
          b.y + sy,
          b.z + sz,
          a.x - sx,
          a.y - sy,
          a.z - sz,
          b.x - sx,
          b.y - sy,
          b.z - sz,
        ],
        offset,
      )
    }
  })
}

function boltGroup(quads: number, color: ColorInput, core: ColorInput) {
  const halo = new Float32Array(quads * 18)
  const inner = new Float32Array(quads * 18)
  const haloGeometry = new THREE.BufferGeometry()
  haloGeometry.setAttribute('position', new THREE.BufferAttribute(halo, 3))
  const innerGeometry = new THREE.BufferGeometry()
  innerGeometry.setAttribute('position', new THREE.BufferAttribute(inner, 3))
  const haloMaterial = glow(color, 0.7)
  const innerMaterial = glow(core, 0.9)
  const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial)
  const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial)
  haloMesh.frustumCulled = false
  innerMesh.frustumCulled = false
  innerMesh.renderOrder = 1
  const group = new THREE.Group()
  group.add(haloMesh, innerMesh)
  const refresh = (paths: BoltPath[], visible: number[], viewDirection: THREE.Vector3) => {
    writeBoltQuads(halo, paths, visible, 1, viewDirection)
    writeBoltQuads(inner, paths, visible, 0.3, viewDirection)
    haloGeometry.attributes.position.needsUpdate = true
    innerGeometry.attributes.position.needsUpdate = true
  }
  return { group, haloMaterial, innerMaterial, refresh }
}

export interface ForkedBoltOptions {
  color: ColorInput
  core?: ColorInput
  width?: number
  segments?: number
  branches?: number
  jitter?: number
  // Phase by which the bolt has fully forked down from `from` to `to`.
  reveal?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// A thick, branching lightning bolt that forks down its path, re-jitters, and flickers out.
export function forkedBolt(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: ForkedBoltOptions,
): void {
  const segments = options.segments ?? 10
  const branchCount = options.branches ?? 3
  const branchSegments = 4
  const jitter = options.jitter ?? 0.3
  const reveal = options.reveal ?? 0.12
  const width = options.width ?? 0.12
  const { group, haloMaterial, innerMaterial, refresh } = boltGroup(
    segments + branchCount * branchSegments,
    options.color,
    options.core ?? '#fef9c3',
  )
  const main: BoltPath = {
    points: Array.from({ length: segments + 1 }, () => new THREE.Vector3()),
    width,
  }
  const branches = Array.from({ length: branchCount }, () => ({
    path: {
      points: Array.from({ length: branchSegments + 1 }, () => new THREE.Vector3()),
      width: width * 0.55,
    },
    root: 0,
    direction: new THREE.Vector3(),
    length: 0,
  }))
  const offsets = Array.from({ length: segments + 1 }, () => new THREE.Vector3())
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  const along = new THREE.Vector3()
  const viewDirection = new THREE.Vector3()
  const paths = [main, ...branches.map((branch) => branch.path)]
  const visible = paths.map(() => 0)
  const seed = Math.random() * 10
  let lastJitter = -1
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 320,
    group,
    (p, now) => {
      start.copy(resolvePoint(from))
      end.copy(resolvePoint(to))
      along.subVectors(end, start)
      const distance = along.length()
      if (now - lastJitter > 55) {
        lastJitter = now
        offsets.forEach((offset) =>
          offset.set(Math.random() - 0.5, (Math.random() - 0.5) * 0.4, Math.random() - 0.5),
        )
        branches.forEach((branch) => {
          branch.root = 2 + Math.floor(Math.random() * Math.max(1, segments - 4))
          branch.direction
            .copy(along)
            .normalize()
            .add(
              scratchA
                .set(Math.random() - 0.5, -Math.random() * 0.3, Math.random() - 0.5)
                .multiplyScalar(1.6),
            )
            .normalize()
          branch.length = distance * (0.18 + Math.random() * 0.2)
        })
      }
      main.points.forEach((point, index) => {
        const t = index / segments
        const wobble = index === 0 || index === segments ? 0 : jitter
        point.lerpVectors(start, end, t).addScaledVector(offsets[index], wobble)
      })
      branches.forEach((branch) => {
        const root = main.points[branch.root]
        branch.path.points.forEach((point, index) => {
          const t = index / branchSegments
          point.copy(root).addScaledVector(branch.direction, branch.length * t)
          if (index > 0)
            point.addScaledVector(offsets[(branch.root + index) % offsets.length], jitter * 0.5)
        })
      })
      const shown = Math.ceil(segments * clamp01(p / reveal))
      visible[0] = shown
      branches.forEach((branch, index) => {
        visible[index + 1] =
          shown > branch.root ? Math.min(branchSegments, (shown - branch.root) * 2) : 0
      })
      viewDirection.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion)
      refresh(paths, visible, viewDirection)
      const flicker = p < reveal + 0.1 ? 1 : Math.sin(now * 0.09 + seed) > -0.2 ? 1 : 0.45
      const fade = (1 - phase(p, 0.55, 1)) * flicker
      haloMaterial.opacity = 0.7 * fade
      innerMaterial.opacity = 0.9 * fade
    },
    options.priority ?? 'ability',
  )
}

export interface GroundArcOptions {
  color: ColorInput
  core?: ColorInput
  radius?: number
  arcs?: number
  delay?: number
  duration?: number
}

// Static electricity crawling over the floor: short jagged arcs that hop around a glowing patch.
export function groundArcs(ctx: FxContext, center: PointSource, options: GroundArcOptions): void {
  const arcs = options.arcs ?? 4
  const radius = options.radius ?? 0.6
  const pieces = 5
  const { group, haloMaterial, innerMaterial, refresh } = boltGroup(
    arcs * pieces,
    options.color,
    options.core ?? '#fef9c3',
  )
  const patch = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), glow(options.color, 0.16))
  patch.rotation.x = -Math.PI / 2
  group.add(patch)
  const paths: BoltPath[] = Array.from({ length: arcs }, () => ({
    points: Array.from({ length: pieces + 1 }, () => new THREE.Vector3()),
    width: 0.06,
  }))
  const visible = paths.map(() => pieces)
  const origin = new THREE.Vector3()
  const viewDirection = new THREE.Vector3()
  let lastHop = -1
  fx(ctx, options.delay ?? 0, options.duration ?? 900, group, (p, now) => {
    origin.copy(resolvePoint(center)).setY(0)
    patch.position.set(origin.x, 0.06, origin.z)
    if (now - lastHop > 80) {
      lastHop = now
      paths.forEach((path, index) => {
        if (lastHop > 0 && Math.random() < 0.4) return
        visible[index] = Math.random() < 0.75 ? pieces : 0
        const angle = Math.random() * Math.PI * 2
        const distance = Math.random() * radius * 0.8
        const heading = Math.random() * Math.PI * 2
        const length = 0.3 + Math.random() * 0.4
        path.points.forEach((point, piece) => {
          const t = piece / pieces
          const wobble = piece === 0 || piece === pieces ? 0 : 0.09
          point.set(
            origin.x +
              Math.cos(angle) * distance +
              Math.cos(heading) * length * t +
              (Math.random() - 0.5) * wobble,
            0.08 + Math.random() * 0.06,
            origin.z +
              Math.sin(angle) * distance +
              Math.sin(heading) * length * t +
              (Math.random() - 0.5) * wobble,
          )
        })
      })
    }
    viewDirection.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion)
    refresh(paths, visible, viewDirection)
    const fade = fadeInOut(p, 0.08, 0.35)
    haloMaterial.opacity = 0.7 * fade
    innerMaterial.opacity = 0.9 * fade
    setOpacity(patch, fade * (0.7 + 0.3 * Math.sin(now * 0.03)))
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
