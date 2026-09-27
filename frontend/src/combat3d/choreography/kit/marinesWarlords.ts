import * as THREE from 'three'
import type { RenderEffectPriority } from '../../../animations/renderPolicy'
import { easeInOut, type UnitView } from '../../unitView'
import { glow, type ColorInput, type FxContext } from '../primitives'
import { fistMesh, flat, fx, phase, setOpacity, standard } from './shared'

export interface ArmoredFistOptions {
  emissive?: ColorInput
  emissiveIntensity?: number
  cuff?: ColorInput
  glowColor?: ColorInput
}

// Shared fist plus a sleeve cuff and optional glow halo (Garp's coat sleeve, Akainu's magma arm).
// The skin meshes are unnamed so callers can recolour them (e.g. Haki darkening).
export function armoredFist(
  size: number,
  color: ColorInput,
  options: ArmoredFistOptions = {},
): THREE.Group {
  const skin = () =>
    standard(color, {
      emissive: options.emissive,
      emissiveIntensity: options.emissiveIntensity ?? 0,
      roughness: 0.6,
    })
  const group = fistMesh(size, skin)
  const cuff = new THREE.Mesh(
    new THREE.CylinderGeometry(size * 0.55, size * 0.62, size * 0.8, 14).rotateX(Math.PI / 2),
    options.cuff ? standard(options.cuff, { roughness: 0.7 }) : skin(),
  )
  cuff.position.z = -size * 0.8
  cuff.name = 'cuff'
  group.add(cuff)
  if (options.glowColor) {
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(size * 1.4, 16, 12),
      glow(options.glowColor, 0.35),
    )
    halo.name = 'halo'
    group.add(halo)
  }
  return group
}

// Kuma's paw print (pad + four toe beans) in the XY plane.
export function pawMesh(size: number, color: ColorInput, opacity = 0.9): THREE.Group {
  const group = new THREE.Group()
  const pad = new THREE.Mesh(new THREE.CircleGeometry(size * 0.55, 24), glow(color, opacity))
  pad.scale.set(1.15, 0.9, 1)
  pad.position.y = -size * 0.2
  group.add(pad)
  for (let index = 0; index < 4; index++) {
    const angle = Math.PI * (0.2 + (index / 3) * 0.6)
    const toe = new THREE.Mesh(new THREE.CircleGeometry(size * 0.2, 16), glow(color, opacity))
    toe.position.set(Math.cos(angle) * size * 0.72, Math.sin(angle) * size * 0.62 + size * 0.05, 0)
    group.add(toe)
  }
  return group
}

// Moria's shadow bat: two jagged wings (children 0 and 1, for flapping) in the XY plane.
export function batMesh(size: number, color: ColorInput): THREE.Group {
  const wing = (side: number) => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.lineTo(side * size, size * 0.45)
    shape.lineTo(side * size * 0.8, size * 0.05)
    shape.lineTo(side * size * 0.6, size * 0.2)
    shape.lineTo(side * size * 0.45, -size * 0.1)
    shape.lineTo(side * size * 0.25, size * 0.08)
    shape.lineTo(0, -size * 0.15)
    return new THREE.Mesh(new THREE.ShapeGeometry(shape), flat(color, 0.95))
  }
  const group = new THREE.Group()
  group.add(wing(1), wing(-1))
  group.add(new THREE.Mesh(new THREE.CircleGeometry(size * 0.14, 10), flat(color, 0.95)))
  return group
}

export interface CageOptions {
  color: ColorInput
  glowColor: ColorInput
  delay?: number
  duration?: number
  bars?: number
  priority?: RenderEffectPriority
}

// Hina's Cage Cage: iron bars slam down around the target, clamp tight, then fade.
export function ironCage(ctx: FxContext, view: UnitView, options: CageOptions): void {
  const bars = options.bars ?? 8
  const height = view.height + 0.35
  const radius = 0.42
  const iron = () =>
    standard(options.color, {
      metalness: 0.6,
      roughness: 0.4,
      emissive: options.glowColor,
      emissiveIntensity: 0.3,
    })
  const group = new THREE.Group()
  const barMeshes: THREE.Mesh[] = []
  for (let index = 0; index < bars; index++) {
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, height, 8).translate(0, height / 2, 0),
      iron(),
    )
    const angle = (index / bars) * Math.PI * 2
    bar.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
    barMeshes.push(bar)
    group.add(bar)
  }
  const top = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.04, 8, 32).rotateX(Math.PI / 2),
    iron(),
  )
  top.position.y = height
  const bottom = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.04, 8, 32).rotateX(Math.PI / 2),
    iron(),
  )
  bottom.position.y = 0.06
  const lock = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.25, 0.03, 6, 40).rotateX(Math.PI / 2),
    glow(options.glowColor, 0.8),
  )
  lock.position.y = height * 0.5
  group.add(top, bottom, lock)
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 1300,
    group,
    (p) => {
      group.position.copy(view.root.position)
      barMeshes.forEach((bar, index) => {
        bar.position.y = (1 - easeInOut(phase(p, index * 0.012, index * 0.012 + 0.14))) * 2.2
      })
      const clamp = phase(p, 0.16, 0.24)
      const squeeze = 1.35 - 0.35 * clamp
      group.scale.set(squeeze, 1, squeeze)
      top.visible = clamp > 0
      lock.scale.setScalar(1 + (1 - clamp) * 0.8)
      setOpacity(group, 1 - phase(p, 0.82, 1))
      ;(lock.material as THREE.MeshBasicMaterial).opacity = clamp * 0.8 * (1 - phase(p, 0.5, 0.7))
    },
    options.priority ?? 'ability',
  )
}
