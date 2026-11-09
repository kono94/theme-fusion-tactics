import * as THREE from 'three'
import type { UnitView } from '../../unitView'
import {
  acornMesh,
  backFlames,
  bodyGlint,
  clap,
  cocoon,
  dizzy,
  eyeRings,
  flameWheel,
  headFin,
  headLeaf,
  jaws,
  leafBladeMesh,
  lilyPad,
  mothWings,
  rainfall,
  silkStrands,
  soundRings,
  sunShafts,
  tailPaddle,
  waterfallColumn,
  zigzagCharge,
} from '../kit/gen23Tier1'
import {
  above,
  ahead,
  alliesAround,
  beakJab,
  beyond,
  bloom,
  bodyAt,
  bubbles,
  coil,
  driftMotes,
  enemiesAround,
  enemiesInLine,
  flames,
  flatDirection,
  flinch,
  flinchAlong,
  groundCracks,
  heartGeometry,
  lifeDrain,
  makeGlob,
  motionLines,
  noteGeometry,
  powderFall,
  puddle,
  rush,
  scorchTrail,
  shell,
  shiver,
  speedStreaks,
  splashCrown,
  squash,
  statArrows,
  stream,
  swing,
  waterJet,
  waveWall,
  zzz,
} from '../kit/shared'
import {
  at,
  aura,
  burst,
  cameraPunch,
  cloud,
  crouch,
  dash,
  flare,
  type FxContext,
  glow,
  ground,
  halo,
  leafMesh,
  leap,
  levitate,
  meteor,
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
  trail,
  vortex,
} from '../primitives'
import type { Choreography, UltimateSet } from '../types'

const LEAF = '#65a30d'
const LEAF_LIGHT = '#bef264'
const HEAL = '#86efac'
const FIRE = '#f97316'
const FIRE_DEEP = '#dc2626'
const FLAME_CORE = '#fde047'
const WATER = '#3b82f6'
const FOAM = '#dbeafe'
const MUD = '#92400e'
const MUD_LIGHT = '#c08a4a'
const PSYCHIC = '#c084fc'
const SHADOW = '#27272a'

// Melee units close the gap; ranged casters (and reduced motion) stay on their tile and crouch.
function rushIn(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: { delay?: number; duration: number; through?: boolean; hold?: number },
): void {
  if (ctx.reducedMotion || source.unit.range > 1)
    crouch(ctx, source, { delay: options.delay, duration: 240 })
  else dash(ctx, source, target, options)
}

const withTarget = (target: UnitView, others: UnitView[], limit: number): UnitView[] =>
  [target, ...others.filter((other) => other !== target)].slice(0, limit)

const lineVictims = (ctx: FxContext, source: UnitView, target: UnitView, overshoot = 1.5) =>
  withTarget(target, enemiesInLine(ctx, source, target, { overshoot, limit: 3 }), 4)

// ---- Johto starters ----

const chikoritaSynthesis: Choreography = (ctx, { source }) => {
  crouch(ctx, source, { duration: 320 })
  levitate(ctx, source, { delay: 120, duration: 800, height: 0.1, wobble: 0.05 })
  headLeaf(ctx, source, { size: 0.3, duration: 1200, sway: 0.6 })
  sunShafts(ctx, source, { duration: 1100 })
  driftMotes(ctx, ground(source), {
    colors: ['#fde68a', LEAF_LIGHT],
    count: 24,
    radius: 0.6,
    height: 1.4,
    cycles: -1,
    size: 0.04,
    delay: 80,
    duration: 1000,
  })
  const impact = 520
  alliesAround(ctx, source, 2.6, 5).forEach((ally, index) => {
    const delay = impact + index * 70
    if (ally !== source)
      stream(ctx, bodyAt(source, 1), bodyAt(ally, 0.6), {
        color: LEAF_LIGHT,
        count: 8,
        spread: 0.15,
        delay: delay - 220,
        duration: 420,
        travel: 0.6,
      })
    halo(ctx, ally, { color: HEAL, direction: 'rise', delay, duration: 700 })
  })
  return impact
}

const bayleefReflect: Choreography = (ctx, { source }) => {
  crouch(ctx, source, { duration: 300 })
  spin(ctx, source, { delay: 120, duration: 480, turns: ctx.reducedMotion ? 0 : 1 })
  orbit(ctx, source, {
    color: LEAF,
    count: 6,
    radius: 0.32,
    heightFactor: 0.75,
    turns: 1.5,
    collapse: 2.6,
    build: (index) => leafMesh(index % 2 ? '#84cc16' : '#4d7c0f', 0.12),
    duration: 600,
  })
  shockwave(ctx, ground(source), { color: '#a3e635', delay: 260, radius: 2.8, duration: 600 })
  const impact = 340
  alliesAround(ctx, source, 2.8, 5).forEach((ally, index) => {
    const delay = impact + index * 60
    orbit(ctx, ally, {
      color: LEAF,
      count: 8,
      radius: 0.58,
      heightFactor: 0.5,
      turns: 0.5,
      build: (leaf) => {
        const mesh = leafMesh(leaf % 2 ? '#4d7c0f' : '#84cc16', 0.2)
        mesh.rotation.x = Math.PI / 2
        return mesh
      },
      delay,
      duration: 950,
    })
    shell(ctx, ally, {
      color: '#d9f99d',
      edge: '#4d7c0f',
      radius: 0.62,
      detail: 0,
      material: 'crystal',
      delay: delay + 60,
      duration: 900,
    })
  })
  return impact
}

const meganiumAromatherapy: Choreography = (ctx, { source }) => {
  crouch(ctx, source, { duration: 360 })
  bloom(ctx, source, {
    petal: '#f9a8d4',
    center: FLAME_CORE,
    petals: 10,
    size: 0.32,
    height: -0.05,
    duration: 1400,
  })
  driftMotes(ctx, ground(source), {
    colors: ['#fbcfe8', '#f472b6', '#fef08a'],
    count: 36,
    radius: 2.4,
    height: 1.6,
    swirl: 2.5,
    size: 0.05,
    delay: 200,
    duration: 1300,
  })
  shockwave(ctx, ground(source), { color: '#f9a8d4', delay: 300, radius: 2.8, duration: 700 })
  const impact = 560
  alliesAround(ctx, source, 2.8, 5).forEach((ally, index) => {
    const delay = impact + index * 70
    orbit(ctx, ally, {
      color: '#f472b6',
      count: 3,
      radius: 0.38,
      heightFactor: 0.8,
      turns: 1,
      billboard: true,
      build: () => new THREE.Mesh(heartGeometry(0.06), glow('#f9a8d4', 0.8)),
      delay,
      duration: 800,
    })
    halo(ctx, ally, { color: HEAL, direction: 'rise', delay: delay + 80, duration: 700 })
  })
  return impact
}

const cyndaquilEmber: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 260 })
  backFlames(ctx, source, target, { color: FIRE, core: FLAME_CORE, height: 0.45, duration: 900 })
  const mouth = ahead(source, target, 0.28, 0.5)
  ;[0.2, 0.45, 0.32].forEach((arc, index) => {
    projectile(ctx, source, target, {
      color: FIRE,
      core: FLAME_CORE,
      delay: 200 + index * 70,
      duration: 260,
      size: 0.07,
      arc,
      from: mouth,
    })
  })
  const impact = 200 + 70 * 2 + 260
  burst(ctx, at(target), { color: FIRE, count: 12, delay: impact - 80, speed: 1.2, spread: 'up' })
  flames(ctx, ground(target), {
    color: FIRE,
    core: FLAME_CORE,
    count: 5,
    radius: 0.25,
    height: 0.45,
    delay: impact,
    duration: 1000,
  })
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const quilavaFlameWheel: Choreography = (ctx, { source, target, shake: strength }) => {
  backFlames(ctx, source, target, {
    color: FIRE,
    height: 0.7,
    count: 8,
    radius: 0.28,
    duration: 1000,
  })
  crouch(ctx, source, { duration: 240 })
  const position = rush(ctx, source, target, {
    delay: 220,
    duration: 700,
    reach: 1.15,
    hold: 0.1,
    outEnd: 0.4,
  })
  flameWheel(ctx, position, flatDirection(source, target), { delay: 200, duration: 740 })
  scorchTrail(ctx, ground(source), beyond(source, target, 1.2, 0), {
    width: 0.5,
    delay: 300,
    duration: 1200,
  })
  const impact = 220 + 700 * 0.4
  const victims = lineVictims(ctx, source, target, 1.4)
  victims.forEach((victim, index) =>
    flames(ctx, ground(victim), {
      color: index ? '#fb923c' : FIRE,
      count: 4,
      radius: 0.22,
      height: 0.4,
      delay: impact + index * 60,
      duration: 900,
    }),
  )
  flinchAlong(ctx, source, victims.slice(1), impact - 120, 90)
  shake(ctx, strength, impact)
  return impact
}

const typhlosionEruption: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 420 })
  shiver(ctx, source, { duration: 420, amount: 0.04 })
  backFlames(ctx, source, target, {
    color: FIRE_DEEP,
    core: '#fdba74',
    height: 1,
    count: 9,
    radius: 0.36,
    duration: 1400,
  })
  const impact = 480
  pillar(ctx, ground(source), {
    color: '#ea580c',
    delay: impact - 80,
    duration: 650,
    height: 2.4,
    radius: 0.4,
  })
  shockwave(ctx, ground(source), { color: FIRE, delay: impact, radius: 2.6, duration: 650 })
  groundCracks(ctx, ground(source), {
    color: '#f97316',
    count: 7,
    length: 1.6,
    delay: impact,
    duration: 1100,
  })
  const victims = withTarget(target, enemiesAround(ctx, source, source, 2.4), 4)
  victims.forEach((victim, index) => {
    const land = impact + 120 + index * 70
    meteor(ctx, ground(victim), {
      color: '#7c2d12',
      trail: FIRE,
      delay: land - 300,
      duration: 300,
      size: 0.14,
      height: 3,
    })
    flames(ctx, ground(victim), {
      color: FIRE,
      core: FLAME_CORE,
      count: 5,
      radius: 0.28,
      height: 0.55,
      delay: land,
      duration: 1000,
    })
  })
  cloud(ctx, above(source, 1.6), {
    color: '#44403c',
    count: 6,
    radius: 0.8,
    size: 0.4,
    rise: 0.8,
    opacity: 0.3,
    delay: impact,
    duration: 1200,
  })
  flinch(ctx, victims.slice(1), impact + 120, 70)
  cameraPunch(ctx, ground(source), 0.4, impact - 40)
  shake(ctx, strength + 1, impact, 500)
  return impact
}

const totodileBite: Choreography = (ctx, { source, target, shake: strength }) => {
  rushIn(ctx, source, target, { delay: 80, duration: 520, hold: 0.25 })
  jaws(ctx, target, {
    color: WATER,
    rim: '#93c5fd',
    teeth: 4,
    size: 0.4,
    snapAt: 0.5,
    delay: 120,
    duration: 560,
  })
  const impact = 120 + 280
  splashCrown(ctx, ground(target), {
    radius: 0.35,
    height: 0.6,
    tips: 10,
    delay: impact,
    duration: 650,
  })
  burst(ctx, at(target), { color: FOAM, count: 14, delay: impact, speed: 1.6, gravity: 2.5 })
  squash(ctx, target, { delay: impact, duration: 260, amount: 0.12 })
  shake(ctx, strength, impact)
  return impact
}

const croconawIceFang: Choreography = (ctx, { source, target, shake: strength }) => {
  rushIn(ctx, source, target, { delay: 60, duration: 560, hold: 0.25 })
  burst(ctx, bodyAt(source, 0.6), { color: '#e0f2fe', count: 10, speed: 0.6, duration: 400 })
  jaws(ctx, target, {
    color: '#7dd3fc',
    rim: '#e0f2fe',
    teeth: 6,
    size: 0.46,
    snapAt: 0.45,
    delay: 120,
    duration: 600,
  })
  const impact = 120 + 270
  spikes(ctx, ground(target), {
    color: '#bae6fd',
    count: 6,
    radius: 0.4,
    height: 0.6,
    width: 0.1,
    solid: true,
    delay: impact,
    duration: 1000,
  })
  cloud(ctx, ground(target), {
    color: '#e0f2fe',
    count: 5,
    radius: 0.5,
    size: 0.25,
    opacity: 0.3,
    delay: impact,
    duration: 800,
  })
  shiver(ctx, target, { delay: impact, duration: 800, amount: 0.04, speed: 60 })
  dizzy(ctx, target, { color: '#bae6fd', delay: impact + 100, duration: 900 })
  shake(ctx, strength, impact)
  return impact
}

const feraligatrWaterfall: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 260 })
  leap(ctx, source, { delay: 180, duration: 560, height: 0.9, slam: true })
  waterfallColumn(ctx, ground(target), { radius: 0.4, height: 3.4, delay: 160, duration: 820 })
  const impact = 160 + 820 * 0.35
  splashCrown(ctx, ground(target), {
    radius: 0.75,
    height: 1.1,
    tips: 16,
    delay: impact,
    duration: 900,
  })
  shockwave(ctx, ground(target), { color: WATER, delay: impact, radius: 2, duration: 650 })
  cloud(ctx, at(target, 0.4), {
    color: FOAM,
    count: 6,
    radius: 0.6,
    size: 0.3,
    opacity: 0.25,
    delay: impact + 120,
    duration: 900,
  })
  pushBack(ctx, target, at(source), { delay: impact, duration: 520, distance: 0.5, lift: 0.12 })
  const others = enemiesAround(ctx, source, target, 1.3).slice(0, 2)
  others.forEach((victim) =>
    pushBack(ctx, victim, ground(target), { delay: impact + 60, duration: 420, distance: 0.25 }),
  )
  flinch(ctx, others, impact + 60, 50)
  cameraPunch(ctx, at(target), 0.45, impact - 40)
  shake(ctx, strength + 1, impact, 450)
  return impact
}

// ---- Hoenn starters ----

const treeckoPound: Choreography = (ctx, { source, target, shake: strength }) => {
  rushIn(ctx, source, target, { delay: 60, duration: 560, hold: 0.3 })
  swing(ctx, source, target, tailPaddle(0.42), {
    from: -1.8,
    to: 1.3,
    height: 0.35,
    roll: 1.4,
    delay: 60,
    duration: 480,
  })
  const impact = 60 + 480 * 0.65
  squash(ctx, target, { delay: impact, duration: 280, amount: 0.18 })
  orbit(ctx, target, {
    color: LEAF,
    count: 5,
    radius: 0.2,
    turns: 0.6,
    collapse: 4,
    build: (index) => leafMesh(index % 2 ? '#22c55e' : '#166534', 0.09),
    delay: impact,
    duration: 500,
  })
  shockwave(ctx, ground(target), { color: '#4ade80', delay: impact, radius: 0.9, duration: 380 })
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const grovyleFuryCutter: Choreography = (ctx, { source, target, shake: strength }) => {
  rushIn(ctx, source, target, { delay: 40, duration: 900, hold: 0.55 })
  const hits = [0, 1, 2].map((index) => 200 + index * 170)
  hits.forEach((hit, index) => {
    const side = index % 2 ? -1 : 1
    swing(ctx, source, target, leafBladeMesh(0.38 + index * 0.08, '#22c55e', '#dcfce7'), {
      from: -1.6,
      to: 1.6,
      height: 0.6,
      roll: side * 0.9,
      delay: hit - 160,
      duration: 260,
      windup: 0.4,
    })
    slashArc(ctx, at(target), {
      color: index === 2 ? '#86efac' : '#22c55e',
      delay: hit,
      angle: side * (0.7 + index * 0.25),
      radius: 0.45 + index * 0.12,
      width: 0.08 + index * 0.03,
      sweep: 1.4,
    })
    burst(ctx, at(target), {
      color: '#4ade80',
      count: 6 + index * 4,
      delay: hit,
      speed: 1 + index * 0.4,
    })
  })
  const impact = hits[2]
  flinch(ctx, [target], hits[0], 0)
  flinch(ctx, [target], hits[1], 0)
  shake(ctx, strength, impact)
  return impact
}

const sceptileLeafBlade: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 260 })
  ;[1, -1].forEach((side) =>
    swing(ctx, source, target, leafBladeMesh(0.7, '#16a34a', '#bbf7d0'), {
      from: -2,
      to: 1.4,
      height: 0.65,
      roll: side * 1.2,
      delay: 120,
      duration: 560,
      windup: 0.5,
    }),
  )
  dash(ctx, source, target, { delay: 260, duration: 520, through: true, hold: 0.2 })
  motionLines(ctx, source, { color: '#4ade80', count: 8, delay: 260, duration: 400 })
  const far = beyond(source, target, 1.6)
  speedStreaks(ctx, bodyAt(source, 0.6), far, {
    color: '#22c55e',
    count: 10,
    spread: 0.45,
    delay: 280,
    duration: 380,
  })
  const impact = 400
  const victims = lineVictims(ctx, source, target, 1.6)
  victims.forEach((victim, index) => {
    slashArc(ctx, at(victim), {
      color: index ? '#4ade80' : '#86efac',
      delay: impact + index * 60,
      angle: -0.5,
      radius: 0.7,
      width: 0.12,
      sweep: 2,
    })
    burst(ctx, at(victim), { color: LEAF_LIGHT, count: 10, delay: impact + index * 60, speed: 1.6 })
  })
  flinchAlong(ctx, source, victims.slice(1), impact - 80, 70)
  shake(ctx, strength + 1, impact)
  return impact
}

const torchicPeck: Choreography = (ctx, { source, target, shake: strength }) => {
  rushIn(ctx, source, target, { delay: 40, duration: 560, hold: 0.4 })
  ;[0.08, -0.08].forEach((side, index) =>
    beakJab(ctx, source, target, {
      color: '#facc15',
      size: 0.07,
      side,
      height: 0.6,
      delay: 120 + index * 170,
      duration: 220,
    }),
  )
  const impact = 120 + 170 + 110
  burst(ctx, at(target), { color: '#fb923c', count: 8, delay: 230, speed: 1 })
  burst(ctx, at(target), { color: FLAME_CORE, count: 10, delay: impact, speed: 1.3, spread: 'up' })
  flames(ctx, ground(target), {
    color: '#fb923c',
    core: FLAME_CORE,
    count: 4,
    radius: 0.2,
    height: 0.38,
    delay: impact,
    duration: 900,
  })
  flinch(ctx, [target], 230, 0)
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const combuskenDoubleKick: Choreography = (ctx, { source, target, shake: strength }) => {
  rushIn(ctx, source, target, { delay: 40, duration: 700, hold: 0.45 })
  flames(ctx, bodyAt(source, 0.2), {
    color: '#ea580c',
    core: FLAME_CORE,
    count: 4,
    radius: 0.12,
    height: 0.25,
    duration: 700,
  })
  const kicks = [220, 400]
  kicks.forEach((kick, index) => {
    slashArc(ctx, at(target, index ? 0.7 : 0.35), {
      color: index ? FIRE : '#fdba74',
      delay: kick,
      angle: index ? 0.9 : -0.3,
      radius: 0.5,
      width: 0.12,
      sweep: 1.6,
    })
    flare(ctx, at(target, index ? 0.7 : 0.35), {
      color: FIRE,
      core: FLAME_CORE,
      size: 0.3,
      rays: 4,
      delay: kick,
    })
  })
  const impact = kicks[1]
  flinch(ctx, [target], kicks[0], 0)
  pushBack(ctx, target, at(source), { delay: impact, duration: 460, distance: 0.45, lift: 0.08 })
  shake(ctx, strength, impact)
  return impact
}

const blazikenBlazeKick: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 260 })
  flames(ctx, bodyAt(source, 0.5), {
    color: FIRE_DEEP,
    core: '#fdba74',
    count: 5,
    radius: 0.32,
    height: 0.35,
    duration: 900,
  })
  rushIn(ctx, source, target, { delay: 160, duration: 700, hold: 0.35 })
  leap(ctx, source, { delay: 180, duration: 480, height: 0.7 })
  flames(ctx, ahead(source, target, 0.25, 0.25), {
    color: FIRE,
    core: FLAME_CORE,
    count: 6,
    radius: 0.15,
    height: 0.45,
    delay: 160,
    duration: 600,
  })
  trail(ctx, source, { color: FIRE, delay: 200, duration: 420 })
  const impact = 520
  slashArc(ctx, at(target), {
    color: FIRE,
    delay: impact - 40,
    angle: 2.4,
    radius: 0.75,
    width: 0.18,
    sweep: 2.2,
  })
  slashArc(ctx, at(target), {
    color: FLAME_CORE,
    delay: impact,
    angle: 2.4,
    radius: 0.6,
    width: 0.08,
    sweep: 2,
  })
  flare(ctx, at(target, 0.7), {
    color: FIRE_DEEP,
    core: FLAME_CORE,
    size: 0.45,
    rays: 6,
    delay: impact,
  })
  pillar(ctx, ground(target), {
    color: FIRE,
    delay: impact,
    duration: 420,
    height: 1.2,
    radius: 0.28,
  })
  flames(ctx, ground(target), {
    color: FIRE,
    core: FLAME_CORE,
    count: 5,
    radius: 0.26,
    height: 0.5,
    delay: impact + 80,
    duration: 1000,
  })
  dizzy(ctx, target, { delay: impact + 120, duration: 900 })
  cameraPunch(ctx, at(target), 0.35, impact - 40)
  shake(ctx, strength + 1, impact)
  return impact
}

const mudkipWaterGun: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 220 })
  headFin(ctx, source, { duration: 1000 })
  const mouth = ahead(source, target, 0.28, 0.45)
  waterJet(ctx, mouth, beyond(source, target, 1.5), {
    radius: 0.07,
    flare: 1.3,
    rings: 2,
    spray: 16,
    delay: 200,
    duration: 560,
  })
  pushBack(ctx, source, at(target), { delay: 200, duration: 360, distance: 0.12 })
  const impact = 300
  const victims = lineVictims(ctx, source, target, 1.5)
  victims.forEach((victim, index) =>
    splashCrown(ctx, ground(victim), {
      radius: 0.3,
      height: 0.45,
      tips: 8,
      delay: impact + index * 60,
      duration: 600,
    }),
  )
  bubbles(ctx, mouth, at(target), {
    color: '#bfdbfe',
    count: 6,
    size: 0.06,
    delay: 520,
    duration: 500,
  })
  flinchAlong(ctx, source, victims.slice(1), impact - 60, 60)
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const marshtompMudShot: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 260 })
  burst(ctx, ground(source), {
    color: MUD_LIGHT,
    count: 10,
    spread: 'up',
    speed: 0.9,
    duration: 420,
  })
  const victims = lineVictims(ctx, source, target, 1.5)
  const hand = ahead(source, target, 0.25, 0.6)
  victims.forEach((victim, index) => {
    const delay = 180 + index * 90
    prop(ctx, source, victim, {
      build: () => makeGlob(index ? MUD_LIGHT : MUD, 0.12, 0.35),
      from: hand,
      delay,
      duration: 300,
      arc: 0.4,
      spin: 6,
    })
    puddle(ctx, ground(victim), {
      color: '#78350f',
      radius: 0.45,
      delay: delay + 300,
      duration: 1100,
      bubbles: MUD_LIGHT,
    })
    burst(ctx, at(victim, 0.4), {
      color: MUD_LIGHT,
      count: 10,
      delay: delay + 300,
      speed: 1.2,
      gravity: 3,
    })
  })
  const impact = 480
  shiver(ctx, target, { delay: impact, duration: 700, amount: 0.03 })
  dizzy(ctx, target, { color: '#d6b48a', delay: impact + 100, duration: 800 })
  flinch(ctx, victims.slice(1), impact + 90, 90)
  shake(ctx, strength, impact)
  return impact
}

const swampertMuddyWater: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 340 })
  squash(ctx, source, { delay: 300, duration: 300, amount: 0.12 })
  const impact = 380
  waveWall(ctx, ground(source), {
    color: '#a16207',
    crest: '#e7d3a8',
    radius: 2.4,
    height: 0.9,
    delay: impact - 120,
    duration: 900,
  })
  waveWall(ctx, ground(source), {
    color: MUD,
    crest: MUD_LIGHT,
    radius: 1.6,
    height: 0.6,
    delay: impact,
    duration: 800,
  })
  shockwave(ctx, ground(source), { color: '#b45309', delay: impact, radius: 2.4, duration: 600 })
  const victims = withTarget(target, enemiesAround(ctx, source, source, 2.4), 4)
  victims.forEach((victim, index) => {
    const hit = impact + 120 + index * 50
    splashCrown(ctx, ground(victim), {
      color: '#a16207',
      foam: '#e7d3a8',
      radius: 0.35,
      height: 0.6,
      tips: 8,
      delay: hit,
      duration: 600,
    })
    pushBack(ctx, victim, ground(source), { delay: hit, duration: 480, distance: 0.45, lift: 0.08 })
  })
  cameraPunch(ctx, ground(source), 0.35, impact)
  shake(ctx, strength + 1, impact, 450)
  return impact
}

// ---- Early routes ----

const hoothootHypnosis: Choreography = (ctx, { source, target, shake: strength }) => {
  levitate(ctx, source, { duration: 900, height: 0.15, wobble: 0.1 })
  eyeRings(ctx, source, { rim: '#dc2626', iris: PSYCHIC, duration: 900 })
  soundRings(ctx, bodyAt(source, 0.75), at(target, 0.75), {
    colors: [PSYCHIC, '#f0abfc'],
    count: 6,
    size: 0.14,
    grow: 1.4,
    delay: 220,
    duration: 620,
  })
  const impact = 560
  zzz(ctx, target, { color: '#e9d5ff', delay: impact, duration: 1100 })
  levitate(ctx, target, { delay: impact, duration: 900, height: 0, wobble: 0.14 })
  halo(ctx, target, { color: PSYCHIC, direction: 'fall', delay: impact, duration: 600 })
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const noctowlExtrasensory: Choreography = (ctx, { source, target, shake: strength }) => {
  levitate(ctx, source, { duration: 1100, height: 0.35, wobble: 0.06 })
  eyeRings(ctx, source, { rim: '#fde047', iris: '#ef4444', duration: 1000 })
  sigil(ctx, ground(source), {
    color: PSYCHIC,
    secondary: '#f0abfc',
    radius: 1.6,
    points: 6,
    delay: 100,
    duration: 1000,
  })
  const impact = 460
  shockwave(ctx, at(source, 0.7), {
    color: PSYCHIC,
    delay: impact - 60,
    radius: 2.4,
    duration: 600,
    height: 0.2,
  })
  shockwave(ctx, at(source, 0.7), {
    color: '#f0abfc',
    delay: impact + 80,
    radius: 1.8,
    duration: 520,
  })
  const victims = withTarget(target, enemiesAround(ctx, source, source, 2.4), 4)
  victims.forEach((victim, index) => {
    const delay = impact + index * 70
    levitate(ctx, victim, { delay, duration: 800, height: 0.18, wobble: 0.12 })
    dizzy(ctx, victim, { color: '#f0abfc', delay: delay + 80, duration: 900 })
  })
  flinch(ctx, victims.slice(1), impact, 70)
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const poochyenaBite: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 220 })
  bodyGlint(ctx, source, '#ef4444', 60)
  rushIn(ctx, source, target, { delay: 160, duration: 480, hold: 0.25 })
  leap(ctx, source, { delay: 160, duration: 300, height: 0.35 })
  jaws(ctx, target, {
    color: SHADOW,
    rim: '#991b1b',
    teeth: 4,
    size: 0.36,
    solid: true,
    snapAt: 0.5,
    delay: 160,
    duration: 480,
  })
  const impact = 160 + 240
  cloud(ctx, at(target, 0.5), {
    color: '#3f3f46',
    count: 4,
    radius: 0.35,
    size: 0.22,
    opacity: 0.35,
    delay: impact,
    duration: 600,
  })
  burst(ctx, at(target), { color: '#52525b', count: 10, delay: impact, speed: 1.2 })
  shake(ctx, strength, impact)
  return impact
}

const mightyenaCrunch: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 300 })
  bodyGlint(ctx, source, '#ef4444', 80)
  aura(ctx, source, { color: '#52525b', duration: 600, count: 12 })
  rushIn(ctx, source, target, { delay: 200, duration: 560, hold: 0.3 })
  jaws(ctx, target, {
    color: '#18181b',
    rim: '#ef4444',
    teeth: 6,
    size: 0.56,
    solid: true,
    snapAt: 0.45,
    delay: 200,
    duration: 600,
  })
  const impact = 200 + 270
  groundCracks(ctx, ground(target), {
    color: '#7f1d1d',
    count: 5,
    length: 0.8,
    delay: impact,
    duration: 900,
  })
  squash(ctx, target, { delay: impact, duration: 320, amount: 0.22 })
  burst(ctx, at(target), { color: '#a1a1aa', count: 14, delay: impact, speed: 1.6, gravity: 2 })
  cloud(ctx, ground(target), {
    color: SHADOW,
    count: 5,
    radius: 0.5,
    opacity: 0.35,
    delay: impact,
    duration: 700,
  })
  shake(ctx, strength + 1, impact)
  return impact
}

const zigzagoonHeadbutt: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 200 })
  zigzagCharge(ctx, source, target, { delay: 140, duration: 640, zigs: 3 })
  motionLines(ctx, source, { color: '#d6b48a', count: 6, delay: 140, duration: 380 })
  const impact = 140 + 640 * 0.6
  flare(ctx, at(target, 0.65), {
    color: '#fde68a',
    core: '#fef3c7',
    size: 0.3,
    rays: 5,
    delay: impact,
  })
  burst(ctx, at(target, 0.65), { color: '#d6b48a', count: 10, delay: impact, speed: 1.2 })
  squash(ctx, target, { delay: impact, duration: 260, amount: 0.16 })
  dizzy(ctx, target, { delay: impact + 80, duration: 850 })
  shake(ctx, strength, impact)
  return impact
}

const linooneExtremeSpeed: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 200 })
  dash(ctx, source, target, { delay: 160, duration: 380, through: true, hold: 0.15 })
  motionLines(ctx, source, { color: '#f5f5f4', count: 10, delay: 160, duration: 340 })
  speedStreaks(ctx, bodyAt(source, 0.35), beyond(source, target, 1.8, 0.35), {
    color: '#a8743f',
    count: 12,
    spread: 0.35,
    delay: 170,
    duration: 320,
  })
  const impact = 260
  const victims = lineVictims(ctx, source, target, 1.8)
  victims.forEach((victim, index) =>
    slashArc(ctx, at(victim, 0.4), {
      color: index % 2 ? '#e7e5e4' : '#d6b48a',
      delay: impact + index * 40,
      angle: 0,
      radius: 0.55,
      width: 0.07,
      sweep: 1.8,
    }),
  )
  burst(ctx, ground(target), { color: '#d6d3d1', count: 10, delay: impact, spread: 'up', speed: 1 })
  flinchAlong(ctx, source, victims.slice(1), impact - 60, 40)
  shake(ctx, strength, impact)
  return impact
}

const wurmpleStringShot: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 220 })
  squash(ctx, source, { delay: 120, duration: 240, amount: 0.12 })
  silkStrands(ctx, ahead(source, target, 0.25, 0.45), target, {
    color: '#fef9c3',
    lanes: [-1, 0, 1],
    delay: 140,
    duration: 800,
  })
  const impact = 140 + 800 * 0.28
  coil(ctx, target, {
    color: '#fefce8',
    delay: impact,
    duration: 1000,
    turns: 5,
    thickness: 0.016,
    radius: 0.36,
  })
  spikes(ctx, ground(target), {
    color: '#fef9c3',
    count: 4,
    radius: 0.45,
    height: 0.35,
    width: 0.03,
    tilt: 0.9,
    delay: impact + 80,
    duration: 900,
  })
  levitate(ctx, target, { delay: impact, duration: 800, height: 0, wobble: 0.12 })
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const silcoonHarden: Choreography = (ctx, { source }) => {
  crouch(ctx, source, { duration: 280 })
  silkStrands(ctx, above(source, 1.6), source, { color: '#f5f5f4', lanes: [-1, 1], duration: 500 })
  cocoon(ctx, source, { color: '#f5f5f4', band: '#d6d3d1', delay: 120, duration: 1100 })
  shiver(ctx, source, { delay: 300, duration: 400, amount: 0.03 })
  slashArc(ctx, at(source, 0.75), {
    color: '#ffffff',
    delay: 460,
    angle: 0.6,
    radius: 0.4,
    width: 0.04,
    sweep: 1.1,
    duration: 240,
  })
  shockwave(ctx, ground(source), { color: '#e7e5e4', delay: 200, radius: 1, duration: 450 })
  return 260
}

const cascoonIronDefense: Choreography = (ctx, { source }) => {
  crouch(ctx, source, { duration: 300 })
  cocoon(ctx, source, { color: '#7e22ce', band: '#c4b5fd', metal: 0.7, delay: 80, duration: 1150 })
  bodyGlint(ctx, source, '#ef4444', 380)
  shell(ctx, source, {
    color: '#a1a1aa',
    edge: '#e9d5ff',
    radius: 0.66,
    detail: 0,
    material: 'metal',
    delay: 320,
    duration: 850,
  })
  slashArc(ctx, at(source, 0.6), {
    color: '#e9d5ff',
    delay: 520,
    angle: -0.7,
    radius: 0.5,
    width: 0.04,
    sweep: 1.3,
    duration: 260,
  })
  shockwave(ctx, ground(source), { color: '#a855f7', delay: 260, radius: 1.1, duration: 500 })
  return 320
}

const beautiflySilverWind: Choreography = (ctx, { source, target, shake: strength }) => {
  levitate(ctx, source, { duration: 1100, height: 0.45, wobble: 0.08 })
  mothWings(ctx, source, {
    upper: '#facc15',
    lower: '#fbbf24',
    spots: ['#dc2626', '#2563eb'],
    edge: '#1c1917',
    duration: 1100,
    flaps: 7,
  })
  const far = beyond(source, target, 1.6)
  stream(ctx, bodyAt(source, 0.7), far, {
    color: '#e2e8f0',
    count: 34,
    spread: 0.45,
    delay: 220,
    duration: 600,
    travel: 0.45,
    wobble: 0.2,
  })
  speedStreaks(ctx, bodyAt(source, 0.7), far, {
    color: '#cbd5e1',
    count: 8,
    spread: 0.5,
    delay: 240,
    duration: 420,
  })
  const impact = 460
  const victims = lineVictims(ctx, source, target, 1.6)
  victims.forEach((victim, index) => {
    driftMotes(ctx, ground(victim), {
      colors: ['#f1f5f9', '#cbd5e1', '#fde68a'],
      count: 14,
      radius: 0.45,
      height: 1.2,
      twinkle: true,
      size: 0.035,
      delay: impact + index * 60,
      duration: 700,
    })
    slashArc(ctx, at(victim), {
      color: '#e2e8f0',
      delay: impact + index * 60,
      angle: 0.3,
      radius: 0.55,
      width: 0.06,
      sweep: 1.8,
    })
  })
  flinchAlong(ctx, source, victims.slice(1), impact - 100, 70)
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const dustoxPoisonPowder: Choreography = (ctx, { source, target, shake: strength }) => {
  levitate(ctx, source, { duration: 1200, height: 0.4, wobble: 0.06 })
  mothWings(ctx, source, {
    upper: '#65a30d',
    lower: '#4d7c0f',
    spots: ['#facc15', '#fde047'],
    edge: '#365314',
    span: 0.4,
    duration: 1200,
    flaps: 8,
  })
  powderFall(ctx, ground(source), {
    color: '#bef264',
    count: 50,
    radius: 2.2,
    height: 1.8,
    delay: 200,
    duration: 1100,
    swirl: 3,
  })
  powderFall(ctx, ground(source), {
    color: '#a855f7',
    count: 30,
    radius: 2,
    height: 1.6,
    size: 0.06,
    delay: 280,
    duration: 1000,
    swirl: -3,
  })
  const impact = 560
  const victims = withTarget(target, enemiesAround(ctx, source, source, 2.2), 4)
  victims.forEach((victim, index) => {
    const delay = impact + index * 70
    cloud(ctx, ground(victim), {
      color: '#a855f7',
      count: 5,
      radius: 0.4,
      size: 0.28,
      rise: 0.5,
      opacity: 0.32,
      delay,
      duration: 1200,
    })
    burst(ctx, at(victim, 0.4), { color: '#d946ef', count: 8, delay, speed: 0.6, spread: 'up' })
  })
  flinch(ctx, victims.slice(1), impact, 70)
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const taillowWingAttack: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 180 })
  rush(ctx, source, target, { delay: 120, duration: 600, reach: 0.85, hold: 0.2, lift: 0.4 })
  motionLines(ctx, source, { color: '#1e3a8a', count: 6, delay: 120, duration: 360 })
  const impact = 120 + 600 * 0.32
  ;[-1, 1].forEach((side, index) => {
    slashArc(ctx, at(target), {
      color: index ? '#dc2626' : '#1e3a8a',
      delay: impact + index * 70,
      angle: side * 0.9,
      radius: 0.55,
      width: 0.12,
      sweep: 1.5,
    })
  })
  burst(ctx, at(target), { color: '#e0e7ff', count: 10, delay: impact, speed: 1.3 })
  flinch(ctx, [target], impact + 70, 0)
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const swellowBraveBird: Choreography = (ctx, { source, target, shake: strength }) => {
  leap(ctx, source, { duration: 360, height: 1 })
  aura(ctx, source, { color: '#60a5fa', duration: 800, count: 16, radius: 0.4 })
  dash(ctx, source, target, { delay: 300, duration: 440, through: true, hold: 0.15 })
  trail(ctx, source, { color: '#dc2626', delay: 300, duration: 380 })
  speedStreaks(ctx, above(source, 1.2), beyond(source, target, 1.6, 0.5), {
    color: '#1e40af',
    count: 10,
    spread: 0.4,
    delay: 300,
    duration: 360,
  })
  const impact = 420
  const victims = lineVictims(ctx, source, target, 1.6)
  victims.forEach((victim, index) => {
    flare(ctx, at(victim), {
      color: '#3b82f6',
      core: '#bfdbfe',
      size: 0.35,
      rays: 5,
      delay: impact + index * 50,
    })
    burst(ctx, at(victim), { color: '#dc2626', count: 8, delay: impact + index * 50, speed: 1.4 })
  })
  shiver(ctx, source, { delay: impact + 200, duration: 360, amount: 0.04 })
  flinchAlong(ctx, source, victims.slice(1), impact - 80, 60)
  cameraPunch(ctx, at(target), 0.3, impact - 40)
  shake(ctx, strength + 1, impact)
  return impact
}

const wingullSupersonic: Choreography = (ctx, { source, target, shake: strength }) => {
  levitate(ctx, source, { duration: 800, height: 0.3, wobble: 0.08 })
  squash(ctx, source, { delay: 120, duration: 200, amount: 0.1 })
  soundRings(ctx, ahead(source, target, 0.25, 0.6), at(target, 0.65), {
    colors: ['#e0f2fe', '#7dd3fc'],
    count: 7,
    size: 0.12,
    grow: 1.8,
    delay: 160,
    duration: 520,
    travel: 0.45,
  })
  const impact = 460
  shiver(ctx, target, { delay: impact, duration: 600, amount: 0.05, speed: 70 })
  dizzy(ctx, target, { color: '#bae6fd', delay: impact + 60, duration: 900 })
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const pelipperRainDance: Choreography = (ctx, { source }) => {
  crouch(ctx, source, { duration: 260 })
  levitate(ctx, source, { delay: 160, duration: 900, height: 0.25, wobble: 0.05 })
  waterJet(ctx, bodyAt(source, 0.75), above(source, 2.4), {
    color: '#60a5fa',
    core: FOAM,
    radius: 0.08,
    rings: 2,
    spray: 14,
    delay: 180,
    duration: 420,
  })
  cloud(ctx, above(source, 2.4), {
    color: '#64748b',
    count: 8,
    radius: 1.4,
    size: 0.5,
    rise: 0.05,
    opacity: 0.4,
    delay: 360,
    duration: 1300,
  })
  rainfall(ctx, ground(source), { radius: 2, height: 2.3, count: 70, delay: 440, duration: 1200 })
  const impact = 600
  alliesAround(ctx, source, 2.6, 5).forEach((ally, index) => {
    const delay = impact + index * 70
    statArrows(ctx, ally, { color: '#7dd3fc', delay, duration: 800 })
    motionLines(ctx, ally, { color: '#bae6fd', count: 5, delay: delay + 60, duration: 400 })
  })
  return impact
}

// ---- Lotad and Seedot lines ----

const lotadAbsorb: Choreography = (ctx, { source, target, shake: strength }) => {
  lilyPad(ctx, source, { size: 0.32, duration: 1200, spins: 0.4 })
  crouch(ctx, source, { duration: 240 })
  const impact = 300
  burst(ctx, at(target), { color: '#4ade80', count: 10, delay: impact, speed: 0.9 })
  lifeDrain(ctx, at(target), bodyAt(source, 0.6), {
    count: 18,
    travel: 0.5,
    delay: impact,
    duration: 800,
  })
  halo(ctx, source, { color: HEAL, direction: 'rise', delay: impact + 450, duration: 600 })
  shiver(ctx, target, { delay: impact, duration: 500, amount: 0.03 })
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const lombreFakeOut: Choreography = (ctx, { source, target, shake: strength }) => {
  lilyPad(ctx, source, { size: 0.26, color: '#22c55e', duration: 900 })
  rushIn(ctx, source, target, { delay: 60, duration: 600, hold: 0.35 })
  clap(ctx, target, { color: '#16a34a', delay: 100, duration: 560 })
  const impact = 100 + 560 * 0.5
  shockwave(ctx, at(target, 0.7), {
    color: '#bbf7d0',
    delay: impact,
    radius: 0.8,
    duration: 320,
    thickness: 0.08,
  })
  flare(ctx, at(target, 0.7), {
    color: '#86efac',
    core: '#f0fdf4',
    size: 0.28,
    rays: 6,
    delay: impact,
  })
  pushBack(ctx, target, at(source), { delay: impact, duration: 360, distance: 0.2 })
  dizzy(ctx, target, { delay: impact + 80, duration: 900 })
  shake(ctx, strength, impact)
  return impact
}

const ludicoloGigaDrain: Choreography = (ctx, { source, target, shake: strength }) => {
  lilyPad(ctx, source, { size: 0.42, color: '#4ade80', duration: 1400, spins: 1.5 })
  spin(ctx, source, { duration: 900, turns: ctx.reducedMotion ? 0 : 2 })
  levitate(ctx, source, { duration: 900, height: 0.12, wobble: 0.2 })
  orbit(ctx, source, {
    color: FLAME_CORE,
    count: 4,
    radius: 0.55,
    heightFactor: 0.9,
    turns: 1.5,
    billboard: true,
    build: (index) =>
      new THREE.Mesh(noteGeometry(0.1), glow(index % 2 ? '#fde047' : '#86efac', 0.85)),
    duration: 1100,
  })
  const impact = 420
  shockwave(ctx, ground(source), {
    color: '#4ade80',
    delay: impact - 80,
    radius: 2.3,
    duration: 600,
  })
  const victims = withTarget(target, enemiesAround(ctx, source, source, 2.3), 3)
  victims.forEach((victim, index) => {
    const delay = impact + index * 80
    burst(ctx, at(victim), { color: '#4ade80', count: 8, delay, speed: 0.9 })
    lifeDrain(ctx, at(victim), bodyAt(source, 0.6), {
      count: 14,
      travel: 0.5,
      delay,
      duration: 800,
    })
  })
  halo(ctx, source, { color: HEAL, direction: 'rise', delay: impact + 500, duration: 700 })
  flinch(ctx, victims.slice(1), impact + 80, 80)
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const seedotBulletSeed: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 200 })
  const mouth = ahead(source, target, 0.22, 0.5)
  const shots = 5
  for (let index = 0; index < shots; index++) {
    const delay = 160 + index * 60
    prop(ctx, source, target, {
      build: () => acornMesh(0.06),
      from: mouth,
      delay,
      duration: 220,
      arc: 0.05 + (index % 2) * 0.08,
      spin: 10,
    })
    burst(ctx, at(target, 0.5 + (index % 3) * 0.1), {
      color: '#a16207',
      count: 5,
      delay: delay + 220,
      speed: 1.1,
      gravity: 3,
    })
  }
  pushBack(ctx, source, at(target), { delay: 160, duration: 320, distance: 0.08 })
  const impact = 160 + 2 * 60 + 220
  shiver(ctx, target, { delay: 380, duration: 320, amount: 0.04 })
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const nuzleafFeintAttack: Choreography = (ctx, { source, target, shake: strength }) => {
  cloud(ctx, ground(source), {
    color: '#292524',
    count: 6,
    radius: 0.4,
    size: 0.3,
    rise: 0.4,
    opacity: 0.4,
    duration: 600,
  })
  dash(ctx, source, target, { delay: 160, duration: 520, through: true, hold: 0.3 })
  speedStreaks(ctx, bodyAt(source, 0.5), beyond(source, target, 0.6), {
    color: '#44403c',
    count: 8,
    spread: 0.4,
    delay: 170,
    duration: 280,
  })
  const behind = beyond(source, target, 0.5)
  const impact = 400
  prop(ctx, source, target, {
    build: () => leafMesh('#4d7c0f', 0.18),
    from: behind,
    to: at(target),
    delay: impact - 160,
    duration: 160,
    tumble: 8,
  })
  slashArc(ctx, at(target), {
    color: '#78716c',
    delay: impact,
    angle: -2.2,
    radius: 0.6,
    width: 0.1,
    sweep: 1.6,
  })
  slashArc(ctx, at(target), {
    color: '#84cc16',
    delay: impact + 50,
    angle: 1,
    radius: 0.5,
    width: 0.06,
    sweep: 1.4,
  })
  burst(ctx, at(target), { color: '#57534e', count: 10, delay: impact, speed: 1.3 })
  shake(ctx, strength, impact)
  return impact
}

const shiftryLeafTornado: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 300 })
  orbit(ctx, source, {
    color: LEAF,
    count: 2,
    radius: 0.42,
    heightFactor: 0.75,
    turns: 1.5,
    build: () => leafMesh('#15803d', 0.28),
    duration: 700,
  })
  spin(ctx, source, { delay: 200, duration: 600, turns: ctx.reducedMotion ? 0 : 2 })
  vortex(ctx, ground(source), {
    color: '#22c55e',
    secondary: '#a3e635',
    height: 2,
    radius: 1.4,
    rings: 5,
    delay: 220,
    duration: 900,
  })
  const impact = 460
  orbit(ctx, source, {
    color: LEAF,
    count: 12,
    radius: 0.5,
    heightFactor: 0.6,
    turns: 2,
    collapse: 4.5,
    build: (index) => leafMesh(index % 3 ? '#16a34a' : LEAF_LIGHT, 0.13),
    delay: impact - 200,
    duration: 800,
  })
  shockwave(ctx, ground(source), { color: '#4ade80', delay: impact, radius: 2.4, duration: 600 })
  const victims = withTarget(target, enemiesAround(ctx, source, source, 2.3), 4)
  victims.forEach((victim, index) => {
    const hit = impact + 80 + index * 50
    pushBack(ctx, victim, ground(source), { delay: hit, duration: 520, distance: 0.5, lift: 0.18 })
  })
  flinch(ctx, victims.slice(1), impact + 80, 50)
  cameraPunch(ctx, ground(source), 0.3, impact)
  shake(ctx, strength + 1, impact)
  return impact
}

export const GEN23_TIER1_ULTIMATES: UltimateSet = {
  'chikorita:Synthesis': chikoritaSynthesis,
  'bayleef:Reflect': bayleefReflect,
  'meganium:Aromatherapy': meganiumAromatherapy,
  'cyndaquil:Ember': cyndaquilEmber,
  'quilava:Flame Wheel': quilavaFlameWheel,
  'typhlosion:Eruption': typhlosionEruption,
  'totodile:Bite': totodileBite,
  'croconaw:Ice Fang': croconawIceFang,
  'feraligatr:Waterfall': feraligatrWaterfall,
  'treecko:Pound': treeckoPound,
  'grovyle:Fury Cutter': grovyleFuryCutter,
  'sceptile:Leaf Blade': sceptileLeafBlade,
  'torchic:Peck': torchicPeck,
  'combusken:Double Kick': combuskenDoubleKick,
  'blaziken:Blaze Kick': blazikenBlazeKick,
  'mudkip:Water Gun': mudkipWaterGun,
  'marshtomp:Mud Shot': marshtompMudShot,
  'swampert:Muddy Water': swampertMuddyWater,
  'hoothoot:Hypnosis': hoothootHypnosis,
  'noctowl:Extrasensory': noctowlExtrasensory,
  'poochyena:Bite': poochyenaBite,
  'mightyena:Crunch': mightyenaCrunch,
  'zigzagoon:Headbutt': zigzagoonHeadbutt,
  'linoone:Extreme Speed': linooneExtremeSpeed,
  'wurmple:String Shot': wurmpleStringShot,
  'silcoon:Harden': silcoonHarden,
  'cascoon:Iron Defense': cascoonIronDefense,
  'beautifly:Silver Wind': beautiflySilverWind,
  'dustox:Poison Powder': dustoxPoisonPowder,
  'taillow:Wing Attack': taillowWingAttack,
  'swellow:Brave Bird': swellowBraveBird,
  'wingull:Supersonic': wingullSupersonic,
  'pelipper:Rain Dance': pelipperRainDance,
  'lotad:Absorb': lotadAbsorb,
  'lombre:Fake Out': lombreFakeOut,
  'ludicolo:Giga Drain': ludicoloGigaDrain,
  'seedot:Bullet Seed': seedotBulletSeed,
  'nuzleaf:Feint Attack': nuzleafFeintAttack,
  'shiftry:Leaf Tornado': shiftryLeafTornado,
}
