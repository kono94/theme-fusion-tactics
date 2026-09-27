import * as THREE from 'three'
import {
  at,
  aura,
  burst,
  cameraPunch,
  crouch,
  dash,
  ground,
  later,
  leap,
  meteor,
  pillar,
  projectile,
  shake,
  shockwave,
  slashArc,
  spin,
  stretchLimb,
  trail,
} from './primitives'
import type { Choreography } from './types'

const SKIN = '#f1c27d'

const luffyGatling: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  crouch(ctx, source, { duration: 220 })
  cameraPunch(ctx, at(target), 0.55, 180)
  const punches = 8
  for (let index = 0; index < punches; index++) {
    const delay = 200 + index * 70
    stretchLimb(ctx, source, target, {
      color: SKIN,
      fist: index % 2 === 0 ? primary : secondary,
      delay,
      duration: 220,
      sideOffset: (index % 2 === 0 ? 1 : -1) * (0.12 + (index % 3) * 0.08),
    })
    burst(ctx, at(target), { color: index % 2 === 0 ? primary : secondary, count: 6, delay: delay + 100, speed: 1.2 })
  }
  const finale = 200 + punches * 70 + 120
  burst(ctx, at(target), { color: secondary, count: 30, delay: finale, speed: 2.6 })
  shockwave(ctx, ground(target), { color: primary, delay: finale, radius: 1.6 })
  shake(ctx, strength, finale, 320)
  return 300
}

const zoroOniGiri: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  crouch(ctx, source, { duration: 240 })
  cameraPunch(ctx, at(target), 0.5, 220)
  dash(ctx, source, target, { delay: 240, duration: 700, through: true, hold: 0.35 })
  trail(ctx, source, { color: primary, delay: 240, duration: 520 })
  const angles = [-1.9, -0.6, 0.7]
  angles.forEach((angle, index) => {
    slashArc(ctx, at(target), { color: primary, delay: 330 + index * 45, angle, radius: 0.6, sweep: 1.6 })
  })
  const detonate = 780
  ctx.flash('#f0fdf4', detonate, 160)
  angles.forEach((angle, index) => {
    slashArc(ctx, at(target), {
      color: index === 1 ? secondary : primary,
      delay: detonate,
      duration: 360,
      angle: angle + 0.4,
      radius: 1.1,
      width: 0.2,
      sweep: 0.5,
    })
  })
  burst(ctx, at(target), { color: primary, count: 34, delay: detonate, speed: 2.8 })
  shake(ctx, strength, detonate, 300)
  return detonate
}

const sanjiDiableJambe: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  spin(ctx, source, { duration: 520, turns: 3 })
  aura(ctx, source, { color: secondary, duration: 700, count: 26 })
  pillar(ctx, ground(source), { color: secondary, duration: 520, height: 1.6, radius: 0.35 })
  dash(ctx, source, target, { delay: 480, duration: 620, hold: 0.3 })
  leap(ctx, source, { delay: 480, duration: 620, height: 0.8 })
  trail(ctx, source, { color: secondary, delay: 480, duration: 420 })
  for (let kick = 0; kick < 3; kick++) {
    const delay = 640 + kick * 90
    burst(ctx, at(target), { color: kick === 2 ? primary : secondary, count: 14, delay, speed: 2 })
    slashArc(ctx, at(target), { color: secondary, delay, angle: kick * 1.3, radius: 0.55, sweep: 1.4 })
  }
  shockwave(ctx, ground(target), { color: secondary, delay: 820, radius: 1.8 })
  shake(ctx, strength, 820)
  return 640
}

const aceFireFist: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  aura(ctx, source, { color: primary, duration: 600, count: 24 })
  cameraPunch(ctx, at(source), 0.35, 0)
  const travel = 420
  projectile(ctx, source, target, {
    color: primary,
    core: secondary,
    delay: 260,
    duration: travel,
    size: 0.3,
    arc: 0.2,
  })
  for (let index = 0; index < 6; index++) {
    projectile(ctx, source, target, {
      color: index % 2 === 0 ? primary : '#fbbf24',
      delay: 280 + index * 30,
      duration: travel,
      size: 0.12,
      arc: 0.2,
      offset: new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.4, 0),
    })
  }
  const impact = 260 + travel
  pillar(ctx, ground(target), { color: primary, delay: impact, duration: 800, height: 3.2, radius: 0.55 })
  burst(ctx, at(target), { color: '#fbbf24', count: 36, delay: impact, speed: 3 })
  shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 2.2 })
  shake(ctx, strength, impact, 360)
  return impact
}

const whitebeardQuake: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  leap(ctx, source, { duration: 620, height: 1.3, slam: true })
  const impact = 560
  ctx.flash('#dbeafe', impact, 200)
  shockwave(ctx, ground(source), { color: primary, delay: impact, radius: 6, duration: 800, thickness: 0.4 })
  shockwave(ctx, ground(source), { color: secondary, delay: impact + 140, radius: 5, duration: 800, thickness: 0.3 })
  burst(ctx, ground(source), { color: '#e2e8f0', count: 40, delay: impact, speed: 3, spread: 'ring', gravity: 0.4 })
  shake(ctx, Math.max(strength, 9), impact, 700)
  for (const enemy of ctx.enemiesOf(source)) {
    const distance = enemy.root.position.distanceTo(source.root.position)
    const delay = impact + distance * 70
    burst(ctx, at(enemy), { color: secondary, count: 10, delay, speed: 1.6 })
    later(ctx, delay, () => enemy.onHit(ctx.now + delay))
  }
  return impact + target.root.position.distanceTo(source.root.position) * 70
}

const kizaruLight: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  leap(ctx, source, { duration: 1100, height: 1.6 })
  aura(ctx, source, { color: primary, duration: 1000, count: 20 })
  const enemies = ctx.enemiesOf(source)
  const shots = 12
  for (let index = 0; index < shots; index++) {
    const victim = index % 3 === 0 || enemies.length === 0 ? target : enemies[index % enemies.length]
    const delay = 320 + index * 45
    const origin = new THREE.Vector3()
    projectile(ctx, source, victim, {
      color: primary,
      core: secondary,
      delay,
      duration: 160,
      size: 0.07,
      arc: 0,
      shape: 'bolt',
      from: () => source.focusPoint(origin, 0.6).setY(origin.y + source.pose.lift + 0.3),
    })
    burst(ctx, at(victim), { color: primary, count: 5, delay: delay + 160, speed: 1.4 })
  }
  ctx.flash('#fef9c3', 320, 120)
  shake(ctx, strength, 400, 500)
  return 480
}

const akainuEruption: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  aura(ctx, source, { color: primary, duration: 800, count: 28 })
  pillar(ctx, ground(source), { color: secondary, duration: 500, height: 2.4, radius: 0.35 })
  const center = new THREE.Vector3()
  const drops = 8
  for (let index = 0; index < drops; index++) {
    const offset = new THREE.Vector3(
      index === 0 ? 0 : (Math.random() - 0.5) * 2.2,
      0,
      index === 0 ? 0 : (Math.random() - 0.5) * 2.2,
    )
    const delay = 260 + index * 85
    const impactPoint = () => center.copy(target.root.position).add(offset)
    meteor(ctx, impactPoint, { color: secondary, trail: primary, delay, duration: 380, size: 0.2 })
    burst(ctx, impactPoint, { color: secondary, count: 12, delay: delay + 380, speed: 1.8 })
    shockwave(ctx, impactPoint, { color: primary, delay: delay + 380, radius: 0.8, duration: 380 })
  }
  const finale = 260 + drops * 85 + 380
  pillar(ctx, ground(target), { color: primary, delay: finale, duration: 700, height: 3, radius: 0.5 })
  shake(ctx, strength, 640, 900)
  return 640
}

const mihawkBlackBlade: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  crouch(ctx, source, { duration: 300 })
  slashArc(ctx, at(source), { color: '#0f172a', delay: 200, radius: 0.7, angle: -0.4, sweep: 1 })
  const steps = 6
  const along = new THREE.Vector3()
  for (let index = 0; index < steps; index++) {
    const t = (index + 1) / (steps + 1)
    slashArc(
      ctx,
      () => along.lerpVectors(source.focusPoint(new THREE.Vector3()), target.focusPoint(new THREE.Vector3()), t),
      { color: primary, delay: 260 + index * 35, radius: 0.9, width: 0.16, angle: 0.2, sweep: 0.3, duration: 200 },
    )
  }
  const impact = 260 + steps * 35 + 40
  ctx.flash('#ecfdf5', impact, 140)
  cameraPunch(ctx, at(target), 0.6, impact - 60)
  slashArc(ctx, at(target), { color: primary, delay: impact, radius: 1.4, width: 0.24, angle: -0.8, sweep: 0.6, duration: 420 })
  slashArc(ctx, at(target), { color: secondary, delay: impact + 60, radius: 1.2, width: 0.16, angle: 0.8, sweep: -0.6, duration: 420 })
  burst(ctx, at(target), { color: primary, count: 30, delay: impact, speed: 2.6 })
  shake(ctx, strength, impact, 320)
  return impact
}

export const SIGNATURE_ULTIMATES: Record<string, Choreography> = {
  luffy_v1: luffyGatling,
  zoro_v1: zoroOniGiri,
  sanji_v1: sanjiDiableJambe,
  ace_v1: aceFireFist,
  whitebeard_v1: whitebeardQuake,
  kizaru_v1: kizaruLight,
  akainu_v1: akainuEruption,
  mihawk_v1: mihawkBlackBlade,
}

