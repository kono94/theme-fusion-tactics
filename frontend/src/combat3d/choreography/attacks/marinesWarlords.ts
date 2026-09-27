import * as THREE from 'three'
import { armoredFist, batMesh, pawMesh } from '../kit/marinesWarlords'
import { billboard, flat, fx, heartGeometry, palmMesh, setOpacity, standard } from '../kit/shared'
import {
  at,
  burst,
  cloud,
  crescentMesh,
  flare,
  glow,
  ground,
  projectile,
  prop,
  shockwave,
  slashArc,
} from '../primitives'
import type { AttackChoreography, AttackSet } from '../types'

const SKIN = '#f1c27d'
const STANDARD = 'standard' as const

const kobyPunch: AttackChoreography = (ctx, { source, target, color }) => {
  prop(ctx, source, target, {
    build: () => armoredFist(0.2, SKIN, { cuff: '#f8fafc' }),
    duration: 120,
    arc: 0,
    priority: STANDARD,
  })
  flare(ctx, at(target), { color, size: 0.3, delay: 120, priority: STANDARD })
  burst(ctx, at(target), { color, count: 6, delay: 120, speed: 1.2, priority: STANDARD })
  return 120
}

const helmeppoKukri: AttackChoreography = (ctx, { target, color, secondary }) => {
  slashArc(ctx, at(target), {
    color,
    delay: 60,
    angle: -0.9,
    radius: 0.45,
    sweep: 1.6,
    width: 0.09,
    priority: STANDARD,
  })
  slashArc(ctx, at(target), {
    color: secondary,
    delay: 110,
    angle: 2.2,
    radius: 0.45,
    sweep: -1.6,
    width: 0.09,
    priority: STANDARD,
  })
  burst(ctx, at(target), { color, count: 6, delay: 110, priority: STANDARD })
  return 110
}

const tashigiKatana: AttackChoreography = (ctx, { target, color }) => {
  slashArc(ctx, at(target), {
    color,
    delay: 90,
    duration: 160,
    angle: -2.2,
    radius: 0.7,
    width: 0.05,
    sweep: 1.9,
    priority: STANDARD,
  })
  flare(ctx, at(target, 0.6), { color: '#e0e7ff', size: 0.22, delay: 110, priority: STANDARD })
  return 100
}

const hinaIronBand: AttackChoreography = (ctx, { source, target, color }) => {
  prop(ctx, source, target, {
    build: () => armoredFist(0.16, SKIN, { cuff: '#1e293b' }),
    duration: 130,
    arc: 0,
    priority: STANDARD,
  })
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.04, 6, 28),
    standard('#64748b', {
      metalness: 0.7,
      roughness: 0.35,
      emissive: color,
      emissiveIntensity: 0.4,
    }),
  )
  band.rotation.x = Math.PI / 2
  const holder = new THREE.Group()
  holder.add(band)
  fx(
    ctx,
    130,
    320,
    holder,
    (p) => {
      target.focusPoint(holder.position, 0.45)
      const snap = Math.min(1, p * 4)
      band.scale.setScalar(1.8 - snap * 0.8)
      setOpacity(holder, 1 - Math.max(0, (p - 0.6) / 0.4))
    },
    STANDARD,
  )
  burst(ctx, at(target), { color, count: 6, delay: 150, priority: STANDARD })
  return 140
}

const smokerJitte: AttackChoreography = (ctx, { source, target, color }) => {
  prop(ctx, source, target, {
    build: () => {
      const fist = armoredFist(0.26, '#e2e8f0')
      setOpacity(fist, 0.75)
      return fist
    },
    duration: 160,
    arc: 0.1,
    priority: STANDARD,
  })
  cloud(ctx, at(target, 0.5), {
    color,
    count: 4,
    radius: 0.3,
    size: 0.25,
    delay: 150,
    duration: 380,
    priority: STANDARD,
  })
  shockwave(ctx, ground(target), {
    color: '#94a3b8',
    delay: 160,
    radius: 0.6,
    duration: 260,
    priority: STANDARD,
  })
  return 160
}

const garpHakiFist: AttackChoreography = (ctx, { source, target, color }) => {
  prop(ctx, source, target, {
    build: () => armoredFist(0.26, '#111827', { cuff: '#f8fafc', glowColor: '#60a5fa' }),
    duration: 130,
    arc: 0,
    grow: 0.3,
    priority: STANDARD,
  })
  shockwave(ctx, ground(target), {
    color,
    delay: 130,
    radius: 0.9,
    duration: 300,
    priority: STANDARD,
  })
  burst(ctx, at(target), {
    color: '#f8fafc',
    count: 10,
    delay: 130,
    speed: 1.8,
    priority: STANDARD,
  })
  return 130
}

const sengokuPalm: AttackChoreography = (ctx, { source, target, color, secondary }) => {
  prop(ctx, source, target, {
    build: () => palmMesh(0.18, () => glow(color, 0.75)),
    duration: 130,
    arc: 0,
    grow: 0.4,
    priority: STANDARD,
  })
  shockwave(ctx, ground(target), {
    color,
    delay: 130,
    radius: 0.8,
    duration: 300,
    priority: STANDARD,
  })
  flare(ctx, at(target), { color: secondary, size: 0.35, delay: 130, priority: STANDARD })
  return 130
}

const kizaruLightKick: AttackChoreography = (ctx, { source, target, color }) => {
  for (let index = 0; index < 3; index++) {
    projectile(ctx, source, target, {
      color,
      core: '#ffffff',
      delay: index * 35,
      duration: 90,
      size: 0.05,
      arc: 0,
      shape: 'bolt',
      offset: new THREE.Vector3((index - 1) * 0.12, 0.1, 0),
      priority: STANDARD,
    })
  }
  flare(ctx, at(target), { color, size: 0.3, rays: 6, delay: 100, priority: STANDARD })
  return 90
}

const akainuMagmaPunch: AttackChoreography = (ctx, { source, target, color, secondary }) => {
  prop(ctx, source, target, {
    build: () =>
      armoredFist(0.28, '#7f1d1d', {
        emissive: '#f97316',
        emissiveIntensity: 1,
        glowColor: secondary,
      }),
    duration: 140,
    arc: 0,
    priority: STANDARD,
  })
  burst(ctx, at(target), {
    color: secondary,
    count: 10,
    delay: 140,
    speed: 1.6,
    gravity: 2,
    spread: 'up',
    priority: STANDARD,
  })
  shockwave(ctx, ground(target), {
    color,
    delay: 140,
    radius: 0.7,
    duration: 300,
    priority: STANDARD,
  })
  return 140
}

const buggyKnifeHand: AttackChoreography = (ctx, { source, target, color }) => {
  const build = () => {
    const hand = new THREE.Group()
    hand.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), standard('#f8fafc')))
    const knife = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.32, 4).rotateX(Math.PI / 2).translate(0, 0, 0.24),
      standard('#cbd5e1', { metalness: 0.8, roughness: 0.25 }),
    )
    hand.add(knife)
    return hand
  }
  prop(ctx, source, target, {
    build,
    duration: 220,
    arc: 0.35,
    spin: Math.PI * 4,
    priority: STANDARD,
  })
  slashArc(ctx, at(target), {
    color: '#e2e8f0',
    delay: 220,
    radius: 0.4,
    sweep: 1.8,
    width: 0.07,
    priority: STANDARD,
  })
  burst(ctx, at(target), { color, count: 6, delay: 220, priority: STANDARD })
  return 220
}

const moriaShadowBats: AttackChoreography = (ctx, { source, target, color }) => {
  const flock = new THREE.Group()
  const bats = [0, 1, 2].map(() => {
    const bat = batMesh(0.16, '#0b0620')
    flock.add(bat)
    return bat
  })
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const travel = 260
  fx(
    ctx,
    0,
    travel,
    flock,
    (p, now) => {
      source.focusPoint(from, 0.7)
      target.focusPoint(to, 0.6)
      bats.forEach((bat, index) => {
        const local = Math.min(1, p * (1 + index * 0.12))
        bat.position.lerpVectors(from, to, local)
        bat.position.y +=
          Math.sin(Math.PI * local) * (0.3 + index * 0.15) + Math.sin(now * 0.03 + index) * 0.05
        bat.position.x += (index - 1) * 0.15 * Math.sin(Math.PI * local)
        billboard(ctx, bat)
        const flap = Math.sin(now * 0.06 + index * 2) * 0.7
        bat.children[0].rotation.y = flap
        bat.children[1].rotation.y = -flap
      })
    },
    STANDARD,
  )
  burst(ctx, at(target), { color, count: 8, delay: travel, speed: 1.2, priority: STANDARD })
  return travel
}

const crocodileSandBlade: AttackChoreography = (ctx, { source, target, color, secondary }) => {
  prop(ctx, source, target, {
    build: () => {
      const blade = crescentMesh(color, 0.34)
      blade.rotation.x = -Math.PI / 2
      const holder = new THREE.Group()
      holder.add(blade)
      return holder
    },
    from: at(source, 0.3),
    to: at(target, 0.3),
    duration: 240,
    arc: 0.05,
    tumble: Math.PI * 6,
    priority: STANDARD,
  })
  burst(ctx, at(target, 0.3), {
    color: secondary,
    count: 10,
    delay: 240,
    speed: 1.4,
    gravity: 2.4,
    priority: STANDARD,
  })
  return 240
}

const kumaPawPush: AttackChoreography = (ctx, { source, target, color }) => {
  prop(ctx, source, target, {
    build: () => pawMesh(0.4, color, 0.7),
    duration: 140,
    arc: 0,
    grow: 0.5,
    priority: STANDARD,
  })
  shockwave(ctx, at(target, 0.5), {
    color: '#bfdbfe',
    delay: 140,
    radius: 0.8,
    duration: 260,
    height: 0.5,
    priority: STANDARD,
  })
  burst(ctx, at(target), {
    color: '#dbeafe',
    count: 8,
    delay: 140,
    speed: 1.6,
    gravity: 0,
    priority: STANDARD,
  })
  return 140
}

const doflamingoStringCut: AttackChoreography = (ctx, { source, target, color, secondary }) => {
  const strings = new THREE.Group()
  const lines = [0, 1, 2].map((index) => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: index === 1 ? '#ffffff' : secondary,
        transparent: true,
        depthWrite: false,
      }),
    )
    line.frustumCulled = false
    strings.add(line)
    return line
  })
  const hand = new THREE.Vector3()
  const tip = new THREE.Vector3()
  fx(
    ctx,
    0,
    240,
    strings,
    (p) => {
      source.focusPoint(hand, 0.85)
      target.focusPoint(tip, 0.55)
      const reach = Math.min(1, p * 2.2)
      lines.forEach((line, index) => {
        const spread = (index - 1) * 0.14
        const array = line.geometry.attributes.position.array as Float32Array
        array.set([
          hand.x + spread,
          hand.y + spread * 0.5,
          hand.z,
          hand.x + (tip.x - hand.x) * reach + spread * 0.3,
          hand.y + (tip.y - hand.y) * reach - spread,
          hand.z + (tip.z - hand.z) * reach,
        ])
        line.geometry.attributes.position.needsUpdate = true
      })
      setOpacity(strings, 1 - Math.max(0, (p - 0.6) / 0.4))
    },
    STANDARD,
  )
  slashArc(ctx, at(target), {
    color,
    delay: 110,
    angle: -0.4,
    radius: 0.5,
    sweep: 1.2,
    width: 0.05,
    priority: STANDARD,
  })
  return 110
}

const mihawkYoruFlick: AttackChoreography = (ctx, { source, target, color }) => {
  prop(ctx, source, target, {
    build: () => {
      const group = new THREE.Group()
      const dark = new THREE.Mesh(
        new THREE.RingGeometry(0.22, 0.34, 24, 1, Math.PI * 1.1, Math.PI * 0.8),
        flat('#030712', 0.95),
      )
      const rim = crescentMesh(color, 0.36)
      rim.rotation.z = Math.PI
      group.add(dark, rim)
      return group
    },
    duration: 110,
    arc: 0,
    spin: 0.6,
    priority: STANDARD,
  })
  slashArc(ctx, at(target), {
    color,
    delay: 110,
    angle: 0.4,
    radius: 0.55,
    width: 0.07,
    sweep: 0.9,
    duration: 200,
    priority: STANDARD,
  })
  return 110
}

const hancockHeartPistol: AttackChoreography = (ctx, { source, target, color }) => {
  const heart = new THREE.Group()
  heart.add(new THREE.Mesh(heartGeometry(0.13), glow(color, 0.95)))
  const core = new THREE.Mesh(heartGeometry(0.07), glow('#fff1f2', 1))
  core.position.z = 0.01
  heart.add(core)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const travel = 240
  fx(
    ctx,
    0,
    travel,
    heart,
    (p, now) => {
      source.focusPoint(from, 0.7)
      target.focusPoint(to, 0.55)
      heart.position.lerpVectors(from, to, p)
      heart.position.y += Math.sin(Math.PI * p) * 0.25
      billboard(ctx, heart)
      heart.scale.setScalar(1 + Math.abs(Math.sin(now * 0.03)) * 0.25)
    },
    STANDARD,
  )
  burst(ctx, at(target), { color, count: 8, delay: travel, speed: 1.2, priority: STANDARD })
  return travel
}

export const MARINES_WARLORDS_ATTACKS: AttackSet = {
  koby_v1: kobyPunch,
  helmeppo_v1: helmeppoKukri,
  tashigi_v1: tashigiKatana,
  hina_v1: hinaIronBand,
  smoker_v1: smokerJitte,
  garp_v1: garpHakiFist,
  sengoku_v1: sengokuPalm,
  kizaru_v1: kizaruLightKick,
  akainu_v1: akainuMagmaPunch,
  buggy_v1: buggyKnifeHand,
  moria_v1: moriaShadowBats,
  crocodile_v1: crocodileSandBlade,
  kuma_v1: kumaPawPush,
  doflamingo_v1: doflamingoStringCut,
  mihawk_v1: mihawkYoruFlick,
  hancock_v1: hancockHeartPistol,
}
