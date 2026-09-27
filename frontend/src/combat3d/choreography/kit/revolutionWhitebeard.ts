import * as THREE from 'three'
import type { RenderEffectPriority } from '../../../animations/renderPolicy'
import { easeInOut, type UnitView } from '../../unitView'
import { glow, type ColorInput, type FxContext } from '../primitives'
import {
  bodyPoint,
  easeIn,
  easeOut,
  fistMesh,
  fx,
  palmMesh,
  phase,
  pulse,
  resolvePoint,
  setOpacity,
  type PointSource,
} from './shared'

const UP = new THREE.Vector3(0, 1, 0)
const aim = new THREE.Vector3()

export interface AirCrackOptions {
  color: ColorInput
  delay?: number
  duration?: number
  radius?: number
  rays?: number
  width?: number
  grow?: number
  priority?: RenderEffectPriority
}

// Whitebeard's Gura Gura shatter: jagged radial fractures with broken ring links in the camera plane,
// revealed from the center outward so the air itself looks like breaking glass.
export function airCracks(ctx: FxContext, center: PointSource, options: AirCrackOptions): void {
  const radius = options.radius ?? 1.6
  const rays = options.rays ?? 9
  const width = options.width ?? 0.05
  const levels = 5
  const segments: number[][] = []
  const angles = Array.from(
    { length: rays },
    (_, index) => (index / rays) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
  )
  let previous = angles.map(() => [0, 0])
  for (let level = 1; level <= levels; level++) {
    const r = (radius * level) / levels
    const current = angles.map((angle) => {
      const jittered = angle + (Math.random() - 0.5) * 0.35
      const reach = r * (0.8 + Math.random() * 0.35)
      return [Math.cos(jittered) * reach, Math.sin(jittered) * reach]
    })
    const taper = 1 - (level - 1) / (levels + 1)
    current.forEach((point, index) => {
      segments.push([previous[index][0], previous[index][1], point[0], point[1], width * taper])
      if (level > 1 && Math.random() < 0.35) {
        const branch = angles[index] + (Math.random() < 0.5 ? 0.7 : -0.7)
        const length = (radius / levels) * 0.8
        segments.push([
          point[0],
          point[1],
          point[0] + Math.cos(branch) * length,
          point[1] + Math.sin(branch) * length,
          width * taper * 0.6,
        ])
      }
    })
    if (level === 2 || level === 4) {
      current.forEach((point, index) => {
        const next = current[(index + 1) % rays]
        if (Math.random() < 0.6)
          segments.push([point[0], point[1], next[0], next[1], width * taper * 0.7])
      })
    }
    previous = current
  }
  const positions = new Float32Array(segments.length * 18)
  segments.forEach(([x1, y1, x2, y2, w], index) => {
    const length = Math.hypot(x2 - x1, y2 - y1) || 1
    const nx = (-(y2 - y1) / length) * (w / 2)
    const ny = ((x2 - x1) / length) * (w / 2)
    positions.set(
      [
        x1 + nx,
        y1 + ny,
        0,
        x1 - nx,
        y1 - ny,
        0,
        x2 + nx,
        y2 + ny,
        0,
        x2 + nx,
        y2 + ny,
        0,
        x1 - nx,
        y1 - ny,
        0,
        x2 - nx,
        y2 - ny,
        0,
      ],
      index * 18,
    )
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = glow(options.color, 1)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  const grow = options.grow ?? 0.25
  const position = new THREE.Vector3()
  let resolved = false
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 700,
    mesh,
    (p) => {
      if (!resolved) {
        position.copy(resolvePoint(center))
        resolved = true
      }
      mesh.position.copy(position)
      mesh.quaternion.copy(ctx.camera.quaternion)
      geometry.setDrawRange(0, Math.ceil(segments.length * easeOut(phase(p, 0, grow))) * 6)
      material.opacity = 1 - phase(p, 0.55, 1)
    },
    options.priority ?? 'ability',
  )
}

export interface FireFistOptions {
  color: ColorInput
  core: ColorInput
  delay?: number
  travel?: number
  duration?: number
  scale?: number
}

// Ace's Hiken: a giant fire fist riding the head of a roaring, tapered flame column.
export function fireFist(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: FireFistOptions,
): void {
  const travel = options.travel ?? 380
  const duration = options.duration ?? travel + 520
  const reach = travel / duration
  const scale = options.scale ?? 1
  const group = new THREE.Group()
  const columnOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 0.4, 1, 18, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5),
    glow(options.color, 0.6),
  )
  const columnInner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.15, 1, 12, 1, true)
      .rotateX(Math.PI / 2)
      .translate(0, 0, 0.5),
    glow(options.core, 0.85),
  )
  const fistOuter = fistMesh(0.55, () => glow(options.color, 0.85))
  const fistCore = fistMesh(0.4, () => glow(options.core, 0.95))
  const fist = new THREE.Group()
  fist.add(fistOuter, fistCore)
  const emberCount = Math.max(12, Math.round(48 * ctx.particleScale))
  const emberPositions = new Float32Array(emberCount * 3)
  const emberGeometry = new THREE.BufferGeometry()
  emberGeometry.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3))
  const emberMaterial = new THREE.PointsMaterial({
    color: '#fbbf24',
    size: 0.16,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const embers = new THREE.Points(emberGeometry, emberMaterial)
  embers.frustumCulled = false
  group.add(columnOuter, columnInner, fist, embers)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const head = new THREE.Vector3()
  const direction = new THREE.Vector3()
  const side = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, duration, group, (p, now) => {
    bodyPoint(source, 0.62, from)
    target.focusPoint(to, 0.55)
    direction.subVectors(to, from).normalize()
    to.addScaledVector(direction, 0.35)
    const q = easeIn(phase(p, 0, reach))
    head.lerpVectors(from, to, q)
    const after = phase(p, reach, 1)
    const length = Math.max(0.05, from.distanceTo(head))
    const thickness =
      scale * (0.18 + 0.2 * q) * (1 - after * 0.9) * (1 + 0.08 * Math.sin(now * 0.05))
    for (const column of [columnOuter, columnInner]) {
      column.position.copy(from)
      column.lookAt(head)
      column.scale.set(thickness, thickness, length)
    }
    setOpacity(columnOuter, 1 - after)
    setOpacity(columnInner, 1 - after)
    fist.position.copy(head)
    fist.lookAt(aim.copy(head).add(direction))
    fist.rotateZ(now * 0.004)
    fist.scale.setScalar(
      scale * (0.55 + 1.1 * q + 1.4 * easeOut(after)) * (1 + 0.05 * Math.sin(now * 0.06)),
    )
    setOpacity(fistOuter, 1 - after)
    setOpacity(fistCore, Math.max(0, 1 - after * 1.3))
    side.crossVectors(direction, UP).normalize()
    for (let index = 0; index < emberCount; index++) {
      const t = Math.random() * q
      const spread = thickness * 1.6 * (0.3 + t)
      const angle = Math.random() * Math.PI * 2
      emberPositions[index * 3] = from.x + (head.x - from.x) * t + side.x * Math.cos(angle) * spread
      emberPositions[index * 3 + 1] =
        from.y + (head.y - from.y) * t + Math.sin(angle) * spread + after * 0.6
      emberPositions[index * 3 + 2] =
        from.z + (head.z - from.z) * t + side.z * Math.cos(angle) * spread
    }
    emberGeometry.attributes.position.needsUpdate = true
    emberMaterial.opacity = 1 - after
  })
}

export interface ClawOptions {
  color: ColorInput
  core: ColorInput
  delay?: number
  duration?: number
  size?: number
}

// Sabo's Dragon Claw: a giant flaming five-talon hand drops over the target and curls shut.
export function dragonClaw(ctx: FxContext, target: UnitView, options: ClawOptions): void {
  const size = options.size ?? 1
  const group = new THREE.Group()
  const outer = glow(options.color, 0.85)
  const tipMaterial = glow(options.core, 0.95)
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 10), outer)
  palm.scale.set(1, 0.45, 1)
  group.add(palm)
  const joints: THREE.Group[] = []
  const roots: THREE.Group[] = []
  const fingers = 5
  for (let index = 0; index < fingers; index++) {
    const angle = (index / fingers) * Math.PI * 2 + Math.PI / 2
    const root = new THREE.Group()
    root.position.set(Math.cos(angle) * 0.28, -0.05, Math.sin(angle) * 0.28)
    root.rotation.order = 'YXZ'
    // Local +z points at the palm center so a negative x-rotation curls the talon inward.
    root.rotation.y = Math.atan2(-Math.cos(angle), -Math.sin(angle))
    group.add(root)
    roots.push(root)
    let parent: THREE.Object3D = root
    const lengths = [0.34, 0.3, 0.3]
    lengths.forEach((length, segment) => {
      const top = 0.085 - segment * 0.022
      const last = segment === lengths.length - 1
      const geometry = last
        ? new THREE.ConeGeometry(top, length, 7).rotateX(Math.PI).translate(0, -length / 2, 0)
        : new THREE.CylinderGeometry(top, top - 0.02, length, 8).translate(0, -length / 2, 0)
      parent.add(new THREE.Mesh(geometry, last ? tipMaterial : outer))
      const joint = new THREE.Group()
      joint.position.y = -length
      parent.add(joint)
      if (!last) joints.push(joint)
      parent = joint
    })
  }
  const base = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration ?? 900, group, (p, now) => {
    target.focusPoint(base, 0)
    const appear = easeOut(phase(p, 0, 0.3))
    const drop = easeIn(phase(p, 0.32, 0.55))
    const curl = easeInOut(phase(p, 0.45, 0.6))
    group.position.set(base.x, 2.6 - 1.2 * drop + 0.05 * Math.sin(now * 0.02), base.z)
    group.rotation.y = 0.6 * (1 - appear) + now * 0.0004
    group.scale.setScalar(size * (0.3 + 0.9 * appear) * (1 + 0.15 * pulse(phase(p, 0.55, 0.7))))
    roots.forEach((root) => (root.rotation.x = 0.7 - curl))
    joints.forEach((joint) => (joint.rotation.x = 0.25 - 0.85 * curl))
    const fade = 1 - phase(p, 0.78, 1)
    outer.opacity = 0.85 * fade
    tipMaterial.opacity = 0.95 * fade
  })
}

function featherShape(length: number, width: number): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.quadraticCurveTo(width, length * 0.45, 0, length)
  shape.quadraticCurveTo(-width * 0.55, length * 0.5, 0, 0)
  return shape
}

export interface WingOptions {
  color: ColorInput
  edge: ColorInput
  delay?: number
  duration?: number
  span?: number
}

// Marco's phoenix wings: fanned blue flame feathers with gold cores, billboarded behind the portrait.
export function phoenixWings(ctx: FxContext, view: UnitView, options: WingOptions): void {
  const size = options.span ?? 1
  const group = new THREE.Group()
  const blue = glow(options.color, 0.8)
  const gold = glow(options.edge, 0.9)
  const wings = [1, -1].map((side) => {
    const wing = new THREE.Group()
    for (let index = 0; index < 8; index++) {
      const length = 1.25 - index * 0.1
      const angle = -0.15 - index * 0.21
      const feather = new THREE.Mesh(new THREE.ShapeGeometry(featherShape(length, 0.2)), blue)
      feather.rotation.z = angle
      const core = new THREE.Mesh(new THREE.ShapeGeometry(featherShape(length * 0.55, 0.08)), gold)
      core.rotation.z = angle
      core.position.z = 0.01
      wing.add(feather, core)
    }
    group.add(wing)
    return { wing, side }
  })
  const position = new THREE.Vector3()
  const back = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration ?? 1400, group, (p, now) => {
    bodyPoint(view, 0.7, position)
    back.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion).multiplyScalar(0.12)
    group.position.copy(position).add(back)
    group.quaternion.copy(ctx.camera.quaternion)
    const open = easeOut(phase(p, 0, 0.22)) * (1 - easeInOut(phase(p, 0.82, 1)))
    const flap = Math.sin(phase(p, 0.2, 0.85) * Math.PI * 4) * 0.35
    wings.forEach(({ wing, side }) => {
      wing.rotation.z = side * (-0.9 * (1 - open) + flap)
      wing.scale.set(side * size * (0.2 + 0.8 * open), size * (0.4 + 0.6 * open), size)
    })
    blue.opacity = 0.8 * (0.25 + 0.75 * open) * (0.85 + 0.15 * Math.sin(now * 0.03))
    gold.opacity = 0.9 * open
  })
}

function petalShape(): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(0.12, 0.05, 0.12, 0.2, 0.03, 0.26)
  shape.lineTo(0, 0.22)
  shape.lineTo(-0.03, 0.26)
  shape.bezierCurveTo(-0.12, 0.2, -0.12, 0.05, 0, 0)
  return shape
}

export interface RoseOptions {
  color: ColorInput
  inner: ColorInput
  delay?: number
  duration?: number
  size?: number
}

// Vista's rose: a giant blossom that opens flat on the ground, petal pivots tilting open layer by layer.
export function rose(ctx: FxContext, anchor: PointSource, options: RoseOptions): void {
  const size = options.size ?? 3
  const group = new THREE.Group()
  const geometry = new THREE.ShapeGeometry(petalShape())
  const petal = (color: ColorInput) =>
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
  const outer = petal(options.color)
  const inner = petal(options.inner)
  const layers = [
    { count: 6, scale: 1, open: 1.45, material: outer, offset: 0 },
    { count: 5, scale: 0.75, open: 1.1, material: outer, offset: 0.4 },
    { count: 4, scale: 0.5, open: 0.7, material: inner, offset: 0.2 },
  ].map((layer) => {
    const pivots = Array.from({ length: layer.count }, (_, index) => {
      const pivot = new THREE.Group()
      // YXZ: tilt the petal outward first, then spin it around the flower's axis.
      pivot.rotation.order = 'YXZ'
      pivot.rotation.y = (index / layer.count) * Math.PI * 2 + layer.offset
      const mesh = new THREE.Mesh(geometry, layer.material)
      mesh.scale.setScalar(layer.scale)
      pivot.add(mesh)
      group.add(pivot)
      return pivot
    })
    return { ...layer, pivots }
  })
  fx(ctx, options.delay ?? 0, options.duration ?? 1200, group, (p, now) => {
    const origin = resolvePoint(anchor)
    group.position.set(origin.x, 0.06, origin.z)
    group.rotation.y = now * 0.001
    group.scale.setScalar(size * easeOut(phase(p, 0, 0.3)) + 0.001)
    layers.forEach((layer, index) => {
      const bloom = easeOut(phase(p, index * 0.08, 0.35 + index * 0.08))
      layer.pivots.forEach((pivot) => (pivot.rotation.x = 0.15 + (layer.open - 0.15) * bloom))
    })
    const fade = 1 - phase(p, 0.7, 1)
    outer.opacity = 0.9 * fade
    inner.opacity = 0.9 * fade
  })
}

export interface StrikeOptions {
  color: ColorInput
  core?: ColorInput
  delay?: number
  duration?: number
  scale?: number
  impact?: number
  priority?: RenderEffectPriority
}

// Hack's water palm: an open hand of water thrust into the target that splats flat on contact.
export function palmStrike(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: StrikeOptions,
): void {
  const scale = options.scale ?? 1
  const impact = options.impact ?? 0.45
  const group = new THREE.Group()
  const outer = palmMesh(0.3, () => glow(options.color, 0.7))
  const core = palmMesh(0.18, () => glow(options.core ?? '#e0f2fe', 0.8))
  group.add(outer, core)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const direction = new THREE.Vector3()
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 360,
    group,
    (p, now) => {
      bodyPoint(source, 0.6, from)
      target.focusPoint(to, 0.6)
      direction.subVectors(to, from).normalize()
      to.addScaledVector(direction, -0.25)
      const reach = easeIn(phase(p, 0, impact))
      const after = phase(p, impact, 1)
      group.position.lerpVectors(from, to, reach)
      group.lookAt(aim.copy(to).add(direction))
      group.rotateZ(Math.sin(now * 0.02) * 0.05)
      const s = scale * (0.5 + 0.6 * reach + 0.5 * easeOut(after))
      group.scale.set(s * (1 + after * 0.5), s * (1 + after * 0.5), s * (1 - after * 0.8) + 0.001)
      setOpacity(group, 1 - after)
    },
    options.priority ?? 'ability',
  )
}

export interface CrossSlashOptions {
  color: ColorInput
  core: ColorInput
  delay?: number
  duration?: number
  length?: number
  priority?: RenderEffectPriority
}

// Thatch's twin-blade X: two straight streaks carve a cross, hang for a beat, then slide apart.
export function crossSlash(ctx: FxContext, center: PointSource, options: CrossSlashOptions): void {
  const length = options.length ?? 1.6
  const group = new THREE.Group()
  const blades = [0.75, -0.75].map((angle, index) => {
    const pivot = new THREE.Group()
    pivot.rotation.z = angle
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.04), glow(options.core, 1))
    inner.position.z = 0.01
    pivot.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 0.12), glow(options.color, 0.95)), inner)
    group.add(pivot)
    return { pivot, lag: index * 0.12 }
  })
  const position = new THREE.Vector3()
  let resolved = false
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 520,
    group,
    (p) => {
      if (!resolved) {
        position.copy(resolvePoint(center))
        resolved = true
      }
      group.position.copy(position)
      group.quaternion.copy(ctx.camera.quaternion)
      const split = easeIn(phase(p, 0.55, 1))
      blades.forEach(({ pivot, lag }, index) => {
        pivot.scale.set(length * easeOut(phase(p, lag, lag + 0.2)) + 0.001, 1 + split * 0.5, 1)
        pivot.position.set(0, (index === 0 ? 1 : -1) * split * 0.25, 0)
      })
      setOpacity(group, 1 - phase(p, 0.6, 1))
    },
    options.priority ?? 'ability',
  )
}

// Ivankov's hormone injection nail (+z forward) for `prop`: syringe barrel, plunger and needle tip.
export function needleMesh(color: ColorInput, tip: ColorInput): THREE.Group {
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.34, 8).rotateX(Math.PI / 2).translate(0, 0, -0.2),
      glow(color, 0.9),
    ),
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.03, 10).rotateX(Math.PI / 2).translate(0, 0, -0.38),
      glow(color, 0.9),
    ),
    new THREE.Mesh(
      new THREE.ConeGeometry(0.02, 0.26, 6).rotateX(Math.PI / 2).translate(0, 0, 0.1),
      glow(tip, 1),
    ),
  )
  return group
}
