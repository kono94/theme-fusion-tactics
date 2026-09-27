import * as THREE from 'three'
import type { RenderEffectPriority } from '../../../animations/renderPolicy'
import type { UnitView } from '../../unitView'
import { glow, type ColorInput, type FxContext } from '../primitives'
import { flatDirection, fx, phase, setOpacity, standard } from './shared'

export interface CarryOptions {
  delay?: number
  duration: number
  forward?: number | ((p: number) => number)
  height?: number
  side?: number
  priority?: RenderEffectPriority
  fadeIn?: number
  fadeOut?: number
  animate?: (p: number, object: THREE.Object3D, now: number) => void
}

// Keeps a worn prop (horns, skull, frill, arm cannon) glued to the caster's moving body, +Z facing the target.
export function carry(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  object: THREE.Object3D,
  options: CarryOptions,
): void {
  const direction = new THREE.Vector3()
  const holder = new THREE.Group()
  holder.add(object)
  const fadeIn = options.fadeIn ?? 0.12
  const fadeOut = options.fadeOut ?? 0.75
  fx(
    ctx,
    options.delay ?? 0,
    options.duration,
    holder,
    (p, now) => {
      flatDirection(source, target, direction)
      const forward =
        typeof options.forward === 'function' ? options.forward(p) : (options.forward ?? 0.35)
      const side = options.side ?? 0
      holder.position
        .copy(source.root.position)
        .add(source.pose.offset)
        .addScaledVector(direction, forward)
      holder.position.x += -direction.z * side
      holder.position.z += direction.x * side
      holder.position.y = (options.height ?? 0.55) + source.pose.lift
      holder.lookAt(
        holder.position.x + direction.x,
        holder.position.y,
        holder.position.z + direction.z,
      )
      options.animate?.(p, object, now)
      setOpacity(holder, Math.min(fadeIn > 0 ? phase(p, 0, fadeIn) : 1, 1 - phase(p, fadeOut, 1)))
    },
    options.priority,
  )
}

export function kanabo(length: number, body: ColorInput, studs: ColorInput): THREE.Group {
  const group = new THREE.Group()
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, length * 0.3, 8).translate(0, length * 0.15, 0),
    standard('#3f2a1d'),
  )
  const club = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.06, length * 0.72, 8).translate(0, length * 0.64, 0),
    standard(body, { metalness: 0.5, roughness: 0.4 }),
  )
  group.add(handle, club)
  for (let index = 0; index < 12; index++) {
    const ring = index % 3
    const angle = (index / 12) * Math.PI * 2 + ring * 0.4
    const y = length * (0.45 + ring * 0.17)
    const radius = 0.08 + ring * 0.022
    const stud = new THREE.Mesh(
      new THREE.ConeGeometry(0.03, 0.08, 5),
      standard(studs, { metalness: 0.8 }),
    )
    stud.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
    stud.lookAt(stud.position.x * 3, y, stud.position.z * 3)
    stud.rotateX(Math.PI / 2)
    group.add(stud)
  }
  return group
}

// Prop models below are built along +Z (forward) unless noted, sized in world units (one tile = 1).

export function bullHorns(color: ColorInput = '#f5f0dc'): THREE.Group {
  const group = new THREE.Group()
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.42, 8).translate(0, 0.21, 0),
      standard(color, { roughness: 0.35 }),
    )
    horn.position.set(side * 0.16, 0.12, 0)
    horn.rotation.set(Math.PI / 2 - 0.5, 0, -side * 0.9)
    group.add(horn)
  }
  return group
}

export function skullDome(color: ColorInput, studs: ColorInput): THREE.Group {
  const group = new THREE.Group()
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    standard(color, { roughness: 0.4 }),
  )
  dome.rotation.x = Math.PI / 2
  group.add(dome)
  for (let index = 0; index < 7; index++) {
    const angle = (index / 7) * Math.PI * 2
    const knob = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 6), standard(studs))
    knob.position.set(Math.cos(angle) * 0.27, Math.sin(angle) * 0.27, 0.04)
    knob.rotation.set(0, 0, angle - Math.PI / 2)
    group.add(knob)
  }
  return group
}

// Triceratops frill facing +Z: a spiked disc with three horns; spin it around Z.
export function frill(color: ColorInput, rim: ColorInput): THREE.Group {
  const group = new THREE.Group()
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 24),
    standard(color, { roughness: 0.5 }),
  )
  disc.material.side = THREE.DoubleSide
  group.add(disc)
  for (let index = 0; index < 12; index++) {
    const angle = (index / 12) * Math.PI * 2
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 5), standard(rim))
    spike.position.set(Math.cos(angle) * 0.47, Math.sin(angle) * 0.47, 0)
    spike.rotation.z = angle - Math.PI / 2
    group.add(spike)
  }
  for (const [x, y, length] of [
    [-0.14, 0.12, 0.34],
    [0.14, 0.12, 0.34],
    [0, -0.1, 0.2],
  ] as const) {
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.045, length, 8).rotateX(Math.PI / 2).translate(0, 0, length / 2),
      standard('#f5f0dc'),
    )
    horn.position.set(x, y, 0.02)
    group.add(horn)
  }
  return group
}

// Spinosaurus sail in the XY plane rising from y = 0.
export function sail(
  color: ColorInput,
  spines: ColorInput,
  width = 1.6,
  height = 1.2,
): THREE.Group {
  const group = new THREE.Group()
  const shape = new THREE.Shape()
  shape.moveTo(-width / 2, 0)
  const peaks = 7
  for (let index = 0; index <= peaks; index++) {
    const t = index / peaks
    const x = -width / 2 + t * width
    const y = Math.sin(Math.PI * (0.1 + t * 0.8)) * height
    shape.lineTo(x, y * (index % 2 === 0 ? 1 : 0.86))
  }
  shape.lineTo(width / 2, 0)
  const membrane = new THREE.Mesh(new THREE.ShapeGeometry(shape), glow(color, 0.55))
  group.add(membrane)
  for (let index = 0; index <= peaks; index += 2) {
    const t = index / peaks
    const spineHeight = Math.sin(Math.PI * (0.1 + t * 0.8)) * height
    const spine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.03, spineHeight, 5).translate(0, spineHeight / 2, 0),
      glow(spines, 0.95),
    )
    spine.position.x = -width / 2 + t * width
    group.add(spine)
  }
  return group
}

// Pteranodon of flames facing +Z; wings are children 1 and 2 so they can flap.
export function pteranodon(body: ColorInput, wing: ColorInput, size = 1): THREE.Group {
  const group = new THREE.Group()
  const torso = new THREE.Mesh(
    new THREE.ConeGeometry(0.16 * size, 0.8 * size, 8).rotateX(-Math.PI / 2),
    glow(body, 0.9),
  )
  group.add(torso)
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0.18 * size)
    shape.lineTo(side * 1.25 * size, -0.05 * size)
    shape.lineTo(side * 0.9 * size, -0.2 * size)
    shape.lineTo(side * 0.35 * size, -0.12 * size)
    shape.lineTo(0, -0.28 * size)
    const wingMesh = new THREE.Mesh(
      new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2),
      glow(wing, 0.75),
    )
    group.add(wingMesh)
  }
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.06 * size, 0.55 * size, 6)
      .rotateX(Math.PI / 2)
      .translate(0, 0.02, 0.62 * size),
    glow('#fde68a'),
  )
  const crest = new THREE.Mesh(
    new THREE.ConeGeometry(0.05 * size, 0.4 * size, 6)
      .rotateX(-Math.PI / 2 - 0.5)
      .translate(0, 0.15 * size, 0.25 * size),
    glow(wing),
  )
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.2 * size, 1.4 * size, 10, 1, true)
      .rotateX(Math.PI / 2)
      .translate(0, 0, -0.9 * size),
    glow(body, 0.4),
  )
  group.add(beak, crest, tail)
  return group
}

// Living sun: core, outer glow and a rotating crown of flare spikes (child 2) in the XY plane.
export function sun(core: ColorInput, flare: ColorInput, radius = 0.35): THREE.Group {
  const group = new THREE.Group()
  group.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), glow(core, 0.95)))
  group.add(new THREE.Mesh(new THREE.SphereGeometry(radius * 1.35, 20, 14), glow(flare, 0.35)))
  const crown = new THREE.Group()
  for (let index = 0; index < 12; index++) {
    const angle = (index / 12) * Math.PI * 2
    const length = radius * (index % 2 === 0 ? 0.9 : 0.6)
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(radius * 0.18, length, 6).translate(0, radius * 1.2 + length / 2, 0),
      glow(flare, 0.8),
    )
    spike.rotation.z = angle
    crown.add(spike)
  }
  group.add(crown)
  return group
}

// Candy cane modelled along +Y with alternating stripes and a hook.
export function candyCane(
  length: number,
  stripe: ColorInput,
  base: ColorInput = '#fff7fb',
): THREE.Group {
  const group = new THREE.Group()
  const pieces = 7
  for (let index = 0; index < pieces; index++) {
    const segment = length / pieces
    const piece = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, segment, 8).translate(0, segment * (index + 0.5), 0),
      standard(index % 2 === 0 ? stripe : base, { roughness: 0.3 }),
    )
    group.add(piece)
  }
  const hook = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.04, 8, 16, Math.PI),
    standard(stripe, { roughness: 0.3 }),
  )
  hook.position.set(-0.13, length, 0)
  group.add(hook)
  return group
}

export function lollipop(color: ColorInput, swirl: ColorInput): THREE.Group {
  const group = new THREE.Group()
  const candy = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.04, 16).rotateX(Math.PI / 2),
    standard(color, { roughness: 0.25 }),
  )
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.075, 0.018, 6, 16),
    standard(swirl, { roughness: 0.25 }),
  )
  ring.position.z = 0.025
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.26, 5).translate(0, -0.26, 0),
    standard('#fafafa'),
  )
  group.add(candy, ring, stick)
  return group
}

export function chessPawn(body: ColorInput, trim: ColorInput): THREE.Group {
  const group = new THREE.Group()
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.16, 0.08, 14).translate(0, 0.04, 0),
    standard(body),
  )
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.11, 0.3, 12).translate(0, 0.23, 0),
    standard(body),
  )
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.035, 12).translate(0, 0.39, 0),
    standard(trim),
  )
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 10).translate(0, 0.48, 0),
    standard(body),
  )
  group.add(base, stem, collar, head)
  return group
}

export function biscuitPlate(color: ColorInput, width = 0.36, height = 0.5): THREE.Group {
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 0.06),
      standard(color, { roughness: 0.95 }),
    ),
  )
  for (let index = 0; index < 4; index++) {
    const dot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.02, 6).rotateX(Math.PI / 2),
      standard('#5c3310'),
    )
    dot.position.set(
      ((index % 2) - 0.5) * width * 0.5,
      (Math.floor(index / 2) - 0.5) * height * 0.5,
      0.035,
    )
    group.add(dot)
  }
  return group
}

// Future-sight eye in the XY plane: sclera, glowing iris, black slit pupil.
export function visionEye(iris: ColorInput): THREE.Group {
  const group = new THREE.Group()
  const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.3, 28), glow('#fdf4ff', 0.9))
  sclera.scale.set(1.5, 0.62, 1)
  const irisMesh = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), glow(iris, 1))
  irisMesh.position.z = 0.01
  const pupil = new THREE.Mesh(
    new THREE.CircleGeometry(0.07, 18),
    new THREE.MeshBasicMaterial({ color: '#0a0a0a', transparent: true }),
  )
  pupil.scale.set(0.45, 1, 1)
  pupil.position.z = 0.02
  group.add(sclera, irisMesh, pupil)
  return group
}

// Bagua octagon of trigram bars lying flat on the ground.
export function baguaSeal(color: ColorInput, radius = 1.6): THREE.Group {
  const group = new THREE.Group()
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.92, radius, 8), glow(color, 0.9))
  const inner = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.3, radius * 0.36, 32),
    glow(color, 0.9),
  )
  group.add(ring, inner)
  for (let side = 0; side < 8; side++) {
    const angle = (side / 8) * Math.PI * 2 + Math.PI / 8
    for (let bar = 0; bar < 3; bar++) {
      const broken = (side >> bar) & 1
      const distance = radius * (0.58 + bar * 0.1)
      const widths = broken ? [-1, 1] : [0]
      for (const offset of widths) {
        const length = broken ? radius * 0.12 : radius * 0.32
        const piece = new THREE.Mesh(
          new THREE.PlaneGeometry(length, radius * 0.05),
          glow(color, 0.9),
        )
        const tangent = offset * radius * 0.1
        piece.position.set(
          Math.cos(angle) * distance - Math.sin(angle) * tangent,
          Math.sin(angle) * distance + Math.cos(angle) * tangent,
          0,
        )
        piece.rotation.z = angle + Math.PI / 2
        group.add(piece)
      }
    }
  }
  group.rotation.x = -Math.PI / 2
  return group
}

// Anime anger mark: four curved ticks around a centre, in the XY plane.
export function angerMark(color: ColorInput): THREE.Group {
  const group = new THREE.Group()
  for (let index = 0; index < 4; index++) {
    const corner = (index * Math.PI) / 2 + Math.PI / 4
    const tick = new THREE.Mesh(
      new THREE.RingGeometry(0.09, 0.13, 10, 1, corner + (Math.PI * 3) / 4, Math.PI / 2),
      glow(color, 1),
    )
    tick.position.set(Math.cos(corner) * 0.2, Math.sin(corner) * 0.2, 0)
    group.add(tick)
  }
  return group
}
