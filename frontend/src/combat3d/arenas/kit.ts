import * as THREE from 'three'
import { ARENA_COLUMNS, ARENA_ROWS, gridToWorld } from '../types'

export interface ArenaHandle {
  update: (timeMs: number) => void
}

export interface ArenaTheme {
  id: string
  label: string
  build: (scene: THREE.Scene, root: THREE.Group) => ArenaHandle
}

export const noUpdate: ArenaHandle = { update: () => {} }

export function standard(color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...options })
}

export function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
  shadows = true,
): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material)
  result.position.set(...position)
  result.castShadow = shadows
  result.receiveShadow = shadows
  return result
}

export interface LightingOptions {
  sky: THREE.ColorRepresentation
  ground: THREE.ColorRepresentation
  hemisphere?: number
  sun: THREE.ColorRepresentation
  sunIntensity?: number
  sunPosition?: [number, number, number]
  rim?: THREE.ColorRepresentation
}

export function lighting(root: THREE.Group, options: LightingOptions): void {
  root.add(new THREE.HemisphereLight(options.sky, options.ground, options.hemisphere ?? 0.9))
  const sun = new THREE.DirectionalLight(options.sun, options.sunIntensity ?? 2.4)
  sun.position.set(...(options.sunPosition ?? [-5, 11, 6]))
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -8
  sun.shadow.camera.right = 8
  sun.shadow.camera.top = 7
  sun.shadow.camera.bottom = -7
  sun.shadow.bias = -0.0005
  sun.shadow.normalBias = 0.02
  root.add(sun)
  const rim = new THREE.DirectionalLight(options.rim ?? '#8fb4ff', 0.9)
  rim.position.set(4, 5, -8)
  root.add(rim)
}

export function atmosphere(
  scene: THREE.Scene,
  root: THREE.Group,
  top: THREE.ColorRepresentation,
  horizon: THREE.ColorRepresentation,
  fogNear = 18,
  fogFar = 44,
): void {
  const horizonColor = new THREE.Color(horizon)
  scene.background = horizonColor
  scene.fog = new THREE.Fog(horizonColor, fogNear, fogFar)
  const geometry = new THREE.SphereGeometry(60, 32, 16)
  const topColor = new THREE.Color(top)
  const colors: number[] = []
  const position = geometry.attributes.position
  for (let index = 0; index < position.count; index++) {
    const t = THREE.MathUtils.clamp(position.getY(index) / 60, 0, 1)
    const color = horizonColor.clone().lerp(topColor, Math.pow(t, 0.6))
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const sky = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }),
  )
  root.add(sky)
}

export interface BoardOptions {
  near: THREE.ColorRepresentation
  far: THREE.ColorRepresentation
  base: THREE.ColorRepresentation
  checker?: number
  baseHeight?: number
  roughness?: number
  line?: THREE.ColorRepresentation
}

// The 9x6 combat grid every arena is built around; stage props stay outside it.
export function board(root: THREE.Group, options: BoardOptions): void {
  const baseHeight = options.baseHeight ?? 0.4
  root.add(
    mesh(
      new THREE.BoxGeometry(ARENA_COLUMNS + 0.8, baseHeight, ARENA_ROWS + 0.8),
      standard(options.base),
      [0, -baseHeight / 2, 0],
    ),
  )
  const tiles = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.94, 0.06, 0.94),
    new THREE.MeshStandardMaterial({ roughness: options.roughness ?? 0.75, metalness: 0.05 }),
    ARENA_COLUMNS * ARENA_ROWS,
  )
  tiles.receiveShadow = true
  const matrix = new THREE.Matrix4()
  const near = new THREE.Color(options.near)
  const far = new THREE.Color(options.far)
  let index = 0
  for (let y = 0; y < ARENA_ROWS; y++) {
    for (let x = 0; x < ARENA_COLUMNS; x++) {
      const world = gridToWorld(x, y)
      matrix.makeTranslation(world.x, 0.03, world.z)
      tiles.setMatrixAt(index, matrix)
      const color = (y < ARENA_ROWS / 2 ? far : near).clone()
      color.offsetHSL(0, 0, (x + y) % 2 === 0 ? (options.checker ?? 0.04) : 0)
      tiles.setColorAt(index, color)
      index++
    }
  }
  root.add(tiles)
  const centerLine = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA_COLUMNS, 0.05),
    new THREE.MeshBasicMaterial({ color: options.line ?? '#ffffff', transparent: true, opacity: 0.35 }),
  )
  centerLine.rotation.x = -Math.PI / 2
  centerLine.position.y = 0.065
  root.add(centerLine)
}

export function ground(root: THREE.Group, color: THREE.ColorRepresentation, y = -0.4, size = 90): THREE.Mesh {
  const plane = mesh(new THREE.PlaneGeometry(size, size), standard(color), [0, y, 0], false)
  plane.rotation.x = -Math.PI / 2
  plane.receiveShadow = true
  root.add(plane)
  return plane
}

export function water(
  root: THREE.Group,
  color: THREE.ColorRepresentation,
  options: { y?: number; size?: number; amplitude?: number; opacity?: number } = {},
): ArenaHandle {
  const size = options.size ?? 90
  const geometry = new THREE.PlaneGeometry(size, size, 60, 60)
  geometry.rotateX(-Math.PI / 2)
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.25,
    metalness: 0.1,
    transparent: (options.opacity ?? 1) < 1,
    opacity: options.opacity ?? 1,
    flatShading: true,
  })
  const surface = new THREE.Mesh(geometry, material)
  surface.position.y = options.y ?? -0.6
  surface.receiveShadow = true
  root.add(surface)
  const position = geometry.attributes.position
  const base = Float32Array.from(position.array as Float32Array)
  const amplitude = options.amplitude ?? 0.12
  let lastUpdate = -1000
  return {
    update: (timeMs) => {
      if (timeMs - lastUpdate < 50) return
      lastUpdate = timeMs
      const t = timeMs * 0.001
      for (let index = 0; index < position.count; index++) {
        const x = base[index * 3]
        const z = base[index * 3 + 2]
        position.setY(index, Math.sin(x * 0.35 + t) * amplitude + Math.cos(z * 0.3 + t * 1.3) * amplitude)
      }
      position.needsUpdate = true
      geometry.computeVertexNormals()
    },
  }
}

export interface WeatherOptions {
  color: THREE.ColorRepresentation
  count?: number
  size?: number
  area?: [number, number, number]
  fall?: number
  sway?: number
  rise?: boolean
  opacity?: number
}

export function weather(root: THREE.Group, options: WeatherOptions): ArenaHandle {
  const count = options.count ?? 160
  const [width, height, depth] = options.area ?? [22, 8, 16]
  const positions = new Float32Array(count * 3)
  const seeds = Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * width,
    y: Math.random() * height,
    z: (Math.random() - 0.5) * depth,
    phase: Math.random() * Math.PI * 2,
    speed: 0.6 + Math.random() * 0.8,
  }))
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: options.color,
      size: options.size ?? 0.12,
      transparent: true,
      opacity: options.opacity ?? 0.85,
      depthWrite: false,
    }),
  )
  points.frustumCulled = false
  root.add(points)
  const fall = options.fall ?? 0.6
  const sway = options.sway ?? 0.4
  return {
    update: (timeMs) => {
      const t = timeMs * 0.001
      seeds.forEach((seed, index) => {
        const travel = (t * fall * seed.speed) % height
        const y = options.rise ? (seed.y + travel) % height : height - ((height - seed.y + travel) % height)
        positions[index * 3] = seed.x + Math.sin(t * 0.8 + seed.phase) * sway
        positions[index * 3 + 1] = y
        positions[index * 3 + 2] = seed.z + Math.cos(t * 0.6 + seed.phase) * sway * 0.5
      })
      geometry.attributes.position.needsUpdate = true
    },
  }
}

export function combine(...handles: ArenaHandle[]): ArenaHandle {
  return { update: (timeMs) => handles.forEach((handle) => handle.update(timeMs)) }
}

export function scatter(
  count: number,
  radius: [number, number],
  place: (x: number, z: number, index: number) => void,
  arc: [number, number] = [0, Math.PI * 2],
): void {
  for (let index = 0; index < count; index++) {
    const angle = arc[0] + ((index + 0.5) / count) * (arc[1] - arc[0]) + (Math.random() - 0.5) * 0.2
    const distance = radius[0] + Math.random() * (radius[1] - radius[0])
    place(Math.cos(angle) * distance, Math.sin(angle) * distance, index)
  }
}
