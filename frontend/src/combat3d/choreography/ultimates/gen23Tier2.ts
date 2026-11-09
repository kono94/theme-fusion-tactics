import * as THREE from 'three'
import type { UnitView } from '../../unitView'
import {
  at,
  aura,
  burst,
  chargeOrb,
  cloud,
  crouch,
  type FxContext,
  glow,
  ground,
  halo,
  leap,
  levitate,
  orbit,
  pillar,
  projectile,
  prop,
  pushBack,
  shake,
  shockwave,
  sigil,
  slashArc,
  spikes,
  spin,
  starGeometry,
  stretchLimb,
  vortex,
} from '../primitives'
import {
  above,
  alliesAround,
  beyond,
  bodyAt,
  bubbles,
  cameraYaw,
  debris,
  driftMotes,
  easeIn,
  easeOut,
  enemiesAround,
  enemiesInLine,
  fadeInOut,
  fangs,
  fistMesh,
  flameMesh,
  flames,
  flat,
  flatDirection,
  flinch,
  flinchAlong,
  fx,
  groundCracks,
  heartGeometry,
  motionLines,
  motionScale,
  palmMesh,
  phase,
  rayBeam,
  rush,
  setOpacity,
  shell,
  shiver,
  snowflakeGeometry,
  speedStreaks,
  squash,
  standard,
  starPower,
  statArrows,
  stream,
  thickBolt,
  zap,
  zzz,
} from '../kit/shared'
import {
  armorPlates,
  bubbleBall,
  clawRake,
  dazeStars,
  eyeGlyph,
  featherMesh,
  glyphAt,
  groundRing,
  hailFall,
  iceChunk,
  iceTusk,
  reel,
  rollingBody,
  tailOrb,
  tailPoint,
  volley,
  wispMesh,
  woolPuffs,
} from '../kit/gen23Tier2'
import type { Choreography, UltimateSet } from '../types'

const YELLOW = '#facc15'
const PALE_YELLOW = '#fef08a'
const ICE = '#bae6fd'
const ICE_DEEP = '#38bdf8'
const SNOW = '#f0f9ff'
const DARK = '#312e81'
const PINK = '#f9a8d4'

const living = (views: UnitView[]): UnitView[] => views.filter((view) => !view.isDying)

const around = (ctx: FxContext, source: UnitView, center: UnitView, radius: number, limit = 3) =>
  living(enemiesAround(ctx, source, center, radius)).slice(0, limit)

// SURROUND around the caster: the target plus up to `limit - 1` other enemies near the caster.
const ring = (ctx: FxContext, source: UnitView, target: UnitView, radius = 1.6, limit = 3) => {
  const near = around(ctx, source, source, radius, limit + 1).filter((view) => view !== target)
  return [target, ...near].slice(0, limit)
}

const inLine = (ctx: FxContext, source: UnitView, target: UnitView, limit = 2) =>
  living(enemiesInLine(ctx, source, target, { limit: 4 })).slice(0, limit)

const team = (ctx: FxContext, source: UnitView, target: UnitView, radius: number) => {
  const allies = alliesAround(ctx, source, radius, 4).filter((ally) => !ally.isDying)
  return target !== source && !allies.includes(target) ? [...allies.slice(0, 3), target] : allies
}

const forward = (source: UnitView, target: UnitView) => flatDirection(source, target)

// ---------- Mareep line ----------

const mareepThunderShock: Choreography = (ctx, { source, target }) => {
  const tail = tailPoint(source, target, 0.5, 0.3)
  crouch(ctx, source, { duration: 360 })
  woolPuffs(ctx, source, { color: '#fef9c3', duration: 620 })
  tailOrb(ctx, tail, { color: '#f59e0b', shell: '#fde68a', size: 0.09, duration: 640 })
  ;[60, 180, 300].forEach((delay) =>
    zap(ctx, at(source, 0.5), tail, {
      color: PALE_YELLOW,
      delay,
      duration: 120,
      segments: 4,
      jitter: 0.15,
    }),
  )
  const impact = 460
  zap(ctx, tail, at(target), {
    color: YELLOW,
    core: '#fff7d6',
    delay: impact - 80,
    duration: 240,
    segments: 7,
    jitter: 0.3,
  })
  zap(ctx, tail, at(target, 0.4), {
    color: '#fbbf24',
    delay: impact - 30,
    duration: 200,
    segments: 6,
    jitter: 0.35,
  })
  burst(ctx, at(target), { color: YELLOW, count: 14, delay: impact, speed: 1.6 })
  shiver(ctx, target, { delay: impact, duration: 320, amount: 0.05 })
  flinch(ctx, [target], impact)
  return impact
}

const flaaffyThunderPunch: Choreography = (ctx, { source, target }) => {
  const tail = tailPoint(source, target, 0.55, 0.3)
  tailOrb(ctx, tail, { color: '#38bdf8', shell: '#bae6fd', size: 0.1, duration: 520 })
  aura(ctx, source, { color: YELLOW, count: 10, duration: 420 })
  zap(ctx, tail, at(source, 0.6), {
    color: PALE_YELLOW,
    delay: 120,
    duration: 160,
    segments: 5,
    jitter: 0.2,
  })
  const body = rush(ctx, source, target, { delay: 260, duration: 520, reach: 0.75, outEnd: 0.38 })
  const fist = fistMesh(0.2, () =>
    standard('#fde047', { emissive: '#f59e0b', emissiveIntensity: 0.35 }),
  )
  const fistPos = new THREE.Vector3()
  const dir = forward(source, target)
  fx(ctx, 120, 560, fist, (p, now) => {
    body(now, fistPos).addScaledVector(dir, 0.35)
    fist.position.copy(fistPos)
    fist.lookAt(target.root.position.x, fistPos.y, target.root.position.z)
    setOpacity(fist, fadeInOut(p, 0.1, 0.25))
  })
  const impact = 470
  zap(ctx, at(target, 0.8), ground(target), {
    color: YELLOW,
    delay: impact,
    duration: 220,
    segments: 5,
    jitter: 0.3,
  })
  zap(ctx, at(target, 0.6), at(target, 0.2), {
    color: PALE_YELLOW,
    delay: impact + 50,
    duration: 200,
    segments: 4,
    jitter: 0.35,
  })
  burst(ctx, at(target), { color: YELLOW, count: 16, delay: impact, speed: 2 })
  shockwave(ctx, at(target), { color: '#fbbf24', radius: 0.7, delay: impact, duration: 300 })
  dazeStars(ctx, target, { color: PALE_YELLOW, delay: impact + 100 })
  reel(ctx, target, impact + 60, 600)
  flinch(ctx, [target], impact)
  return impact
}

function zapCannonBall(size: number): THREE.Group {
  const group = new THREE.Group()
  const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(size * 1.25, 1), glow(YELLOW, 0.5))
  ;(cage.material as THREE.MeshBasicMaterial).wireframe = true
  group.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(size, 18, 14),
      standard('#fde047', { emissive: '#eab308', emissiveIntensity: 0.6, opacity: 0.8 }),
    ),
    new THREE.Mesh(new THREE.SphereGeometry(size * 0.45, 12, 8), glow('#fef9c3', 0.5)),
    cage,
  )
  return group
}

const ampharosZapCannon: Choreography = (ctx, { source, target }) => {
  const tail = tailPoint(source, target, 0.45, 0.32)
  const brow = bodyAt(source, 0.95)
  tailOrb(ctx, tail, { color: '#ef4444', shell: '#fca5a5', size: 0.12, duration: 760 })
  tailOrb(ctx, brow, { color: '#ef4444', shell: '#fca5a5', size: 0.08, duration: 760 })
  zap(ctx, tail, brow, { color: YELLOW, delay: 100, duration: 200, segments: 6, jitter: 0.25 })
  const muzzle = () => bodyAt(source, 0.7)().addScaledVector(forward(source, target), 0.45)
  chargeOrb(ctx, muzzle, { color: YELLOW, core: '#fef9c3', size: 0.3, delay: 120, duration: 360 })
  crouch(ctx, source, { duration: 420 })
  const extra = 1.4
  const distance = Math.max(0.5, source.root.position.distanceTo(target.root.position))
  const flight = 380
  const launch = 480
  const ball = zapCannonBall(0.22)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  fx(ctx, launch, flight + 140, ball, (p, now) => {
    from.copy(muzzle())
    to.copy(beyond(source, target, extra)())
    ball.position.lerpVectors(from, to, Math.min(1, p * 1.25))
    ball.rotation.set(now * 0.01, now * 0.015, 0)
    setOpacity(ball, 1 - phase(p, 0.8, 1))
  })
  const impact = launch + Math.round((flight * distance) / (distance + extra))
  const victims = [target, ...inLine(ctx, source, target)]
  victims.forEach((victim, index) => {
    const delay = impact + index * 90
    zap(ctx, at(victim, 0.9), ground(victim), {
      color: YELLOW,
      delay,
      duration: 260,
      segments: 6,
      jitter: 0.35,
    })
    burst(ctx, at(victim), { color: PALE_YELLOW, count: 12, delay, speed: 1.8 })
    dazeStars(ctx, victim, { color: YELLOW, delay: delay + 80, duration: 800 })
  })
  shockwave(ctx, ground(target), { color: YELLOW, radius: 1.1, delay: impact, duration: 380 })
  flinchAlong(ctx, source, victims, impact - Math.round(distance * 40), 40)
  return impact
}

// ---------- Marill / Azumarill ----------

const marillBubble: Choreography = (ctx, { source, target }) => {
  const tail = tailPoint(source, target, 0.35, 0.35)
  const ball = bubbleBall(0.11)
  fx(ctx, 0, 520, ball, (p) => {
    ball.position.copy(tail())
    ball.position.y += Math.abs(Math.sin(p * Math.PI * 3)) * 0.18
    setOpacity(ball, fadeInOut(p, 0.1, 0.2))
  })
  squash(ctx, source, { duration: 300, amount: 0.18 })
  const victims = ring(ctx, source, target)
  const impact = 520
  victims.forEach((victim, index) => {
    bubbles(ctx, bodyAt(source, 0.5), at(victim), {
      color: '#60a5fa',
      count: 6,
      size: 0.09,
      wobble: 0.12,
      delay: 180 + index * 40,
      duration: 340,
    })
    burst(ctx, at(victim), { color: '#bfdbfe', count: 10, delay: impact + index * 40, speed: 1.2 })
  })
  shockwave(ctx, ground(source), { color: '#93c5fd', radius: 1.4, delay: 200, duration: 420 })
  flinch(ctx, victims, impact, 40)
  return impact
}

const azumarillRollout: Choreography = (ctx, { source, target }) => {
  const dir = forward(source, target)
  squash(ctx, source, { duration: 260, amount: 0.25 })
  const body = rush(ctx, source, target, {
    delay: 200,
    duration: 700,
    reach: 1.15,
    outEnd: 0.4,
    hold: 0.15,
  })
  rollingBody(ctx, body, {
    build: () => {
      const group = bubbleBall(0.36, '#3b82f6')
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 6, 24), standard('#f8fafc'))
      group.add(band)
      return group
    },
    axis: dir,
    radius: 0.36,
    delay: 160,
    duration: 760,
    turns: 5,
  })
  fx(
    ctx,
    0,
    900,
    undefined,
    (p) => (source.pose.scale *= 1 - 0.85 * phase(p, 0.18, 0.24) * (1 - phase(p, 0.9, 0.96))),
  )
  bubbles(ctx, bodyAt(source, 0.2), beyond(source, target, 0.6, 0.2), {
    color: '#93c5fd',
    count: 8,
    size: 0.07,
    delay: 260,
    duration: 500,
  })
  const impact = 470
  const victims = [target, ...inLine(ctx, source, target)]
  victims.forEach((victim, index) => {
    const delay = impact + index * 70
    burst(ctx, ground(victim), { color: '#bfdbfe', count: 14, delay, spread: 'up', speed: 1.6 })
    pushBack(ctx, victim, ground(source), { delay, distance: 0.5, lift: 0.15 })
  })
  shockwave(ctx, ground(target), { color: '#60a5fa', radius: 1, delay: impact, duration: 360 })
  flinch(ctx, victims, impact, 70)
  return impact
}

// ---------- Togepi line ----------

const heart = (color: string, size = 0.12) => new THREE.Mesh(heartGeometry(size), flat(color, 0.9))

const togepiCharm: Choreography = (ctx, { source, target }) => {
  squash(ctx, source, { duration: 360, amount: 0.12 })
  orbit(ctx, source, {
    color: PINK,
    count: 5,
    radius: 0.5,
    turns: 1.2,
    collapse: 1.8,
    billboard: true,
    build: (index) => heart(index % 2 ? PINK : '#f472b6'),
    duration: 700,
  })
  driftMotes(ctx, ground(source), {
    colors: ['#fbcfe8', '#fde68a', '#bfdbfe'],
    count: 18,
    radius: 0.6,
    height: 1.2,
    twinkle: true,
    duration: 900,
  })
  const victims = ring(ctx, source, target)
  const impact = 560
  victims.forEach((victim, index) => {
    const delay = impact + index * 60
    glyphAt(ctx, above(victim, victim.height + 0.15), () => heart('#f472b6', 0.1), {
      delay,
      duration: 520,
      scale: 1.1,
    })
    statArrows(ctx, victim, { color: '#60a5fa', direction: 'fall', delay, duration: 700 })
  })
  shockwave(ctx, ground(source), { color: PINK, radius: 1.5, delay: 300, duration: 520 })
  flinch(ctx, victims, impact, 60)
  return impact
}

const togeticWish: Choreography = (ctx, { source, target }) => {
  const sky = above(target, 3)
  levitate(ctx, source, { duration: 700, height: 0.25, wobble: 0.08 })
  const star = () => {
    const group = new THREE.Group()
    group.add(
      new THREE.Mesh(
        starGeometry(5, 0.2, 0.09),
        standard('#fde047', { emissive: '#f59e0b', emissiveIntensity: 0.3 }),
      ),
      new THREE.Mesh(starGeometry(5, 0.28, 0.12).translate(0, 0, -0.01), glow('#fef08a', 0.35)),
    )
    return group
  }
  const riser = star()
  const crown = bodyAt(source, 1.1)
  fx(ctx, 80, 420, riser, (p) => {
    riser.position.copy(crown()).lerp(sky(), easeIn(p))
    riser.rotation.z = p * 4
    setOpacity(riser, 1 - phase(p, 0.85, 1))
  })
  const impact = 780
  const faller = star()
  const landing = bodyAt(target, 0.9)
  fx(ctx, 500, 300, faller, (p) => {
    faller.position.copy(sky()).lerp(landing(), easeIn(p))
    faller.rotation.z = -p * 6
    setOpacity(faller, 1 - phase(p, 0.9, 1))
  })
  driftMotes(ctx, () => sky().clone().lerp(ground(target)(), 0.5), {
    colors: ['#fef08a', '#fde68a', '#ffffff'],
    count: 12,
    radius: 0.3,
    height: 1.2,
    cycles: -1,
    duration: 600,
    delay: 480,
  })
  halo(ctx, target, { color: '#fde047', direction: 'fall', delay: impact, duration: 600 })
  driftMotes(ctx, ground(target), {
    colors: ['#bbf7d0', '#fef08a'],
    count: 16,
    radius: 0.45,
    height: 1.3,
    delay: impact,
    duration: 800,
  })
  burst(ctx, at(target, 0.9), { color: '#fef08a', count: 12, delay: impact, speed: 1 })
  return impact
}

const togekissAirSlash: Choreography = (ctx, { source, target }) => {
  const allies = team(ctx, source, target, 1.8)
  levitate(ctx, source, { duration: 760, height: 0.3, wobble: 0.06 })
  // Sparkle wings: two fans of white plumes spreading behind Togekiss.
  ;[-1, 1].forEach((side) => {
    const wing = new THREE.Group()
    for (let index = 0; index < 4; index++) {
      const plume = featherMesh('#f8fafc', index % 2 ? '#ef4444' : '#3b82f6', 0.36)
      plume.rotation.z = side * (0.5 + index * 0.32) - (side > 0 ? Math.PI / 2 : -Math.PI / 2) * 0.4
      wing.add(plume)
    }
    const body = bodyAt(source, 0.6)
    const right = new THREE.Vector3()
    fx(ctx, 0, 760, wing, (p) => {
      right.set(1, 0, 0).applyQuaternion(ctx.camera.quaternion)
      wing.position.copy(body()).addScaledVector(right, side * 0.12)
      wing.quaternion.copy(ctx.camera.quaternion)
      wing.rotateZ(side * Math.sin(p * Math.PI * 3) * 0.2)
      wing.scale.set(side * easeOut(phase(p, 0, 0.3)), easeOut(phase(p, 0, 0.3)), 1)
      setOpacity(wing, fadeInOut(p, 0.1, 0.25))
    })
  })
  const impact = 520
  slashArc(ctx, bodyAt(source, 0.5), {
    color: '#e0f2fe',
    radius: 1.2,
    width: 0.12,
    sweep: Math.PI * 1.6,
    delay: 300,
    duration: 320,
  })
  slashArc(ctx, bodyAt(source, 0.7), {
    color: '#fde68a',
    radius: 0.95,
    width: 0.08,
    angle: 1.2,
    sweep: Math.PI * 1.4,
    delay: 380,
    duration: 300,
  })
  allies.forEach((ally, index) => {
    const delay = impact + index * 70
    halo(ctx, ally, { color: '#86efac', direction: 'rise', delay, duration: 560 })
    driftMotes(ctx, ground(ally), {
      colors: ['#fecaca', '#bfdbfe', '#fef9c3'],
      count: 10,
      radius: 0.35,
      height: 1.1,
      twinkle: true,
      delay,
      duration: 700,
    })
  })
  return impact
}

// ---------- Natu / Xatu ----------

const natuConfuseRay: Choreography = (ctx, { source, target }) => {
  glyphAt(ctx, above(source, source.height + 0.25), () => eyeGlyph('#a855f7', 0.14), {
    duration: 420,
  })
  crouch(ctx, source, { duration: 300 })
  const orb = () => {
    const group = new THREE.Group()
    group.add(
      new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), glow('#facc15', 0.6)),
      new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 6, 20), flat('#a855f7', 0.8)),
    )
    return group
  }
  prop(ctx, source, target, { build: orb, delay: 300, duration: 300, arc: 0.4, spin: 9, tumble: 6 })
  const impact = 600
  orbit(ctx, target, {
    color: '#c084fc',
    count: 4,
    radius: 0.35,
    heightFactor: 0.9,
    turns: 2,
    delay: impact,
    duration: 800,
    build: (index) =>
      new THREE.Mesh(
        new THREE.TorusGeometry(0.05, 0.012, 4, 12),
        flat(index % 2 ? '#facc15' : '#a855f7', 0.85),
      ),
  })
  sigil(ctx, ground(target), {
    color: '#a855f7',
    secondary: '#facc15',
    radius: 0.5,
    delay: impact,
    duration: 700,
  })
  levitate(ctx, target, { delay: impact, duration: 700, height: 0.15, wobble: 0.3 })
  flinch(ctx, [target], impact)
  return impact
}

const xatuFutureSight: Choreography = (ctx, { source, target }) => {
  const sky = () => above(source, 3.2)().addScaledVector(forward(source, target), 0.5)
  glyphAt(ctx, above(source, source.height + 0.3), () => eyeGlyph('#16a34a', 0.2), {
    duration: 600,
    scale: 1.2,
  })
  sigil(ctx, ground(source), { color: '#f472b6', secondary: '#22c55e', radius: 0.7, duration: 700 })
  projectile(ctx, source, target, {
    color: '#f472b6',
    core: '#fdf2f8',
    from: bodyAt(source, 1),
    size: 0.18,
    arc: 0,
    delay: 150,
    duration: 300,
  })
  chargeOrb(ctx, sky, { color: '#ec4899', core: '#fbcfe8', size: 0.35, delay: 300, duration: 450 })
  const impact = 860
  const victims = [target, ...inLine(ctx, source, target)]
  victims.forEach((victim, index) => {
    const delay = impact + index * 80
    pillar(ctx, ground(victim), {
      color: '#f472b6',
      height: 3.2,
      radius: 0.24,
      delay: delay - 60,
      duration: 360,
    })
    glyphAt(ctx, above(victim, victim.height + 0.2), () => eyeGlyph('#ec4899', 0.12), {
      delay,
      duration: 500,
    })
    dazeStars(ctx, victim, { color: '#f9a8d4', delay: delay + 80, duration: 800 })
  })
  shockwave(ctx, ground(target), { color: '#ec4899', radius: 1, delay: impact, duration: 380 })
  flinch(ctx, victims, impact, 80)
  return impact
}

// ---------- Sneasel / Weavile ----------

const sneaselQuickAttack: Choreography = (ctx, { source, target }) => {
  crouch(ctx, source, { duration: 140 })
  const body = rush(ctx, source, target, {
    delay: 100,
    duration: 460,
    reach: 0.85,
    outEnd: 0.28,
    hold: 0.25,
  })
  speedStreaks(ctx, bodyAt(source, 0.5), at(target), {
    color: '#e2e8f0',
    count: 8,
    spread: 0.35,
    delay: 90,
    duration: 220,
  })
  const claw = iceTusk(0.3, '#f1f5f9', 0.9)
  const pos = new THREE.Vector3()
  fx(ctx, 100, 360, claw, (p, now) => {
    body(now, pos)
    claw.position.copy(pos).add(new THREE.Vector3(0, 0.15, 0))
    claw.lookAt(target.root.position.x, pos.y, target.root.position.z)
    claw.rotateX(Math.PI / 2 - p * 2)
    setOpacity(claw, fadeInOut(p, 0.1, 0.3))
  })
  const impact = 260
  clawRake(ctx, at(target), {
    color: '#f1f5f9',
    edge: '#ef4444',
    size: 0.42,
    delay: impact - 40,
    duration: 300,
  })
  burst(ctx, at(target), { color: ICE, count: 10, delay: impact, speed: 1.6 })
  debris(ctx, at(target), {
    color: ICE,
    count: 4,
    size: 0.05,
    pointed: true,
    delay: impact,
    speed: 1.4,
  })
  flinch(ctx, [target], impact)
  return impact
}

const weavileNightSlash: Choreography = (ctx, { source, target }) => {
  fx(
    ctx,
    0,
    620,
    undefined,
    (p) => (source.pose.scale *= 1 - 0.9 * phase(p, 0.05, 0.2) * (1 - phase(p, 0.8, 0.95))),
  )
  cloud(ctx, ground(source), {
    color: '#1e1b4b',
    count: 6,
    radius: 0.35,
    size: 0.35,
    opacity: 0.55,
    duration: 500,
  })
  speedStreaks(ctx, bodyAt(source, 0.5), beyond(source, target, 1.3), {
    color: '#a78bfa',
    count: 10,
    spread: 0.3,
    delay: 140,
    duration: 300,
  })
  const impact = 400
  const victims = [target, ...inLine(ctx, source, target)]
  victims.forEach((victim, index) => {
    const delay = impact + index * 70
    clawRake(ctx, at(victim), {
      color: '#e2e8f0',
      edge: '#dc2626',
      size: 0.5,
      angle: -0.9,
      delay: delay - 40,
      duration: 320,
    })
    slashArc(ctx, at(victim), {
      color: '#6d28d9',
      radius: 0.55,
      width: 0.1,
      angle: 0.5,
      delay,
      duration: 300,
    })
    debris(ctx, at(victim), { color: ICE, count: 4, size: 0.05, pointed: true, delay, speed: 1.5 })
  })
  const crown = new THREE.Group()
  crown.add(
    ...[-1, 0, 1].map((i) => {
      const plume = featherMesh('#dc2626', '#fca5a5', 0.3 - Math.abs(i) * 0.06)
      plume.rotation.z = -i * 0.35
      return plume
    }),
  )
  const crownPoint = bodyAt(source, 1.05)
  fx(ctx, 420, 360, crown, (p) => {
    crown.position.copy(crownPoint())
    crown.quaternion.copy(ctx.camera.quaternion)
    setOpacity(crown, fadeInOut(p, 0.2, 0.4))
  })
  flinch(ctx, victims, impact, 70)
  return impact
}

// ---------- Murkrow / Honchkrow ----------

const darkFeather = (index: number) =>
  featherMesh(index % 3 ? '#1e1b4b' : '#312e81', '#6366f1', 0.22)

const murkrowPursuit: Choreography = (ctx, { source, target }) => {
  leap(ctx, source, { duration: 360, height: 0.2 })
  const body = rush(ctx, source, target, { delay: 160, duration: 460, reach: 0.8, outEnd: 0.32 })
  volley(ctx, bodyAt(source, 0.6), at(target), {
    build: darkFeather,
    count: 6,
    spread: 0.3,
    delay: 80,
    duration: 300,
    stagger: 30,
  })
  const pos = new THREE.Vector3()
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.28, 3),
    standard('#1e1b4b', { roughness: 0.7 }),
  )
  fx(ctx, 160, 460, hat, (p, now) => {
    body(now, pos)
    hat.position.copy(pos).setY(pos.y + 0.5)
    hat.rotation.set(0.4, p * 2, 0)
    setOpacity(hat, fadeInOut(p, 0.1, 0.3))
  })
  const impact = 420
  slashArc(ctx, at(target), {
    color: '#4338ca',
    radius: 0.45,
    width: 0.08,
    angle: -0.6,
    delay: impact - 30,
    duration: 260,
  })
  burst(ctx, at(target), { color: '#6366f1', count: 10, delay: impact, speed: 1.4 })
  shockwave(ctx, ground(target), { color: DARK, radius: 0.8, delay: impact, duration: 320 })
  flinch(ctx, [target], impact)
  return impact
}

const honchkrowSuckerPunch: Choreography = (ctx, { source, target }) => {
  const power = starPower(source)
  // Honchkrow's broad cloak of feathers flares open, then it vanishes and strikes first.
  const cloak = new THREE.Group()
  for (let index = 0; index < 7; index++) {
    const plume = darkFeather(index)
    plume.rotation.z = -1.2 + index * 0.4
    plume.scale.setScalar(1.6)
    cloak.add(plume)
  }
  const cloakPoint = bodyAt(source, 0.55)
  fx(ctx, 0, 380, cloak, (p) => {
    cloak.position.copy(cloakPoint())
    cloak.quaternion.copy(ctx.camera.quaternion)
    cloak.scale.setScalar(easeOut(phase(p, 0, 0.5)))
    setOpacity(cloak, fadeInOut(p, 0.1, 0.35))
  })
  fx(
    ctx,
    260,
    480,
    undefined,
    (p) => (source.pose.scale *= 1 - 0.8 * phase(p, 0, 0.12) * (1 - phase(p, 0.55, 0.7))),
  )
  rush(ctx, source, target, { delay: 260, duration: 480, reach: 0.85, outEnd: 0.25, hold: 0.25 })
  speedStreaks(ctx, bodyAt(source, 0.5), at(target), {
    color: '#4338ca',
    count: 6,
    delay: 260,
    duration: 160,
  })
  const impact = 400
  const fist = fistMesh(0.22, () =>
    standard('#1e1b4b', { emissive: '#4c1d95', emissiveIntensity: 0.3 }),
  )
  const fistAt = () => at(target)().addScaledVector(forward(source, target), -0.35)
  fx(ctx, impact - 80, 260, fist, (p) => {
    fist.position
      .copy(fistAt())
      .addScaledVector(forward(source, target), easeOut(phase(p, 0, 0.35)) * 0.2)
    fist.lookAt(target.root.position.x, fist.position.y, target.root.position.z)
    setOpacity(fist, 1 - phase(p, 0.5, 1))
  })
  shockwave(ctx, at(target), {
    color: '#6d28d9',
    radius: 0.6 * power,
    delay: impact,
    duration: 300,
  })
  burst(ctx, at(target), { color: '#818cf8', count: 14, delay: impact, speed: 1.8 })
  volley(ctx, at(target), beyond(source, target, 0.8, 0.7), {
    build: darkFeather,
    count: 4,
    spread: 0.4,
    delay: impact,
    duration: 260,
  })
  pushBack(ctx, target, ground(source), { delay: impact, distance: 0.25 })
  flinch(ctx, [target], impact)
  return impact
}

// ---------- Houndour / Houndoom ----------

const houndourEmber: Choreography = (ctx, { source, target }) => {
  const mouth = () => bodyAt(source, 0.6)().addScaledVector(forward(source, target), 0.3)
  crouch(ctx, source, { duration: 260 })
  ;[0, 1, 2].forEach((index) =>
    prop(ctx, source, target, {
      build: () => flameMesh('#f97316', '#fde68a', 0.11),
      from: mouth,
      delay: 200 + index * 70,
      duration: 260,
      arc: 0.25 + index * 0.1,
      tumble: 4,
    }),
  )
  const impact = 470
  burst(ctx, at(target), { color: '#f97316', count: 12, delay: impact, speed: 1.4 })
  flames(ctx, ground(target), {
    color: '#ea580c',
    core: '#fbbf24',
    count: 5,
    radius: 0.25,
    height: 0.45,
    delay: impact,
    duration: 1000,
  })
  cloud(ctx, at(target, 0.9), {
    color: '#292524',
    count: 4,
    radius: 0.2,
    size: 0.22,
    opacity: 0.4,
    delay: impact + 200,
    duration: 700,
  })
  flinch(ctx, [target], impact)
  return impact
}

const houndoomFlamethrower: Choreography = (ctx, { source, target }) => {
  const mouth = () => bodyAt(source, 0.65)().addScaledVector(forward(source, target), 0.35)
  // Curved horns glint before the dark fire pours out.
  ;[-1, 1].forEach((side) => {
    const horn = iceTusk(0.28, '#e7e5e4', -0.6)
    const right = new THREE.Vector3()
    fx(ctx, 0, 380, horn, (p) => {
      right.set(1, 0, 0).applyQuaternion(ctx.camera.quaternion)
      horn.position.copy(bodyAt(source, 1)()).addScaledVector(right, side * 0.15)
      horn.rotation.set(0, cameraYaw(ctx), side * 0.4)
      setOpacity(horn, fadeInOut(p, 0.15, 0.3))
    })
  })
  aura(ctx, source, { color: '#7f1d1d', count: 10, duration: 400 })
  const end = beyond(source, target, 1.3, 0.5)
  stream(ctx, mouth, end, {
    color: '#dc2626',
    count: 36,
    size: 0.16,
    spread: 0.5,
    wobble: 0.1,
    rise: 0.15,
    delay: 280,
    duration: 520,
  })
  stream(ctx, mouth, end, {
    color: '#4c1d95',
    count: 20,
    size: 0.2,
    spread: 0.6,
    wobble: 0.15,
    delay: 320,
    duration: 520,
  })
  stream(ctx, mouth, end, {
    color: '#fb923c',
    count: 16,
    size: 0.08,
    spread: 0.25,
    delay: 300,
    duration: 460,
  })
  const impact = 470
  const victims = [target, ...inLine(ctx, source, target)]
  victims.forEach((victim, index) => {
    const delay = impact + index * 60
    flames(ctx, ground(victim), {
      color: '#b91c1c',
      core: '#7c3aed',
      count: 5,
      radius: 0.28,
      height: 0.55,
      delay,
      duration: 1100,
    })
    burst(ctx, at(victim), { color: '#f97316', count: 10, delay, speed: 1.2 })
  })
  flinchAlong(ctx, source, victims, impact - 60, 50)
  return impact
}

// ---------- Swinub line ----------

const snowflake = (size: number) => new THREE.Mesh(snowflakeGeometry(size), flat(SNOW, 0.85))

const swinubPowderSnow: Choreography = (ctx, { source, target }) => {
  squash(ctx, source, { duration: 320, amount: 0.12 })
  shiver(ctx, source, { duration: 360, amount: 0.04 })
  const victims = ring(ctx, source, target)
  cloud(ctx, ground(source), {
    color: SNOW,
    count: 8,
    radius: 0.9,
    size: 0.38,
    rise: 0.4,
    opacity: 0.55,
    delay: 160,
    duration: 700,
  })
  vortex(ctx, ground(source), {
    color: ICE,
    secondary: SNOW,
    height: 0.8,
    radius: 0.9,
    rings: 3,
    delay: 120,
    duration: 520,
  })
  driftMotes(ctx, ground(source), {
    colors: [SNOW, ICE],
    count: 26,
    radius: 1.3,
    height: 1,
    swirl: 3,
    delay: 120,
    duration: 700,
  })
  const impact = 440
  victims.forEach((victim, index) => {
    glyphAt(ctx, at(victim, 0.7), () => snowflake(0.16), {
      delay: impact + index * 50,
      duration: 420,
      spin: 2,
    })
    burst(ctx, at(victim), { color: SNOW, count: 10, delay: impact + index * 50, speed: 1 })
  })
  flinch(ctx, victims, impact, 50)
  return impact
}

const piloswineIceFang: Choreography = (ctx, { source, target }) => {
  shiver(ctx, source, { duration: 260, amount: 0.05 })
  const body = rush(ctx, source, target, { delay: 160, duration: 500, reach: 0.7, outEnd: 0.4 })
  const tusks = new THREE.Group()
  ;[-1, 1].forEach((side) => {
    const tusk = iceTusk(0.32, '#e0f2fe', 0.6)
    tusk.position.x = side * 0.14
    tusk.rotation.z = side * 0.2
    tusks.add(tusk)
  })
  const pos = new THREE.Vector3()
  fx(ctx, 140, 520, tusks, (p, now) => {
    body(now, pos)
    tusks.position
      .copy(pos)
      .setY(pos.y - 0.2)
      .addScaledVector(forward(source, target), 0.3)
    tusks.rotation.y = Math.atan2(forward(source, target).x, forward(source, target).z)
    setOpacity(tusks, fadeInOut(p, 0.1, 0.3))
  })
  const impact = 470
  fangs(ctx, target, {
    color: '#e0f2fe',
    glowColor: ICE_DEEP,
    size: 0.4,
    teeth: 3,
    delay: impact - 180,
    duration: 400,
  })
  shell(ctx, target, {
    color: ICE,
    edge: '#e0f2fe',
    radius: 0.42,
    material: 'crystal',
    delay: impact,
    duration: 700,
  })
  spikes(ctx, ground(target), {
    color: ICE,
    count: 5,
    radius: 0.35,
    height: 0.35,
    solid: true,
    delay: impact,
    duration: 600,
  })
  dazeStars(ctx, target, { color: '#e0f2fe', delay: impact + 120 })
  flinch(ctx, [target], impact)
  return impact
}

const mamoswineEarthquake: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  leap(ctx, source, { duration: 560, height: 0.8 * m, slam: true })
  // Mamoswine's huge curved tusks drive into the ground on landing.
  ;[-1, 1].forEach((side) => {
    const tusk = iceTusk(0.6, '#f1f5f9', 0.9)
    const right = new THREE.Vector3()
    fx(ctx, 200, 640, tusk, (p) => {
      right.crossVectors(forward(source, target), new THREE.Vector3(0, 1, 0))
      tusk.position
        .copy(bodyAt(source, 0.25)())
        .addScaledVector(right, side * 0.22)
        .addScaledVector(forward(source, target), 0.2)
      tusk.rotation.set(
        Math.PI + easeIn(phase(p, 0, 0.5)) * 0.5,
        Math.atan2(forward(source, target).x, forward(source, target).z),
        side * 0.25,
      )
      setOpacity(tusk, fadeInOut(p, 0.1, 0.3))
    })
  })
  const slam = 520
  groundCracks(ctx, ground(source), {
    color: '#78350f',
    count: 7,
    length: 2,
    width: 0.07,
    delay: slam,
    duration: 900,
  })
  shockwave(ctx, ground(source), {
    color: '#a16207',
    radius: 2.2,
    thickness: 0.22,
    delay: slam,
    duration: 560,
  })
  shockwave(ctx, ground(source), { color: ICE, radius: 1.6, delay: slam + 100, duration: 480 })
  spikes(ctx, ground(source), {
    color: ICE,
    count: 8,
    radius: 1,
    height: 0.5,
    solid: true,
    delay: slam + 40,
    duration: 620,
  })
  debris(ctx, ground(source), { color: '#92400e', count: 6, size: 0.11, speed: 2, delay: slam })
  shake(ctx, strength, slam)
  const victims = ring(ctx, source, target, 1.8)
  victims.forEach((victim, index) =>
    pushBack(ctx, victim, ground(source), { delay: slam + index * 50, distance: 0.45, lift: 0.2 }),
  )
  flinchAlong(ctx, source, victims, slam, 60)
  return slam
}

// ---------- Snubbull / Granbull ----------

const snubbullScaryFace: Choreography = (ctx, { source, target }) => {
  const face = () => bodyAt(source, 0.95)().addScaledVector(forward(source, target), 0.2)
  ;[-1, 1].forEach((side) =>
    glyphAt(
      ctx,
      () => {
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(ctx.camera.quaternion)
        return face().addScaledVector(right, side * 0.16)
      },
      () => eyeGlyph('#dc2626', 0.13, '#fef3c7'),
      { duration: 520, scale: 1.2 },
    ),
  )
  shiver(ctx, source, { duration: 360, amount: 0.04 })
  rush(ctx, source, target, { delay: 360, duration: 380, reach: 0.7 })
  const impact = 600
  fangs(ctx, target, {
    color: '#fef3c7',
    glowColor: PINK,
    size: 0.34,
    teeth: 2,
    delay: impact - 160,
    duration: 380,
  })
  burst(ctx, at(target), { color: PINK, count: 10, delay: impact, speed: 1.3 })
  shiver(ctx, target, { delay: 300, duration: 300, amount: 0.05 })
  dazeStars(ctx, target, { color: '#fde68a', delay: impact + 80 })
  reel(ctx, target, impact, 600)
  flinch(ctx, [target], impact)
  return impact
}

const granbullCrunch: Choreography = (ctx, { source, target }) => {
  crouch(ctx, source, { duration: 300 })
  aura(ctx, source, { color: '#a78bfa', count: 8, duration: 360 })
  rush(ctx, source, target, { delay: 240, duration: 480, reach: 0.8, outEnd: 0.35 })
  const impact = 520
  fangs(ctx, target, {
    color: '#f8fafc',
    glowColor: '#7c3aed',
    size: 0.55,
    teeth: 4,
    delay: impact - 200,
    duration: 440,
  })
  clawRake(ctx, at(target, 0.5), {
    color: '#ede9fe',
    edge: '#6d28d9',
    count: 2,
    size: 0.4,
    angle: 0.4,
    delay: impact - 20,
    duration: 260,
  })
  burst(ctx, at(target), { color: '#c4b5fd', count: 14, delay: impact, speed: 1.6 })
  shockwave(ctx, ground(target), { color: '#7c3aed', radius: 0.8, delay: impact, duration: 320 })
  pushBack(ctx, target, ground(source), { delay: impact, distance: 0.55, lift: 0.15 })
  flinch(ctx, [target], impact)
  return impact
}

// ---------- Shroomish / Breloom ----------

const shroomishSpore: Choreography = (ctx, { source, target }) => {
  squash(ctx, source, { duration: 360, amount: 0.2 })
  cloud(ctx, bodyAt(source, 0.9), {
    color: '#d9f99d',
    count: 6,
    radius: 0.3,
    size: 0.25,
    rise: 0.4,
    opacity: 0.5,
    delay: 120,
    duration: 600,
  })
  volley(ctx, bodyAt(source, 0.8), at(target, 0.7), {
    build: () =>
      new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), standard('#bef264', { roughness: 1 })),
    count: 7,
    spread: 0.25,
    arc: 0.6,
    delay: 200,
    duration: 360,
    stagger: 30,
  })
  const impact = 620
  cloud(ctx, at(target, 0.6), {
    color: '#a3e635',
    count: 7,
    radius: 0.4,
    size: 0.3,
    opacity: 0.45,
    delay: impact - 40,
    duration: 800,
  })
  driftMotes(ctx, ground(target), {
    colors: ['#d9f99d', '#fef08a'],
    count: 18,
    radius: 0.5,
    height: 1.2,
    cycles: -0.8,
    delay: impact,
    duration: 900,
  })
  zzz(ctx, target, { color: '#ecfccb', count: 3, delay: impact + 120, duration: 900 })
  fx(ctx, impact, 900, undefined, (p) => {
    target.pose.tilt += 0.2 * easeOut(phase(p, 0, 0.3)) * (1 - phase(p, 0.85, 1))
    target.pose.lift -= 0.05 * easeOut(phase(p, 0, 0.3))
  })
  return impact
}

const breloomMachPunch: Choreography = (ctx, { source, target }) => {
  crouch(ctx, source, { duration: 120 })
  motionLines(ctx, source, { color: '#bbf7d0', count: 8, delay: 60, duration: 260 })
  stretchLimb(ctx, source, target, {
    color: '#65a30d',
    fist: '#dc2626',
    thickness: 0.06,
    delay: 120,
    duration: 360,
  })
  const impact = 230
  shockwave(ctx, at(target), { color: '#fca5a5', radius: 0.6, delay: impact, duration: 260 })
  burst(ctx, at(target), { color: '#bef264', count: 12, delay: impact, speed: 2.2 })
  driftMotes(ctx, ground(target), {
    colors: ['#d9f99d', '#bbf7d0'],
    count: 10,
    radius: 0.4,
    height: 0.9,
    delay: impact,
    duration: 600,
  })
  dazeStars(ctx, target, { color: PALE_YELLOW, delay: impact + 80 })
  reel(ctx, target, impact, 520)
  flinch(ctx, [target], impact)
  return impact
}

// ---------- Makuhita / Hariyama ----------

const palmMaterial = (color: string) => () => standard(color, { roughness: 0.7 })

const makuhitaArmThrust: Choreography = (ctx, { source, target }) => {
  rush(ctx, source, target, { duration: 760, reach: 0.55, outEnd: 0.2, hold: 0.55 })
  const hits = [220, 320, 420, 520]
  hits.forEach((delay, index) => {
    const side = index % 2 ? 1 : -1
    const right = new THREE.Vector3()
    prop(ctx, source, target, {
      build: () => palmMesh(0.17, palmMaterial('#fde68a')),
      from: () => {
        right.crossVectors(forward(source, target), new THREE.Vector3(0, 1, 0))
        return bodyAt(source, 0.55)().addScaledVector(right, side * 0.2)
      },
      to: at(target, 0.5 + side * 0.08),
      delay: delay - 90,
      duration: 110,
      arc: 0,
      fadeOut: 0.3,
    })
    burst(ctx, at(target, 0.5 + side * 0.08), { color: '#fbbf24', count: 6, delay, speed: 1.2 })
  })
  const impact = hits[0]
  shockwave(ctx, at(target), { color: '#f59e0b', radius: 0.65, delay: hits[3], duration: 300 })
  pushBack(ctx, target, ground(source), { delay: hits[3], distance: 0.4 })
  flinch(ctx, [target], impact)
  flinch(ctx, [target], hits[3])
  return impact
}

const hariyamaForcePalm: Choreography = (ctx, { source, target }) => {
  crouch(ctx, source, { duration: 360 })
  aura(ctx, source, { color: '#f59e0b', count: 12, duration: 440 })
  rush(ctx, source, target, { delay: 260, duration: 520, reach: 0.65, outEnd: 0.32 })
  const palm = palmMesh(0.42, palmMaterial('#fcd34d'))
  const at0 = () => at(target)().addScaledVector(forward(source, target), -0.55)
  const impact = 470
  fx(ctx, 200, 520, palm, (p) => {
    palm.position
      .copy(at0())
      .addScaledVector(forward(source, target), easeIn(phase(p, 0.1, 0.52)) * 0.3)
    palm.lookAt(target.root.position.x, palm.position.y, target.root.position.z)
    palm.scale.setScalar(0.6 + 0.4 * easeOut(phase(p, 0, 0.4)))
    setOpacity(palm, fadeInOut(p, 0.1, 0.35))
  })
  shockwave(ctx, at(target), { color: '#fbbf24', radius: 0.9, delay: impact, duration: 340 })
  shockwave(ctx, ground(target), {
    color: '#d97706',
    radius: 1.1,
    delay: impact + 60,
    duration: 380,
  })
  burst(ctx, at(target), { color: '#fde68a', count: 14, delay: impact, speed: 1.8 })
  dazeStars(ctx, target, { color: PALE_YELLOW, delay: impact + 90 })
  reel(ctx, target, impact + 40, 640)
  flinch(ctx, [target], impact)
  return impact
}

// ---------- Aron line ----------

const aronHeadbutt: Choreography = (ctx, { source, target }) => {
  crouch(ctx, source, { duration: 280 })
  const body = rush(ctx, source, target, { delay: 200, duration: 480, reach: 0.85, outEnd: 0.35 })
  const helm = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    standard('#9ca3af', { metalness: 0.85, roughness: 0.3 }),
  )
  const pos = new THREE.Vector3()
  fx(ctx, 180, 500, helm, (p, now) => {
    body(now, pos)
    helm.position
      .copy(pos)
      .setY(pos.y + 0.2)
      .addScaledVector(forward(source, target), 0.15)
    helm.lookAt(target.root.position.x, helm.position.y + 0.3, target.root.position.z)
    setOpacity(helm, fadeInOut(p, 0.1, 0.3))
  })
  const impact = 370
  burst(ctx, at(target, 0.6), {
    color: '#fdba74',
    count: 14,
    delay: impact,
    speed: 2.2,
    gravity: 0.8,
  })
  burst(ctx, at(target, 0.6), { color: '#e5e7eb', count: 6, size: 0.05, delay: impact, speed: 2.6 })
  shockwave(ctx, at(target), { color: '#9ca3af', radius: 0.6, delay: impact, duration: 280 })
  flinch(ctx, [target], impact)
  return impact
}

const laironIronDefense: Choreography = (ctx, { target }) => {
  const self = target
  squash(ctx, self, { duration: 420, amount: 0.12 })
  armorPlates(ctx, self, { color: '#9ca3af', rim: '#e5e7eb', count: 6, duration: 800 })
  const impact = 460
  shell(ctx, self, {
    color: '#cbd5e1',
    edge: '#f1f5f9',
    radius: 0.55,
    material: 'metal',
    delay: impact,
    duration: 700,
  })
  burst(ctx, at(self), { color: '#e5e7eb', count: 10, size: 0.05, delay: impact, speed: 1.4 })
  halo(ctx, self, { color: '#94a3b8', direction: 'rise', delay: impact, duration: 500 })
  shockwave(ctx, ground(self), { color: '#64748b', radius: 0.8, delay: impact, duration: 360 })
  return impact
}

const aggronHeavySlam: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  crouch(ctx, source, { duration: 260 })
  leap(ctx, source, { delay: 180, duration: 560, height: 1.4 * m, slam: true })
  armorPlates(ctx, source, {
    color: '#6b7280',
    rim: '#d1d5db',
    count: 4,
    delay: 120,
    duration: 480,
  })
  const slam = 650
  groundCracks(ctx, ground(source), {
    color: '#374151',
    count: 8,
    length: 2,
    width: 0.08,
    delay: slam,
    duration: 900,
  })
  shockwave(ctx, ground(source), {
    color: '#9ca3af',
    radius: 2.1,
    thickness: 0.24,
    delay: slam,
    duration: 560,
  })
  shockwave(ctx, ground(source), { color: '#e5e7eb', radius: 1.3, delay: slam + 80, duration: 420 })
  debris(ctx, ground(source), { color: '#57534e', count: 8, size: 0.12, speed: 2.2, delay: slam })
  burst(ctx, ground(source), { color: '#fdba74', count: 14, delay: slam, spread: 'ring', speed: 2 })
  cloud(ctx, ground(source), {
    color: '#a8a29e',
    count: 7,
    radius: 1.2,
    size: 0.4,
    opacity: 0.45,
    delay: slam,
    duration: 700,
  })
  shake(ctx, strength + 1, slam, 360)
  const victims = ring(ctx, source, target, 1.8)
  victims.forEach((victim, index) =>
    pushBack(ctx, victim, ground(source), { delay: slam + index * 40, distance: 0.55, lift: 0.25 }),
  )
  flinchAlong(ctx, source, victims, slam, 50)
  return slam
}

// ---------- Electrike / Manectric ----------

const electrikeSpark: Choreography = (ctx, { source, target }) => {
  aura(ctx, source, { color: '#a3e635', count: 12, duration: 380 })
  zap(ctx, at(source, 0.9), at(source, 0.2), {
    color: YELLOW,
    delay: 60,
    duration: 160,
    segments: 5,
    jitter: 0.25,
  })
  rush(ctx, source, target, { delay: 180, duration: 460, reach: 0.9, outEnd: 0.32 })
  speedStreaks(ctx, bodyAt(source, 0.5), at(target), {
    color: '#bef264',
    count: 7,
    spread: 0.3,
    delay: 180,
    duration: 200,
  })
  const impact = 330
  zap(ctx, at(target, 0.9), at(target, 0.1), {
    color: YELLOW,
    delay: impact,
    duration: 220,
    segments: 6,
    jitter: 0.3,
  })
  zap(ctx, at(target, 0.5), ground(target), {
    color: '#a3e635',
    delay: impact + 40,
    duration: 200,
    segments: 4,
    jitter: 0.3,
  })
  burst(ctx, at(target), { color: '#d9f99d', count: 14, delay: impact, speed: 1.8 })
  flinch(ctx, [target], impact)
  return impact
}

const manectricThunder: Choreography = (ctx, { source, target, shake: strength }) => {
  const sky = above(target, 3.6)
  aura(ctx, source, { color: '#38bdf8', count: 14, duration: 500 })
  zap(ctx, at(source, 1), above(source, 3.6), {
    color: '#fde047',
    delay: 100,
    duration: 220,
    segments: 7,
    jitter: 0.35,
  })
  cloud(ctx, sky, {
    color: '#1e293b',
    count: 8,
    radius: 1,
    size: 0.55,
    rise: 0,
    opacity: 0.85,
    duration: 1100,
  })
  const strike = 520
  thickBolt(ctx, sky, ground(target), {
    color: '#fde047',
    core: '#fef9c3',
    width: 0.07,
    segments: 7,
    jitter: 0.5,
    delay: strike,
    duration: 340,
  })
  shockwave(ctx, ground(target), { color: '#38bdf8', radius: 1.8, delay: strike, duration: 480 })
  burst(ctx, at(target, 0.3), {
    color: PALE_YELLOW,
    count: 18,
    delay: strike,
    spread: 'up',
    speed: 2,
  })
  shake(ctx, strength, strike)
  const victims = [target, ...around(ctx, source, target, 1.6, 2)]
  victims.slice(1).forEach((victim, index) =>
    zap(ctx, sky, at(victim), {
      color: '#7dd3fc',
      delay: strike + 60 + index * 60,
      duration: 240,
      segments: 8,
      jitter: 0.45,
    }),
  )
  victims.forEach((victim, index) =>
    dazeStars(ctx, victim, { color: '#fde047', delay: strike + 120 + index * 40, duration: 800 }),
  )
  flinch(ctx, victims, strike, 60)
  return strike
}

// ---------- Spheal line ----------

const sphealPowderSnow: Choreography = (ctx, { source, target }) => {
  spin(ctx, source, { duration: 600, turns: 2 })
  squash(ctx, source, { duration: 600, amount: 0.1 })
  groundRing(ctx, ground(source), { color: SNOW, radius: 0.7, duration: 600 })
  cloud(ctx, ground(source), {
    color: SNOW,
    count: 8,
    radius: 0.9,
    size: 0.35,
    rise: 0.3,
    opacity: 0.55,
    delay: 200,
    duration: 650,
  })
  driftMotes(ctx, ground(source), {
    colors: [SNOW, '#bfdbfe'],
    count: 22,
    radius: 1.2,
    height: 0.8,
    swirl: 4,
    delay: 100,
    duration: 700,
  })
  const impact = 480
  const victims = ring(ctx, source, target)
  victims.forEach((victim, index) => {
    burst(ctx, at(victim, 0.4), {
      color: SNOW,
      count: 10,
      delay: impact + index * 50,
      spread: 'up',
      speed: 1,
    })
    glyphAt(ctx, at(victim, 0.7), () => snowflake(0.14), {
      delay: impact + index * 50,
      duration: 400,
      spin: -2,
    })
  })
  flinch(ctx, victims, impact, 50)
  return impact
}

const sealeoAuroraBeam: Choreography = (ctx, { source, target }) => {
  const nose = () => bodyAt(source, 0.95)().addScaledVector(forward(source, target), 0.15)
  // Sealeo balances a snowball on its nose before firing.
  const ball = iceChunk(0.1, '#e0f2fe')
  fx(ctx, 0, 380, ball, (p, now) => {
    ball.position.copy(nose()).setY(nose().y + 0.12 + Math.abs(Math.sin(p * Math.PI * 2)) * 0.12)
    ball.rotation.set(now * 0.02, 0, now * 0.03)
    setOpacity(ball, 1 - phase(p, 0.8, 1))
  })
  chargeOrb(ctx, nose, { color: '#a5f3fc', core: '#f0abfc', size: 0.22, delay: 200, duration: 260 })
  const impact = 560
  rayBeam(ctx, nose, beyond(source, target, 1.4), {
    colors: ['#f0abfc', '#a5f3fc', '#fde68a', '#86efac'],
    width: 0.12,
    twist: 4,
    delay: 420,
    duration: 520,
    grow: 0.25,
  })
  const victims = [target, ...inLine(ctx, source, target)]
  victims.forEach((victim, index) => {
    const delay = impact + index * 50
    burst(ctx, at(victim), { color: '#a5f3fc', count: 10, delay, speed: 1.3 })
    spikes(ctx, ground(victim), {
      color: ICE,
      count: 4,
      radius: 0.3,
      height: 0.3,
      solid: true,
      delay,
      duration: 520,
    })
  })
  flinchAlong(ctx, source, victims, impact - 60, 40)
  return impact
}

// Localized hail summon shared by Walrein and Glalie: a small grey-blue cloud above the caster and stones raining out.
function hailSummon(ctx: FxContext, source: UnitView, delay: number): void {
  const sky = above(source, 2.6)
  cloud(ctx, sky, {
    color: '#64748b',
    count: 7,
    radius: 0.9,
    size: 0.5,
    rise: 0,
    opacity: 0.7,
    delay,
    duration: 1000,
  })
  cloud(ctx, sky, {
    color: '#cbd5e1',
    count: 4,
    radius: 0.6,
    size: 0.35,
    rise: 0.05,
    opacity: 0.5,
    delay: delay + 80,
    duration: 900,
  })
  hailFall(ctx, ground(source), {
    count: 14,
    radius: 1.5,
    height: 2.4,
    size: 0.07,
    delay: delay + 180,
    duration: 900,
  })
}

const walreinHail: Choreography = (ctx, { source, target }) => {
  // Walrein raises its great ivory tusks and bellows up the storm.
  ;[-1, 1].forEach((side) => {
    const tusk = iceTusk(0.45, '#f8fafc', -0.5)
    const right = new THREE.Vector3()
    fx(ctx, 0, 640, tusk, (p) => {
      right.set(1, 0, 0).applyQuaternion(ctx.camera.quaternion)
      tusk.position.copy(bodyAt(source, 0.45)()).addScaledVector(right, side * 0.14)
      tusk.rotation.set(Math.PI - easeOut(phase(p, 0, 0.4)) * 0.4, cameraYaw(ctx), side * 0.15)
      setOpacity(tusk, fadeInOut(p, 0.1, 0.3))
    })
  })
  squash(ctx, source, { duration: 420, amount: 0.12 })
  hailSummon(ctx, source, 120)
  const impact = 720
  const victims = ring(ctx, source, target, 1.7)
  victims.forEach((victim, index) => {
    const delay = impact + index * 60
    shell(ctx, victim, {
      color: ICE,
      edge: SNOW,
      radius: 0.4,
      material: 'crystal',
      delay,
      duration: 600,
    })
    dazeStars(ctx, victim, { color: SNOW, delay: delay + 80, duration: 800 })
  })
  shockwave(ctx, ground(source), { color: ICE, radius: 1.8, delay: impact - 60, duration: 480 })
  flinch(ctx, victims, impact, 60)
  return impact
}

// ---------- Snorunt line ----------

const snoruntIcyWind: Choreography = (ctx, { source, target }) => {
  shiver(ctx, source, { duration: 360, amount: 0.04 })
  vortex(ctx, ground(source), {
    color: '#bfdbfe',
    secondary: SNOW,
    height: 1,
    radius: 1.2,
    rings: 3,
    delay: 100,
    duration: 620,
  })
  driftMotes(ctx, ground(source), {
    colors: [SNOW, ICE, '#fde68a'],
    count: 24,
    radius: 1.4,
    height: 1,
    swirl: 5,
    delay: 100,
    duration: 700,
  })
  const victims = ring(ctx, source, target)
  victims.forEach((victim, index) =>
    stream(ctx, bodyAt(source, 0.6), at(victim), {
      color: SNOW,
      count: 12,
      size: 0.08,
      spread: 0.2,
      wobble: 0.1,
      delay: 200 + index * 40,
      duration: 360,
    }),
  )
  const impact = 520
  victims.forEach((victim, index) => {
    const delay = impact + index * 50
    shiver(ctx, victim, { delay, duration: 700, amount: 0.06 })
    glyphAt(ctx, above(victim, victim.height + 0.2), () => snowflake(0.12), {
      delay,
      duration: 700,
      spin: 3,
    })
  })
  flinch(ctx, victims, impact, 50)
  return impact
}

const glalieHail: Choreography = (ctx, { source, target }) => {
  // Glalie's icy sphere spins and its jaw cracks open as the hail comes down.
  spin(ctx, source, { duration: 520, turns: 1 })
  shell(ctx, source, {
    color: '#e0f2fe',
    edge: '#1e293b',
    radius: 0.5,
    material: 'crystal',
    duration: 600,
  })
  ;[-1, 1].forEach((side) => {
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.32, 6),
      standard('#f1f5f9', { roughness: 0.3, flatShading: true }),
    )
    const right = new THREE.Vector3()
    fx(ctx, 0, 600, horn, (p) => {
      right.set(1, 0, 0).applyQuaternion(ctx.camera.quaternion)
      horn.position.copy(bodyAt(source, 1.02)()).addScaledVector(right, side * 0.24)
      horn.rotation.set(0, 0, -side * 0.5)
      setOpacity(horn, fadeInOut(p, 0.1, 0.3))
    })
  })
  hailSummon(ctx, source, 100)
  const impact = 700
  spikes(ctx, ground(source), {
    color: ICE,
    count: 8,
    radius: 1.1,
    height: 0.55,
    solid: true,
    delay: impact - 40,
    duration: 620,
  })
  const victims = ring(ctx, source, target, 1.7)
  victims.forEach((victim, index) => {
    const delay = impact + index * 60
    burst(ctx, at(victim, 0.5), { color: ICE, count: 10, delay, speed: 1.3 })
    dazeStars(ctx, victim, { color: SNOW, delay: delay + 80, duration: 800 })
  })
  flinch(ctx, victims, impact, 60)
  return impact
}

const froslassOminousWind: Choreography = (ctx, { source, target }) => {
  levitate(ctx, source, { duration: 800, height: 0.3, wobble: 0.1 })
  orbit(ctx, source, {
    color: '#c4b5fd',
    count: 4,
    radius: 0.45,
    heightFactor: 0.7,
    turns: 1.3,
    billboard: true,
    build: (index) => wispMesh(index % 2 ? '#a5b4fc' : '#e0e7ff', '#c084fc', 0.11),
    duration: 520,
  })
  const end = beyond(source, target, 1.4)
  volley(ctx, bodyAt(source, 0.7), end, {
    build: (index) => (index % 2 ? wispMesh('#a5b4fc', '#c084fc', 0.12) : snowflake(0.12)),
    count: 8,
    spread: 0.35,
    arc: 0.1,
    delay: 380,
    duration: 360,
    stagger: 25,
  })
  stream(ctx, bodyAt(source, 0.7), end, {
    color: '#ddd6fe',
    count: 24,
    size: 0.1,
    spread: 0.45,
    wobble: 0.2,
    delay: 360,
    duration: 480,
  })
  const impact = 600
  const victims = [target, ...inLine(ctx, source, target)]
  victims.forEach((victim, index) => {
    const delay = impact + index * 60
    slashArc(ctx, at(victim), {
      color: '#7c3aed',
      radius: 0.5,
      width: 0.08,
      angle: 2.2,
      delay,
      duration: 280,
    })
    burst(ctx, at(victim), { color: '#c7d2fe', count: 10, delay, speed: 1.2 })
  })
  flinchAlong(ctx, source, victims, impact - 60, 50)
  return impact
}

// ---------- Phanpy / Donphan ----------

const phanpyRollout: Choreography = (ctx, { source, target }) => {
  squash(ctx, source, { duration: 240, amount: 0.25 })
  const body = rush(ctx, source, target, {
    delay: 160,
    duration: 560,
    reach: 0.85,
    outEnd: 0.4,
    hold: 0.15,
  })
  rollingBody(ctx, body, {
    build: () => {
      const group = new THREE.Group()
      group.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.26, 16, 12),
          standard('#93c5fd', { roughness: 0.6 }),
        ),
        new THREE.Mesh(
          new THREE.TorusGeometry(0.26, 0.03, 6, 20),
          standard('#f87171', { roughness: 0.5 }),
        ),
      )
      return group
    },
    axis: forward(source, target),
    radius: 0.26,
    delay: 140,
    duration: 600,
    turns: 4,
  })
  fx(
    ctx,
    0,
    760,
    undefined,
    (p) => (source.pose.scale *= 1 - 0.85 * phase(p, 0.18, 0.24) * (1 - phase(p, 0.88, 0.95))),
  )
  burst(ctx, ground(source), { color: '#d6b98c', count: 10, delay: 180, spread: 'up', speed: 1 })
  const impact = 380
  burst(ctx, ground(target), {
    color: '#c8a878',
    count: 14,
    delay: impact,
    spread: 'up',
    speed: 1.4,
  })
  shockwave(ctx, ground(target), { color: '#a16207', radius: 0.8, delay: impact, duration: 320 })
  flinch(ctx, [target], impact)
  return impact
}

const donphanRapidSpin: Choreography = (ctx, { source, target }) => {
  const dir = forward(source, target)
  crouch(ctx, source, { duration: 240 })
  const body = rush(ctx, source, target, {
    delay: 180,
    duration: 700,
    reach: 1.2,
    outEnd: 0.42,
    hold: 0.12,
  })
  // Donphan curls into a ridged grey tyre, tusks flashing on each turn.
  rollingBody(ctx, body, {
    build: () => {
      const group = new THREE.Group()
      const tyre = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.14, 10, 24),
        standard('#4b5563', { roughness: 0.85, flatShading: true }),
      )
      group.add(tyre)
      for (let index = 0; index < 8; index++) {
        const ridge = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.06, 0.3),
          standard('#1f2937', { roughness: 0.9 }),
        )
        const angle = (index / 8) * Math.PI * 2
        ridge.position.set(Math.cos(angle) * 0.42, Math.sin(angle) * 0.42, 0)
        ridge.rotation.z = angle
        group.add(ridge)
      }
      ;[-1, 1].forEach((side) => {
        const tusk = iceTusk(0.24, '#f5f5f4', 0.6)
        tusk.position.set(0.2 * side, -0.3, 0.12)
        group.add(tusk)
      })
      group.rotation.y = Math.PI / 2
      const holder = new THREE.Group()
      holder.add(group)
      return holder
    },
    axis: dir,
    radius: 0.44,
    delay: 160,
    duration: 740,
    turns: 6,
  })
  fx(
    ctx,
    0,
    920,
    undefined,
    (p) => (source.pose.scale *= 1 - 0.85 * phase(p, 0.18, 0.24) * (1 - phase(p, 0.9, 0.96))),
  )
  groundRing(ctx, ground(source), { color: '#c8a878', radius: 0.7, delay: 180, duration: 400 })
  cloud(ctx, ground(source), {
    color: '#d6b98c',
    count: 5,
    radius: 0.4,
    size: 0.3,
    opacity: 0.45,
    delay: 200,
    duration: 600,
  })
  const impact = 480
  const victims = [target, ...inLine(ctx, source, target)]
  victims.forEach((victim, index) => {
    const delay = impact + index * 70
    burst(ctx, ground(victim), { color: '#c8a878', count: 12, delay, spread: 'up', speed: 1.6 })
    debris(ctx, ground(victim), { color: '#78716c', count: 4, size: 0.08, delay, speed: 1.4 })
    pushBack(ctx, victim, ground(source), { delay, distance: 0.55, lift: 0.2 })
  })
  flinch(ctx, victims, impact, 70)
  return impact
}

export const GEN23_TIER2_ULTIMATES: UltimateSet = {
  'mareep:Thunder Shock': mareepThunderShock,
  'flaaffy:Thunder Punch': flaaffyThunderPunch,
  'ampharos:Zap Cannon': ampharosZapCannon,
  'marill:Bubble': marillBubble,
  'azumarill:Rollout': azumarillRollout,
  'togepi:Charm': togepiCharm,
  'togetic:Wish': togeticWish,
  'togekiss:Air Slash': togekissAirSlash,
  'natu:Confuse Ray': natuConfuseRay,
  'xatu:Future Sight': xatuFutureSight,
  'sneasel:Quick Attack': sneaselQuickAttack,
  'weavile:Night Slash': weavileNightSlash,
  'murkrow:Pursuit': murkrowPursuit,
  'honchkrow:Sucker Punch': honchkrowSuckerPunch,
  'houndour:Ember': houndourEmber,
  'houndoom:Flamethrower': houndoomFlamethrower,
  'swinub:Powder Snow': swinubPowderSnow,
  'piloswine:Ice Fang': piloswineIceFang,
  'mamoswine:Earthquake': mamoswineEarthquake,
  'snubbull:Scary Face': snubbullScaryFace,
  'granbull:Crunch': granbullCrunch,
  'shroomish:Spore': shroomishSpore,
  'breloom:Mach Punch': breloomMachPunch,
  'makuhita:Arm Thrust': makuhitaArmThrust,
  'hariyama:Force Palm': hariyamaForcePalm,
  'aron:Headbutt': aronHeadbutt,
  'lairon:Iron Defense': laironIronDefense,
  'aggron:Heavy Slam': aggronHeavySlam,
  'electrike:Spark': electrikeSpark,
  'manectric:Thunder': manectricThunder,
  'spheal:Powder Snow': sphealPowderSnow,
  'sealeo:Aurora Beam': sealeoAuroraBeam,
  'walrein:Hail': walreinHail,
  'snorunt:Icy Wind': snoruntIcyWind,
  'glalie:Hail': glalieHail,
  'froslass:Ominous Wind': froslassOminousWind,
  'phanpy:Rollout': phanpyRollout,
  'donphan:Rapid Spin': donphanRapidSpin,
}
