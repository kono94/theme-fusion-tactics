import * as THREE from 'three'
import type { UnitView } from '../../unitView'
import {
  angerMark,
  baguaSeal,
  biscuitPlate,
  bullHorns,
  candyCane,
  carry,
  chessPawn,
  frill,
  kanabo,
  pteranodon,
  sail,
  skullDome,
  sun,
  visionEye,
} from '../kit/beastsBigMom'
import {
  alliesAround,
  blade,
  bodyAt,
  bodyPoint,
  easeIn,
  easeOut,
  enemiesAround,
  enemiesInLine,
  flatDirection,
  flinch,
  fx,
  groundCracks,
  phase,
  pulse,
  setOpacity,
  spear,
  standard,
  swing,
  nearestEnemy,
} from '../kit/shared'
import {
  at,
  aura,
  burst,
  cloud,
  cameraPunch,
  crouch,
  dash,
  glow,
  ground,
  leap,
  lightning,
  pillar,
  projectile,
  shake,
  shockwave,
  slashArc,
  swarm,
  trail,
} from '../primitives'
import type { Choreography, UltimateSet } from '../types'

const DUST = '#a8a29e'
const IVORY = '#f5f0dc'

const gifterWildCharge: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 260 })
  burst(ctx, ground(source), {
    color: DUST,
    count: 12,
    spread: 'ring',
    speed: 0.9,
    gravity: 0,
    duration: 420,
  })
  carry(ctx, source, target, bullHorns(), {
    duration: 760,
    forward: (p) => 0.3 + 0.15 * pulse(phase(p, 0.25, 0.6)),
    height: 0.62,
    animate: (p, horns) => horns.rotation.set(-0.35 * pulse(phase(p, 0, 0.3)), 0, 0),
  })
  dash(ctx, source, target, { delay: 220, duration: 560, hold: 0.2 })
  trail(ctx, source, { color: secondary, delay: 220, duration: 300 })
  const impact = 390
  burst(ctx, at(target), { color: secondary, count: 18, delay: impact, speed: 2 })
  burst(ctx, ground(target), {
    color: DUST,
    count: 10,
    delay: impact,
    spread: 'ring',
    speed: 1.2,
    gravity: 0,
  })
  shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 1.1, duration: 420 })
  shake(ctx, strength, impact)
  return impact
}

const headlinerRampage: Choreography = (ctx, { source, primary, secondary, shake: strength }) => {
  crouch(ctx, source, { duration: 240 })
  fx(ctx, 200, 900, undefined, (p, now) => {
    source.pose.scale *= 1 + 0.22 * easeOut(phase(p, 0, 0.25)) * (1 - phase(p, 0.75, 1))
    if (!ctx.reducedMotion) source.pose.tilt += Math.sin(now * 0.06) * 0.06 * (1 - p)
  })
  const crown = new THREE.Group()
  for (let index = 0; index < 10; index++) {
    const angle = (index / 10) * Math.PI * 2
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.5, 6).translate(0, 0.25, 0),
      glow(index % 2 ? secondary : '#dc2626', 0.8),
    )
    flame.position.set(Math.cos(angle) * 0.42, 0, Math.sin(angle) * 0.42)
    crown.add(flame)
  }
  fx(ctx, 180, 950, crown, (p, now) => {
    crown.position.copy(source.root.position).setY(0.05)
    crown.rotation.y = p * 2
    crown.children.forEach((flame, index) => {
      flame.scale.set(
        1,
        easeOut(phase(p, 0, 0.2)) * (0.8 + 0.4 * Math.sin(now * 0.03 + index * 1.7)),
        1,
      )
    })
    setOpacity(crown, 1 - phase(p, 0.7, 1))
  })
  const mark = angerMark('#ef4444')
  fx(ctx, 260, 700, mark, (p, now) => {
    source.focusPoint(mark.position, 1).add(source.pose.offset)
    mark.position.y += 0.1 + source.pose.lift
    mark.quaternion.copy(ctx.camera.quaternion)
    mark.translateX(0.32)
    mark.scale.setScalar(
      (0.6 + 0.6 * easeOut(phase(p, 0, 0.15))) * (1 + 0.15 * Math.sin(now * 0.04)),
    )
    setOpacity(mark, 1 - phase(p, 0.7, 1))
  })
  aura(ctx, source, { color: primary, delay: 200, duration: 900, count: 22 })
  burst(ctx, bodyAt(source, 1.14), {
    color: '#d4d4d8',
    count: 10,
    delay: 240,
    spread: 'up',
    speed: 1.1,
    gravity: 0,
  })
  for (const [index, delay] of [300, 540].entries()) {
    shockwave(ctx, ground(source), {
      color: index ? secondary : '#b91c1c',
      delay,
      radius: 1.3 + index * 0.4,
      duration: 450,
    })
    shake(ctx, strength * (0.6 + index * 0.4), delay, 200)
  }
  return 300
}

const ultiMortar: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  crouch(ctx, source, { duration: 280 })
  aura(ctx, source, { color: primary, duration: 500, count: 16 })
  const flight = 720
  const launch = 240
  const landing = 0.55
  const impact = launch + Math.round(flight * landing)
  const offset = new THREE.Vector3()
  fx(ctx, launch, flight, undefined, (p) => {
    offset.subVectors(target.root.position, source.root.position).setY(0).multiplyScalar(0.8)
    const reach = p < landing ? phase(p, 0, landing) : 1 - easeOut(phase(p, 0.7, 1))
    source.pose.offset.addScaledVector(
      offset,
      p < landing ? easeIn(reach) * 0.4 + reach * 0.6 : reach,
    )
    const height = ctx.reducedMotion ? 0.3 : 1.9
    source.pose.lift += p < landing ? Math.sin(Math.PI * reach) * height : 0
    if (!ctx.reducedMotion && p < landing) source.pose.spin -= reach * Math.PI * 2
  })
  carry(ctx, source, target, skullDome(primary, secondary), {
    delay: 120,
    duration: launch + flight * 0.72,
    forward: 0.28,
    height: 0.7,
    animate: (p, dome) => dome.scale.setScalar(0.4 + 0.8 * easeOut(phase(p, 0, 0.3))),
  })
  trail(ctx, source, { color: secondary, delay: launch, duration: flight * landing + 80 })
  cameraPunch(ctx, at(target), 0.55, impact - 60)
  shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 1.7, thickness: 0.3 })
  shockwave(ctx, ground(target), {
    color: secondary,
    delay: impact + 90,
    radius: 1.1,
    duration: 500,
  })
  groundCracks(ctx, ground(target), { color: secondary, delay: impact, length: 1.2, count: 7 })
  burst(ctx, ground(target), {
    color: '#78716c',
    count: 18,
    delay: impact,
    speed: 2.4,
    gravity: 3,
    size: 0.2,
  })
  burst(ctx, at(target), { color: secondary, count: 16, delay: impact, speed: 1.8 })
  shake(ctx, strength, impact, 320)
  return impact
}

const pageOneSpinosaurusShield: Choreography = (
  ctx,
  { source, primary, secondary, shake: strength },
) => {
  const rival = nearestEnemy(ctx, source)
  crouch(ctx, source, { duration: 220 })
  aura(ctx, source, { color: primary, duration: 800, count: 20 })
  const fin = sail(primary, secondary, 1.8, 1.35)
  const back = new THREE.Vector3()
  fx(ctx, 120, 1100, fin, (p) => {
    if (rival) flatDirection(source, rival, back).multiplyScalar(-0.35)
    fin.position.copy(source.root.position).add(back).setY(0.02)
    fin.quaternion.copy(ctx.camera.quaternion)
    fin.scale.set(1, easeOut(phase(p, 0, 0.3)) * (1 + 0.04 * Math.sin(p * 30)), 1)
    setOpacity(fin, 1 - phase(p, 0.7, 1))
  })
  shockwave(ctx, ground(source), { color: secondary, delay: 300, radius: 2.4, thickness: 0.25 })
  shake(ctx, strength * 0.5, 300, 220)
  alliesAround(ctx, source, Number.POSITIVE_INFINITY, 8).forEach((ally) => {
    const delay = 320 + Math.round(ally.root.position.distanceTo(source.root.position) * 90)
    const ward = new THREE.Group()
    for (let index = 0; index < 8; index++) {
      const angle = (index / 8) * Math.PI * 2
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.55 + (index % 2) * 0.2, 5).translate(0, 0.3, 0),
        glow(index % 2 ? secondary : primary, 0.85),
      )
      spike.position.set(Math.cos(angle) * 0.45, 0, Math.sin(angle) * 0.45)
      spike.rotation.set(Math.sin(angle) * 0.25, 0, -Math.cos(angle) * 0.25)
      ward.add(spike)
    }
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.5, 1.1, 20, 1, true).translate(0, 0.55, 0),
      glow(primary, 0.28),
    )
    ward.add(shell)
    fx(ctx, delay, 800, ward, (p) => {
      ward.position.copy(ally.root.position).setY(0)
      ward.scale.set(1, easeOut(phase(p, 0, 0.25)), 1)
      ward.rotation.y = p * 0.8
      setOpacity(ward, 1 - phase(p, 0.6, 1))
    })
  })
  return 350
}

const sasakiTriceratopsCharge: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 260 })
  const firstDistance = target.root.position.distanceTo(source.root.position)
  const victims = [
    target,
    ...enemiesInLine(ctx, source, target, {
      overshoot: Math.max(0.5, 3 - firstDistance),
      width: 0.75,
      limit: 3,
    }),
  ]
  const distances = victims.map((victim) => victim.root.position.distanceTo(source.root.position))
  const run = Math.min(3.6, Math.max(...distances) + 0.5)
  const start = 260
  const travel = 180 + run * 90
  const hold = 160
  const back = 300
  const direction = new THREE.Vector3()
  fx(ctx, start, travel + hold + back, undefined, (p, now) => {
    const elapsed = p * (travel + hold + back)
    const reach =
      elapsed < travel
        ? easeIn(elapsed / travel) * 0.35 + (elapsed / travel) * 0.65
        : elapsed < travel + hold
          ? 1
          : 1 - easeOut((elapsed - travel - hold) / back)
    flatDirection(source, target, direction)
    source.pose.offset.addScaledVector(
      direction,
      reach * (ctx.reducedMotion ? Math.min(run, 0.6) : run),
    )
    if (elapsed < travel && !ctx.reducedMotion) source.pose.tilt += Math.sin(now * 0.08) * 0.1
  })
  carry(ctx, source, target, frill(primary, secondary), {
    delay: 80,
    duration: start + travel + hold + 120,
    forward: 0.32,
    height: 0.6,
    animate: (p, model) => {
      model.scale.setScalar(0.4 + 0.7 * easeOut(phase(p, 0, 0.25)))
      model.rotation.z = p * p * 28
    },
  })
  trail(ctx, source, { color: DUST, delay: start, duration: travel + 120 })
  burst(ctx, ground(source), {
    color: DUST,
    count: 12,
    delay: start,
    spread: 'ring',
    speed: 1,
    gravity: 0,
  })
  victims.forEach((victim, index) => {
    const delay = start + Math.round(Math.pow(Math.min(1, distances[index] / run), 1.2) * travel)
    burst(ctx, at(victim), {
      color: index === 0 ? secondary : primary,
      count: 14,
      delay,
      speed: 2.2,
    })
    slashArc(ctx, at(victim), {
      color: secondary,
      delay,
      angle: -0.3,
      radius: 0.55,
      sweep: 3.2,
      duration: 220,
    })
    if (index > 0) flinch(ctx, [victim], delay)
  })
  const finish = start + travel
  shockwave(ctx, () => direction.clone().multiplyScalar(run).add(source.root.position), {
    color: primary,
    delay: finish,
    radius: 1.2,
    duration: 420,
  })
  shake(ctx, strength, finish - 60, 360)
  return start + Math.round(Math.pow(Math.min(1, distances[0] / run), 1.2) * travel)
}

const whosWhoFangPistol: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 220 })
  dash(ctx, source, target, { delay: 180, duration: 900, hold: 0.5 })
  trail(ctx, source, { color: primary, delay: 180, duration: 260 })
  const jaws = new THREE.Group()
  const fangs: THREE.Mesh[] = []
  for (const side of [1, -1]) {
    for (const lateral of [-0.2, 0.2]) {
      const fang = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.7, 8).translate(0, -0.35, 0),
        standard(IVORY, { roughness: 0.3, emissive: secondary, emissiveIntensity: 0.35 }),
      )
      fang.position.set(lateral, side * 0.55, 0)
      if (side > 0) fang.rotation.z = Math.PI
      fang.userData.side = side
      jaws.add(fang)
      fangs.push(fang)
    }
  }
  const bites = [460, 580, 700]
  const firstBite = 400
  fx(ctx, firstBite - 120, 620, jaws, (p) => {
    target.focusPoint(jaws.position, 0.55)
    jaws.quaternion.copy(ctx.camera.quaternion)
    const cycle = (p * 620) % 120
    const bite = cycle < 60 ? easeIn(cycle / 60) : 1 - easeOut((cycle - 60) / 60)
    fangs.forEach((fang) => {
      fang.position.y = (fang.userData.side as number) * (0.62 - bite * 0.38)
    })
    jaws.scale.setScalar(0.7 + 0.5 * easeOut(phase(p, 0, 0.2)))
    setOpacity(jaws, 1 - phase(p, 0.8, 1))
  })
  bites.forEach((delay, index) =>
    burst(ctx, at(target), {
      color: index % 2 ? secondary : primary,
      count: 8,
      delay: delay - 40,
      speed: 1.6,
    }),
  )
  const finale = 800
  projectile(ctx, source, target, {
    color: primary,
    core: '#fff1f2',
    delay: finale - 90,
    duration: 90,
    shape: 'shard',
    size: 0.08,
    arc: 0,
  })
  cameraPunch(ctx, at(target), 0.45, finale - 60)
  burst(ctx, at(target), { color: primary, count: 26, delay: finale, speed: 2.6 })
  shockwave(ctx, ground(target), { color: secondary, delay: finale, radius: 1, duration: 360 })
  shake(ctx, strength, finale, 280)
  return firstBite
}

const queenPlagueBullet: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  aura(ctx, source, { color: primary, duration: 700, count: 18 })
  const cannon = new THREE.Group()
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.13, 0.7, 14).rotateX(Math.PI / 2).translate(0, 0, 0.35),
    standard('#4b5563', { metalness: 0.8, roughness: 0.3 }),
  )
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.03, 8, 18).translate(0, 0, 0.55),
    standard(primary, { metalness: 0.6 }),
  )
  const muzzle = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.025, 8, 18).translate(0, 0, 0.71),
    glow(secondary, 0.95),
  )
  const charge = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), glow(secondary, 0.9))
  charge.position.z = 0.78
  cannon.add(barrel, band, muzzle, charge)
  const fire = 420
  carry(ctx, source, target, cannon, {
    duration: 900,
    forward: (p) => 0.2 - 0.12 * pulse(phase(p * 900, fire, fire + 160)),
    side: 0.28,
    height: 0.6,
    fadeOut: 0.8,
    animate: (p) => {
      const t = p * 900
      charge.scale.setScalar(t < fire ? 0.2 + easeIn(t / fire) * 1.2 : 0.01)
    },
  })
  const travel = 300
  const impact = fire + travel
  projectile(ctx, source, target, {
    color: primary,
    core: secondary,
    delay: fire,
    duration: travel,
    size: 0.2,
    arc: 0.7,
    from: () => {
      const direction = flatDirection(source, target)
      return source.focusPoint(new THREE.Vector3(), 0.55).addScaledVector(direction, 0.9)
    },
  })
  burst(ctx, at(source, 0.6), { color: secondary, count: 10, delay: fire, speed: 1.4 })
  const splat = new THREE.Vector3()
  const splatPoint = () => splat.copy(target.root.position).setY(0.3)
  cloud(ctx, splatPoint, {
    color: '#65a30d',
    count: 9,
    radius: 1.2,
    size: 0.45,
    opacity: 0.6,
    delay: impact,
    duration: 1000,
  })
  cloud(ctx, splatPoint, {
    color: primary,
    count: 5,
    radius: 0.9,
    size: 0.35,
    opacity: 0.45,
    delay: impact + 80,
    duration: 1100,
  })
  burst(ctx, at(target), { color: secondary, count: 20, delay: impact, speed: 1.8, gravity: 2.4 })
  shockwave(ctx, ground(target), { color: secondary, delay: impact, radius: 2.2, thickness: 0.3 })
  const victims = [target, ...enemiesAround(ctx, source, target, 2)].slice(0, 6)
  victims.forEach((victim, index) => {
    const delay = impact + 80 + index * 40
    const weakened = new THREE.Group()
    for (let piece = 0; piece < 4; piece++) {
      const shard = new THREE.Mesh(
        new THREE.RingGeometry(0.42, 0.5, 12, 1, (piece * Math.PI) / 2 + 0.08, Math.PI / 2 - 0.16),
        glow(primary, 0.9),
      )
      shard.userData.angle = (piece * Math.PI) / 2 + Math.PI / 4
      weakened.add(shard)
    }
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.24, 4).rotateX(Math.PI),
      glow(secondary, 0.95),
    )
    weakened.add(arrow)
    fx(ctx, delay, 780, weakened, (p) => {
      victim.focusPoint(weakened.position, 0.6)
      weakened.quaternion.copy(ctx.camera.quaternion)
      const crack = easeOut(phase(p, 0.2, 1))
      weakened.children.forEach((child) => {
        if (child === arrow) {
          arrow.position.set(0.42, 0.55 - crack * 0.6, 0.05)
          return
        }
        const angle = child.userData.angle as number
        child.position.set(
          Math.cos(angle) * crack * 0.25,
          Math.sin(angle) * crack * 0.25 - crack * crack * 0.5,
          0,
        )
        child.rotation.z = crack * (angle - 3) * 0.3
      })
      setOpacity(weakened, 1 - phase(p, 0.6, 1))
    })
    if (victim !== target) flinch(ctx, [victim], delay)
  })
  cameraPunch(ctx, at(target), 0.35, impact - 40)
  shake(ctx, strength, impact, 300)
  return impact
}

const kingMagmaDragon: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 280 })
  aura(ctx, source, { color: secondary, duration: 600, count: 24 })
  pillar(ctx, ground(source), { color: primary, duration: 520, height: 1.8, radius: 0.4 })
  const dragon = pteranodon(primary, secondary, 0.9)
  const wings = [dragon.children[1], dragon.children[2]]
  const launch = 240
  const flight = 900
  const dive = 0.72
  const impact = launch + Math.round(flight * dive)
  const home = new THREE.Vector3()
  const strike = new THREE.Vector3()
  const apex = new THREE.Vector3()
  const current = new THREE.Vector3()
  const next = new THREE.Vector3()
  const path = (t: number, out: THREE.Vector3) => {
    if (t < 0.45) {
      const rise = easeOut(t / 0.45)
      return out.lerpVectors(home, apex, rise)
    }
    const fall = easeIn((t - 0.45) / (dive - 0.45))
    return out.lerpVectors(apex, strike, Math.min(1, fall))
  }
  fx(ctx, launch, flight, dragon, (p, now) => {
    home.copy(source.root.position).setY(0.8)
    strike.copy(target.root.position).setY(0.4)
    apex.lerpVectors(home, strike, 0.3).setY(ctx.reducedMotion ? 1.6 : 3)
    const t = Math.min(p, dive)
    path(t, current)
    path(Math.min(dive, t + 0.02), next)
    dragon.position.copy(current)
    if (next.distanceToSquared(current) > 1e-6) dragon.lookAt(next)
    const flap = Math.sin(now * 0.03) * (p < 0.45 ? 0.6 : 0.15)
    wings[0].rotation.z = flap
    wings[1].rotation.z = -flap
    dragon.scale.setScalar(easeOut(phase(p, 0, 0.12)) * (p > dive ? 1 + (p - dive) * 3 : 1))
    setOpacity(dragon, 1 - phase(p, dive, 1))
    if (!ctx.reducedMotion && p < dive) {
      source.pose.offset.add(current.clone().sub(source.root.position).setY(0))
      source.pose.lift += current.y - 0.8
    } else if (!ctx.reducedMotion) {
      const back = easeOut(phase(p, dive, 1))
      source.pose.offset.add(
        strike
          .clone()
          .sub(source.root.position)
          .setY(0)
          .multiplyScalar(1 - back),
      )
    }
  })
  cameraPunch(ctx, at(target), 0.6, impact - 80)
  pillar(ctx, ground(target), {
    color: secondary,
    delay: impact,
    duration: 700,
    height: 2.8,
    radius: 0.55,
  })
  shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 2.3, thickness: 0.35 })
  shockwave(ctx, ground(target), {
    color: secondary,
    delay: impact + 80,
    radius: 1.5,
    duration: 500,
  })
  groundCracks(ctx, ground(target), {
    color: '#f97316',
    delay: impact,
    length: 1.8,
    count: 9,
    duration: 850,
  })
  burst(ctx, at(target), { color: secondary, count: 34, delay: impact, speed: 2.8, gravity: 1.8 })
  burst(ctx, ground(target), {
    color: '#fbbf24',
    count: 16,
    delay: impact + 150,
    spread: 'up',
    speed: 1.4,
    gravity: 0,
    duration: 700,
  })
  flinch(ctx, enemiesAround(ctx, source, target, 2), impact + 40, 30)
  shake(ctx, strength, impact, 420)
  return impact
}

const kaidoThunderBagua: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  const haki = '#dc2626'
  crouch(ctx, source, { duration: 420 })
  aura(ctx, source, { color: haki, duration: 900, count: 28, radius: 0.5 })
  for (let index = 0; index < 3; index++) {
    const angle = index * 2.1
    const spark = new THREE.Vector3()
    lightning(ctx, source, {
      color: index === 1 ? secondary : haki,
      from: () =>
        spark
          .copy(source.root.position)
          .add(new THREE.Vector3(Math.cos(angle) * 0.8, 1.6, Math.sin(angle) * 0.8)),
      delay: index * 140,
      duration: 260,
      segments: 7,
      jitter: 0.35,
    })
  }
  const club = kanabo(1.9, '#1f2937', '#e5e7eb')
  const charge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.12, 1.4, 10, 1, true).translate(0, 1.2, 0),
    glow(haki, 0.45),
  )
  club.add(charge)
  const swingStart = 150
  const swingDuration = 1000
  const impact = swingStart + Math.round(swingDuration * 0.7)
  swing(ctx, source, target, club, {
    delay: swingStart,
    duration: swingDuration,
    from: -0.9,
    to: Math.PI / 2 + 0.45,
    windup: 0.5,
    height: 0.9,
  })
  leap(ctx, source, {
    delay: 200,
    duration: 750,
    height: ctx.reducedMotion ? 0.15 : 0.9,
    slam: true,
  })
  lightning(ctx, source, {
    color: haki,
    from: bodyAt(source, 2.36),
    delay: 500,
    duration: 300,
    jitter: 0.4,
  })
  cameraPunch(ctx, at(target), 0.75, impact - 120)
  const seal = baguaSeal(secondary, 1.7)
  const sealHolder = new THREE.Group()
  sealHolder.add(seal)
  fx(ctx, impact, 900, sealHolder, (p) => {
    sealHolder.position.copy(target.root.position).setY(0.1)
    sealHolder.rotation.y = p * 0.6
    sealHolder.scale.setScalar(0.6 + easeOut(phase(p, 0, 0.2)) * 0.6)
    setOpacity(sealHolder, 1 - phase(p, 0.5, 1))
  })
  shockwave(ctx, ground(target), {
    color: primary,
    delay: impact,
    radius: 3.4,
    thickness: 0.5,
    duration: 700,
  })
  shockwave(ctx, ground(target), { color: haki, delay: impact + 70, radius: 2.4, thickness: 0.3 })
  groundCracks(ctx, ground(target), {
    color: haki,
    delay: impact,
    length: 2.3,
    count: 10,
    width: 0.07,
    duration: 1000,
  })
  lightning(ctx, target, {
    color: secondary,
    delay: impact - 30,
    duration: 320,
    segments: 12,
    jitter: 0.5,
  })
  burst(ctx, ground(target), {
    color: '#57534e',
    count: 26,
    delay: impact,
    speed: 2.6,
    gravity: 3.2,
    size: 0.2,
  })
  burst(ctx, at(target), { color: haki, count: 30, delay: impact, speed: 3 })
  cloud(ctx, ground(target), {
    color: '#44403c',
    count: 8,
    radius: 1.4,
    size: 0.4,
    delay: impact + 60,
    duration: 850,
    rise: 0.3,
  })
  burst(ctx, ground(target), {
    color: '#f87171',
    count: 14,
    delay: impact + 250,
    spread: 'up',
    speed: 1.2,
    gravity: 0,
    duration: 700,
  })
  enemiesAround(ctx, source, target, 2)
    .slice(0, 5)
    .forEach((victim, index) => {
      const delay = impact + 60 + index * 40
      lightning(ctx, victim, {
        color: index % 2 ? secondary : haki,
        from: at(target, 0.2),
        delay,
        duration: 280,
        segments: 8,
      })
      flinch(ctx, [victim], delay)
    })
  shake(ctx, strength, impact, 600)
  return impact
}

const chessSoldiersFormation: Choreography = (
  ctx,
  { source, primary, secondary, shake: strength },
) => {
  const rival = nearestEnemy(ctx, source)
  const formation = new THREE.Group()
  const soldiers: { pawn: THREE.Group; pike: THREE.Group; lag: number }[] = []
  for (let index = 0; index < 5; index++) {
    const pawn = chessPawn(index % 2 ? '#f5f5f4' : '#fafaf9', primary)
    const pike = spear(0.95, '#78350f', '#e5e7eb')
    pike.position.set(0.14, 0.2, 0)
    pawn.add(pike)
    pawn.position.x = (index - 2) * 0.32
    pawn.position.z = -Math.abs(index - 2) * 0.1
    formation.add(pawn)
    soldiers.push({ pawn, pike, lag: Math.abs(index - 2) * 0.06 })
  }
  const facing = new THREE.Vector3()
  const lower = 0.55
  fx(ctx, 0, 1150, formation, (p) => {
    if (rival) flatDirection(source, rival, facing)
    else facing.set(0, 0, 1)
    formation.position.copy(source.root.position).addScaledVector(facing, 0.6).setY(0)
    formation.lookAt(formation.position.x + facing.x, 0, formation.position.z + facing.z)
    soldiers.forEach(({ pawn, pike, lag }) => {
      pawn.position.y = -0.6 + 0.6 * easeOut(phase(p, lag, lag + 0.25))
      pike.rotation.x = easeIn(phase(p, lower, lower + 0.08)) * 1.05
    })
    setOpacity(formation, 1 - phase(p, 0.8, 1))
  })
  const clang = Math.round(1150 * (lower + 0.08))
  burst(ctx, ground(source), {
    color: '#d6d3d1',
    count: 12,
    delay: 80,
    spread: 'ring',
    speed: 1,
    gravity: 0,
  })
  shockwave(ctx, ground(source), { color: primary, delay: clang, radius: 1.6, duration: 420 })
  shake(ctx, strength, clang, 160)
  alliesAround(ctx, source, Number.POSITIVE_INFINITY, 8).forEach((ally, index) => {
    shockwave(ctx, ground(ally), {
      color: secondary,
      delay: clang + 40 + index * 30,
      radius: 0.7,
      duration: 450,
      thickness: 0.12,
    })
  })
  return clang
}

const prometheusFireBurst: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  const star = sun(secondary, primary, 0.3)
  const crown = star.children[2]
  const spit = 380
  fx(ctx, 0, 800, star, (p, now) => {
    source.focusPoint(star.position, 0.62).add(source.pose.offset)
    star.position.y += source.pose.lift
    star.quaternion.copy(ctx.camera.quaternion)
    const t = p * 800
    const swell =
      t < spit ? 0.9 + easeIn(t / spit) * 0.8 : 1.7 - easeOut(phase(t, spit, spit + 200)) * 0.8
    star.scale.setScalar(swell * (1 + 0.05 * Math.sin(now * 0.04)))
    crown.rotation.z = p * 4
    setOpacity(star, 1 - phase(p, 0.75, 1))
  })
  const travel = 260
  const impact = spit + travel
  projectile(ctx, source, target, {
    color: primary,
    core: secondary,
    delay: spit,
    duration: travel,
    size: 0.18,
    arc: 0.9,
  })
  shockwave(ctx, ground(target), {
    color: primary,
    delay: impact,
    radius: 1.4,
    thickness: 0.3,
    duration: 480,
  })
  pillar(ctx, ground(target), {
    color: secondary,
    delay: impact,
    duration: 480,
    height: 1.3,
    radius: 0.4,
  })
  burst(ctx, at(target), { color: secondary, count: 18, delay: impact, speed: 1.8, spread: 'up' })
  flinch(ctx, enemiesAround(ctx, source, target, 1), impact + 40)
  shake(ctx, strength, impact, 240)
  return impact
}

const perosperoCandyShower: Choreography = (ctx, { source, target, primary, secondary }) => {
  const cane = candyCane(1.1, '#ef4444')
  const pivot = new THREE.Group()
  pivot.add(cane)
  fx(ctx, 0, 900, pivot, (p) => {
    source.focusPoint(pivot.position, 0.3).add(source.pose.offset)
    pivot.quaternion.copy(ctx.camera.quaternion)
    pivot.translateX(0.35)
    cane.rotation.z = 0.5 - 0.7 * easeOut(phase(p, 0, 0.35)) + 0.15 * Math.sin(p * 18) * (1 - p)
    setOpacity(pivot, Math.min(phase(p, 0, 0.1), 1 - phase(p, 0.8, 1)))
  })
  const center = new THREE.Vector3()
  const sky = () => center.copy(target.root.position).setY(2.3)
  cloud(ctx, sky, {
    color: secondary,
    count: 8,
    radius: 0.8,
    size: 0.35,
    opacity: 0.7,
    delay: 150,
    duration: 1100,
    rise: 0.1,
  })
  const patients = alliesAround(ctx, source, 2.01, 7, target.root.position)
    .filter((ally) => ally.root.position.distanceTo(target.root.position) <= 2.01)
    .slice(0, 6)
  const candies = new THREE.Group()
  const drops: {
    mesh: THREE.Group
    ally: UnitView
    lag: number
    spin: number
    offset: THREE.Vector2
  }[] = []
  const palette = [primary, secondary, '#fde047', '#60a5fa']
  const count = Math.max(6, Math.round(14 * Math.max(0.5, ctx.particleScale)))
  for (let index = 0; index < count; index++) {
    const ally = patients.length > 0 ? patients[index % patients.length] : target
    const wrapped = new THREE.Group()
    const color = palette[index % palette.length]
    wrapped.add(
      new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), standard(color, { roughness: 0.2 })),
    )
    for (const end of [-1, 1]) {
      const twist = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.08, 6)
          .rotateZ((end * Math.PI) / 2)
          .translate(end * 0.1, 0, 0),
        standard(color),
      )
      wrapped.add(twist)
    }
    candies.add(wrapped)
    drops.push({
      mesh: wrapped,
      ally,
      lag: 0.15 + Math.random() * 0.35,
      spin: 4 + Math.random() * 8,
      offset: new THREE.Vector2((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7),
    })
  }
  fx(ctx, 250, 1000, candies, (p) => {
    drops.forEach(({ mesh, ally, lag, spin: turns, offset }) => {
      const fall = easeIn(phase(p, lag, lag + 0.4))
      const origin = ally.root.position
      mesh.position.set(origin.x + offset.x, 2.2 - fall * 1.7, origin.z + offset.y)
      mesh.rotation.set(fall * turns, fall * turns * 0.7, 0)
      mesh.scale.setScalar(
        fall > 0 && fall < 1 ? 1 : fall >= 1 ? 1 - phase(p, lag + 0.4, lag + 0.5) : 0.001,
      )
    })
  })
  const heal = 520
  patients.forEach((ally, index) => {
    aura(ctx, ally, {
      color: index % 2 ? '#86efac' : secondary,
      delay: heal + index * 40,
      duration: 800,
      count: 16,
    })
  })
  burst(ctx, at(target), {
    color: '#fbcfe8',
    count: 16,
    delay: heal,
    spread: 'up',
    speed: 1.2,
    gravity: 0,
  })
  return heal
}

const daifukuGenieStrike: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  const smoke = '#93c5fd'
  fx(ctx, 0, 320, undefined, (p, now) => {
    if (!ctx.reducedMotion) source.pose.tilt += Math.sin(now * 0.05) * 0.12 * pulse(p)
    source.pose.scale *= 1 - 0.06 * pulse(p)
  })
  cloud(ctx, ground(source), {
    color: smoke,
    count: 7,
    radius: 0.5,
    size: 0.3,
    opacity: 0.5,
    delay: 120,
    duration: 900,
    rise: 1.4,
  })
  pillar(ctx, ground(source), {
    color: primary,
    delay: 150,
    duration: 600,
    height: 2.2,
    radius: 0.3,
  })
  const genie = new THREE.Group()
  const spirit = (color: string, opacity = 0.6) => glow(color, opacity)
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1.2, 12).rotateX(Math.PI).translate(0, 0.6, 0),
    spirit(smoke, 0.45),
  )
  const torso = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 16, 12).scale(1, 0.85, 0.7).translate(0, 1.4, 0),
    spirit(primary),
  )
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 14, 10).translate(0, 2.05, 0),
    spirit(primary),
  )
  const turban = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.07, 8, 18).rotateX(Math.PI / 2).translate(0, 2.2, 0),
    spirit('#fde68a', 0.8),
  )
  const eyes = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.04, 0.02).translate(0, 2.08, 0.2),
    spirit('#fef9c3', 1),
  )
  genie.add(tail, torso, head, turban, eyes)
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.12, 0.7, 8).translate(0, -0.35, 0),
      spirit(primary),
    )
    arm.position.set(side * 0.5, 1.65, 0)
    arm.rotation.z = side * 2.2
    genie.add(arm)
  }
  const behind = new THREE.Vector3()
  fx(ctx, 200, 1150, genie, (p, now) => {
    flatDirection(source, target, behind)
    genie.position.copy(source.root.position).addScaledVector(behind, -0.55)
    genie.position.y = 0.1 * Math.sin(now * 0.006)
    genie.lookAt(target.root.position.x, genie.position.y, target.root.position.z)
    genie.scale.set(
      0.8 + 0.2 * easeOut(phase(p, 0, 0.3)),
      easeOut(phase(p, 0, 0.3)),
      0.8 + 0.2 * easeOut(phase(p, 0, 0.3)),
    )
    setOpacity(genie, 1 - phase(p, 0.75, 1))
  })
  const glaive = blade(1.1, '#dbeafe', secondary, 0.16)
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6).translate(0, -0.4, 0),
    standard('#1e3a8a'),
  )
  glaive.add(shaft)
  const swingStart = 360
  const swingDuration = 640
  const impact = swingStart + Math.round(swingDuration * 0.65)
  swing(ctx, source, target, glaive, {
    delay: swingStart,
    duration: swingDuration,
    from: -0.7,
    to: Math.PI / 2 + 0.15,
    windup: 0.45,
    height: 1.9,
    roll: 0.35,
  })
  cameraPunch(ctx, at(target), 0.45, impact - 60)
  slashArc(ctx, at(target), {
    color: primary,
    delay: impact,
    radius: 1.2,
    width: 0.26,
    angle: -2,
    sweep: 1.2,
    duration: 380,
  })
  burst(ctx, at(target), { color: secondary, count: 24, delay: impact, speed: 2.3 })
  shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 1.3, duration: 420 })
  shake(ctx, strength, impact, 300)
  return impact
}

const crackerBiscuitGuard: Choreography = (
  ctx,
  { source, primary, secondary, shake: strength },
) => {
  const biscuit = '#d9a45b'
  fx(ctx, 0, 300, undefined, (p) => {
    source.pose.scale *= 1 + 0.12 * pulse(p)
  })
  const rival = nearestEnemy(ctx, source)
  const guards = new THREE.Group()
  for (const side of [-1, 1]) {
    const soldier = new THREE.Group()
    soldier.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.5, 0.18).translate(0, 0.35, 0),
        standard(biscuit, { roughness: 0.95 }),
      ),
    )
    soldier.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 12, 10).translate(0, 0.72, 0),
        standard('#e8bd7a', { roughness: 0.9 }),
      ),
    )
    soldier.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.05, 12).translate(0, 0.83, 0),
        standard(primary),
      ),
    )
    const sword = blade(0.45, '#fef3c7', secondary, 0.05)
    sword.position.set(side * 0.2, 0.35, 0.1)
    sword.rotation.x = 0.4
    soldier.add(sword)
    soldier.position.x = side * 0.55
    guards.add(soldier)
  }
  const facing = new THREE.Vector3()
  fx(ctx, 100, 1000, guards, (p) => {
    if (rival) flatDirection(source, rival, facing)
    else facing.set(0, 0, 1)
    guards.position.copy(source.root.position).addScaledVector(facing, 0.2)
    guards.position.y = -0.9 + 0.9 * easeOut(phase(p, 0, 0.3))
    guards.lookAt(guards.position.x + facing.x, guards.position.y, guards.position.z + facing.z)
    setOpacity(guards, 1 - phase(p, 0.8, 1))
  })
  burst(ctx, ground(source), { color: biscuit, count: 14, delay: 100, speed: 1.3, gravity: 2.4 })
  const lock = 420
  alliesAround(ctx, source, Number.POSITIVE_INFINITY, 7).forEach((ally, index) => {
    const delay = 150 + index * 40
    const armor = new THREE.Group()
    for (let plate = 0; plate < 4; plate++) {
      const piece = biscuitPlate(index % 2 ? '#e0ac66' : biscuit)
      piece.userData.angle = (plate / 4) * Math.PI * 2
      armor.add(piece)
    }
    fx(ctx, delay, 950, armor, (p) => {
      armor.position.copy(ally.root.position).setY(0.55)
      const close = easeIn(phase(p, 0, 0.3))
      armor.children.forEach((piece) => {
        const angle = (piece.userData.angle as number) + (1 - close) * 1.5
        const radius = 1.3 - close * 0.9
        piece.position.set(Math.cos(angle) * radius, (1 - close) * 0.5, Math.sin(angle) * radius)
        piece.lookAt(
          armor.position.x + Math.cos(angle) * 9,
          armor.position.y,
          armor.position.z + Math.sin(angle) * 9,
        )
      })
      armor.scale.setScalar(1 + 0.08 * pulse(phase(p, 0.3, 0.4)))
      setOpacity(armor, 1 - phase(p, 0.65, 1))
    })
  })
  shake(ctx, strength * 0.5, lock, 160)
  burst(ctx, at(source), { color: secondary, count: 12, delay: lock, speed: 1.2 })
  return lock
}

const smoothieJuiceExtract: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 240 })
  const juice = '#f472b6'
  const helix = new THREE.Group()
  for (const strand of [0, Math.PI]) {
    const points = Array.from({ length: 24 }, (_, index) => {
      const t = index / 23
      const angle = strand + t * Math.PI * 5
      return new THREE.Vector3(Math.cos(angle) * 0.42, t * 1.2, Math.sin(angle) * 0.42)
    })
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.035, 6),
      glow(strand ? secondary : primary, 0.85),
    )
    helix.add(tube)
  }
  const wring = 150
  fx(ctx, wring, 900, helix, (p) => {
    helix.position.copy(target.root.position).setY(0.02)
    const squeeze = easeIn(phase(p, 0, 0.5))
    helix.scale.set(1.3 - squeeze * 0.75, 1, 1.3 - squeeze * 0.75)
    helix.rotation.y = -p * 9
    setOpacity(helix, Math.min(phase(p, 0, 0.1), 1 - phase(p, 0.75, 1)))
  })
  fx(ctx, wring, 900, undefined, (p, now) => {
    const squeeze = pulse(phase(p, 0.1, 0.9))
    target.pose.scale *= 1 - 0.2 * squeeze
    if (!ctx.reducedMotion) target.pose.tilt += Math.sin(now * 0.05) * 0.3 * squeeze
  })
  const impact = 450
  burst(ctx, at(target), {
    color: juice,
    count: 14,
    delay: impact,
    speed: 1,
    gravity: 2.8,
    size: 0.12,
  })
  burst(ctx, at(target), {
    color: secondary,
    count: 12,
    delay: impact + 220,
    speed: 0.8,
    gravity: 2.8,
    size: 0.12,
  })
  swarm(ctx, target, source, {
    color: juice,
    count: 22,
    delay: impact + 80,
    duration: 800,
    travel: 0.7,
    size: 0.13,
  })
  const gulp = impact + 650
  fx(ctx, gulp, 400, undefined, (p) => {
    source.pose.scale *= 1 + 0.16 * pulse(p)
  })
  aura(ctx, source, { color: juice, delay: gulp, duration: 600, count: 16 })
  shake(ctx, strength * 0.6, impact, 220)
  return impact
}

const katakuriMochiThrust: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  const mochi = '#f5efe6'
  const eye = visionEye('#dc2626')
  fx(ctx, 0, 520, eye, (p) => {
    source.focusPoint(eye.position, 1).add(source.pose.offset)
    eye.position.y += 0.45 + source.pose.lift
    eye.quaternion.copy(ctx.camera.quaternion)
    const open = easeOut(phase(p, 0, 0.35))
    eye.scale.set(1, open * (1 + 0.25 * pulse(phase(p, 0.35, 0.55))), 1)
    setOpacity(eye, 1 - phase(p, 0.75, 1))
  })
  shockwave(ctx, bodyAt(source, 1.41), {
    color: secondary,
    delay: 220,
    radius: 1.6,
    thickness: 0.12,
    height: 1.55,
    duration: 380,
  })
  cameraPunch(ctx, at(source), 0.3, 120)
  crouch(ctx, source, { duration: 460, delay: 120 })
  aura(ctx, source, { color: secondary, delay: 150, duration: 700, count: 20 })
  const pivot = new THREE.Group()
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.1, 1, 12).rotateX(Math.PI / 2).translate(0, 0, 0.5),
    standard(mochi, { roughness: 0.85 }),
  )
  const head = spear(0.1, '#3b0764', '#581c87', 3)
  head.rotation.x = Math.PI / 2
  const coil = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.05, 8, 20),
    standard(mochi, { roughness: 0.85 }),
  )
  pivot.add(shaft, head, coil)
  const thrust = 470
  const hit = 600
  const reach = new THREE.Vector3()
  fx(ctx, thrust, 700, pivot, (p) => {
    pivot.position.copy(source.root.position).add(source.pose.offset).setY(0.62)
    target.focusPoint(reach, 0.55)
    pivot.lookAt(reach)
    const distance = pivot.position.distanceTo(reach) + 0.7
    const t = p * 700
    const extend = t < hit - thrust ? easeIn(t / (hit - thrust)) : 1 - easeOut(phase(t, 330, 700))
    const length = Math.max(0.05, distance * extend)
    shaft.scale.set(1, 1, length)
    head.position.z = length
    coil.position.z = length * 0.2
    coil.scale.setScalar(1 + 0.4 * pulse(phase(p, 0.15, 0.4)))
    setOpacity(pivot, 1 - phase(p, 0.85, 1))
  })
  const impact = hit
  cameraPunch(ctx, at(target), 0.7, impact - 80)
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 40), glow(secondary, 0.9))
  const inward = new THREE.Vector3()
  fx(ctx, impact, 420, ring, (p) => {
    target.focusPoint(ring.position, 0.55)
    flatDirection(source, target, inward)
    ring.position.addScaledVector(inward, 0.35 + p * 0.6)
    ring.lookAt(ring.position.clone().add(inward))
    ring.scale.setScalar(0.4 + easeOut(p) * 1.3)
    setOpacity(ring, 1 - p)
  })
  burst(ctx, at(target), { color: primary, count: 30, delay: impact, speed: 2.8 })
  burst(ctx, at(target), {
    color: mochi,
    count: 18,
    delay: impact + 40,
    speed: 1.6,
    gravity: 3,
    size: 0.2,
  })
  groundCracks(ctx, ground(target), { color: secondary, delay: impact, length: 1.1, count: 6 })
  shake(ctx, strength, impact, 340)
  return impact
}

const bigMomSoulPocus: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  fx(ctx, 0, 1500, undefined, (p) => {
    source.pose.scale *=
      1 +
      0.2 * easeOut(phase(p, 0, 0.2)) * (1 - phase(p, 0.85, 1)) +
      0.12 * pulse(phase(p, 0.6, 0.85))
  })
  aura(ctx, source, { color: primary, duration: 1100, count: 26, radius: 0.5 })
  const flank = (side: number, heightFactor: number) => {
    const out = new THREE.Vector3()
    const direction = new THREE.Vector3()
    return () => {
      bodyPoint(source, heightFactor, out)
      flatDirection(source, target, direction)
      out.x -= direction.z * side
      out.z += direction.x * side
      return out
    }
  }
  const zeus = flank(-0.8, 2)
  cloud(ctx, zeus, {
    color: '#475569',
    count: 8,
    radius: 0.55,
    size: 0.32,
    opacity: 0.85,
    duration: 1500,
    rise: 0.1,
  })
  cloud(ctx, zeus, {
    color: '#1e293b',
    count: 4,
    radius: 0.35,
    size: 0.26,
    opacity: 0.8,
    delay: 60,
    duration: 1400,
    rise: 0.05,
  })
  const star = sun('#fef08a', '#f97316', 0.28)
  const crown = star.children[2]
  const prometheus = flank(0.85, 1.9)
  fx(ctx, 0, 1500, star, (p, now) => {
    star.position.copy(prometheus())
    star.quaternion.copy(ctx.camera.quaternion)
    star.scale.setScalar(easeOut(phase(p, 0, 0.2)) * (1 + 0.06 * Math.sin(now * 0.02)))
    crown.rotation.z = p * 5
    setOpacity(star, 1 - phase(p, 0.8, 1))
  })
  const impact = 420
  lightning(ctx, target, {
    color: '#fde047',
    from: zeus,
    delay: impact - 60,
    duration: 300,
    segments: 12,
    jitter: 0.45,
  })
  lightning(ctx, target, {
    color: '#ffffff',
    from: zeus,
    delay: impact + 80,
    duration: 200,
    segments: 10,
    jitter: 0.35,
  })
  projectile(ctx, source, target, {
    color: '#f97316',
    core: secondary,
    delay: impact - 180,
    duration: 180,
    size: 0.16,
    arc: 0.3,
    from: prometheus,
  })
  cameraPunch(ctx, at(target), 0.6, impact - 60)
  shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 2.4, thickness: 0.35 })
  burst(ctx, at(target), { color: secondary, count: 26, delay: impact, speed: 2.4 })
  const victims = [target, ...enemiesAround(ctx, source, target, 2)].slice(0, 5)
  const bellyPoint = at(source, 0.6)
  victims.forEach((victim, index) => {
    const delay = impact + 60 + index * 70
    const soul = new THREE.Group()
    soul.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), glow('#fdf2f8', 0.9)))
    soul.add(
      new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.36, 8).rotateX(-Math.PI / 2).translate(0, 0, -0.2),
        glow(primary, 0.6),
      ),
    )
    const eyes = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.025, 0.02).translate(0, 0.02, 0.12),
      new THREE.MeshBasicMaterial({ color: '#1f2937', transparent: true }),
    )
    soul.add(eyes)
    const from = new THREE.Vector3()
    const to = new THREE.Vector3()
    fx(ctx, delay, 800, soul, (p) => {
      victim.focusPoint(from, 0.7)
      to.copy(bellyPoint())
      const rise = easeOut(phase(p, 0, 0.3))
      const pull = easeIn(phase(p, 0.3, 1))
      soul.position.lerpVectors(from, to, pull)
      soul.position.y += rise * 0.6 + Math.sin(Math.PI * pull) * 0.8
      soul.position.x += Math.sin(p * 18 + index) * 0.06 * (1 - pull)
      if (p > 0.3) soul.lookAt(to)
      soul.scale.setScalar(0.6 + rise * 0.6 - pull * 0.5)
      setOpacity(soul, Math.min(phase(p, 0, 0.1), 1 - phase(p, 0.92, 1)))
    })
    if (victim !== target) flinch(ctx, [victim], delay - 40)
  })
  const feast = impact + 60 + victims.length * 70 + 650
  aura(ctx, source, { color: secondary, delay: feast, duration: 400, count: 18 })
  burst(ctx, at(source, 0.8), {
    color: primary,
    count: 14,
    delay: feast,
    spread: 'up',
    speed: 1.2,
    gravity: 0,
    duration: 450,
  })
  shake(ctx, strength, impact, 420)
  return impact
}

export const BEASTS_BIG_MOM_ULTIMATES: UltimateSet = {
  gifter_v1: gifterWildCharge,
  headliner_v1: headlinerRampage,
  ulti_v1: ultiMortar,
  page_one_v1: pageOneSpinosaurusShield,
  sasaki_v1: sasakiTriceratopsCharge,
  whos_who_v1: whosWhoFangPistol,
  queen_v1: queenPlagueBullet,
  king_v1: kingMagmaDragon,
  kaido_v1: kaidoThunderBagua,
  chess_soldiers_v1: chessSoldiersFormation,
  prometheus_v1: prometheusFireBurst,
  perospero_v1: perosperoCandyShower,
  daifuku_v1: daifukuGenieStrike,
  cracker_v1: crackerBiscuitGuard,
  smoothie_v1: smoothieJuiceExtract,
  katakuri_v1: katakuriMochiThrust,
  big_mom_v1: bigMomSoulPocus,
}
