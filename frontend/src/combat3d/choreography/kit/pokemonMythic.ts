import * as THREE from 'three'
import { glow, starGeometry, type ColorInput } from '../primitives'
import { easeOut, flat, phase, pulse, standard, hexagonGeometry } from './shared'

export const PASTEL_SPECTRUM = [
  '#f9a8d4',
  '#fda4af',
  '#fcd34d',
  '#86efac',
  '#67e8f9',
  '#a5b4fc',
  '#d8b4fe',
]

// Hue drifting through cyan, lavender and pink, like a soap film or thin glass.
export function iridescent(out: THREE.Color, t: number, lightness = 0.68): THREE.Color {
  return out.setHSL(0.5 + 0.42 * (0.5 + 0.5 * Math.sin(t)), 0.8, lightness)
}

// Flat ring whose vertex colors run through `colors` around the circumference (rotate it to make the band flow).
export function spectrumRing(
  inner: number,
  outer: number,
  colors: ColorInput[],
  opacity = 0.6,
): THREE.Mesh {
  const geometry = new THREE.RingGeometry(inner, outer, 64, 1)
  const position = geometry.attributes.position
  const palette = colors.map((color) => new THREE.Color(color))
  const tint = new THREE.Color()
  const vertexColors = new Float32Array(position.count * 3)
  for (let index = 0; index < position.count; index++) {
    const around =
      ((Math.atan2(position.getY(index), position.getX(index)) / (Math.PI * 2) + 1) % 1) *
      palette.length
    const from = Math.floor(around) % palette.length
    tint.copy(palette[from]).lerp(palette[(from + 1) % palette.length], around - Math.floor(around))
    vertexColors.set([tint.r, tint.g, tint.b], index * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3))
  const material = glow('#ffffff', opacity)
  material.vertexColors = true
  return new THREE.Mesh(geometry, material)
}

// Psystrike crystal: a faceted, lit spike along +z with a faint colored sheath.
export function crystalShard(length: number, body: ColorInput, sheath: ColorInput): THREE.Group {
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(
      new THREE.OctahedronGeometry(1, 0).scale(length * 0.14, length * 0.14, length * 0.5),
      standard(body, {
        roughness: 0.15,
        metalness: 0.35,
        flatShading: true,
        emissive: body,
        emissiveIntensity: 0.45,
        opacity: 0.92,
      }),
    ),
    new THREE.Mesh(
      new THREE.OctahedronGeometry(1, 0).scale(length * 0.22, length * 0.22, length * 0.6),
      glow(sheath, 0.3),
    ),
  )
  return group
}

// Teardrop in the XY plane with its point at +y: dew drops and petals.
export function teardropGeometry(width: number, length: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(width, length * 0.2, width * 0.8, length * 0.75, 0, length)
  shape.bezierCurveTo(-width * 0.8, length * 0.75, -width, length * 0.2, 0, 0)
  return new THREE.ShapeGeometry(shape, 10)
}

// A glassy dew drop (round belly, pointed top) with a small colored glint.
export function dewDrop(color: ColorInput, glint: ColorInput, size = 0.06): THREE.Group {
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(size, 12, 10),
      standard(color, {
        opacity: 0.8,
        roughness: 0.05,
        metalness: 0.2,
        emissive: color,
        emissiveIntensity: 0.4,
      }),
    ),
    new THREE.Mesh(
      new THREE.ConeGeometry(size * 0.96, size * 1.9, 12).translate(0, size * 1.2, 0),
      standard(color, {
        opacity: 0.8,
        roughness: 0.05,
        metalness: 0.2,
        emissive: color,
        emissiveIntensity: 0.4,
      }),
    ),
    new THREE.Mesh(
      new THREE.SphereGeometry(size * 0.3, 6, 4).translate(-size * 0.35, size * 0.3, size * 0.7),
      glow(glint, 0.7),
    ),
  )
  return group
}

export interface GengarShade {
  group: THREE.Group
  eyes: THREE.Group
  grin: THREE.Group
}

function gengarOutline(size: number): THREE.Shape {
  const s = size
  const shape = new THREE.Shape()
  const outline: [number, number][] = [
    [-1.15, 0.45],
    [-0.85, 0.45],
    [-0.95, 1.15],
    [-0.45, 0.72],
    [-0.3, 0.95],
    [-0.12, 0.76],
    [0.08, 1.0],
    [0.25, 0.76],
    [0.45, 0.72],
    [0.95, 1.15],
    [0.85, 0.45],
    [1.15, 0.45],
    [0.95, 0.2],
  ]
  shape.moveTo(-0.7 * s, -0.85 * s)
  shape.quadraticCurveTo(-1.08 * s, -0.3 * s, -0.95 * s, 0.2 * s)
  outline.forEach(([x, y]) => shape.lineTo(x * s, y * s))
  shape.quadraticCurveTo(1.08 * s, -0.3 * s, 0.7 * s, -0.85 * s)
  shape.quadraticCurveTo(0, -1.05 * s, -0.7 * s, -0.85 * s)
  return shape
}

// Gengar's looming silhouette (+z faces the viewer): dark violet body, violet rim, red eyes and a wide grin.
export function gengarShade(size: number): GengarShade {
  const group = new THREE.Group()
  const rim = new THREE.Mesh(
    new THREE.ShapeGeometry(gengarOutline(size * 1.07), 6),
    glow('#7c3aed', 0.5),
  )
  rim.position.set(0, -size * 0.03, -0.02)
  rim.renderOrder = 1
  const body = new THREE.Mesh(
    new THREE.ShapeGeometry(gengarOutline(size), 6),
    flat('#1e0b3d', 0.86),
  )
  body.renderOrder = 2
  const eyes = new THREE.Group()
  ;[-1, 1].forEach((side) => {
    const eye = new THREE.Shape()
    eye.moveTo(side * 0.58 * size, 0.46 * size)
    eye.lineTo(side * 0.14 * size, 0.28 * size)
    eye.quadraticCurveTo(side * 0.22 * size, 0.58 * size, side * 0.58 * size, 0.46 * size)
    const white = new THREE.Mesh(new THREE.ShapeGeometry(eye, 6), glow('#f43f5e', 0.85))
    white.position.z = 0.01
    white.renderOrder = 3
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(size * 0.055, 10), flat('#1e0b3d', 0.95))
    pupil.position.set(side * 0.3 * size, 0.4 * size, 0.02)
    pupil.renderOrder = 4
    eyes.add(white, pupil)
  })
  const grin = new THREE.Group()
  const smile = new THREE.Shape()
  smile.moveTo(-0.66 * size, 0.08 * size)
  smile.quadraticCurveTo(0, -0.2 * size, 0.66 * size, 0.08 * size)
  smile.quadraticCurveTo(0, -0.78 * size, -0.66 * size, 0.08 * size)
  const teeth = new THREE.Mesh(new THREE.ShapeGeometry(smile, 12), flat('#f5d0fe', 0.92))
  teeth.renderOrder = 3
  const seam = new THREE.Shape()
  seam.moveTo(-0.6 * size, 0.04 * size)
  seam.quadraticCurveTo(0, -0.46 * size, 0.6 * size, 0.04 * size)
  seam.quadraticCurveTo(0, -0.41 * size, -0.6 * size, 0.04 * size)
  const seamMesh = new THREE.Mesh(new THREE.ShapeGeometry(seam, 12), flat('#4c1d95', 0.9))
  seamMesh.position.z = 0.01
  seamMesh.renderOrder = 4
  grin.add(teeth, seamMesh)
  grin.position.set(0, -0.12 * size, 0.01)
  group.add(rim, body, eyes, grin)
  return { group, eyes, grin }
}

export interface BarrierCell {
  panel: THREE.Group
  pane: THREE.Mesh
  rim: THREE.Mesh
  x: number
  y: number
  order: number
  yaw: number
}

export interface HexBarrier {
  group: THREE.Group
  cells: BarrierCell[]
  glints: THREE.Mesh[]
  streak: THREE.Mesh
}

// Curved honeycomb pane (+z faces outward) for Mr. Mime's Reflect walls.
export function hexBarrier(cellRadius: number): HexBarrier {
  const group = new THREE.Group()
  const curve = 1.1
  const coords: [number, number][] = [[0, 0]]
  for (let index = 0; index < 6; index++) {
    const angle = (index / 6) * Math.PI * 2
    coords.push([Math.cos(angle) * Math.sqrt(3), Math.sin(angle) * Math.sqrt(3)])
  }
  const cells = coords.map(([cx, cy], index) => {
    const x = cx * cellRadius
    const y = cy * cellRadius
    const panel = new THREE.Group()
    const pane = new THREE.Mesh(hexagonGeometry(cellRadius * 0.95), flat('#c7d2fe', 0.16))
    const rim = new THREE.Mesh(
      hexagonGeometry(cellRadius * 0.95, cellRadius * 0.84),
      glow('#a5b4fc', 0.65),
    )
    rim.position.z = 0.005
    panel.add(pane, rim)
    const yaw = Math.atan(2 * curve * x)
    panel.position.set(x, y, -x * x * curve)
    panel.rotation.y = yaw
    group.add(panel)
    return { panel, pane, rim, x, y, order: index === 0 ? 0 : 0.35 + (index / 6) * 0.65, yaw }
  })
  const glints = [1, 3, 5].map((cellIndex, index) => {
    const glint = new THREE.Mesh(
      starGeometry(4, cellRadius * 0.55, cellRadius * 0.08),
      glow(index === 1 ? '#bae6fd' : '#f5d0fe', 0.6),
    )
    const cell = cells[cellIndex]
    glint.position.set(
      cell.x * 0.8,
      cell.y * 0.8 + cellRadius * 0.3,
      -cell.x * cell.x * curve + 0.03,
    )
    glint.renderOrder = 3
    group.add(glint)
    return glint
  })
  const streak = new THREE.Mesh(
    new THREE.PlaneGeometry(cellRadius * 0.3, cellRadius * 5),
    glow('#c4b5fd', 0.35),
  )
  streak.rotation.z = 0.5
  streak.position.z = 0.04
  group.add(streak)
  return { group, cells, glints, streak }
}

const tint = new THREE.Color()

// Assembles the barrier cell by cell, then runs an iridescent rim shimmer, one light sweep and soft glints.
export function animateBarrier(barrier: HexBarrier, p: number, now: number): void {
  const fade = 1 - phase(p, 0.72, 1)
  const wave = -1 + phase(p, 0.18, 0.7) * 2
  barrier.cells.forEach((cell) => {
    const assemble = easeOut(phase(p, 0.02 + cell.order * 0.12, 0.16 + cell.order * 0.12))
    cell.panel.scale.setScalar(Math.max(0.01, assemble))
    cell.panel.rotation.y = cell.yaw + (1 - assemble) * 1.5
    const shimmer = Math.exp(-((cell.x * 2.2 - wave) ** 2) / 0.08)
    const paneMaterial = cell.pane.material as THREE.MeshBasicMaterial
    paneMaterial.opacity = (0.14 + 0.16 * shimmer) * fade * assemble
    const rimMaterial = cell.rim.material as THREE.MeshBasicMaterial
    iridescent(rimMaterial.color, now * 0.004 + cell.x * 4 + cell.y * 3, 0.62 + 0.1 * shimmer)
    rimMaterial.opacity = (0.45 + 0.2 * shimmer) * fade * assemble
  })
  barrier.glints.forEach((glint, index) => {
    const local = phase(p, 0.28 + index * 0.13, 0.62 + index * 0.13)
    glint.scale.setScalar(0.5 + 0.5 * pulse(local))
    glint.rotation.z = local * 0.8
    ;(glint.material as THREE.MeshBasicMaterial).opacity = 0.6 * pulse(local) * fade
  })
  const sweep = phase(p, 0.3, 0.75)
  barrier.streak.position.x = -0.9 + sweep * 1.8
  barrier.streak.position.z = 0.04 - barrier.streak.position.x ** 2 * 1.1
  const streakMaterial = barrier.streak.material as THREE.MeshBasicMaterial
  iridescent(tint, now * 0.003, 0.7)
  streakMaterial.color.copy(tint)
  streakMaterial.opacity = 0.35 * pulse(sweep) * fade
}
