import * as THREE from 'three'
import { easeInOut, type UnitView } from '../../unitView'
import {
  bodyRing,
  clawMarks,
  cottonPuff,
  diamondMesh,
  drop,
  ghostEye,
  ghostHand,
  hover,
  linePoint,
  metal,
  moonMesh,
  psyBlade,
  sharkJaw,
  starMesh,
} from '../kit/gen23Tier3'
import {
  above,
  ahead,
  alliesAround,
  beyond,
  bodyAt,
  bubbles,
  coil,
  debris,
  driftMotes,
  enemiesAround,
  enemiesInLine,
  fangs,
  flames,
  flat,
  flinch,
  flinchAlong,
  fx,
  groundCracks,
  heartGeometry,
  lit,
  motionLines,
  noteGeometry,
  phase,
  pulse,
  rayBeam,
  shell,
  shiver,
  squash,
  standard,
  statArrows,
  stream,
  zap,
  zzz,
} from '../kit/shared'
import {
  at,
  aura,
  burst,
  cameraPunch,
  chargeOrb,
  cloud,
  crouch,
  dash,
  flare,
  glow,
  ground,
  halo,
  leafMesh,
  leap,
  levitate,
  lightning,
  orbit,
  pillar,
  prop,
  pushBack,
  rockMesh,
  shake,
  shockwave,
  sigil,
  slashArc,
  spikes,
  spin,
  trail,
  vortex,
  type ColorInput,
  type FxContext,
} from '../primitives'
import type { Choreography, UltimateSet } from '../types'

const team = (ctx: FxContext, source: UnitView, target: UnitView, radius: number, limit = 4) =>
  [...new Set([source, target, ...alliesAround(ctx, source, radius, limit)])].slice(0, limit)

const foesNear = (ctx: FxContext, source: UnitView, target: UnitView, radius: number, limit = 4) =>
  [target, ...enemiesAround(ctx, source, target, radius)].slice(0, limit)

const foesAroundCaster = (ctx: FxContext, source: UnitView, target: UnitView, radius: number) =>
  [...new Set([target, ...enemiesAround(ctx, source, source, radius)])].slice(0, 4)

// Daze: small stars circling the head of each stunned unit.
function daze(
  ctx: FxContext,
  victims: UnitView[],
  color: ColorInput,
  delay: number,
  duration = 900,
) {
  victims.forEach((victim) =>
    orbit(ctx, victim, {
      color,
      count: 3,
      radius: 0.3,
      heightFactor: 1.05,
      turns: 1.6,
      billboard: true,
      build: () => starMesh(color, 0.07),
      delay,
      duration,
    }),
  )
}

// ---------- Eevee family ----------

const eeveeSwift: Choreography = (ctx, { source, target }) => {
  const impact = 520
  squash(ctx, source, { duration: 220, amount: 0.12 })
  fx(
    ctx,
    0,
    380,
    undefined,
    (p) => (source.pose.tilt += Math.sin(p * Math.PI * 6) * 0.1 * pulse(p)),
  )
  for (let index = 0; index < 5; index++) {
    const side = (index - 2) * 0.28
    prop(ctx, source, target, {
      build: () => starMesh(index % 2 ? '#fde047' : '#facc15', 0.12, 5, true),
      delay: 160 + index * 55,
      duration: 360 - index * 20,
      arc: 0.35 + Math.abs(side),
      offset: new THREE.Vector3(side, 0.25 + Math.abs(side) * 0.4, 0),
      tumble: 0,
      spin: 9,
    })
  }
  burst(ctx, at(target), { color: '#fde68a', count: 14, delay: impact, speed: 1.6 })
  orbit(ctx, target, {
    color: '#facc15',
    count: 4,
    radius: 0.45,
    billboard: true,
    build: () => starMesh('#fef08a', 0.06),
    delay: impact,
    duration: 500,
    collapse: 1.8,
  })
  flinch(ctx, [target], impact)
  return impact
}

const vaporeonAquaRing: Choreography = (ctx, { source, target }) => {
  const impact = 380
  const wearer = target
  crouch(ctx, source, { duration: 260 })
  bubbles(ctx, ahead(source, wearer, 0.1, 0.4), bodyAt(wearer, 0.6), {
    color: '#7dd3fc',
    count: 8,
    duration: 360,
  })
  ;[0.25, 0.55, 0.8].forEach((height, index) =>
    bodyRing(ctx, wearer, {
      material: () => standard('#38bdf8', { opacity: 0.6, roughness: 0.1, metalness: 0.1 }),
      radius: 0.42 + index * 0.06,
      tube: 0.05 - index * 0.01,
      heightFactor: height,
      tilt: 0.2 + index * 0.1,
      spin: index % 2 ? -5 : 5,
      delay: impact - 120 + index * 70,
      duration: 1000,
    }),
  )
  orbit(ctx, wearer, {
    color: '#bae6fd',
    count: 6,
    radius: 0.55,
    heightFactor: 0.5,
    turns: 2,
    build: () =>
      new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 10, 8),
        standard('#e0f2fe', { opacity: 0.7, roughness: 0.05 }),
      ),
    delay: impact,
    duration: 900,
  })
  shell(ctx, wearer, {
    color: '#0ea5e9',
    edge: '#bae6fd',
    radius: 0.66,
    delay: impact,
    duration: 900,
  })
  shockwave(ctx, ground(wearer), { color: '#0284c7', delay: impact, radius: 1, duration: 450 })
  return impact
}

const jolteonThunderbolt: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 420
  shiver(ctx, source, { duration: 380, amount: 0.05, speed: 70 })
  orbit(ctx, source, {
    color: '#fde047',
    count: 8,
    radius: 0.45,
    turns: 2,
    build: () =>
      new THREE.Mesh(
        new THREE.ConeGeometry(0.035, 0.22, 4).rotateZ(Math.PI / 2),
        glow('#facc15', 0.9),
      ),
    collapse: 1.3,
    duration: 420,
  })
  zap(ctx, at(source, 0.6), at(target), {
    color: '#facc15',
    core: '#fef9c3',
    delay: 280,
    duration: 360,
  })
  lightning(ctx, target, {
    color: '#fde047',
    from: above(target, 3.2),
    delay: impact - 40,
    duration: 320,
  })
  flare(ctx, at(target), { color: '#facc15', core: '#fef08a', size: 0.45, rays: 6, delay: impact })
  burst(ctx, at(target), { color: '#fde047', count: 16, delay: impact, speed: 2.2, gravity: 0.5 })
  shiver(ctx, target, { delay: impact, duration: 700, amount: 0.08, speed: 80 })
  daze(ctx, [target], '#fde047', impact + 120, 800)
  flinch(ctx, [target], impact)
  shake(ctx, strength * 0.6, impact)
  return impact
}

const flareonFlareBlitz: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 460
  const victims = foesAroundCaster(ctx, source, target, 1.7)
  flames(ctx, bodyAt(source, 0.15), {
    color: '#f97316',
    core: '#fde68a',
    radius: 0.35,
    height: 0.9,
    duration: 760,
  })
  dash(ctx, source, target, { delay: 120, duration: 620, through: true, hold: 0.15 })
  trail(ctx, source, { color: '#ea580c', delay: 120, duration: 520 })
  motionLines(ctx, source, { color: '#fdba74', delay: 140, duration: 380 })
  shockwave(ctx, ground(target), { color: '#dc2626', delay: impact, radius: 1.8, thickness: 0.3 })
  shockwave(ctx, ground(target), { color: '#fb923c', delay: impact + 80, radius: 1.2 })
  burst(ctx, at(target), { color: '#fb923c', count: 22, delay: impact, speed: 2.4, gravity: 1 })
  victims.forEach((victim, index) =>
    flames(ctx, ground(victim), {
      color: '#ea580c',
      core: '#fcd34d',
      count: 5,
      radius: 0.25,
      height: 0.5,
      delay: impact + 80 + index * 40,
      duration: 900,
    }),
  )
  // Recoil: Flareon bounces back singed.
  burst(ctx, at(source, 0.9), {
    color: '#57534e',
    count: 8,
    delay: impact + 260,
    spread: 'up',
    speed: 0.8,
    gravity: -0.3,
  })
  flinch(ctx, victims, impact, 40)
  shake(ctx, strength * 0.8, impact)
  return impact
}

const espeonPsychic: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 480
  const victims = [target, ...enemiesInLine(ctx, source, target, { limit: 3 })]
  levitate(ctx, source, { duration: 760, height: 0.2, wobble: 0.05 })
  hover(
    ctx,
    new THREE.Mesh(new THREE.OctahedronGeometry(0.07), lit('#dc2626', 0.6, 0.2)),
    bodyAt(source, 1.0),
    {
      duration: 600,
      face: true,
      scale: 1.4,
    },
  )
  sigil(ctx, ground(source), { color: '#c084fc', secondary: '#f0abfc', radius: 0.8, duration: 800 })
  for (let index = 0; index < 4; index++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.025, 6, 32),
      glow(index % 2 ? '#e9d5ff' : '#c084fc', 0.6),
    )
    hover(ctx, ring, linePoint(source, target, 0.2 + index * 0.22, 0.8, 0.6), {
      delay: 200 + index * 60,
      duration: 520,
      update: (p) => {
        ring.lookAt(target.root.position.x, 0.6, target.root.position.z)
        ring.scale.multiplyScalar(1 + 0.4 * p)
      },
    })
  }
  rayBeam(ctx, ahead(source, target, 0.2), beyond(source, target, 1.2), {
    colors: ['#c084fc', '#f0abfc'],
    width: 0.12,
    twist: 6,
    delay: 260,
    duration: 520,
  })
  victims.forEach((victim, index) => {
    levitate(ctx, victim, { delay: impact + index * 70, duration: 600, height: 0.35, wobble: 0.25 })
    halo(ctx, victim, {
      color: '#d8b4fe',
      direction: 'fall',
      delay: impact + index * 70,
      duration: 520,
    })
  })
  flinchAlong(ctx, source, victims, impact - 80, 40)
  shake(ctx, strength * 0.5, impact)
  return impact
}

const umbreonMoonlight: Choreography = (ctx, { source, target }) => {
  const impact = 560
  const allies = team(ctx, source, target, 2.2, 4)
  const moon = moonMesh(0.32)
  hover(ctx, moon, above(source, 2.4), { duration: 1100, face: true, grow: 0.25 })
  bodyRing(ctx, source, {
    material: () => glow('#facc15', 0.75),
    radius: 0.4,
    tube: 0.03,
    heightFactor: 0.55,
    tilt: 0.05,
    spin: 2,
    duration: 1000,
  })
  aura(ctx, source, { color: '#fde047', count: 12, duration: 700 })
  allies.forEach((ally, index) => {
    pillar(ctx, ground(ally), {
      color: '#fef08a',
      radius: 0.32,
      height: 2.6,
      delay: impact - 160 + index * 60,
      duration: 700,
    })
    driftMotes(ctx, ground(ally), {
      colors: ['#fef9c3', '#fde68a'],
      count: 10,
      radius: 0.4,
      height: 1.4,
      cycles: -0.8,
      twinkle: true,
      delay: impact - 120 + index * 60,
      duration: 800,
    })
    halo(ctx, ally, { color: '#fde047', delay: impact + index * 60, duration: 600 })
  })
  return impact
}

const leafeonLeafBlade: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 440
  dash(ctx, source, target, { delay: 100, duration: 520, through: true, hold: 0.1 })
  motionLines(ctx, source, { color: '#bbf7d0', delay: 100, duration: 360 })
  const bladeLeaf = leafMesh('#22c55e', 0.32)
  hover(ctx, bladeLeaf, bodyAt(source, 0.95), {
    duration: 420,
    update: (p) => {
      bladeLeaf.rotation.set(0.3, p * 6, 0.4)
    },
  })
  ;[0.7, -0.7].forEach((angle, index) =>
    slashArc(ctx, at(target), {
      color: index ? '#4ade80' : '#15803d',
      delay: impact - 40 + index * 110,
      angle,
      radius: 0.75,
      width: 0.16,
    }),
  )
  for (let index = 0; index < 6; index++) {
    prop(ctx, target, target, {
      build: () => leafMesh(index % 2 ? '#86efac' : '#16a34a', 0.1),
      from: at(target),
      to: offsetAround(target, index, 6, 0.9),
      delay: impact + 80,
      duration: 500,
      arc: 0.4,
      spin: 6,
      fadeOut: 0.4,
    })
  }
  // Execute finisher: a vertical cleave that drops a curtain of leaves.
  slashArc(ctx, at(target, 0.6), {
    color: '#bef264',
    delay: impact + 260,
    angle: Math.PI / 2,
    radius: 0.9,
    width: 0.2,
    sweep: 2.2,
  })
  burst(ctx, at(target), { color: '#4ade80', count: 16, delay: impact + 260, speed: 2 })
  flinch(ctx, [target], impact)
  flinch(ctx, [target], impact + 260)
  shake(ctx, strength * 0.7, impact + 260)
  return impact
}

function offsetAround(view: UnitView, index: number, count: number, radius: number) {
  const out = new THREE.Vector3()
  const angle = (index / count) * Math.PI * 2
  return () =>
    view
      .focusPoint(out, 0.4)
      .add(new THREE.Vector3(Math.cos(angle) * radius, -0.2, Math.sin(angle) * radius))
}

const glaceonBlizzard: Choreography = (ctx, { source, target }) => {
  const impact = 520
  const victims = foesAroundCaster(ctx, source, target, 2)
  hover(ctx, diamondMesh('#7dd3fc', 0.09), bodyAt(source, 1.0), { duration: 600, face: true })
  stream(ctx, above(source, 2.2), ground(source), {
    color: '#e0f2fe',
    count: 36,
    spread: 1.6,
    duration: 900,
    travel: 0.4,
    wobble: 0.3,
  })
  vortex(ctx, ground(source), {
    color: '#bae6fd',
    secondary: '#38bdf8',
    radius: 1.5,
    height: 1.4,
    rings: 5,
    delay: 120,
    duration: 900,
  })
  driftMotes(ctx, ground(source), {
    colors: ['#e0f2fe', '#7dd3fc', '#f8fafc'],
    count: 40,
    radius: 1.9,
    height: 1.8,
    cycles: -1.5,
    swirl: 3,
    delay: 80,
    duration: 1000,
  })
  victims.forEach((victim, index) => {
    shell(ctx, victim, {
      color: '#bae6fd',
      edge: '#e0f2fe',
      material: 'crystal',
      radius: 0.55,
      delay: impact + index * 60,
      duration: 900,
    })
    spikes(ctx, ground(victim), {
      color: '#7dd3fc',
      count: 5,
      radius: 0.35,
      height: 0.5,
      solid: true,
      delay: impact + index * 60,
      duration: 900,
    })
  })
  flinch(ctx, victims, impact, 60)
  return impact
}

// ---------- Ralts family ----------

const raltsConfusion: Choreography = (ctx, { source, target }) => {
  const impact = 420
  fx(ctx, 0, 420, undefined, (p) => (source.pose.lift += 0.1 * pulse(p)))
  hover(
    ctx,
    new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), lit('#f87171', 0.5)),
    bodyAt(source, 1.05),
    {
      duration: 500,
    },
  )
  for (let index = 0; index < 3; index++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 28), glow('#f9a8d4', 0.7))
    prop(ctx, source, target, {
      build: () => ring,
      delay: 120 + index * 80,
      duration: 320,
      arc: 0.1,
      grow: 1.2,
      fadeOut: 0.3,
    })
  }
  vortex(ctx, at(target, 1.0), {
    color: '#f0abfc',
    secondary: '#c084fc',
    radius: 0.35,
    height: 0.3,
    rings: 3,
    delay: impact,
    duration: 900,
  })
  fx(
    ctx,
    impact,
    900,
    undefined,
    (p) => (target.pose.spin += Math.sin(p * Math.PI * 4) * 0.5 * pulse(p)),
  )
  orbit(ctx, target, {
    color: '#f472b6',
    count: 3,
    radius: 0.32,
    heightFactor: 1.05,
    billboard: true,
    build: () =>
      new THREE.Mesh(
        new THREE.RingGeometry(0.03, 0.06, 12, 1, 0, Math.PI * 1.5),
        glow('#f472b6', 0.9),
      ),
    delay: impact,
    duration: 900,
  })
  flinch(ctx, [target], impact)
  return impact
}

const kirliaCalmMind: Choreography = (ctx, { source, target }) => {
  const impact = 480
  const allies = team(ctx, source, target, 2, 4)
  // A pirouette: Kirlia dances, lifting a little on each turn.
  spin(ctx, source, { turns: 2, duration: 700 })
  fx(
    ctx,
    0,
    700,
    undefined,
    (p) => (source.pose.lift += 0.12 * Math.abs(Math.sin(p * Math.PI * 2))),
  )
  hover(
    ctx,
    new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), lit('#f87171', 0.5)),
    bodyAt(source, 1.05),
    { duration: 700 },
  )
  sigil(ctx, ground(source), {
    color: '#f9a8d4',
    secondary: '#86efac',
    radius: 1.1,
    points: 6,
    duration: 900,
  })
  driftMotes(ctx, ground(source), {
    colors: ['#fbcfe8', '#bbf7d0'],
    count: 18,
    radius: 1,
    height: 1.4,
    swirl: 2,
    duration: 900,
  })
  allies.forEach((ally, index) => {
    sigil(ctx, at(ally, 1.15), {
      color: '#f472b6',
      radius: 0.22,
      points: 4,
      delay: impact - 80 + index * 70,
      duration: 600,
    })
    statArrows(ctx, ally, {
      color: index === 0 ? '#f472b6' : '#fb7185',
      delay: impact + index * 70,
    })
  })
  return impact
}

const gardevoirHealPulse: Choreography = (ctx, { source, target }) => {
  const impact = 460
  const allies = team(ctx, source, target, 2.4, 4)
  levitate(ctx, source, { duration: 800, height: 0.25, wobble: 0.03 })
  const heart = new THREE.Mesh(heartGeometry(0.16), lit('#ef4444', 0.4, 0.3))
  hover(ctx, heart, bodyAt(source, 0.55), {
    duration: 600,
    face: true,
    update: (p) => heart.scale.multiplyScalar(1 + 0.25 * pulse(phase(p, 0.3, 0.7))),
  })
  chargeOrb(ctx, at(source, 0.6), { color: '#86efac', core: '#f0fdf4', size: 0.16, duration: 320 })
  ;[0, 140, 280].forEach((offset, index) =>
    shockwave(ctx, ground(source), {
      color: index === 1 ? '#f9a8d4' : '#4ade80',
      delay: impact - 80 + offset,
      radius: 2.4,
      thickness: 0.12,
      duration: 650,
    }),
  )
  allies.forEach((ally, index) => {
    const at2 = impact + index * 70
    const glyph = new THREE.Mesh(heartGeometry(0.08), glow('#f9a8d4', 0.8))
    hover(ctx, glyph, bodyAt(ally, 1.1), {
      delay: at2,
      duration: 650,
      face: true,
      update: (p) => (glyph.position.y += 0.3 * p),
    })
    halo(ctx, ally, { color: '#86efac', delay: at2, duration: 600 })
    burst(ctx, at(ally), {
      color: '#bbf7d0',
      count: 10,
      delay: at2,
      spread: 'up',
      speed: 1,
      gravity: -0.2,
    })
  })
  return impact
}

const galladePsychoCut: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 400
  const victims = [target, ...enemiesInLine(ctx, source, target, { limit: 3 })]
  crouch(ctx, source, { duration: 220 })
  ;[-1, 1].forEach((side) => {
    const elbow = psyBlade('#4ade80', '#f8fafc', 0.3)
    hover(ctx, elbow, bodyAt(source, 0.6), {
      duration: 340,
      update: (p) => {
        elbow.position.x += side * 0.3
        elbow.rotation.set(0, 0, side * (0.4 + p * 2))
      },
    })
  })
  ;[0, 1].forEach((index) =>
    prop(ctx, source, target, {
      build: () => {
        const cut = psyBlade(index ? '#f472b6' : '#c084fc', '#fbcfe8', 0.5)
        cut.rotation.set(-Math.PI / 2, 0, Math.PI / 2)
        return cut
      },
      to: beyond(source, target, 1.4),
      delay: 200 + index * 90,
      duration: 380,
      arc: 0,
      tumble: index ? 0.6 : -0.6,
      fadeOut: 0.25,
    }),
  )
  victims.forEach((victim, index) =>
    slashArc(ctx, at(victim), {
      color: '#f0abfc',
      delay: impact + index * 60,
      angle: -0.6,
      radius: 0.6,
    }),
  )
  // Execute finisher: crossed elbow blades over the primary target.
  ;[0.8, -0.8].forEach((angle) =>
    slashArc(ctx, at(target, 0.65), {
      color: '#22c55e',
      delay: impact + 240,
      angle,
      radius: 0.85,
      width: 0.18,
    }),
  )
  burst(ctx, at(target), { color: '#f472b6', count: 14, delay: impact + 240, speed: 1.8 })
  flinchAlong(ctx, source, victims, impact - 60, 40)
  flinch(ctx, [target], impact + 240)
  shake(ctx, strength * 0.6, impact + 240)
  return impact
}

// ---------- Larvitar family ----------

const larvitarRockSlide: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 520
  squash(ctx, source, { duration: 300, amount: 0.15 })
  groundCracks(ctx, ground(source), { color: '#a3e635', count: 4, length: 0.6, duration: 500 })
  ;[0, 1, 2, 3].forEach((index) => {
    const offset = new THREE.Vector3(
      (index % 2 ? 0.25 : -0.2) * (index > 1 ? -1 : 1),
      0,
      index > 1 ? 0.2 : -0.15,
    )
    const out = new THREE.Vector3()
    const point = () => out.copy(target.root.position).add(offset).setY(0.3)
    drop(ctx, point, {
      build: () => rockMesh(index % 2 ? '#a8a29e' : '#78716c', 0.18 + index * 0.02),
      delay: 180 + index * 70,
      duration: 380,
      height: 2.6,
      tumble: 3,
    })
  })
  debris(ctx, ground(target), { color: '#78716c', count: 10, delay: impact, speed: 1.8 })
  cloud(ctx, ground(target), {
    color: '#a8a29e',
    count: 5,
    radius: 0.5,
    opacity: 0.4,
    delay: impact,
    duration: 700,
  })
  flinch(ctx, [target], impact - 60)
  flinch(ctx, [target], impact + 80)
  shake(ctx, strength * 0.6, impact)
  return impact
}

const pupitarSandstorm: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 460
  const victims = foesAroundCaster(ctx, source, target, 1.8)
  // Pupitar jets off the ground on its own pressure, spinning like a top.
  spin(ctx, source, { turns: 4, duration: 900 })
  leap(ctx, source, { duration: 900, height: 0.35 })
  shell(ctx, source, {
    color: '#94a3b8',
    edge: '#cbd5e1',
    material: 'stone',
    radius: 0.55,
    duration: 900,
  })
  vortex(ctx, ground(source), {
    color: '#d6b97a',
    secondary: '#a16207',
    radius: 1.7,
    height: 1.6,
    rings: 6,
    delay: 100,
    duration: 950,
  })
  cloud(ctx, ground(source), {
    color: '#c8a46a',
    count: 8,
    radius: 1.3,
    size: 0.45,
    opacity: 0.4,
    delay: 160,
    duration: 900,
  })
  driftMotes(ctx, ground(source), {
    colors: ['#d6b97a', '#a8a29e'],
    count: 36,
    radius: 1.8,
    height: 1.4,
    cycles: 0.5,
    swirl: 5,
    size: 0.06,
    delay: 120,
    duration: 900,
  })
  victims.forEach((victim, index) =>
    shiver(ctx, victim, { delay: impact + index * 60, duration: 500, amount: 0.07 }),
  )
  flinch(ctx, victims, impact, 60)
  shake(ctx, strength * 0.5, impact)
  return impact
}

const tyranitarStoneEdge: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 520
  const victims = [target, ...enemiesInLine(ctx, source, target, { limit: 3 })]
  // Local sand haze swirling at Tyranitar's feet while it rears up and stomps.
  cloud(ctx, ground(source), {
    color: '#c8a46a',
    count: 6,
    radius: 0.9,
    opacity: 0.35,
    duration: 1000,
  })
  driftMotes(ctx, ground(source), {
    colors: ['#d6b97a', '#a8a29e'],
    count: 22,
    radius: 1.1,
    height: 1.2,
    swirl: 4,
    size: 0.05,
    duration: 1000,
  })
  fx(ctx, 0, 380, undefined, (p) => {
    source.pose.lift += 0.3 * Math.sin(Math.PI * phase(p, 0, 0.85))
    source.pose.scale *= 1 + 0.12 * pulse(p)
  })
  groundCracks(ctx, ground(source), {
    color: '#57534e',
    count: 5,
    length: 1,
    delay: 300,
    duration: 700,
  })
  for (let index = 0; index < 5; index++) {
    spikes(ctx, linePoint(source, target, 0.15 + index * 0.18, 1.2), {
      color: index % 2 ? '#78716c' : '#a8a29e',
      count: 4,
      radius: 0.3,
      height: 0.9 + index * 0.12,
      width: 0.16,
      tilt: 0.45,
      solid: true,
      delay: 320 + index * 55,
      duration: 800,
    })
  }
  // Execute finisher: one towering blue-grey edge spears up under the target.
  spikes(ctx, ground(target), {
    color: '#64748b',
    count: 1,
    height: 1.9,
    width: 0.3,
    solid: true,
    delay: impact + 180,
    duration: 700,
  })
  debris(ctx, ground(target), {
    color: '#57534e',
    count: 10,
    pointed: true,
    delay: impact + 180,
    speed: 2.2,
  })
  victims.forEach((victim) =>
    pushBack(ctx, victim, source.root.position, { delay: impact, distance: 0.2, lift: 0.3 }),
  )
  flinchAlong(ctx, source, victims, 300, 55)
  flinch(ctx, [target], impact + 180)
  shake(ctx, strength, impact + 180, 360)
  return impact
}

// ---------- Bagon family ----------

const bagonHeadbutt: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 330
  crouch(ctx, source, { duration: 200 })
  fx(ctx, 0, 220, undefined, (p) => (source.pose.tilt -= 0.3 * pulse(p)))
  dash(ctx, source, target, { delay: 140, duration: 440, hold: 0.1 })
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    standard('#d1d5db', { roughness: 0.6 }),
  )
  helmet.rotation.x = -0.8
  hover(ctx, helmet, bodyAt(source, 0.95), { delay: 100, duration: 400 })
  motionLines(ctx, source, { color: '#93c5fd', delay: 140, duration: 260 })
  flare(ctx, at(target, 0.75), {
    color: '#60a5fa',
    core: '#dbeafe',
    size: 0.4,
    rays: 5,
    delay: impact,
  })
  burst(ctx, at(target, 0.75), { color: '#9ca3af', count: 12, delay: impact, speed: 1.8 })
  daze(ctx, [source], '#fde047', impact + 80, 500)
  pushBack(ctx, target, source.root.position, { delay: impact, distance: 0.3 })
  flinch(ctx, [target], impact)
  cameraPunch(ctx, at(target), 0.2, impact - 30)
  shake(ctx, strength * 0.5, impact)
  return impact
}

const shelgonProtect: Choreography = (ctx, { source, target }) => {
  const impact = 300
  const wearer = target
  squash(ctx, source, { duration: 260, amount: 0.2 })
  shell(ctx, wearer, {
    color: '#e5e7eb',
    edge: '#9ca3af',
    material: 'stone',
    radius: 0.5,
    detail: 0,
    duration: 380,
  })
  shell(ctx, wearer, {
    color: '#4ade80',
    edge: '#bbf7d0',
    radius: 0.72,
    detail: 1,
    delay: impact - 60,
    duration: 1000,
  })
  const hexes = new THREE.Group()
  for (let index = 0; index < 6; index++) {
    const hex = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.11, 6), glow('#86efac', 0.6))
    const angle = (index / 6) * Math.PI * 2
    hex.position.set(Math.cos(angle) * 0.2, Math.sin(angle) * 0.2, 0)
    hexes.add(hex)
  }
  hexes.add(new THREE.Mesh(new THREE.RingGeometry(0.08, 0.11, 6), glow('#bbf7d0', 0.6)))
  hover(ctx, hexes, ahead(wearer, nearestFoe(ctx, source) ?? wearer, 0.45, 0.5), {
    delay: impact,
    duration: 800,
    face: true,
    scale: 1.6,
  })
  shockwave(ctx, ground(wearer), { color: '#4ade80', delay: impact, radius: 1, duration: 400 })
  return impact
}

function nearestFoe(ctx: FxContext, source: UnitView) {
  return enemiesAround(ctx, source, source, 99)[0]
}

const salamenceOutrage: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 520
  const victims = foesAroundCaster(ctx, source, target, 1.9)
  aura(ctx, source, { color: '#dc2626', count: 22, duration: 1000 })
  shiver(ctx, source, { duration: 380, amount: 0.07, speed: 50 })
  ;[-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 16, 0, Math.PI * 0.55),
      standard('#dc2626', { roughness: 0.6 }),
    )
    hover(ctx, wing, bodyAt(source, 0.7), {
      duration: 1000,
      update: (p, now) => {
        wing.position.x += side * 0.2
        wing.rotation.set(0.2, side > 0 ? 0 : Math.PI, 0.3 + 0.5 * Math.sin(now * 0.02) + p)
      },
    })
  })
  leap(ctx, source, { delay: 200, duration: 520, height: 0.8, slam: true })
  spin(ctx, source, { delay: 200, turns: 2, duration: 520 })
  stream(ctx, at(source, 0.7), ground(target), {
    color: '#ef4444',
    count: 30,
    spread: 0.6,
    delay: 220,
    duration: 380,
  })
  for (let index = 0; index < 3; index++) {
    shockwave(ctx, ground(source), {
      color: index === 1 ? '#3b82f6' : '#dc2626',
      delay: impact + index * 130,
      radius: 1.9,
      thickness: 0.25,
    })
  }
  victims.forEach((victim, index) =>
    clawMarks(ctx, at(victim), {
      color: '#f87171',
      angle: index % 2 ? 0.8 : -0.8,
      delay: impact + index * 60,
    }),
  )
  burst(ctx, at(source, 0.2), {
    color: '#fb7185',
    count: 20,
    delay: impact,
    spread: 'ring',
    speed: 2.4,
    gravity: 0,
  })
  flinch(ctx, victims, impact, 60)
  flinch(ctx, victims, impact + 260, 40)
  shake(ctx, strength, impact, 420)
  return impact
}

// ---------- Beldum family ----------

const beldumTakeDown: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 360
  fx(ctx, 0, 260, undefined, (p) => (source.pose.tilt += 0.5 * pulse(p)))
  hover(ctx, ghostEye(0.05), bodyAt(source, 0.7), { duration: 300, face: true })
  dash(ctx, source, target, { delay: 160, duration: 480, hold: 0.12 })
  trail(ctx, source, { color: '#60a5fa', delay: 160, duration: 300 })
  // Beldum's three magnetic claws fold back for the ram.
  ;[0, 1, 2].forEach((index) => {
    const talon = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.16, 5).rotateX(Math.PI),
      metal('#9ca3af'),
    )
    const angle = (index / 3) * Math.PI * 2
    hover(ctx, talon, bodyAt(source, 0.2), {
      delay: 140,
      duration: 360,
      update: (p) => {
        talon.position.x += Math.cos(angle) * 0.14
        talon.position.z += Math.sin(angle) * 0.14
        talon.rotation.x = -0.8 * p
      },
    })
  })
  flare(ctx, at(target), { color: '#93c5fd', core: '#dbeafe', size: 0.45, rays: 4, delay: impact })
  burst(ctx, at(target), { color: '#cbd5e1', count: 14, delay: impact, speed: 2 })
  pushBack(ctx, target, source.root.position, { delay: impact, distance: 0.55, lift: 0.15 })
  flinch(ctx, [target], impact)
  cameraPunch(ctx, at(target), 0.2, impact - 30)
  shake(ctx, strength * 0.6, impact)
  return impact
}

const metangMetalClaw: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 400
  const victims = foesAroundCaster(ctx, source, target, 1.7)
  levitate(ctx, source, { duration: 760, height: 0.25, wobble: 0.06 })
  const xMark = new THREE.Group()
  ;[0.75, -0.75].forEach((angle) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.02), metal('#e5e7eb', 0.2))
    bar.rotation.z = angle
    xMark.add(bar)
  })
  hover(ctx, xMark, bodyAt(source, 0.75), { duration: 500, face: true })
  ;[-1, 1].forEach((side) => {
    const claw = new THREE.Group()
    for (let index = 0; index < 3; index++) {
      const talon = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.28, 5), metal('#93c5fd'))
      talon.position.x = (index - 1) * 0.09
      claw.add(talon)
    }
    hover(ctx, claw, bodyAt(source, 0.4), {
      duration: 760,
      update: (p) => {
        const angle = side * 1.2 + p * Math.PI * 4 * side
        claw.position.x += Math.cos(angle) * 0.7
        claw.position.z += Math.sin(angle) * 0.7
        claw.rotation.set(Math.PI / 2, -angle, 0)
      },
    })
  })
  victims.forEach((victim, index) => {
    clawMarks(ctx, at(victim), { color: '#bfdbfe', angle: -0.6, delay: impact + index * 80 })
    burst(ctx, at(victim), { color: '#94a3b8', count: 10, delay: impact + index * 80, speed: 1.6 })
  })
  shockwave(ctx, ground(source), { color: '#60a5fa', delay: impact, radius: 1.7 })
  flinch(ctx, victims, impact, 80)
  shake(ctx, strength * 0.5, impact)
  return impact
}

const metagrossMeteorMash: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 600
  const victims = foesNear(ctx, source, target, 1.5)
  leap(ctx, source, { duration: 640, height: 1.8, slam: true })
  dash(ctx, source, target, { delay: 120, duration: 760, hold: 0.25 })
  const fist = new THREE.Group()
  const knuckles = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), metal('#3b82f6'))
  const xPlate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.07, 0.07), metal('#e5e7eb'))
  const xPlate2 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.07, 0.07), metal('#e5e7eb'))
  xPlate.rotation.z = 0.75
  xPlate2.rotation.z = -0.75
  xPlate.position.z = xPlate2.position.z = 0.24
  fist.add(knuckles, xPlate, xPlate2)
  drop(ctx, at(target, 0.4), { build: () => fist, height: 3, delay: 220, duration: 470, tumble: 1 })
  trail(ctx, source, { color: '#93c5fd', delay: 200, duration: 420 })
  impactStar(ctx, impact, target)
  shockwave(ctx, ground(target), { color: '#60a5fa', delay: impact, radius: 2, thickness: 0.3 })
  shockwave(ctx, ground(target), { color: '#cbd5e1', delay: impact + 80, radius: 1.3 })
  groundCracks(ctx, ground(target), {
    color: '#93c5fd',
    count: 6,
    length: 1.3,
    delay: impact,
    duration: 800,
  })
  debris(ctx, ground(target), { color: '#64748b', count: 10, delay: impact, speed: 2.2 })
  daze(ctx, victims, '#fde047', impact + 120, 900)
  flinch(ctx, victims, impact, 40)
  cameraPunch(ctx, at(target), 0.35, impact - 40)
  shake(ctx, strength + 1, impact, 380)
  return impact
}

// Star-shaped glint where the meteor fist lands.
function impactStar(ctx: FxContext, impact: number, target: UnitView) {
  const star = starMesh('#93c5fd', 0.5, 4)
  hover(ctx, star, at(target, 0.4), {
    delay: impact,
    duration: 420,
    face: true,
    grow: 0.2,
    update: (p) => star.rotateZ(p * 0.6),
  })
}

// ---------- Trapinch family ----------

const trapinchSandTomb: Choreography = (ctx, { source, target }) => {
  const impact = 380
  squash(ctx, source, { duration: 260, amount: 0.18 })
  ;[1, -1].forEach((sign) => {
    const jaw = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.26, 16, 1, 0, Math.PI * 0.8),
      standard('#f97316', { roughness: 0.5 }),
    )
    hover(ctx, jaw, bodyAt(source, 0.5), {
      duration: 360,
      face: true,
      update: (p) => jaw.rotateZ(sign > 0 ? 0.6 - p : Math.PI + 0.2 + p),
    })
  })
  stream(ctx, ahead(source, target, 0.2, 0.3), ground(target), {
    color: '#d6b97a',
    count: 26,
    spread: 0.3,
    duration: 360,
    travel: 0.4,
  })
  vortex(ctx, ground(target), {
    color: '#d6b97a',
    secondary: '#a16207',
    radius: 0.7,
    height: 1.1,
    rings: 5,
    delay: impact - 60,
    duration: 1200,
  })
  cloud(ctx, ground(target), {
    color: '#c8a46a',
    count: 6,
    radius: 0.5,
    size: 0.3,
    opacity: 0.45,
    delay: impact,
    duration: 1200,
  })
  fx(ctx, impact, 1200, undefined, (p) => {
    target.pose.lift -= 0.12 * pulse(phase(p, 0, 0.9))
    target.pose.tilt += Math.sin(p * 30) * 0.04
  })
  flinch(ctx, [target], impact)
  flinch(ctx, [target], impact + 450)
  flinch(ctx, [target], impact + 900)
  return impact
}

const vibravaDragonBreath: Choreography = (ctx, { source, target }) => {
  const impact = 420
  const victims = [target, ...enemiesInLine(ctx, source, target, { limit: 3 })]
  // Vibrava's wings buzz into a green blur before it exhales.
  ;[-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), flat('#a3e635', 0.55))
    hover(ctx, wing, bodyAt(source, 0.7), {
      duration: 700,
      update: (_, now) => {
        wing.position.x += side * 0.3
        wing.rotation.set(0, 0, side * (0.3 + 0.4 * Math.sin(now * 0.08)))
      },
    })
  })
  levitate(ctx, source, { duration: 700, height: 0.25, wobble: 0.04 })
  stream(ctx, ahead(source, target, 0.25), beyond(source, target, 1.3), {
    color: '#4ade80',
    count: 40,
    spread: 0.55,
    delay: 200,
    duration: 520,
    wobble: 0.2,
  })
  stream(ctx, ahead(source, target, 0.25), beyond(source, target, 1.3), {
    color: '#60a5fa',
    count: 18,
    spread: 0.3,
    delay: 240,
    duration: 460,
  })
  victims.forEach((victim, index) => {
    zap(ctx, at(victim, 1), at(victim, 0.2), {
      color: '#86efac',
      delay: impact + index * 60,
      duration: 260,
    })
    daze(ctx, [victim], '#a3e635', impact + 100 + index * 60, 700)
  })
  flinchAlong(ctx, source, victims, impact - 80, 50)
  return impact
}

const flygonEarthPower: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 520
  const victims = [target, ...enemiesInLine(ctx, source, target, { limit: 3 })]
  levitate(ctx, source, { duration: 800, height: 0.4, wobble: 0.03 })
  ;[-1, 1].forEach((side) => {
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), lit('#dc2626', 0.5, 0.15))
    hover(ctx, lens, bodyAt(source, 0.95), {
      duration: 500,
      update: () => (lens.position.x += side * 0.1),
    })
  })
  cloud(ctx, ground(source), {
    color: '#d6b97a',
    count: 5,
    radius: 0.6,
    opacity: 0.35,
    duration: 700,
  })
  groundCracks(ctx, linePoint(source, target, 0.5, 1.2), {
    color: '#f97316',
    count: 5,
    length: 1.6,
    delay: 180,
    duration: 900,
  })
  for (let index = 0; index < 4; index++) {
    const point = linePoint(source, target, 0.25 + index * 0.22, 1.2)
    pillar(ctx, point, {
      color: index % 2 ? '#ea580c' : '#f59e0b',
      radius: 0.3,
      height: 1.8,
      delay: 320 + index * 70,
      duration: 520,
    })
    debris(ctx, point, { color: '#78350f', count: 6, delay: 320 + index * 70, speed: 1.8 })
  }
  victims.forEach((victim) =>
    pushBack(ctx, victim, source.root.position, { delay: impact, distance: 0.5, lift: 0.45 }),
  )
  flinchAlong(ctx, source, victims, 300, 70)
  shake(ctx, strength * 0.8, impact, 380)
  return impact
}

// ---------- Gligar family ----------

const gligarPoisonJab: Choreography = (ctx, { source, target }) => {
  const impact = 380
  leap(ctx, source, { duration: 420, height: 0.6 })
  dash(ctx, source, target, { delay: 100, duration: 460, hold: 0.1 })
  const stinger = new THREE.Group()
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.05, 0.4, 8).rotateX(Math.PI / 2),
    standard('#a855f7'),
  )
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.2, 8).rotateX(Math.PI / 2),
    lit('#7e22ce', 0.4, 0.3),
  )
  tip.position.z = 0.28
  stinger.add(tail, tip)
  prop(ctx, source, target, {
    build: () => stinger,
    delay: 220,
    duration: 160,
    arc: 0.25,
    fadeOut: 0.2,
  })
  burst(ctx, at(target), { color: '#c084fc', count: 12, delay: impact, speed: 1.4 })
  bubbles(ctx, at(target, 0.3), at(target, 1.1), {
    color: '#a855f7',
    count: 6,
    size: 0.07,
    delay: impact,
    duration: 900,
  })
  halo(ctx, target, { color: '#9333ea', direction: 'fall', delay: impact + 100, duration: 700 })
  flinch(ctx, [target], impact)
  return impact
}

const gliscorXScissor: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 420
  leap(ctx, source, { duration: 520, height: 0.9 })
  ;[-1, 1].forEach((side) => {
    const pincer = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.24, 14, 1, 0, Math.PI * 0.9),
      standard('#4c1d95', { roughness: 0.4 }),
    )
    hover(ctx, pincer, bodyAt(source, 0.8), {
      duration: 460,
      face: true,
      update: (p) => {
        pincer.position.x += side * 0.35
        pincer.rotateZ(side > 0 ? -0.3 - p : Math.PI + 0.3 + p)
      },
    })
  })
  dash(ctx, source, target, { delay: 160, duration: 500, through: true, hold: 0.1 })
  ;[0.8, -0.8].forEach((angle, index) =>
    slashArc(ctx, at(target), {
      color: index ? '#c084fc' : '#7e22ce',
      delay: impact + index * 40,
      angle,
      radius: 0.8,
      width: 0.18,
    }),
  )
  bubbles(ctx, at(target, 0.4), at(target, 1.1), {
    color: '#a855f7',
    count: 6,
    size: 0.07,
    delay: impact + 80,
    duration: 900,
  })
  // Execute: the X re-forms and snaps shut, crushing the poisoned target.
  const cross = new THREE.Group()
  ;[0.78, -0.78].forEach((angle) => {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.08), glow('#e9d5ff', 0.7))
    bar.rotation.z = angle
    cross.add(bar)
  })
  hover(ctx, cross, at(target), {
    delay: impact + 220,
    duration: 360,
    face: true,
    update: (p) => cross.scale.multiplyScalar(1.4 - 0.6 * easeInOut(p)),
  })
  burst(ctx, at(target), { color: '#9333ea', count: 16, delay: impact + 400, speed: 2 })
  flinch(ctx, [target], impact)
  flinch(ctx, [target], impact + 400)
  shake(ctx, strength * 0.6, impact + 400)
  return impact
}

// ---------- Misdreavus family ----------

const misdreavusShadowBall: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 520
  levitate(ctx, source, { duration: 700, height: 0.2, wobble: 0.08 })
  orbit(ctx, source, {
    color: '#db2777',
    count: 3,
    radius: 0.32,
    heightFactor: 0.4,
    turns: 1.5,
    build: () => new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), lit('#db2777', 0.5, 0.2)),
    duration: 600,
  })
  chargeOrb(ctx, ahead(source, target, 0.35, 0.6), {
    color: '#6b21a8',
    core: '#3b0764',
    size: 0.2,
    duration: 300,
  })
  prop(ctx, source, target, {
    build: () => {
      const group = new THREE.Group()
      group.add(
        new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), flat('#2e1065', 0.92)),
        new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), glow('#7e22ce', 0.45)),
      )
      return group
    },
    delay: 300,
    duration: impact - 300,
    arc: 0.2,
    spin: 4,
  })
  burst(ctx, at(target), { color: '#a855f7', count: 18, delay: impact, speed: 1.8 })
  cloud(ctx, at(target, 0.4), {
    color: '#3b0764',
    count: 5,
    radius: 0.4,
    opacity: 0.45,
    delay: impact,
    duration: 600,
  })
  flinch(ctx, [target], impact)
  shake(ctx, strength * 0.4, impact)
  return impact
}

const mismagiusMysticalFire: Choreography = (ctx, { source, target }) => {
  const impact = 480
  const victims = [target, ...enemiesInLine(ctx, source, target, { limit: 3 })]
  levitate(ctx, source, { duration: 900, height: 0.3, wobble: 0.05 })
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.42, 14, 1, true),
    standard('#6b21a8', { roughness: 0.7 }),
  )
  hover(ctx, hat, bodyAt(source, 1.1), {
    duration: 700,
    update: (p) => (hat.rotation.z = 0.25 * Math.sin(p * 12)),
  })
  sigil(ctx, ground(source), {
    color: '#a21caf',
    secondary: '#e879f9',
    radius: 0.8,
    points: 5,
    duration: 800,
  })
  ;[0, 1, 2].forEach((index) =>
    prop(ctx, source, target, {
      build: () => {
        const flameGroup = new THREE.Group()
        flameGroup.add(
          new THREE.Mesh(
            new THREE.ConeGeometry(0.09, 0.32, 7).rotateX(-Math.PI / 2),
            glow('#d946ef', 0.75),
          ),
          new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), glow('#f0abfc', 0.6)),
        )
        return flameGroup
      },
      to: beyond(source, target, 1.2),
      offset: new THREE.Vector3((index - 1) * 0.2, 0.1, 0),
      delay: 200 + index * 70,
      duration: 420,
      arc: 0.3 * (index - 1),
      fadeOut: 0.2,
    }),
  )
  victims.forEach((victim, index) =>
    flames(ctx, ground(victim), {
      color: '#c026d3',
      core: '#f5d0fe',
      count: 5,
      radius: 0.25,
      height: 0.55,
      delay: impact + index * 60,
      duration: 900,
    }),
  )
  flinchAlong(ctx, source, victims, impact - 80, 50)
  return impact
}

// ---------- Duskull family ----------

const duskullNightShade: Choreography = (ctx, { source, target }) => {
  const impact = 460
  fx(ctx, 0, 700, undefined, (p) => (source.pose.lift += 0.15 * Math.sin(p * Math.PI * 2)))
  const eye = ghostEye(0.07)
  hover(ctx, eye, bodyAt(source, 0.75), {
    duration: 560,
    face: true,
    update: (p) => eye.scale.multiplyScalar(1 + 0.5 * pulse(phase(p, 0.3, 0.7))),
  })
  // Shadow waves roll out from the skull toward the target.
  for (let index = 0; index < 3; index++) {
    prop(ctx, source, target, {
      build: () => new THREE.Mesh(new THREE.RingGeometry(0.2, 0.3, 24), flat('#1f2937', 0.7)),
      delay: 180 + index * 70,
      duration: 300,
      arc: 0,
      grow: 1,
      fadeOut: 0.3,
    })
  }
  const haunt = ghostEye(0.12)
  hover(ctx, haunt, at(target, 1.1), { delay: impact - 60, duration: 600, face: true })
  cloud(ctx, at(target, 0.4), {
    color: '#111827',
    count: 5,
    radius: 0.4,
    opacity: 0.5,
    delay: impact,
    duration: 600,
  })
  shiver(ctx, target, { delay: impact, duration: 500, amount: 0.07 })
  flinch(ctx, [target], impact)
  return impact
}

const dusclopsConfuseRay: Choreography = (ctx, { source, target }) => {
  const impact = 520
  const victims = foesAroundCaster(ctx, source, target, 2)
  fx(ctx, 0, 500, undefined, (p) => (source.pose.scale *= 1 + 0.1 * pulse(p)))
  const eye = ghostEye(0.12)
  hover(ctx, eye, bodyAt(source, 0.6), {
    duration: 700,
    face: true,
    update: (_, now) => eye.rotateZ(Math.sin(now * 0.01) * 0.1),
  })
  coil(ctx, source, { color: '#d6d3d1', radius: 0.42, turns: 3, thickness: 0.03, duration: 700 })
  victims.forEach((victim, index) => {
    const delay = 240 + index * 60
    prop(ctx, source, victim, {
      build: () => {
        const wisp = new THREE.Group()
        wisp.add(
          new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), glow('#facc15', 0.75)),
          new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), glow('#ef4444', 0.3)),
        )
        return wisp
      },
      delay,
      duration: impact - 240,
      arc: 0.6,
      spin: 6,
    })
    orbit(ctx, victim, {
      color: '#fde047',
      count: 3,
      radius: 0.3,
      heightFactor: 1.05,
      turns: 2,
      billboard: true,
      build: () =>
        new THREE.Mesh(
          new THREE.RingGeometry(0.025, 0.05, 12, 1, 0, Math.PI * 1.5),
          glow('#facc15', 0.85),
        ),
      delay: impact + index * 60,
      duration: 900,
    })
    fx(
      ctx,
      impact + index * 60,
      900,
      undefined,
      (p) => (victim.pose.tilt += Math.sin(p * Math.PI * 5) * 0.2 * pulse(p)),
    )
  })
  flinch(ctx, victims, impact, 60)
  return impact
}

const dusknoirShadowPunch: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 480
  const victims = foesAroundCaster(ctx, source, target, 1.9)
  hover(
    ctx,
    new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 20, Math.PI), lit('#facc15', 0.5)),
    bodyAt(source, 1.1),
    { duration: 800 },
  )
  const maw = ghostEye(0.09, '#facc15')
  hover(ctx, maw, bodyAt(source, 0.4), { duration: 600, face: true })
  victims.forEach((victim, index) => {
    const delay = 160 + index * 70
    prop(ctx, source, victim, {
      build: () => ghostHand(0.18, '#374151', 0.85),
      from: offsetAroundSource(source, index),
      delay,
      duration: impact - 160,
      arc: 0.7,
      ease: (p) => p * p,
      fadeOut: 0.1,
    })
    burst(ctx, at(victim), { color: '#6b7280', count: 10, delay: impact + index * 70, speed: 1.6 })
    // Life drains back to Dusknoir as dark-red motes.
    prop(ctx, victim, source, {
      build: () => new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glow('#b91c1c', 0.6)),
      delay: impact + 160 + index * 70,
      duration: 380,
      arc: 0.5,
      fadeOut: 0.3,
    })
  })
  halo(ctx, source, { color: '#b91c1c', delay: impact + 450, duration: 500 })
  flinch(ctx, victims, impact, 70)
  shake(ctx, strength * 0.6, impact)
  return impact
}

function offsetAroundSource(source: UnitView, index: number) {
  const out = new THREE.Vector3()
  const angle = index * 2.1
  return () =>
    source
      .focusPoint(out, 0.9)
      .add(new THREE.Vector3(Math.cos(angle) * 0.5, 0.2, Math.sin(angle) * 0.5))
}

// ---------- Carvanha family ----------

const carvanhaBite: Choreography = (ctx, { source, target }) => {
  const impact = 340
  dash(ctx, source, target, { delay: 80, duration: 460, hold: 0.15 })
  bubbles(ctx, at(source, 0.4), at(source, 1.1), {
    color: '#93c5fd',
    count: 5,
    size: 0.06,
    duration: 500,
  })
  fangs(ctx, target, {
    color: '#f8fafc',
    glowColor: '#dc2626',
    size: 0.3,
    teeth: 4,
    delay: impact - 180,
    duration: 420,
  })
  burst(ctx, at(target), { color: '#ef4444', count: 10, delay: impact, speed: 1.5 })
  prop(ctx, target, source, {
    build: () => new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glow('#dc2626', 0.6)),
    delay: impact + 120,
    duration: 340,
    arc: 0.4,
    fadeOut: 0.3,
  })
  halo(ctx, source, { color: '#f87171', delay: impact + 420, duration: 400 })
  flinch(ctx, [target], impact)
  return impact
}

const sharpedoCrunch: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 460
  stream(ctx, at(source, 0.2), ahead(source, target, -0.8, 0.2), {
    color: '#bfdbfe',
    count: 24,
    spread: 0.3,
    duration: 500,
  })
  dash(ctx, source, target, { delay: 100, duration: 560, through: true, hold: 0.12 })
  motionLines(ctx, source, { color: '#93c5fd', delay: 100, duration: 360 })
  const jaw = sharkJaw(0.5, '#1e3a8a', '#f8fafc')
  hover(ctx, jaw.group, at(target), {
    delay: impact - 260,
    duration: 560,
    face: true,
    update: (p) => {
      const close = easeInOut(phase(p, 0.2, 0.47))
      jaw.upper.position.y = 0.3 * (1 - close)
      jaw.lower.position.y = -0.3 * (1 - close)
    },
  })
  const mark = starMesh('#facc15', 0.12, 4, true)
  hover(ctx, mark, bodyAt(source, 0.5), { duration: 400, face: true })
  burst(ctx, at(target), { color: '#dc2626', count: 16, delay: impact, speed: 2 })
  burst(ctx, at(target), { color: '#60a5fa', count: 10, delay: impact, speed: 1.4, spread: 'up' })
  shiver(ctx, target, { delay: impact, duration: 360, amount: 0.1, speed: 50 })
  flinch(ctx, [target], impact)
  cameraPunch(ctx, at(target), 0.25, impact - 30)
  shake(ctx, strength * 0.7, impact)
  return impact
}

// ---------- Swablu family ----------

const swabluSing: Choreography = (ctx, { source, target }) => {
  const impact = 560
  const victims = foesAroundCaster(ctx, source, target, 2)
  ;[-1, 1].forEach((side) => {
    const wing = cottonPuff(0.12)
    hover(ctx, wing, bodyAt(source, 0.5), {
      duration: 800,
      update: (_, now) => {
        wing.position.x += side * 0.28
        wing.position.y += 0.06 * Math.sin(now * 0.015)
      },
    })
  })
  fx(ctx, 0, 800, undefined, (p) => (source.pose.tilt += Math.sin(p * Math.PI * 4) * 0.1))
  victims.forEach((victim, index) => {
    for (let note = 0; note < 2; note++) {
      prop(ctx, source, victim, {
        build: () => new THREE.Mesh(noteGeometry(0.1), glow(note ? '#7dd3fc' : '#f0f9ff', 0.85)),
        delay: 120 + index * 80 + note * 120,
        duration: 440,
        arc: 0.5 + note * 0.3,
        tumble: 2,
        fadeOut: 0.2,
      })
    }
    zzz(ctx, victim, { color: '#bae6fd', delay: impact + index * 80, duration: 1000 })
    fx(ctx, impact + index * 80, 900, undefined, (p) => {
      victim.pose.tilt += 0.25 * easeInOut(phase(p, 0, 0.3)) * (1 - phase(p, 0.8, 1))
      victim.pose.lift -= 0.05 * pulse(p)
    })
  })
  driftMotes(ctx, ground(source), {
    colors: ['#e0f2fe', '#bae6fd'],
    count: 14,
    radius: 0.8,
    height: 1.4,
    swirl: 1.5,
    duration: 900,
  })
  return impact
}

const altariaDragonDance: Choreography = (ctx, { source, target }) => {
  const impact = 520
  const allies = team(ctx, source, target, 2.2, 4)
  spin(ctx, source, { turns: 1.5, duration: 800 })
  leap(ctx, source, { duration: 800, height: 0.35 })
  ;[-1, 1].forEach((side) => {
    const wing = cottonPuff(0.22)
    hover(ctx, wing, bodyAt(source, 0.55), {
      duration: 900,
      update: (p) => {
        const angle = side * 1.4 + p * Math.PI * 3
        wing.position.x += Math.cos(angle) * 0.4
        wing.position.z += Math.sin(angle) * 0.4
      },
    })
  })
  vortex(ctx, ground(source), {
    color: '#7dd3fc',
    secondary: '#c4b5fd',
    radius: 1.2,
    height: 1.4,
    rings: 4,
    delay: 100,
    duration: 800,
  })
  driftMotes(ctx, ground(source), {
    colors: ['#f8fafc', '#bae6fd', '#c4b5fd'],
    count: 24,
    radius: 1.4,
    height: 1.6,
    swirl: 3,
    duration: 900,
  })
  allies.forEach((ally, index) => {
    statArrows(ctx, ally, {
      color: index === 0 ? '#60a5fa' : '#a78bfa',
      delay: impact + index * 70,
    })
    halo(ctx, ally, { color: '#93c5fd', delay: impact + index * 70, duration: 500 })
  })
  return impact
}

// ---------- Feebas family ----------

const feebasFlail: Choreography = (ctx, { source, target }) => {
  const impact = 460
  // Feebas flops desperately: big wobbles, splashes, then a wild slap.
  fx(ctx, 0, 620, undefined, (p) => {
    source.pose.tilt += Math.sin(p * Math.PI * 8) * 0.35 * pulse(p)
    source.pose.lift += Math.abs(Math.sin(p * Math.PI * 4)) * 0.25 * pulse(p)
  })
  ;[0, 200, 400].forEach((delay) =>
    burst(ctx, ground(source), {
      color: '#7dd3fc',
      count: 8,
      delay,
      spread: 'up',
      speed: 1.4,
      gravity: 3,
    }),
  )
  dash(ctx, source, target, { delay: 260, duration: 380, hold: 0.05 })
  ;[-0.9, 0.6, -0.2].forEach((angle, index) =>
    slashArc(ctx, at(target), {
      color: index % 2 ? '#a8a29e' : '#60a5fa',
      delay: impact - 60 + index * 70,
      angle,
      radius: 0.55,
      sweep: 1.4,
    }),
  )
  bubbles(ctx, at(target, 0.3), at(target, 1.1), {
    color: '#bfdbfe',
    count: 6,
    size: 0.06,
    delay: impact,
    duration: 500,
  })
  flinch(ctx, [target], impact, 0)
  flinch(ctx, [target], impact + 140)
  return impact
}

const miloticRecover: Choreography = (ctx, { source, target }) => {
  const impact = 500
  const allies = team(ctx, source, target, 2.2, 4)
  levitate(ctx, source, { duration: 900, height: 0.2, wobble: 0.04 })
  const scales = ['#f87171', '#fbbf24', '#4ade80', '#60a5fa', '#c084fc', '#f9a8d4']
  orbit(ctx, source, {
    color: '#fef3c7',
    count: 6,
    radius: 0.55,
    heightFactor: 0.5,
    turns: 1.5,
    build: (index) => {
      const scale = new THREE.Mesh(new THREE.CircleGeometry(0.07, 3), lit(scales[index], 0.35, 0.2))
      scale.scale.set(1, 1.4, 1)
      return scale
    },
    duration: 900,
  })
  bodyRing(ctx, source, {
    material: () =>
      standard('#fef3c7', { roughness: 0.3, emissive: '#fde68a', emissiveIntensity: 0.2 }),
    radius: 0.5,
    tube: 0.06,
    heightFactor: 0.2,
    tilt: 0.15,
    spin: 3,
    duration: 900,
  })
  shockwave(ctx, ground(source), {
    color: '#7dd3fc',
    delay: impact - 60,
    radius: 2.2,
    thickness: 0.14,
    duration: 600,
  })
  allies.forEach((ally, index) => {
    const delay = impact + index * 70
    bubbles(ctx, ground(ally), at(ally, 1.1), {
      color: '#a5f3fc',
      count: 5,
      size: 0.07,
      delay,
      duration: 600,
    })
    halo(ctx, ally, { color: index % 2 ? '#f9a8d4' : '#7dd3fc', delay, duration: 600 })
  })
  return impact
}

// ---------- Slakoth family ----------

const slakothYawn: Choreography = (ctx, { source, target }) => {
  const impact = 620
  fx(ctx, 0, 460, undefined, (p) => {
    source.pose.scale *= 1 + 0.12 * pulse(phase(p, 0, 0.7))
    source.pose.tilt -= 0.2 * pulse(phase(p, 0, 0.7))
  })
  const bubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 12),
    standard('#e0f2fe', { opacity: 0.5, roughness: 0.05 }),
  )
  prop(ctx, source, target, {
    build: () => bubble,
    delay: 120,
    duration: 380,
    arc: 0.5,
    grow: 0.8,
    ease: (p) => p * p,
  })
  zzz(ctx, target, { color: '#e0f2fe', delay: 420, duration: 900 })
  // ... then a lazy bonk with a heavy paw.
  dash(ctx, source, target, { delay: 380, duration: 420, hold: 0.1 })
  burst(ctx, at(target, 0.9), { color: '#d6d3d1', count: 10, delay: impact, speed: 1.4 })
  daze(ctx, [target], '#fde047', impact + 60, 800)
  squash(ctx, target, { delay: impact, duration: 300, amount: 0.2 })
  flinch(ctx, [target], impact)
  return impact
}

const vigorothFurySwipes: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 360
  const victims = foesAroundCaster(ctx, source, target, 1.7)
  shiver(ctx, source, { duration: 900, amount: 0.08, speed: 70 })
  spin(ctx, source, { delay: 120, turns: 3, duration: 760 })
  motionLines(ctx, source, { color: '#fecaca', delay: 100, duration: 700 })
  victims.forEach((victim, index) => {
    for (let swipe = 0; swipe < 3; swipe++) {
      clawMarks(ctx, at(victim), {
        color: swipe % 2 ? '#fca5a5' : '#f5f5f4',
        angle: swipe % 2 ? 0.7 : -0.7,
        size: 0.45,
        delay: impact + swipe * 140 + index * 40,
        duration: 260,
      })
    }
  })
  burst(ctx, at(source, 0.3), {
    color: '#ef4444',
    count: 14,
    delay: impact,
    spread: 'ring',
    speed: 2,
    gravity: 0,
  })
  flinch(ctx, victims, impact, 40)
  flinch(ctx, victims, impact + 280, 40)
  shake(ctx, strength * 0.4, impact + 280)
  return impact
}

const slakingGigaImpact: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 680
  // Slaking finally gets up: a long, heavy wind-up wrapped in a violet-orange aura.
  crouch(ctx, source, { duration: 420 })
  aura(ctx, source, { color: '#f97316', count: 22, duration: 700 })
  coil(ctx, source, {
    color: '#a855f7',
    radius: 0.5,
    turns: 3,
    thickness: 0.04,
    glowing: true,
    duration: 600,
  })
  chargeOrb(ctx, at(source, 0.6), { color: '#c084fc', core: '#fdba74', size: 0.26, duration: 420 })
  dash(ctx, source, target, { delay: 420, duration: 600, through: true, hold: 0.1 })
  trail(ctx, source, { color: '#a855f7', delay: 420, duration: 420 })
  motionLines(ctx, source, { color: '#fdba74', delay: 420, duration: 360 })
  shockwave(ctx, ground(target), { color: '#a855f7', delay: impact, radius: 2.2, thickness: 0.35 })
  shockwave(ctx, ground(target), {
    color: '#f97316',
    delay: impact + 90,
    radius: 1.5,
    thickness: 0.25,
  })
  groundCracks(ctx, ground(target), {
    color: '#fb923c',
    count: 6,
    length: 1.4,
    delay: impact,
    duration: 800,
  })
  debris(ctx, ground(target), { color: '#78350f', count: 12, delay: impact, speed: 2.4 })
  burst(ctx, at(target), { color: '#fdba74', count: 20, delay: impact, speed: 2.4 })
  pushBack(ctx, target, source.root.position, { delay: impact, distance: 0.8, lift: 0.4 })
  flinch(ctx, foesNear(ctx, source, target, 1.2), impact, 40)
  // Recharge: Slaking flops down afterwards.
  fx(ctx, impact + 300, 500, undefined, (p) => {
    source.pose.scale *= 1 - 0.1 * pulse(p)
    source.pose.tilt += 0.3 * pulse(p)
  })
  cameraPunch(ctx, at(target), 0.35, impact - 40)
  shake(ctx, strength + 2, impact, 420)
  return impact
}

export const GEN23_TIER3_ULTIMATES: UltimateSet = {
  'eevee:Swift': eeveeSwift,
  'vaporeon:Aqua Ring': vaporeonAquaRing,
  'jolteon:Thunderbolt': jolteonThunderbolt,
  'flareon:Flare Blitz': flareonFlareBlitz,
  'espeon:Psychic': espeonPsychic,
  'umbreon:Moonlight': umbreonMoonlight,
  'leafeon:Leaf Blade': leafeonLeafBlade,
  'glaceon:Blizzard': glaceonBlizzard,
  'ralts:Confusion': raltsConfusion,
  'kirlia:Calm Mind': kirliaCalmMind,
  'gardevoir:Heal Pulse': gardevoirHealPulse,
  'gallade:Psycho Cut': galladePsychoCut,
  'larvitar:Rock Slide': larvitarRockSlide,
  'pupitar:Sandstorm': pupitarSandstorm,
  'tyranitar:Stone Edge': tyranitarStoneEdge,
  'bagon:Headbutt': bagonHeadbutt,
  'shelgon:Protect': shelgonProtect,
  'salamence:Outrage': salamenceOutrage,
  'beldum:Take Down': beldumTakeDown,
  'metang:Metal Claw': metangMetalClaw,
  'metagross:Meteor Mash': metagrossMeteorMash,
  'trapinch:Sand Tomb': trapinchSandTomb,
  'vibrava:Dragon Breath': vibravaDragonBreath,
  'flygon:Earth Power': flygonEarthPower,
  'gligar:Poison Jab': gligarPoisonJab,
  'gliscor:X-Scissor': gliscorXScissor,
  'misdreavus:Shadow Ball': misdreavusShadowBall,
  'mismagius:Mystical Fire': mismagiusMysticalFire,
  'duskull:Night Shade': duskullNightShade,
  'dusclops:Confuse Ray': dusclopsConfuseRay,
  'dusknoir:Shadow Punch': dusknoirShadowPunch,
  'carvanha:Bite': carvanhaBite,
  'sharpedo:Crunch': sharpedoCrunch,
  'swablu:Sing': swabluSing,
  'altaria:Dragon Dance': altariaDragonDance,
  'feebas:Flail': feebasFlail,
  'milotic:Recover': miloticRecover,
  'slakoth:Yawn': slakothYawn,
  'vigoroth:Fury Swipes': vigorothFurySwipes,
  'slaking:Giga Impact': slakingGigaImpact,
}
