import * as THREE from 'three'
import type { UnitView } from '../../unitView'
import { bubbleVolley, drill, splashCrown, waterJet } from '../kit/pokemonTier1'
import { above, ahead, bodyAt, bubbles, fangs, fistMesh, standard, tube } from '../kit/shared'
import {
  at,
  burst,
  crescentMesh,
  flare,
  glow,
  ground,
  leafMesh,
  projectile,
  prop,
  shockwave,
  slashArc,
  type FxContext,
} from '../primitives'
import type { AttackChoreography, AttackSet } from '../types'

const UP = new THREE.Vector3(0, 1, 0)

// A single short vine flick from the bulb; heavier forms get a thicker vine.
function vineFlick(ctx: FxContext, source: UnitView, target: UnitView, thickness: number): number {
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const side = new THREE.Vector3()
  const root = bodyAt(source, 0.8)
  tube(ctx, {
    material: standard('#15803d', { roughness: 0.7 }),
    duration: 320,
    radius: thickness,
    controlPoints: 6,
    tubularSegments: 18,
    radialSegments: 5,
    taper: true,
    priority: 'standard',
    path: (p, points) => {
      from.copy(root())
      to.copy(target.root.position).setY(target.height * 0.55)
      side.subVectors(to, from).cross(UP).normalize()
      const reach = p < 0.45 ? p / 0.45 : 1 - (p - 0.45) / 0.55
      points.forEach((point, index) => {
        const t = (index / (points.length - 1)) * reach
        point.lerpVectors(from, to, t).addScaledVector(side, Math.sin(Math.PI * t) * 0.3)
        point.y += Math.sin(Math.PI * t) * 0.5
      })
    },
  })
  return 140
}

const bulbasaurVine: AttackChoreography = (ctx, { source, target, secondary }) => {
  const impact = vineFlick(ctx, source, target, 0.03)
  slashArc(ctx, at(target), {
    color: secondary,
    delay: impact,
    radius: 0.4,
    width: 0.06,
    duration: 180,
    priority: 'standard',
  })
  return impact
}

const ivysaurLeaves: AttackChoreography = (ctx, { source, target, color }) => {
  ;[0, 70].forEach((delay, index) =>
    prop(ctx, source, target, {
      build: () => leafMesh(index ? '#a3e635' : color, 0.12),
      from: bodyAt(source, 0.9),
      delay,
      duration: 220,
      arc: 0.25,
      tumble: 16,
      priority: 'standard',
    }),
  )
  slashArc(ctx, at(target), {
    color: '#bbf7d0',
    delay: 220,
    radius: 0.4,
    width: 0.05,
    duration: 180,
    priority: 'standard',
  })
  return 220
}

const venusaurVine: AttackChoreography = (ctx, { source, target }) => {
  const impact = vineFlick(ctx, source, target, 0.05)
  burst(ctx, at(target), {
    color: '#f9a8d4',
    count: 10,
    delay: impact,
    speed: 1.3,
    priority: 'standard',
  })
  shockwave(ctx, ground(target), {
    color: '#4ade80',
    delay: impact,
    radius: 0.7,
    duration: 280,
    priority: 'standard',
  })
  return impact
}

const emberSpit =
  (size: number, count: number): AttackChoreography =>
  (ctx, { source, target, color }) => {
    projectile(ctx, source, target, {
      color,
      core: '#fde047',
      duration: 240,
      size,
      arc: 0.3,
      from: ahead(source, target, 0.3, 0.6),
      priority: 'standard',
    })
    burst(ctx, at(target), {
      color: '#fb923c',
      count,
      delay: 240,
      speed: 1.2,
      spread: 'up',
      gravity: 0.3,
      priority: 'standard',
    })
    return 240
  }

const charmeleonClaw: AttackChoreography = (ctx, { target, color }) => {
  ;[-1.2, 0.4].forEach((angle, index) =>
    slashArc(ctx, at(target), {
      color: index ? '#fde047' : color,
      delay: 90 + index * 50,
      angle,
      radius: 0.45,
      priority: 'standard',
    }),
  )
  burst(ctx, at(target), {
    color: '#f97316',
    count: 8,
    delay: 120,
    spread: 'up',
    gravity: 0.2,
    priority: 'standard',
  })
  return 120
}

const squirtleBubble: AttackChoreography = (ctx, { source, target }) => {
  bubbleVolley(ctx, ahead(source, target, 0.25, 0.5), at(target), {
    count: 4,
    size: 0.09,
    spread: 0.35,
    travel: 0.5,
    duration: 420,
    priority: 'standard',
  })
  splashCrown(ctx, ground(target), {
    radius: 0.22,
    height: 0.28,
    tips: 7,
    delay: 210,
    duration: 520,
    priority: 'standard',
  })
  return 210
}

const wartortleTailSlap: AttackChoreography = (ctx, { target }) => {
  slashArc(ctx, at(target), {
    color: '#0ea5e9',
    delay: 90,
    angle: 2.2,
    radius: 0.55,
    width: 0.18,
    priority: 'standard',
  })
  splashCrown(ctx, ground(target), {
    radius: 0.3,
    height: 0.42,
    tips: 9,
    delay: 110,
    duration: 620,
    priority: 'standard',
  })
  bubbleVolley(ctx, at(target, 0.5), above(target, 1.5), {
    count: 3,
    size: 0.07,
    spread: 0.6,
    travel: 0.55,
    delay: 110,
    duration: 380,
    priority: 'standard',
  })
  return 110
}

const blastoiseWaterPulse: AttackChoreography = (ctx, { source, target }) => {
  waterJet(ctx, ahead(source, target, 0.25, 0.9), at(target), {
    radius: 0.06,
    grow: 0.4,
    rings: 2,
    spray: 10,
    duration: 320,
    priority: 'standard',
  })
  splashCrown(ctx, ground(target), {
    radius: 0.32,
    height: 0.5,
    tips: 10,
    delay: 130,
    duration: 600,
    priority: 'standard',
  })
  return 130
}

const caterpieSilk: AttackChoreography = (ctx, { source, target }) => {
  projectile(ctx, source, target, {
    color: '#f8fafc',
    core: '#ffffff',
    duration: 240,
    size: 0.04,
    arc: 0.1,
    shape: 'bolt',
    from: ahead(source, target, 0.3, 0.5),
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: '#f1f5f9',
    count: 6,
    delay: 240,
    speed: 0.7,
    priority: 'standard',
  })
  return 240
}

const shellTackle: AttackChoreography = (ctx, { target, color }) => {
  burst(ctx, at(target), { color, count: 8, delay: 120, speed: 1.2, priority: 'standard' })
  shockwave(ctx, ground(target), {
    color,
    delay: 120,
    radius: 0.6,
    duration: 260,
    priority: 'standard',
  })
  return 120
}

const butterfreeGust: AttackChoreography = (ctx, { source, target }) => {
  projectile(ctx, source, target, {
    color: '#c4b5fd',
    core: '#e0e7ff',
    duration: 280,
    size: 0.09,
    arc: 0.5,
    from: bodyAt(source, 0.8),
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: '#a5f3fc',
    count: 10,
    delay: 280,
    speed: 0.9,
    gravity: -0.1,
    priority: 'standard',
  })
  return 280
}

const weedleSting: AttackChoreography = (ctx, { source, target }) => {
  projectile(ctx, source, target, {
    color: '#a855f7',
    core: '#f5d0fe',
    duration: 200,
    size: 0.05,
    arc: 0.05,
    shape: 'shard',
    from: bodyAt(source, 1),
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: '#c084fc',
    count: 6,
    delay: 200,
    speed: 0.9,
    priority: 'standard',
  })
  return 200
}

const beedrillTwineedle: AttackChoreography = (ctx, { source, target }) => {
  ;[1, -1].forEach((sign, index) => {
    const offset = new THREE.Vector3(0, sign * 0.12, 0)
    const root = bodyAt(source, 0.55)
    drill(ctx, {
      color: '#e2e8f0',
      stripe: '#d946ef',
      length: 0.4,
      radius: 0.06,
      delay: index * 60,
      duration: 150,
      spin: 0,
      from: () => root().add(offset),
      to: at(target),
      priority: 'standard',
    })
  })
  burst(ctx, at(target), {
    color: '#a855f7',
    count: 8,
    delay: 210,
    speed: 1.2,
    priority: 'standard',
  })
  return 150
}

const wingBlade =
  (radius: number, color: string): AttackChoreography =>
  (ctx, { source, target }) => {
    prop(ctx, source, target, {
      build: () => {
        const holder = new THREE.Group()
        const blade = crescentMesh(color, radius)
        blade.rotation.x = Math.PI / 2
        holder.add(blade)
        return holder
      },
      from: ahead(source, target, 0.3, 0.6),
      duration: 260,
      arc: 0.05,
      fadeOut: 0.25,
      priority: 'standard',
    })
    burst(ctx, at(target), {
      color: '#f1f5f9',
      count: 8,
      delay: 260,
      spread: 'ring',
      speed: 1.2,
      gravity: 0,
      priority: 'standard',
    })
    return 260
  }

const bite =
  (size: number, glowColor?: string): AttackChoreography =>
  (ctx, { target }) => {
    fangs(ctx, target, {
      color: '#fffbeb',
      glowColor,
      size,
      teeth: 2,
      duration: 240,
      priority: 'standard',
    })
    burst(ctx, at(target), {
      color: '#fef3c7',
      count: 8,
      delay: 130,
      speed: 1.2,
      priority: 'standard',
    })
    return 130
  }

const beakJab =
  (color: string, length: number): AttackChoreography =>
  (ctx, { source, target }) => {
    drill(ctx, {
      color,
      stripe: '#fff7ed',
      length,
      radius: length * 0.22,
      duration: 160,
      spin: 6,
      from: ahead(source, target, 0.2, 0.6),
      to: at(target),
      priority: 'standard',
    })
    flare(ctx, at(target), { color: '#fde68a', size: 0.25, delay: 160, priority: 'standard' })
    return 160
  }

const hornThrust =
  (color: string, length: number): AttackChoreography =>
  (ctx, { source, target }) => {
    drill(ctx, {
      color,
      stripe: '#a855f7',
      length,
      radius: length * 0.2,
      duration: 150,
      spin: 0,
      from: bodyAt(source, 0.9),
      to: at(target, 0.6),
      priority: 'standard',
    })
    burst(ctx, at(target), {
      color: '#d8b4fe',
      count: 8,
      delay: 150,
      speed: 1.3,
      priority: 'standard',
    })
    return 150
  }

const poisonScratch: AttackChoreography = (ctx, { target, color, secondary }) => {
  ;[-1.4, 0.2].forEach((angle, index) =>
    slashArc(ctx, at(target), {
      color: index ? secondary : color,
      delay: 90 + index * 45,
      angle,
      radius: 0.42,
      width: 0.08,
      priority: 'standard',
    }),
  )
  burst(ctx, at(target), {
    color: '#c084fc',
    count: 6,
    delay: 120,
    speed: 0.8,
    gravity: -0.2,
    priority: 'standard',
  })
  return 120
}

const nidoqueenSlam: AttackChoreography = (ctx, { target }) => {
  burst(ctx, at(target, 0.3), {
    color: '#a16207',
    count: 10,
    delay: 130,
    speed: 1.4,
    gravity: 2.4,
    priority: 'standard',
  })
  shockwave(ctx, ground(target), {
    color: '#c084fc',
    delay: 130,
    radius: 0.9,
    duration: 300,
    priority: 'standard',
  })
  return 130
}

const seedShot =
  (color: string, core: string): AttackChoreography =>
  (ctx, { source, target }) => {
    projectile(ctx, source, target, {
      color,
      core,
      duration: 260,
      size: 0.07,
      arc: 0.6,
      from: bodyAt(source, 1),
      priority: 'standard',
    })
    burst(ctx, at(target), {
      color,
      count: 8,
      delay: 260,
      speed: 1,
      gravity: 0.6,
      priority: 'standard',
    })
    return 260
  }

const vileplumePetal: AttackChoreography = (ctx, { source, target }) => {
  prop(ctx, source, target, {
    build: () => leafMesh('#ef4444', 0.13),
    from: bodyAt(source, 1.1),
    duration: 280,
    arc: 0.5,
    tumble: 12,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: '#fecaca',
    count: 8,
    delay: 280,
    speed: 1,
    gravity: 0.4,
    priority: 'standard',
  })
  return 280
}

const bubbleShot =
  (count: number): AttackChoreography =>
  (ctx, { source, target }) => {
    bubbles(ctx, ahead(source, target, 0.3, 0.5), at(target), {
      color: '#93c5fd',
      count,
      size: 0.08,
      duration: 420,
      priority: 'standard',
    })
    burst(ctx, at(target), {
      color: '#e0f2fe',
      count: 6,
      delay: 220,
      speed: 1,
      priority: 'standard',
    })
    return 220
  }

const poliwrathPunch: AttackChoreography = (ctx, { source, target }) => {
  prop(ctx, source, target, {
    build: () => {
      const holder = new THREE.Group()
      holder.add(
        fistMesh(0.16, () => standard('#e0f2fe', { emissive: '#3b82f6', emissiveIntensity: 0.4 })),
      )
      holder.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), glow('#60a5fa', 0.4)))
      return holder
    },
    from: bodyAt(source, 0.6),
    duration: 150,
    arc: 0,
    priority: 'standard',
  })
  flare(ctx, at(target), { color: '#fb923c', size: 0.35, delay: 150, priority: 'standard' })
  shockwave(ctx, ground(target), {
    color: '#60a5fa',
    delay: 150,
    radius: 0.6,
    duration: 240,
    priority: 'standard',
  })
  return 150
}

export const POKEMON_TIER_1_ATTACKS: AttackSet = {
  bulbasaur: bulbasaurVine,
  ivysaur: ivysaurLeaves,
  venusaur: venusaurVine,
  charmander: emberSpit(0.06, 6),
  charmeleon: charmeleonClaw,
  charizard: emberSpit(0.11, 12),
  squirtle: squirtleBubble,
  wartortle: wartortleTailSlap,
  blastoise: blastoiseWaterPulse,
  caterpie: caterpieSilk,
  metapod: shellTackle,
  butterfree: butterfreeGust,
  weedle: weedleSting,
  kakuna: shellTackle,
  beedrill: beedrillTwineedle,
  pidgey: wingBlade(0.2, '#e2e8f0'),
  pidgeotto: wingBlade(0.26, '#cffafe'),
  pidgeot: wingBlade(0.34, '#a5f3fc'),
  rattata: bite(0.22),
  raticate: bite(0.32, '#a855f7'),
  spearow: beakJab('#fb923c', 0.26),
  fearow: beakJab('#f59e0b', 0.4),
  nidoran_f: poisonScratch,
  nidorina: poisonScratch,
  nidoqueen: nidoqueenSlam,
  nidoran_m: hornThrust('#e9d5ff', 0.3),
  nidorino: hornThrust('#f5d0fe', 0.4),
  nidoking: hornThrust('#ecfccb', 0.55),
  oddish: seedShot('#4ade80', '#f0fdf4'),
  gloom: seedShot('#a16207', '#fde047'),
  vileplume: vileplumePetal,
  poliwag: bubbleShot(3),
  poliwhirl: bubbleShot(5),
  poliwrath: poliwrathPunch,
}
