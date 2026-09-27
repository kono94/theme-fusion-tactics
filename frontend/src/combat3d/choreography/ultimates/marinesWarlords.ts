import * as THREE from 'three'
import { easeInOut, type UnitView } from '../../unitView'
import { armoredFist, ironCage, pawMesh } from '../kit/marinesWarlords'
import {
  billboard,
  clamp01,
  enemiesAround,
  enemiesInLine,
  flat,
  flatDirection,
  flinch,
  fx,
  groundCracks,
  coil,
  heartGeometry,
  palmMesh,
  phase,
  setOpacity,
  shell,
  shiver,
  squash,
  standard,
  above,
  offsetPoint,
} from '../kit/shared'
import {
  at,
  aura,
  beam,
  burst,
  cameraPunch,
  cloud,
  crescentMesh,
  crouch,
  dash,
  glow,
  ground,
  later,
  leap,
  pillar,
  projectile,
  prop,
  shake,
  shockwave,
  slashArc,
  spin,
  trail,
  type FxContext,
} from '../primitives'
import type { Choreography, UltimateSet } from '../types'

const UP = new THREE.Vector3(0, 1, 0)
const SKIN = '#f1c27d'

// Pose envelope helper: runs `apply` with a 0→1→0 envelope for the caster.
function posePulse(
  ctx: FxContext,
  delay: number,
  duration: number,
  apply: (envelope: number, p: number) => void,
): void {
  fx(ctx, delay, duration, undefined, (p) => apply(Math.sin(Math.PI * p), p))
}

const kobyDetermination: Choreography = (ctx, { source, primary, secondary }) => {
  crouch(ctx, source, { duration: 260 })
  posePulse(ctx, 240, 620, (envelope) => {
    source.pose.scale *= 1 + 0.16 * envelope
    source.pose.lift += 0.12 * envelope
  })
  shockwave(ctx, ground(source), { color: primary, delay: 220, radius: 1.1, duration: 500 })
  aura(ctx, source, { color: primary, delay: 180, duration: 900, count: 20 })
  const group = new THREE.Group()
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.035, 6, 6).rotateX(Math.PI / 2),
    glow(secondary, 0.9),
  )
  group.add(halo)
  const crosses = [0, 1, 2].map((index) => {
    const cross = new THREE.Group()
    cross.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.02), glow(primary, 0.95)))
    cross.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.02), glow(primary, 0.95)))
    cross.userData.angle = (index / 3) * Math.PI * 2
    group.add(cross)
    return cross
  })
  fx(ctx, 260, 900, group, (p) => {
    group.position.copy(source.root.position)
    halo.position.y = 0.1 + easeInOut(p) * (source.height + 0.3)
    halo.rotation.y = p * 3
    halo.scale.setScalar(1.2 - p * 0.4)
    crosses.forEach((cross, index) => {
      const angle = (cross.userData.angle as number) + p * 2.5
      const local = phase(p, index * 0.12, index * 0.12 + 0.7)
      cross.position.set(Math.cos(angle) * 0.55, 0.3 + local * 1.1, Math.sin(angle) * 0.55)
      billboard(ctx, cross)
      cross.scale.setScalar(Math.sin(Math.PI * local) * 1.4)
    })
    setOpacity(group, 1 - phase(p, 0.7, 1))
  })
  burst(ctx, at(source, 0.9), {
    color: secondary,
    count: 14,
    delay: 420,
    speed: 1.2,
    gravity: -0.4,
    spread: 'up',
  })
  return 260
}

const helmeppoKukriSlash: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 200 })
  if (!ctx.reducedMotion) dash(ctx, source, target, { delay: 180, duration: 460, hold: 0.25 })
  ;[1, -1].forEach((side, index) => {
    const build = () => {
      const kukri = new THREE.Group()
      const blade = crescentMesh(secondary, 0.28)
      blade.rotation.x = -Math.PI / 2
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.16), flat('#3f2a1d', 1))
      handle.position.set(0.3, 0, -0.06)
      kukri.add(blade, handle)
      return kukri
    }
    prop(ctx, source, target, {
      build,
      offset: new THREE.Vector3(0, 0.1 * side, 0),
      delay: 160 + index * 50,
      duration: 170,
      arc: 0.3 * side,
      tumble: 14 * side,
    })
  })
  const impact = 330
  slashArc(ctx, at(target), {
    color: primary,
    delay: impact,
    angle: -0.8,
    radius: 0.6,
    sweep: 1.4,
    duration: 220,
  })
  slashArc(ctx, at(target), {
    color: secondary,
    delay: impact + 40,
    angle: 2.3,
    radius: 0.6,
    sweep: -1.4,
    duration: 220,
  })
  burst(ctx, at(target), { color: primary, count: 14, delay: impact, speed: 1.8 })
  shake(ctx, strength, impact, 200)
  return impact
}

const tashigiJusticeStrike: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 340 })
  const glint = new THREE.Group()
  glint.add(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.04), glow('#ffffff', 1)))
  glint.add(new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.5), glow('#ffffff', 1)))
  const origin = new THREE.Vector3()
  fx(ctx, 200, 200, glint, (p) => {
    glint.position.copy(source.focusPoint(origin, 0.5)).add(new THREE.Vector3(0.25, 0, 0))
    billboard(ctx, glint)
    glint.rotateZ(p * 1.5)
    glint.scale.setScalar(Math.sin(Math.PI * p) * 1.4)
  })
  const cut = 380
  if (!ctx.reducedMotion)
    dash(ctx, source, target, { delay: cut - 60, duration: 620, through: true, hold: 0.45 })
  trail(ctx, source, { color: primary, delay: cut - 60, duration: 360 })
  const line = new THREE.Group()
  const blade = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.035), glow('#ffffff', 1))
  const tint = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.1), glow(primary, 0.7))
  line.add(tint, blade)
  const split = 640
  fx(ctx, cut, 520, line, (p) => {
    line.position.copy(target.focusPoint(origin, 0.55))
    billboard(ctx, line)
    line.rotateZ(-0.18)
    const draw = phase(p, 0, 0.12)
    const open = phase(p, 0.5, 1)
    line.scale.set(draw * (1 + open * 0.3), 1 + open * 3, 1)
    setOpacity(line, 1 - open)
  })
  cameraPunch(ctx, at(target), 0.45, split - 40)
  burst(ctx, at(target), { color: secondary, count: 22, delay: split, speed: 2.2 })
  slashArc(ctx, at(target), {
    color: primary,
    delay: split,
    angle: -0.2,
    radius: 0.9,
    width: 0.08,
    sweep: 0.4,
    duration: 300,
  })
  shake(ctx, strength, split, 220)
  return split
}

const hinaCageCage: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  aura(ctx, source, { color: primary, duration: 600, count: 14 })
  slashArc(ctx, at(target), {
    color: secondary,
    delay: 200,
    angle: 0,
    radius: 0.55,
    sweep: 2.6,
    width: 0.1,
    duration: 260,
  })
  ironCage(ctx, target, {
    color: '#475569',
    glowColor: primary,
    delay: 260,
    duration: 1500,
    bars: 9,
  })
  const clamp = 260 + Math.round(0.2 * 1500)
  shockwave(ctx, ground(target), { color: primary, delay: clamp, radius: 0.9, duration: 360 })
  burst(ctx, at(target, 1), { color: '#e2e8f0', count: 12, delay: clamp, speed: 1.4 })
  squash(ctx, target, { delay: clamp, duration: 900, amount: 0.08 })
  shiver(ctx, target, { delay: clamp, duration: 900, amount: 0.06 })
  shake(ctx, strength, clamp, 180)
  return clamp
}

const smokerWhiteSmoke: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  posePulse(ctx, 0, 700, (envelope) => {
    source.pose.scale *= 1 - 0.3 * envelope
    source.pose.lift += 0.2 * envelope
  })
  cloud(ctx, at(source, 0.3), {
    color: primary,
    radius: 0.5,
    count: 6,
    size: 0.35,
    duration: 800,
    rise: 0.8,
  })
  const smokeRiver = () => {
    const stream = new THREE.Group()
    for (let index = 0; index < 5; index++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.22 + index * 0.04, 10, 8),
        flat(primary, 0.6),
      )
      puff.position.set(Math.sin(index * 1.7) * 0.08, 0, -index * 0.2)
      stream.add(puff)
    }
    return stream
  }
  prop(ctx, source, target, {
    build: smokeRiver,
    from: at(source, 0.8),
    delay: 260,
    duration: 340,
    arc: 0.6,
    spin: 6,
    grow: 0.5,
  })
  const engulf = 600
  cloud(ctx, at(target, 0.3), {
    color: '#e2e8f0',
    radius: 1.7,
    count: 12,
    size: 0.55,
    opacity: 0.6,
    delay: engulf - 40,
    duration: 1400,
    rise: 0.5,
  })
  const victims = [target, ...enemiesAround(ctx, source, target, 2.1).slice(0, 2)]
  victims.forEach((victim, index) => {
    coil(ctx, victim, {
      color: index === 0 ? '#f8fafc' : primary,
      delay: engulf + index * 60,
      duration: 1100,
      thickness: 0.08,
      turns: 3.5,
    })
    squash(ctx, victim, { delay: engulf + 200, duration: 800, amount: 0.12 })
    shiver(ctx, victim, { delay: engulf + 200, duration: 800, amount: 0.04 })
  })
  flinch(ctx, victims.slice(1), engulf + 60, 60)
  burst(ctx, at(target), { color: secondary, count: 16, delay: engulf, speed: 1.2, gravity: -0.3 })
  shake(ctx, strength, engulf, 300)
  return engulf
}

const garpFistOfLove: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 260 })
  if (!ctx.reducedMotion) leap(ctx, source, { delay: 200, duration: 620, height: 0.9, slam: true })
  aura(ctx, source, { color: secondary, duration: 700, count: 24 })
  const fist = armoredFist(0.9, SKIN, { cuff: '#f8fafc', glowColor: secondary })
  const skinMaterials: THREE.MeshStandardMaterial[] = []
  fist.traverse((object) => {
    if (
      object instanceof THREE.Mesh &&
      object.name === '' &&
      object.material instanceof THREE.MeshStandardMaterial
    ) {
      skinMaterials.push(object.material)
    }
  })
  const haki = new THREE.Color('#111827')
  const skin = new THREE.Color(SKIN)
  const charge = new THREE.Vector3()
  const strike = new THREE.Vector3()
  const direction = flatDirection(source, target)
  const chargeOffset = direction
    .clone()
    .multiplyScalar(-0.9)
    .add(new THREE.Vector3(0, 2.1, 0))
  const impact = 660
  fx(ctx, 120, impact - 120 + 160, fist, (_p, now) => {
    const t = (now - ctx.now - 120) / (impact - 120)
    charge.copy(source.root.position).add(chargeOffset)
    target.focusPoint(strike, 0.5)
    if (t < 0.55) {
      const grow = easeInOut(clamp01(t / 0.4))
      fist.position.copy(charge)
      fist.position.y += Math.sin(t * 40) * 0.02
      fist.scale.setScalar(0.3 + grow * 0.9)
      fist.lookAt(strike)
      skinMaterials.forEach((material) => material.color.lerpColors(skin, haki, clamp01(t / 0.5)))
    } else if (t <= 1) {
      const fly = ((t - 0.55) / 0.45) ** 2
      fist.position.lerpVectors(charge, strike, fly)
      fist.scale.setScalar(1.2 + fly * 0.3)
      fist.lookAt(strike)
    } else {
      fist.position.copy(strike)
      setOpacity(fist, 1 - clamp01((t - 1) * 4))
    }
  })
  cameraPunch(ctx, at(target), 0.85, impact - 80)
  shockwave(ctx, ground(target), {
    color: '#f8fafc',
    delay: impact,
    radius: 2.6,
    thickness: 0.3,
    duration: 700,
  })
  shockwave(ctx, ground(target), {
    color: secondary,
    delay: impact + 80,
    radius: 1.6,
    duration: 600,
  })
  groundCracks(ctx, ground(target), {
    color: '#1f2937',
    delay: impact,
    length: 1.7,
    count: 10,
    width: 0.06,
    duration: 1300,
  })
  burst(ctx, at(target), { color: primary, count: 40, delay: impact, speed: 3 })
  burst(ctx, ground(target), {
    color: '#78716c',
    count: 18,
    delay: impact,
    speed: 2.2,
    gravity: 3,
    spread: 'up',
  })
  const splash = enemiesAround(ctx, source, target, 1.5)
  flinch(ctx, splash, impact + 40)
  const center = new THREE.Vector3()
  for (let index = 0; index < 3; index++) {
    const offset = new THREE.Vector3((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 1.6)
    const delay = impact + 180 + index * 90
    const point = () => center.copy(target.root.position).add(offset)
    const ball = () =>
      new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 14, 10),
        standard('#111827', { roughness: 0.4, metalness: 0.6 }),
      )
    prop(ctx, source, target, {
      build: ball,
      from: () =>
        point()
          .clone()
          .add(new THREE.Vector3(-1.5, 4, -1)),
      to: point,
      delay,
      duration: 300,
      arc: 0,
    })
    burst(ctx, point, { color: secondary, count: 8, delay: delay + 300, speed: 1.3 })
  }
  shake(ctx, strength, impact, 450)
  return impact
}

const sengokuBuddhaPalm: Choreography = (ctx, { source, primary, secondary, shake: strength }) => {
  aura(ctx, source, { color: primary, duration: 1100, count: 28, radius: 0.5 })
  posePulse(ctx, 0, 1100, (envelope) => {
    source.pose.scale *= 1 + 0.35 * envelope
    source.pose.lift += 0.15 * envelope
  })
  const direction = new THREE.Vector3()
  const enemies = ctx.enemiesOf(source)
  if (enemies.length > 0) {
    const nearest = enemies.reduce((best, view) =>
      view.root.position.distanceTo(source.root.position) <
      best.root.position.distanceTo(source.root.position)
        ? view
        : best,
    )
    direction.copy(flatDirection(source, nearest))
  } else {
    direction.set(0, 0, 1)
  }
  const buddha = new THREE.Group()
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), glow(primary, 0.22))
  body.scale.set(1.1, 1.3, 0.7)
  body.position.y = 1.3
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 14), glow(primary, 0.3))
  head.position.y = 2.75
  const topknot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), glow(secondary, 0.4))
  topknot.position.y = 3.2
  const halo = new THREE.Group()
  halo.add(new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 8, 48), glow(secondary, 0.8)))
  halo.add(new THREE.Mesh(new THREE.RingGeometry(0.6, 0.85, 48), glow(primary, 0.25)))
  buddha.add(body, head, topknot, halo)
  const palm = palmMesh(0.6, () => glow(secondary, 0.55))
  const behind = direction.clone().multiplyScalar(-0.5)
  const palmStart = new THREE.Vector3()
  const slam = 560
  fx(ctx, 60, 1500, buddha, (p) => {
    buddha.position.copy(source.root.position).add(behind)
    const rise = easeInOut(phase(p, 0, 0.25))
    buddha.scale.setScalar(0.2 + rise * 0.8)
    halo.position.set(0, 2.75, 0)
    halo.quaternion.copy(ctx.camera.quaternion)
    halo.rotateZ(p * 2)
    setOpacity(buddha, rise * (1 - phase(p, 0.75, 1)))
  })
  fx(ctx, 200, 900, palm, (_p, now) => {
    const t = (now - ctx.now - 200) / (slam - 200)
    palmStart.copy(source.root.position).addScaledVector(direction, 0.9)
    const descend = easeInOut(clamp01(t)) ** 2
    palm.position.copy(palmStart).setY(3 - descend * 2.8)
    palm.rotation.set(
      Math.PI / 2 - (1 - descend) * 0.8,
      Math.atan2(direction.x, direction.z),
      0,
      'YXZ',
    )
    palm.scale.setScalar(t < 1 ? 1 : 1 + (t - 1) * 0.6)
    setOpacity(palm, t < 1 ? 1 : 1 - clamp01((t - 1) * 1.5))
  })
  cameraPunch(ctx, ground(source), 0.5, slam - 60)
  shockwave(ctx, ground(source), {
    color: primary,
    delay: slam,
    radius: 4.2,
    thickness: 0.35,
    duration: 800,
  })
  shockwave(ctx, ground(source), {
    color: secondary,
    delay: slam + 100,
    radius: 2.8,
    duration: 700,
  })
  burst(ctx, ground(source), {
    color: primary,
    count: 30,
    delay: slam,
    speed: 2.8,
    spread: 'ring',
    gravity: 0,
  })
  const allies = [
    source,
    ...ctx.alliesOf(source).filter((view) => view !== source && !view.isDying),
  ]
  const blessing = new THREE.Group()
  const marks = allies.map(() => {
    const mark = new THREE.Group()
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.46, 32).rotateX(-Math.PI / 2),
      glow(primary, 0.9),
    )
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 4), glow(secondary, 0.95))
    mark.add(ring, arrow)
    blessing.add(mark)
    return mark
  })
  fx(ctx, slam + 60, 900, blessing, (p) => {
    marks.forEach((mark, index) => {
      const ally = allies[index]
      const local = phase(p, index * 0.03, index * 0.03 + 0.8)
      mark.position.copy(ally.root.position)
      const ring = mark.children[0]
      const arrow = mark.children[1]
      ring.position.y = 0.09
      ring.scale.setScalar(0.6 + local * 0.8)
      arrow.position.set(0.32, 0.4 + local * 1.2, 0)
      arrow.rotation.y = p * 8
    })
    setOpacity(blessing, 1 - phase(p, 0.6, 1))
  })
  shake(ctx, strength, slam, 360)
  return slam
}

const kizaruYataNoKagami: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  aura(ctx, source, { color: primary, duration: 700, count: 20 })
  const mirror = new THREE.Group()
  mirror.add(new THREE.Mesh(new THREE.CircleGeometry(0.34, 40), glow(secondary, 0.75)))
  mirror.add(new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 8), glow(primary, 1)))
  const rays = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.8, 12, 1), glow(primary, 0.35))
  mirror.add(rays)
  const origin = new THREE.Vector3()
  const toward = flatDirection(source, target)
  fx(ctx, 0, 380, mirror, (p) => {
    mirror.position.copy(source.focusPoint(origin, 0.6)).addScaledVector(toward, 0.35)
    billboard(ctx, mirror)
    mirror.rotateZ(p * 3)
    mirror.scale.setScalar(0.3 + easeInOut(p) * 0.9)
    rays.scale.setScalar(1 + Math.sin(p * 30) * 0.08)
  })
  const vanish = 340
  const back = 820
  beam(ctx, source, target, {
    color: primary,
    core: '#ffffff',
    delay: vanish,
    duration: 160,
    width: 0.06,
  })
  const teleport = new THREE.Vector3()
  fx(ctx, vanish, back - vanish, undefined, (p) => {
    if (!ctx.reducedMotion) {
      teleport.subVectors(target.root.position, source.root.position).setY(0)
      teleport.multiplyScalar(Math.max(0, 1 - 0.75 / Math.max(0.01, teleport.length())))
      source.pose.offset.add(teleport)
      source.pose.lift += 0.35
      source.pose.tilt += -0.4 * Math.sin(Math.PI * Math.min(1, p * 3))
    }
    source.pose.scale *= p < 0.06 || p > 0.94 ? 0.3 : 1
  })
  const kick = vanish + 40
  cameraPunch(ctx, at(target), 0.55, kick - 30)
  burst(ctx, at(target), { color: '#ffffff', count: 18, delay: kick, speed: 2.4 })
  burst(ctx, at(target), { color: primary, count: 26, delay: kick + 20, speed: 3, gravity: 0 })
  shockwave(ctx, ground(target), { color: primary, delay: kick, radius: 1.3, duration: 400 })
  const lance = new THREE.Group()
  lance.add(
    new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1, 12, 1, true), glow(primary, 0.85)),
  )
  lance.add(
    new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8, 1, true), glow('#ffffff', 1)),
  )
  const lanceStart = new THREE.Vector3()
  const lanceDirection = new THREE.Vector3()
  const length = 7
  fx(ctx, kick + 60, 380, lance, (p) => {
    target.focusPoint(lanceStart, 0.5)
    lanceDirection.copy(flatDirection(source, target))
    const reach = Math.min(1, p * 4) * length
    lance.position.copy(lanceStart).addScaledVector(lanceDirection, reach / 2)
    lance.quaternion.setFromUnitVectors(UP, lanceDirection)
    const thickness = Math.sin(Math.PI * Math.min(1, p * 1.3)) * 1.6 + 0.2
    lance.scale.set(thickness, reach, thickness)
    setOpacity(lance, 1 - phase(p, 0.6, 1))
  })
  const pierced = enemiesInLine(ctx, source, target, { overshoot: 6, width: 0.6, limit: 4 })
  pierced.forEach((victim, index) => {
    const delay = kick + 80 + index * 40
    burst(ctx, at(victim), { color: primary, count: 10, delay, speed: 1.8 })
  })
  flinch(ctx, pierced, kick + 80, 40)
  beam(ctx, target, source, {
    color: primary,
    core: '#ffffff',
    delay: back - 60,
    duration: 140,
    width: 0.05,
  })
  shake(ctx, strength, kick, 380)
  return kick
}

const akainuMeteorVolcano: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 240 })
  aura(ctx, source, { color: secondary, duration: 900, count: 26 })
  pillar(ctx, ground(source), { color: primary, duration: 500, height: 2.2, radius: 0.3 })
  const magma = () =>
    armoredFist(0.45, '#7f1d1d', {
      emissive: '#f97316',
      emissiveIntensity: 1.1,
      glowColor: secondary,
    })
  for (let index = 0; index < 3; index++) {
    prop(ctx, source, target, {
      build: magma,
      from: at(source, 0.8),
      to: above(source, 6),
      offset: new THREE.Vector3((index - 1) * 0.3, 0, 0),
      delay: 180 + index * 90,
      duration: 300,
      arc: 0,
    })
  }
  const drops = 6
  const first = 560
  const center = new THREE.Vector3()
  const impacts: THREE.Vector3[] = []
  for (let index = 0; index < drops; index++) {
    const offset =
      index === 0
        ? new THREE.Vector3()
        : new THREE.Vector3(
            Math.cos(index * 1.3) * (0.7 + Math.random()),
            0,
            Math.sin(index * 1.3) * (0.7 + Math.random()),
          )
    impacts.push(offset)
    const delay = first - 320 + index * 90
    const point = () => center.copy(target.root.position).add(offset).setY(0.15)
    const sky = offset.clone().add(new THREE.Vector3(-1.2, 6.5, -1))
    prop(ctx, source, target, {
      build: magma,
      from: offsetPoint(target.root.position, sky),
      to: point,
      delay,
      duration: 320,
      arc: 0,
    })
    burst(ctx, point, {
      color: index % 2 ? secondary : '#fde047',
      count: 14,
      delay: delay + 320,
      speed: 2,
      gravity: 2.2,
      spread: 'up',
    })
  }
  const pools = new THREE.Group()
  impacts.forEach(() => {
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 24).rotateX(-Math.PI / 2),
      glow(secondary, 0.75),
    )
    pools.add(pool)
  })
  fx(ctx, first, 1200, pools, (p) => {
    pools.children.forEach((pool, index) => {
      const local = phase(p, index * 0.075, index * 0.075 + 0.2)
      pool.position.copy(target.root.position).add(impacts[index]).setY(0.085)
      pool.scale.setScalar(easeInOut(local) * (1 + Math.sin(p * 20 + index) * 0.05))
    })
    setOpacity(pools, 1 - phase(p, 0.6, 1))
  })
  shockwave(ctx, ground(target), {
    color: primary,
    delay: first,
    radius: 2.4,
    thickness: 0.3,
    duration: 650,
  })
  cameraPunch(ctx, at(target), 0.6, first - 60)
  const finale = first + (drops - 1) * 90
  pillar(ctx, ground(target), {
    color: secondary,
    delay: finale,
    duration: 650,
    height: 3.2,
    radius: 0.55,
  })
  flinch(ctx, enemiesAround(ctx, source, target, 2.4), first + 90, 60)
  shake(ctx, strength, first, 900)
  return first
}

const buggyChopChopFestival: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  if (!ctx.reducedMotion) spin(ctx, source, { duration: 1000, turns: 2 })
  posePulse(ctx, 0, 1100, (envelope) => {
    source.pose.scale *= 1 - 0.35 * Math.min(1, envelope * 1.6)
    source.pose.lift += 0.3 * envelope
  })
  const festival = new THREE.Group()
  const part = (mesh: THREE.Mesh, orbit: number, phase: number, height: number) => {
    mesh.userData = { orbit, phase, height }
    festival.add(mesh)
  }
  for (let index = 0; index < 2; index++) {
    const glove = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 12, 10),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', transparent: true }),
    )
    const knife = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.34, 4).translate(0, 0.24, 0),
      standard('#cbd5e1', { metalness: 0.8, roughness: 0.25 }),
    )
    glove.add(knife)
    part(glove, 1, index * Math.PI, 0.7)
    const boot = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.12, 0.26),
      new THREE.MeshStandardMaterial({ color: '#1d4ed8', transparent: true }),
    )
    part(boot, 0.8, index * Math.PI + Math.PI / 2, 0.25)
  }
  for (let index = 0; index < 4; index++) {
    const knife = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.3, 4).rotateZ(Math.PI / 2),
      standard('#cbd5e1', { metalness: 0.8, roughness: 0.25 }),
    )
    part(knife, 1.25, (index / 4) * Math.PI * 2 + 0.4, 0.5 + (index % 2) * 0.35)
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), glow(primary, 1))
  part(nose, 0.5, 0.8, 1.1)
  fx(ctx, 80, 1100, festival, (p, now) => {
    festival.position.copy(source.root.position)
    const out = p < 0.2 ? easeInOut(p / 0.2) : p > 0.8 ? 1 - easeInOut((p - 0.8) / 0.2) : 1
    festival.children.forEach((child) => {
      const { orbit, phase, height } = child.userData as {
        orbit: number
        phase: number
        height: number
      }
      const angle = phase + p * Math.PI * 5 * (orbit > 1 ? -1 : 1)
      child.position.set(
        Math.cos(angle) * orbit * out,
        height + Math.sin(now * 0.02 + phase) * 0.12,
        Math.sin(angle) * orbit * out,
      )
      child.rotation.set(now * 0.01 + phase, angle, now * 0.013)
    })
  })
  const hit = 420
  burst(ctx, at(source), { color: primary, count: 16, delay: 200, speed: 2, gravity: 1.8 })
  burst(ctx, at(source), { color: secondary, count: 16, delay: 240, speed: 2, gravity: 1.8 })
  slashArc(ctx, at(target), { color: '#e2e8f0', delay: hit, angle: 0.5, radius: 0.5, sweep: 2.2 })
  burst(ctx, at(target), { color: primary, count: 12, delay: hit, speed: 1.6 })
  const nearby = enemiesAround(ctx, source, source, 1.6).filter((view) => view !== target)
  nearby.slice(0, 3).forEach((victim, index) => {
    slashArc(ctx, at(victim), {
      color: '#e2e8f0',
      delay: hit + 80 + index * 70,
      angle: -0.6,
      radius: 0.45,
      sweep: 2,
    })
  })
  flinch(ctx, nearby, hit + 80, 70)
  shake(ctx, strength, hit, 220)
  return hit
}

const moriaShadowSteal: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  aura(ctx, source, { color: primary, duration: 900, count: 20 })
  const scissors = new THREE.Group()
  const blades = [1, -1].map((side) => {
    const blade = new THREE.Group()
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.9, 0.02).translate(0, 0.45, 0),
      standard('#cbd5e1', { metalness: 0.8, roughness: 0.25 }),
    )
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 16), glow(primary, 0.9))
    ring.position.y = -0.12
    blade.add(edge, ring)
    blade.userData.side = side
    scissors.add(blade)
    return blade
  })
  const snip = 520
  const origin = new THREE.Vector3()
  fx(ctx, 120, 560, scissors, (p, now) => {
    scissors.position.copy(target.focusPoint(origin, 0.25))
    billboard(ctx, scissors)
    const t = (now - ctx.now - 120) / (snip - 120)
    const open = t < 0.7 ? 0.55 : t < 1 ? 0.55 * (1 - (t - 0.7) / 0.3) : 0
    blades.forEach((blade) => {
      blade.rotation.z = (blade.userData.side as number) * open
    })
    scissors.scale.setScalar(easeInOut(phase(p, 0, 0.25)) * 1.2)
    setOpacity(scissors, 1 - phase(p, 0.8, 1))
  })
  const shadow = new THREE.Group()
  const shadowBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, 0.5, 4, 12),
    flat('#0b0620', 0.88),
  )
  shadowBody.position.y = 0.45
  const shadowHead = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), flat('#0b0620', 0.88))
  shadowHead.position.y = 0.95
  const shadowEyes = new THREE.Mesh(new THREE.CircleGeometry(0.035, 8), glow(secondary, 1))
  shadowEyes.position.set(0.06, 0.97, 0.01)
  shadow.add(shadowBody, shadowHead, shadowEyes)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const absorb = 1080
  fx(ctx, 200, absorb - 200, shadow, (_p, now) => {
    const t = now - ctx.now
    from.copy(target.root.position).setY(0.09)
    to.copy(source.root.position).setY(0.5)
    if (t < snip) {
      const lie = phase(t, 200, 400)
      shadow.position.copy(from)
      shadow.rotation.set(-Math.PI / 2, 0, Math.atan2(-(to.x - from.x), -(to.z - from.z)))
      shadow.scale.set(0.9, 0.3 + lie * 0.9, 1)
    } else {
      const fly = easeInOut(clamp01((t - snip) / (absorb - snip)))
      shadow.position.lerpVectors(from, to, fly)
      shadow.position.y += Math.sin(Math.PI * fly) * 0.9
      billboard(ctx, shadow)
      shadow.rotateZ(Math.sin(t * 0.03) * 0.25)
      shadow.scale.setScalar(1.2 - fly * 0.7)
    }
  })
  slashArc(ctx, at(target, 0.2), {
    color: secondary,
    delay: snip,
    angle: 0,
    radius: 0.5,
    sweep: 0.3,
    width: 0.06,
    duration: 220,
  })
  const plate = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.46, 6), glow('#94a3b8', 0.9))
  fx(ctx, snip, 420, plate, (p) => {
    plate.position.copy(target.focusPoint(origin, 0.6))
    billboard(ctx, plate)
    plate.scale.setScalar(1 + p * 0.4)
    plate.rotateZ(p * 0.4)
    ;(plate.material as THREE.MeshBasicMaterial).opacity = p < 0.35 ? 0.9 : 0
  })
  burst(ctx, at(target, 0.6), {
    color: '#94a3b8',
    count: 14,
    delay: snip + 150,
    speed: 1.4,
    gravity: 2.4,
  })
  burst(ctx, at(target, 0.9), {
    color: primary,
    count: 14,
    delay: snip + 60,
    speed: 0.8,
    gravity: 1.6,
  })
  squash(ctx, target, { delay: snip, duration: 700, amount: 0.14 })
  shiver(ctx, target, { delay: snip, duration: 700, amount: 0.05 })
  burst(ctx, at(source), { color: primary, count: 18, delay: absorb, speed: 1.6 })
  posePulse(ctx, absorb - 60, 360, (envelope) => {
    source.pose.scale *= 1 + 0.2 * envelope
  })
  shake(ctx, strength, snip, 200)
  return snip
}

const crocodileGroundSecco: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 380 })
  aura(ctx, source, { color: primary, duration: 700, count: 18 })
  shockwave(ctx, ground(source), { color: primary, delay: 200, radius: 0.9, duration: 400 })
  const ripple = () =>
    new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.35, 24).rotateX(-Math.PI / 2),
      glow(secondary, 0.8),
    )
  prop(ctx, source, target, {
    build: ripple,
    from: ground(source),
    to: ground(target),
    delay: 220,
    duration: 260,
    arc: 0,
    grow: 1.5,
  })
  const dry = 480
  groundCracks(ctx, ground(target), {
    color: '#92400e',
    delay: dry,
    length: 2.1,
    count: 12,
    duration: 1300,
  })
  const patch = new THREE.Mesh(
    new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2),
    flat('#b45309', 0.35),
  )
  fx(ctx, dry, 1300, patch, (p) => {
    patch.position.copy(target.root.position).setY(0.08)
    patch.scale.setScalar(0.2 + easeInOut(phase(p, 0, 0.3)) * 2)
    ;(patch.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - phase(p, 0.7, 1))
  })
  const count = Math.max(24, Math.round(60 * ctx.particleScale))
  const positions = new Float32Array(count * 3)
  const seeds = Array.from({ length: count }, () => ({
    phase: Math.random() * Math.PI * 2,
    height: Math.random(),
    speed: 0.8 + Math.random() * 0.6,
  }))
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: secondary,
    size: 0.12,
    transparent: true,
    depthWrite: false,
  })
  const vortex = new THREE.Points(geometry, material)
  vortex.frustumCulled = false
  fx(ctx, dry, 1000, vortex, (p) => {
    const center = target.root.position
    seeds.forEach((seed, index) => {
      const h = (seed.height + p * seed.speed) % 1
      const radius = 0.25 + h * 1.1
      const angle = seed.phase + p * 12 * seed.speed
      positions[index * 3] = center.x + Math.cos(angle) * radius
      positions[index * 3 + 1] = h * 2.2
      positions[index * 3 + 2] = center.z + Math.sin(angle) * radius
    })
    geometry.attributes.position.needsUpdate = true
    material.opacity = Math.sin(Math.PI * p)
  })
  const victims = [target, ...enemiesAround(ctx, source, target, 2.1).slice(0, 3)]
  victims.forEach((victim, index) => {
    squash(ctx, victim, { delay: dry + index * 50, duration: 900, amount: 0.2 })
    shiver(ctx, victim, { delay: dry + index * 50, duration: 900, amount: 0.03 })
  })
  flinch(ctx, victims.slice(1), dry + 60, 50)
  burst(ctx, at(target), { color: primary, count: 18, delay: dry, speed: 1.6, gravity: 0.6 })
  for (let index = 0; index < 3; index++) {
    projectile(ctx, target, source, {
      color: primary,
      core: secondary,
      delay: dry + 350 + index * 80,
      duration: 380,
      size: 0.06,
      arc: 0.8 + index * 0.3,
    })
  }
  shake(ctx, strength, dry, 400)
  return dry
}

const kumaUrsusShock: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  posePulse(ctx, 0, 520, (envelope) => {
    source.pose.lift += 0.25 * envelope
    source.pose.tilt += 0.2 * envelope
  })
  const bubble = new THREE.Group()
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 18), glow(secondary, 0.22))
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), glow('#ffffff', 0.6))
  const print = pawMesh(1.1, primary, 0.55)
  bubble.add(shell, core, print)
  const charge = new THREE.Vector3()
  const landing = new THREE.Vector3()
  const compress = 460
  const launch = 520
  const land = 860
  const detonate = 1080
  fx(ctx, 0, detonate, bubble, (_p, now) => {
    const t = now - ctx.now
    charge.copy(source.root.position).setY(1.7)
    landing.copy(target.root.position).setY(0.55)
    print.quaternion.copy(ctx.camera.quaternion)
    if (t < compress) {
      const form = easeInOut(phase(t, 0, 200))
      const squeeze = phase(t, 220, compress)
      bubble.position.copy(charge)
      bubble.scale.setScalar(form * (1 - squeeze * squeeze * 0.72))
      ;(core.material as THREE.MeshBasicMaterial).opacity = 0.4 + squeeze * 0.6
    } else if (t < launch) {
      bubble.position.copy(charge)
      bubble.scale.setScalar(0.28 + Math.sin(t * 0.08) * 0.02)
    } else if (t < land) {
      const fly = easeInOut((t - launch) / (land - launch))
      bubble.position.lerpVectors(charge, landing, fly)
      bubble.position.y += Math.sin(Math.PI * fly) * 0.7
      bubble.scale.setScalar(0.28)
    } else {
      const tension = (t - land) / (detonate - land)
      bubble.position.copy(landing)
      bubble.scale.setScalar(
        0.28 + tension * 0.12 + Math.sin(t * (0.05 + tension * 0.15)) * 0.03 * (1 + tension * 2),
      )
    }
  })
  cameraPunch(ctx, at(target), 0.8, detonate - 80)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), glow(secondary, 0.55))
  fx(ctx, detonate, 620, dome, (p) => {
    dome.position.copy(target.root.position).setY(0.3)
    dome.scale.setScalar(0.3 + easeInOut(p) * 2.3)
    ;(dome.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - p)
  })
  const stamp = pawMesh(2.2, primary, 0.7)
  fx(ctx, detonate, 900, stamp, (p) => {
    stamp.position.copy(target.root.position).setY(0.1)
    stamp.rotation.set(-Math.PI / 2, 0, 0)
    stamp.scale.setScalar(0.6 + easeInOut(phase(p, 0, 0.25)) * 0.5)
    setOpacity(stamp, 1 - phase(p, 0.4, 1))
  })
  shockwave(ctx, ground(target), {
    color: '#ffffff',
    delay: detonate,
    radius: 3,
    thickness: 0.3,
    duration: 650,
  })
  burst(ctx, at(target), { color: secondary, count: 34, delay: detonate, speed: 3.2, gravity: 0.3 })
  flinch(ctx, enemiesAround(ctx, source, target, 2.1), detonate + 40, 30)
  shake(ctx, strength + 2, detonate, 450)
  return detonate
}

const doflamingoOverheat: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  posePulse(ctx, 0, 520, (envelope) => {
    source.pose.lift += 0.35 * envelope
  })
  const strings = new THREE.Group()
  const stringLines = [0, 1, 2, 3, 4].map((index) => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: index === 2 ? '#ffffff' : secondary,
        transparent: true,
        depthWrite: false,
      }),
    )
    line.frustumCulled = false
    strings.add(line)
    return line
  })
  const hand = new THREE.Vector3()
  const knot = new THREE.Vector3()
  const direction = flatDirection(source, target)
  fx(ctx, 0, 380, strings, (p) => {
    source.focusPoint(hand, 0.9)
    hand.y += source.pose.lift
    knot.copy(hand).addScaledVector(direction, 0.6)
    knot.y += 0.25
    stringLines.forEach((line, index) => {
      const spread = (index - 2) * 0.45 * (1 - easeInOut(p))
      const array = line.geometry.attributes.position.array as Float32Array
      array.set([
        hand.x + spread * direction.z,
        hand.y + Math.abs(spread) * 0.5 + 0.5,
        hand.z - spread * direction.x,
        knot.x,
        knot.y,
        knot.z,
      ])
      line.geometry.attributes.position.needsUpdate = true
    })
  })
  const length = 5.5
  const lash = 380
  const lashDuration = 220
  const curve = new THREE.CatmullRomCurve3(
    Array.from({ length: 12 }, (_, index) => {
      const t = index / 11
      return new THREE.Vector3(Math.sin(t * Math.PI * 3) * 0.28 * (1 - t * 0.5), 0, t * length)
    }),
  )
  const tubular = 120
  const radial = 8
  const whipGroup = new THREE.Group()
  const hot = new THREE.Mesh(
    new THREE.TubeGeometry(curve, tubular, 0.09, radial),
    glow('#fb923c', 0.9),
  )
  const core = new THREE.Mesh(
    new THREE.TubeGeometry(curve, tubular, 0.035, radial),
    glow('#fff7ed', 1),
  )
  const aurora = new THREE.Mesh(
    new THREE.TubeGeometry(curve, tubular, 0.2, radial),
    glow(primary, 0.35),
  )
  whipGroup.add(aurora, hot, core)
  const start = new THREE.Vector3()
  fx(ctx, lash, 760, whipGroup, (p, now) => {
    source.focusPoint(start, 0.8)
    whipGroup.position.copy(start).addScaledVector(direction, 0.3)
    whipGroup.rotation.set(0, Math.atan2(direction.x, direction.z), 0)
    whipGroup.rotateZ(Math.sin(now * 0.02) * 0.15 * (1 - p))
    const draw = easeInOut(clamp01((p * 760) / lashDuration))
    whipGroup.children.forEach((mesh) =>
      (mesh as THREE.Mesh).geometry.setDrawRange(0, Math.floor(draw * tubular) * radial * 6),
    )
    whipGroup.position.y -= phase(p, 0.3, 0.6) * 0.35
    setOpacity(whipGroup, (1 - phase(p, 0.55, 1)) * (0.85 + Math.sin(now * 0.05) * 0.15))
  })
  const distance = source.root.position.distanceTo(target.root.position)
  const impact = lash + Math.round(lashDuration * Math.min(1, distance / length))
  const scorch = new THREE.Mesh(
    new THREE.PlaneGeometry(0.35, length).rotateX(-Math.PI / 2).translate(0, 0, length / 2),
    glow('#ea580c', 0.5),
  )
  fx(ctx, lash + 60, 900, scorch, (p) => {
    scorch.position.copy(source.root.position).setY(0.085)
    scorch.rotation.y = Math.atan2(direction.x, direction.z)
    scorch.scale.set(1, easeInOut(phase(p, 0, 0.2)), 1)
    ;(scorch.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - p)
  })
  cameraPunch(ctx, at(target), 0.5, impact - 40)
  burst(ctx, at(target), { color: '#fb923c', count: 24, delay: impact, speed: 2.2, gravity: -0.5 })
  burst(ctx, at(target), { color: primary, count: 12, delay: impact + 40, speed: 1.4 })
  slashArc(ctx, at(target), {
    color: '#fdba74',
    delay: impact,
    angle: -0.3,
    radius: 0.7,
    sweep: 0.8,
    width: 0.07,
  })
  const lined = enemiesInLine(ctx, source, target, { overshoot: 3, width: 0.6, limit: 4 })
  lined.forEach((victim) => {
    const delay =
      lash +
      Math.round(
        lashDuration * Math.min(1, source.root.position.distanceTo(victim.root.position) / length),
      )
    burst(ctx, at(victim), { color: '#fb923c', count: 12, delay, speed: 1.8, gravity: -0.5 })
    later(ctx, delay, () => victim.onHit(ctx.now + delay))
  })
  shake(ctx, strength, impact, 300)
  return impact
}

// Yoru's flying slash: an opaque near-black crescent (normal blending) with a glowing rim.
function blackBlade(
  radius: number,
  width: number,
  color: string,
  edge: string,
  arc: number,
): THREE.Group {
  const startAngle = Math.PI * 1.5 - arc / 2
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(
      new THREE.RingGeometry(radius - width, radius, 40, 1, startAngle, arc),
      flat(color, 0.92),
    ),
  )
  group.add(
    new THREE.Mesh(
      new THREE.RingGeometry(radius - width * 0.28, radius + width * 0.12, 40, 1, startAngle, arc),
      glow(edge, 0.95),
    ),
  )
  return group
}

const mihawkWorldsStrongestSlash: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 360 })
  const direction = flatDirection(source, target)
  const yoru = new THREE.Group()
  const bladeMaterial = new THREE.MeshStandardMaterial({
    color: '#0b0f0c',
    metalness: 0.9,
    roughness: 0.2,
    transparent: true,
  })
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 1.9, 0.03).translate(0, 1.1, 0),
    bladeMaterial,
  )
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 1.9, 0.035).translate(0.05, 1.1, 0),
    glow(primary, 0.9),
  )
  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.08, 0.06).translate(0, 0.14, 0),
    standard('#cbd5e1', { metalness: 0.8, roughness: 0.25 }),
  )
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8).translate(0, -0.08, 0),
    flat('#7f1d1d', 1),
  )
  yoru.add(blade, edge, guard, grip)
  const release = 440
  const pivot = new THREE.Vector3()
  fx(ctx, 60, 560, yoru, (_p, now) => {
    const t = now - ctx.now
    pivot.copy(source.root.position).addScaledVector(direction, 0.2).setY(0.9)
    yoru.position.copy(pivot)
    const raise = easeInOut(phase(t, 60, 280))
    const swing = easeInOut(phase(t, 300, release))
    yoru.rotation.set(0, Math.atan2(direction.x, direction.z), 0)
    yoru.rotateX(-0.2 - raise * 0.6 + swing * 2.4)
    yoru.scale.setScalar(0.4 + raise * 0.6)
    setOpacity(yoru, 1 - phase(t, release + 60, release + 60 + 160))
  })
  const range = 7.5
  const travel = 520
  const wave = blackBlade(1.5, 0.42, '#021a0b', primary, Math.PI * 0.9)
  wave.add(blackBlade(1.25, 0.12, '#0a0a0a', secondary, Math.PI * 0.7))
  const start = new THREE.Vector3()
  fx(ctx, release, travel + 120, wave, (p) => {
    const t = Math.min(1, (p * (travel + 120)) / travel)
    start.copy(source.root.position).setY(1.05)
    wave.position.copy(start).addScaledVector(direction, 0.3 + t * range)
    wave.rotation.set(0, Math.atan2(direction.x, direction.z), 0)
    wave.rotateZ(Math.PI + 0.35)
    wave.scale.set(0.7 + t * 0.5, 0.7 + t * 0.5, 1)
    setOpacity(wave, 1 - phase(t, 0.8, 1))
  })
  const scar = new THREE.Group()
  scar.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, range).rotateX(-Math.PI / 2).translate(0, 0, range / 2),
      flat('#020617', 0.7),
    ),
  )
  scar.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, range).rotateX(-Math.PI / 2).translate(0, 0.002, range / 2),
      glow(primary, 0.9),
    ),
  )
  fx(ctx, release, 1100, scar, (p) => {
    scar.position.copy(source.root.position).setY(0.085)
    scar.rotation.y = Math.atan2(direction.x, direction.z)
    scar.scale.set(1, Math.max(0.01, clamp01((p * 1100) / travel)), 1)
    setOpacity(scar, 1 - phase(p, 0.6, 1))
  })
  const arrival = (view: UnitView) =>
    release +
    Math.round(
      (travel * Math.max(0, source.root.position.distanceTo(view.root.position) - 0.3)) / range,
    )
  const impact = arrival(target)
  cameraPunch(ctx, at(target), 0.65, impact - 60)
  slashArc(ctx, at(target), {
    color: primary,
    delay: impact,
    radius: 1.3,
    width: 0.22,
    angle: -0.8,
    sweep: 0.6,
    duration: 420,
  })
  burst(ctx, at(target), { color: primary, count: 30, delay: impact, speed: 2.6 })
  const lined = enemiesInLine(ctx, source, target, { overshoot: 6, width: 0.7, limit: 4 })
  lined.forEach((victim) => {
    const delay = arrival(victim)
    burst(ctx, at(victim), { color: secondary, count: 12, delay, speed: 2 })
    later(ctx, delay, () => victim.onHit(ctx.now + delay))
  })
  shake(ctx, strength, impact, 360)
  return impact
}

const hancockSlaveArrow: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  posePulse(ctx, 0, 600, (envelope) => {
    source.pose.tilt += 0.18 * envelope
    source.pose.scale *= 1 + 0.08 * envelope
  })
  const heart = new THREE.Group()
  heart.add(new THREE.Mesh(heartGeometry(0.42), glow(primary, 0.85)))
  const heartCore = new THREE.Mesh(heartGeometry(0.26), glow('#fff1f2', 0.9))
  heartCore.position.z = 0.01
  heart.add(heartCore)
  const origin = new THREE.Vector3()
  const toward = flatDirection(source, target)
  const fire = 420
  fx(ctx, 0, fire + 160, heart, (_p, now) => {
    const t = now - ctx.now
    heart.position.copy(source.focusPoint(origin, 0.75)).addScaledVector(toward, 0.4)
    billboard(ctx, heart)
    const beat = 1 + Math.abs(Math.sin(t * 0.018)) * 0.18
    heart.scale.setScalar(easeInOut(phase(t, 0, 200)) * beat * (t > fire ? 1 + (t - fire) / 80 : 1))
    setOpacity(heart, t > fire ? 1 - phase(t, fire, fire + 160) : 1)
  })
  const victims = [target, ...enemiesAround(ctx, source, target, 2.5).slice(0, 3)]
  const land = fire + 260
  victims.forEach((victim, index) => {
    const arrow = () => {
      const group = new THREE.Group()
      const tip = new THREE.Mesh(heartGeometry(0.16), glow(secondary, 1))
      tip.rotation.x = -Math.PI / 2
      tip.position.z = 0.3
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.55, 6).rotateX(Math.PI / 2),
        glow(primary, 0.9),
      )
      shaft.position.z = 0.05
      group.add(tip, shaft)
      return group
    }
    const delay = fire + index * 50
    prop(ctx, source, victim, {
      build: arrow,
      from: () => source.focusPoint(origin, 0.8).addScaledVector(toward, 0.4),
      delay,
      duration: 260,
      arc: 0.7 + index * 0.2,
    })
    shell(ctx, victim, {
      color: '#9ca3af',
      edge: '#f9a8d4',
      material: 'stone',
      delay: delay + 260,
      duration: 1150,
    })
    burst(ctx, at(victim), { color: primary, count: 10, delay: delay + 260, speed: 1.4 })
  })
  flinch(ctx, victims.slice(1), land + 50, 50)
  shake(ctx, strength, land, 240)
  return land
}

export const MARINES_WARLORDS_ULTIMATES: UltimateSet = {
  koby_v1: kobyDetermination,
  helmeppo_v1: helmeppoKukriSlash,
  tashigi_v1: tashigiJusticeStrike,
  hina_v1: hinaCageCage,
  smoker_v1: smokerWhiteSmoke,
  garp_v1: garpFistOfLove,
  sengoku_v1: sengokuBuddhaPalm,
  kizaru_v1: kizaruYataNoKagami,
  akainu_v1: akainuMeteorVolcano,
  buggy_v1: buggyChopChopFestival,
  moria_v1: moriaShadowSteal,
  crocodile_v1: crocodileGroundSecco,
  kuma_v1: kumaUrsusShock,
  doflamingo_v1: doflamingoOverheat,
  mihawk_v1: mihawkWorldsStrongestSlash,
  hancock_v1: hancockSlaveArrow,
}
