import * as THREE from 'three'
import { easeInOut, type UnitView } from '../../unitView'
import {
  PASTEL_SPECTRUM,
  animateBarrier,
  crystalShard,
  dewDrop,
  gengarShade,
  hexBarrier,
  iridescent,
  spectrumRing,
  teardropGeometry,
} from '../kit/pokemonMythic'
import {
  above,
  alliesAround,
  beyond,
  billboard,
  bodyPoint,
  cameraYaw,
  clamp01,
  easeIn,
  easeOut,
  enemiesInLine,
  fadeInOut,
  flat,
  flatDirection,
  flinch,
  fx,
  groundCracks,
  motionScale,
  nearestEnemy,
  palmMesh,
  phase,
  pulse,
  scaledCount,
  setOpacity,
  shiver,
  squash,
  standard,
  starPower,
  stream,
  tube,
  zap,
  zzz,
  driftMotes,
} from '../kit/shared'
import {
  at,
  aura,
  burst,
  cameraPunch,
  chargeOrb,
  cloud,
  flare,
  glow,
  ground,
  halo,
  orbit,
  pushBack,
  shake,
  shockwave,
  sigil,
  spikes,
  starGeometry,
  vortex,
  type FxContext,
} from '../primitives'
import type { Choreography, UltimateSet } from '../types'

const UP = new THREE.Vector3(0, 1, 0)

function vertexColorPoints(
  count: number,
  colors: string[],
  size: number,
): { points: THREE.Points; positions: Float32Array; material: THREE.PointsMaterial } {
  const positions = new Float32Array(count * 3)
  const vertexColors = new Float32Array(count * 3)
  const color = new THREE.Color()
  for (let index = 0; index < count; index++) {
    color.set(colors[index % colors.length])
    vertexColors.set([color.r, color.g, color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3))
  const material = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  return { points, positions, material }
}

const PSY_COLORS = ['#a855f7', '#60a5fa', '#c084fc', '#818cf8', '#e879f9']

const mewtwoPsystrike: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  const power = Math.min(1.3, starPower(source))
  const release = 800
  const reach = Math.max(0.6, source.root.position.distanceTo(target.root.position))
  const overshoot = 1.6
  const flight = 130
  const travel = (flight * (reach + overshoot)) / reach
  const impact = release + flight
  const direction = flatDirection(source, target)
  const side = new THREE.Vector3().crossVectors(direction, UP).normalize()

  const sphereCenter = new THREE.Vector3()
  const sphereAt = (): THREE.Vector3 => {
    bodyPoint(source, 1, sphereCenter).addScaledVector(direction, 0.12)
    sphereCenter.y += 0.7
    return sphereCenter
  }

  fx(ctx, 0, 1750, undefined, (p, now) => {
    const elapsed = p * 1750
    const hover = easeOut(phase(p, 0, 0.2)) * (1 - easeInOut(phase(p, 0.8, 1)))
    source.pose.lift += (0.5 + 0.05 * Math.sin(now * 0.006)) * hover * m
    source.pose.tilt +=
      (-0.1 * pulse(phase(elapsed, 200, release)) +
        0.2 * pulse(phase(elapsed, release - 40, release + 280))) *
      m
    source.pose.scale *= 1 + 0.06 * pulse(phase(elapsed, 500, release + 120))
  })

  // Psychic aura: two flickering translucent sheaths, rising energy streaks and ripple rings.
  const auraGroup = new THREE.Group()
  const sheaths = [
    { color: '#6d28d9', opacity: 0.26 },
    { color: '#3b82f6', opacity: 0.14 },
  ].map(({ color, opacity }, index) => {
    const height = 1.5 + index * 0.3
    const sheath = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.12 + index * 0.06,
        0.5 + index * 0.14,
        height,
        28,
        1,
        true,
      ).translate(0, height / 2, 0),
      index === 0 ? flat(color, opacity) : glow(color, opacity),
    )
    auraGroup.add(sheath)
    return sheath
  })
  const streakCount = scaledCount(ctx, 18)
  const streakPositions = new Float32Array(streakCount * 6)
  const streakGeometry = new THREE.BufferGeometry()
  streakGeometry.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3))
  const streakMaterial = new THREE.LineBasicMaterial({
    color: '#c4b5fd',
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const streaks = new THREE.LineSegments(streakGeometry, streakMaterial)
  streaks.frustumCulled = false
  auraGroup.add(streaks)
  const streakSeeds = Array.from({ length: streakCount }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: 0.3 + Math.random() * 0.35,
    speed: 1.1 + Math.random() * 1.1,
    length: 0.22 + Math.random() * 0.35,
    offset: Math.random(),
  }))
  const ripples = ['#a78bfa', '#60a5fa'].map((color) => {
    const ripple = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.014, 6, 56), glow(color, 0.6))
    ripple.rotation.x = Math.PI / 2
    auraGroup.add(ripple)
    return ripple
  })
  fx(ctx, 0, 1650, auraGroup, (p, now) => {
    const elapsed = p * 1650
    auraGroup.position.copy(source.root.position).add(source.pose.offset)
    auraGroup.position.y = source.pose.lift * 0.7
    const envelope = easeOut(phase(p, 0, 0.18)) * (1 - phase(p, 0.78, 1))
    const surge = 1 + 0.35 * pulse(phase(elapsed, release - 120, release + 320))
    sheaths.forEach((sheath, index) => {
      const flicker = 1 + 0.08 * Math.sin(now * (0.03 + index * 0.011) + index * 2)
      const width = Math.max(0.01, flicker * surge * (0.4 + 0.6 * envelope))
      sheath.scale.set(width, 0.75 + 0.25 * envelope + 0.05 * Math.sin(now * 0.02 + index), width)
      sheath.rotation.y = now * 0.002 * (index % 2 ? -1 : 1)
      setOpacity(sheath, envelope)
    })
    streakSeeds.forEach((seed, index) => {
      const local = (now * 0.001 * seed.speed + seed.offset) % 1
      const r = seed.radius * (1 - local * 0.45) * surge
      const angle = seed.angle + local * 1.5
      const x = Math.cos(angle) * r
      const z = Math.sin(angle) * r
      const y = 0.1 + local * 1.8
      streakPositions.set([x, y, z, x * 0.92, y + seed.length, z * 0.92], index * 6)
    })
    streakGeometry.attributes.position.needsUpdate = true
    streakMaterial.opacity = 0.8 * envelope
    ripples.forEach((ripple, index) => {
      const local = (p * 2.4 + index * 0.5) % 1
      ripple.position.y = 0.15 + local * 1.7
      ripple.scale.setScalar((0.7 + local * 1.1) * surge)
      ;(ripple.material as THREE.MeshBasicMaterial).opacity = 0.6 * pulse(local) * envelope
    })
  })

  groundCracks(ctx, ground(source), {
    color: '#9333ea',
    count: 7,
    length: 1.4,
    width: 0.045,
    delay: 140,
    duration: 1600,
  })
  shockwave(ctx, ground(source), { color: '#7c3aed', delay: 120, radius: 1.5, duration: 700 })

  // Floating debris: stone chunks rip free, orbit in the psychic field, get flung at release and drop.
  const rockCount = Math.max(5, Math.round(9 * Math.max(0.6, ctx.particleScale)))
  const rocks = new THREE.Group()
  const rockSeeds = Array.from({ length: rockCount }, (_, index) => {
    const size = 0.06 + Math.random() * 0.08
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(size, 0),
      standard('#3f3651', {
        roughness: 0.9,
        flatShading: true,
        emissive: '#4c1d95',
        emissiveIntensity: 0.45,
      }),
    )
    rock.add(new THREE.Mesh(new THREE.DodecahedronGeometry(size * 1.45, 0), glow('#a855f7', 0.2)))
    rocks.add(rock)
    return {
      angle: (index / rockCount) * Math.PI * 2 + Math.random() * 0.4,
      radius: 0.65 + Math.random() * 0.6,
      height: 0.35 + Math.random() * 1.1,
      lag: Math.random() * 0.25,
      spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(4),
    }
  })
  fx(ctx, 60, 1650, rocks, (p, now) => {
    const elapsed = 60 + p * 1650
    const base = source.root.position
    const fling = easeOut(phase(elapsed, release, release + 350))
    const drop = easeIn(phase(p, 0.82, 1))
    rocks.children.forEach((rock, index) => {
      const seed = rockSeeds[index]
      const rise = easeOut(phase(p, seed.lag, seed.lag + 0.3))
      const angle = seed.angle + p * 1.3
      const radius = seed.radius + fling * 0.45
      const hover = seed.height * rise + Math.sin(now * 0.004 + index) * 0.05 * rise
      rock.position.set(
        base.x + Math.cos(angle) * radius,
        0.05 + hover * (1 - drop),
        base.z + Math.sin(angle) * radius,
      )
      rock.rotation.set(seed.spin.x * p * 3, seed.spin.y * p * 3, seed.spin.z * p * 3)
    })
    setOpacity(rocks, 1 - phase(p, 0.9, 1))
  })

  // The psychic sphere gathers above Mewtwo, then condenses before it breaks into shards.
  const sphere = new THREE.Group()
  const outerShell = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 18), flat('#4c1d95', 0.32))
  const midShell = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 16), glow('#9333ea', 0.35))
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), glow('#c4b5fd', 0.7))
  const bands = ['#60a5fa', '#e879f9'].map((color, index) => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.016, 6, 64), glow(color, 0.65))
    band.rotation.set(index ? 1.1 : -0.5, index * 0.8, 0)
    sphere.add(band)
    return band
  })
  const moteCount = scaledCount(ctx, 34)
  const inflow = vertexColorPoints(moteCount, ['#c4b5fd', '#93c5fd', '#f0abfc'], 0.07)
  const moteSeeds = Array.from({ length: moteCount }, () => ({
    direction: new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ).normalize(),
    speed: 0.8 + Math.random() * 0.8,
    offset: Math.random(),
  }))
  sphere.add(outerShell, midShell, core, inflow.points)
  const moteSpot = new THREE.Vector3()
  fx(ctx, 80, 900, sphere, (p, now) => {
    const elapsed = 80 + p * 900
    sphere.position.copy(sphereAt())
    const grow = easeInOut(phase(elapsed, 80, 620))
    const condense = easeIn(phase(elapsed, 620, release))
    const collapse = easeIn(phase(elapsed, release, release + 160))
    const size = Math.max(0.01, grow * (1 - 0.45 * condense) * (1 - collapse) * power)
    outerShell.scale.setScalar(size * (1 + 0.05 * Math.sin(now * 0.03)))
    midShell.scale.setScalar(size * (1 + 0.08 * Math.sin(now * 0.045 + 1)))
    core.scale.setScalar(Math.max(0.01, size * (1 + 0.8 * condense)))
    bands[0].rotation.z = now * 0.006
    bands[1].rotation.x = 1.1 + now * 0.005
    bands.forEach((band) => band.scale.setScalar(Math.max(0.01, size * (1 - 0.3 * condense))))
    moteSeeds.forEach((seed, index) => {
      const local = (now * 0.0012 * seed.speed + seed.offset) % 1
      moteSpot
        .copy(seed.direction)
        .applyAxisAngle(UP, local * 2.5)
        .multiplyScalar((1 - local) * 1.4 * (0.5 + 0.5 * grow))
      inflow.positions.set([moteSpot.x, moteSpot.y, moteSpot.z], index * 3)
    })
    inflow.points.geometry.attributes.position.needsUpdate = true
    inflow.material.opacity = (1 - condense) * grow
  })
  const hands = (): THREE.Vector3 => bodyPoint(source, 0.75, new THREE.Vector3())
  zap(ctx, sphereAt, hands, { color: '#a78bfa', core: '#ddd6fe', delay: 260, duration: 220 })
  zap(ctx, sphereAt, () => bodyPoint(source, 0.3, new THREE.Vector3()), {
    color: '#60a5fa',
    core: '#c7d2fe',
    delay: 520,
    duration: 220,
    jitter: 0.35,
  })

  // Crystal volley: shards crystallize around the sphere, aim, then pierce down the line in a spiral formation.
  const shardCount = Math.round(11 * power)
  const volley = new THREE.Group()
  const endPoint = beyond(source, target, overshoot, 0.5)
  const aimPoint = at(target)
  const shardSeeds = Array.from({ length: shardCount }, (_, index) => {
    const shard = crystalShard(
      0.42 + Math.random() * 0.18,
      index % 2 ? '#6366f1' : '#9333ea',
      index % 3 ? '#c084fc' : '#60a5fa',
    )
    volley.add(shard)
    return {
      shard,
      angle: (index / shardCount) * Math.PI * 2,
      ring: 0.28 + (index % 3) * 0.1,
      lag: (index % 4) * 18 + Math.random() * 10,
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
    }
  })
  const offset = new THREE.Vector3()
  const volleyStart = 620
  const volleyDuration = release + travel + 90 - volleyStart
  fx(ctx, volleyStart, volleyDuration, volley, (p, now) => {
    const elapsed = volleyStart + p * volleyDuration
    const center = sphereAt()
    const form = easeOut(phase(elapsed, volleyStart, release))
    shardSeeds.forEach((seed) => {
      const turn = seed.angle + elapsed * 0.004
      offset
        .copy(side)
        .multiplyScalar(Math.cos(turn) * seed.ring)
        .addScaledVector(UP, Math.sin(turn) * seed.ring)
      const flying = (elapsed - release - seed.lag) / travel
      if (flying < 0) {
        seed.shard.position.copy(center).addScaledVector(offset, 1.7 - 0.7 * form)
        seed.shard.lookAt(aimPoint())
        seed.shard.scale.setScalar(Math.max(0.01, form))
        seed.start.copy(seed.shard.position)
        seed.end.copy(endPoint()).addScaledVector(offset, 0.25)
        seed.shard.visible = true
        return
      }
      seed.shard.visible = flying < 1
      seed.shard.position.lerpVectors(seed.start, seed.end, Math.min(0.999, flying))
      seed.shard.lookAt(seed.end)
      seed.shard.rotateZ(now * 0.01)
      seed.shard.scale.set(0.85, 0.85, 1.7)
    })
  })

  // Distortion wave rings riding the line behind the shards.
  const wave = new THREE.Group()
  const waveRings = ['#60a5fa', '#a855f7', '#e879f9'].map((color) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.028, 8, 48), glow(color, 0.6))
    wave.add(ring)
    return ring
  })
  const waveFrom = new THREE.Vector3()
  const waveTo = new THREE.Vector3()
  const facing = new THREE.Vector3()
  const waveDuration = travel + 420
  fx(ctx, release - 20, waveDuration, wave, (p) => {
    const elapsed = p * waveDuration
    waveFrom.copy(sphereAt())
    waveTo.copy(endPoint())
    waveRings.forEach((ring, index) => {
      const local = clamp01((elapsed - index * 50) / (travel + 220))
      ring.position.lerpVectors(waveFrom, waveTo, easeOut(local))
      ring.lookAt(facing.copy(ring.position).add(direction))
      ring.scale.setScalar(0.5 + local * 1.6)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - local) * clamp01(local * 8)
    })
  })
  shockwave(ctx, ground(source), { color: '#60a5fa', delay: release, radius: 2.4, duration: 600 })
  driftMotes(ctx, ground(source), {
    twinkle: true,
    cycles: 1,
    colors: PSY_COLORS,
    count: 20,
    radius: 0.6,
    height: 1.5,
    swirl: 3,
    delay: release,
    duration: 950,
  })

  // Impact: implosion, then expanding distortion rings, a crystal cluster and drifting psychic wisps.
  const distortion = new THREE.Group()
  const implosion = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), flat('#6d28d9', 0.35))
  const implosionCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 12),
    glow('#a78bfa', 0.55),
  )
  const rippleRings = [0, 1, 2].map((index) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1, 64),
      glow(index === 1 ? '#60a5fa' : '#a855f7', 0.5),
    )
    distortion.add(ring)
    return ring
  })
  distortion.add(implosion, implosionCore)
  fx(ctx, impact - 60, 980, distortion, (p, now) => {
    const elapsed = p * 980
    bodyPoint(target, 0.55, distortion.position)
    const implode = phase(elapsed, 0, 80)
    const expand = easeOut(phase(elapsed, 80, 420))
    implosion.scale.setScalar(
      Math.max(0.01, elapsed < 80 ? 1.2 - 0.8 * implode : 0.4 + 1.3 * expand),
    )
    ;(implosion.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - phase(elapsed, 200, 560))
    implosionCore.scale.setScalar(Math.max(0.01, elapsed < 80 ? 1 - 0.5 * implode : 0.5 + expand))
    ;(implosionCore.material as THREE.MeshBasicMaterial).opacity =
      0.55 * (1 - phase(elapsed, 120, 420))
    rippleRings.forEach((ring, index) => {
      billboard(ctx, ring)
      const local = phase(elapsed, 60 + index * 140, 680 + index * 140)
      const wobble = 0.08 * Math.sin(now * 0.02 + index * 2)
      ring.scale.set(0.3 + local * 1.4 + wobble, 0.3 + local * 1.4 - wobble, 1)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.5 * pulse(local)
    })
  })
  flare(ctx, at(target), {
    color: '#7c3aed',
    core: '#c4b5fd',
    size: 0.75,
    rays: 6,
    delay: impact,
    duration: 340,
  })
  burst(ctx, at(target), { color: '#a78bfa', count: 26, delay: impact, speed: 2.6 })
  burst(ctx, at(target), {
    color: '#60a5fa',
    count: 16,
    delay: impact,
    speed: 2.2,
    gravity: 0,
    spread: 'ring',
  })
  shockwave(ctx, ground(target), { color: '#9333ea', delay: impact, radius: 2.2, duration: 700 })
  spikes(ctx, ground(target), {
    color: '#6366f1',
    solid: true,
    count: 7,
    radius: 0.55,
    height: 0.85,
    width: 0.1,
    delay: impact + 30,
    duration: 900,
  })
  spikes(ctx, ground(target), {
    color: '#c084fc',
    count: 5,
    radius: 0.75,
    height: 0.5,
    width: 0.06,
    delay: impact + 70,
    duration: 800,
  })
  driftMotes(ctx, ground(target), {
    twinkle: true,
    cycles: 1,
    colors: PSY_COLORS,
    count: 26,
    radius: 0.7,
    height: 1.3,
    swirl: 3,
    delay: impact + 30,
    duration: 880,
  })
  pushBack(ctx, target, source.root.position.clone(), {
    delay: impact,
    duration: 420,
    distance: 0.3,
  })
  cameraPunch(ctx, at(target), 0.9, impact - 80)
  shake(ctx, strength * 1.2, impact, 420)

  enemiesInLine(ctx, source, target, { overshoot, limit: 3 }).forEach((victim) => {
    const along = victim.root.position.distanceTo(source.root.position)
    const delay = Math.round(release + (flight * along) / reach)
    burst(ctx, at(victim), { color: '#a78bfa', count: 14, delay, speed: 1.8 })
    flinch(ctx, [victim], delay)
  })
  return impact
}

function dewBlessing(ctx: FxContext, ally: UnitView, delay: number): void {
  const duration = 1050
  const landAt = 0.16
  const group = new THREE.Group()
  const drops = Array.from({ length: 4 }, (_, index) => {
    const drop = dewDrop(index % 2 ? '#22d3ee' : '#67e8f9', '#f9a8d4')
    group.add(drop)
    const angle = (index / 4) * Math.PI * 2 + 0.4
    const radius = index === 0 ? 0.05 : 0.3
    return { drop, x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, lag: index * 0.025 }
  })
  const glitterCount = scaledCount(ctx, 16)
  const glitter = vertexColorPoints(glitterCount, ['#f9a8d4', '#67e8f9', '#f5d0fe'], 0.06)
  const glitterSeeds = Array.from({ length: glitterCount }, (_, index) => ({
    drop: index % drops.length,
    trail: Math.random() * 0.5,
    jitter: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(0.12),
  }))
  group.add(glitter.points)

  const bloom = new THREE.Group()
  const petals = [
    { color: '#f472b6', count: 6, length: 0.42, width: 0.16, offset: 0, lag: 0 },
    { color: '#22d3ee', count: 6, length: 0.28, width: 0.12, offset: Math.PI / 6, lag: 0.05 },
  ].flatMap((ring) =>
    Array.from({ length: ring.count }, (_, index) => {
      const pivot = new THREE.Group()
      pivot.rotation.y = (index / ring.count) * Math.PI * 2 + ring.offset
      const petal = new THREE.Mesh(teardropGeometry(ring.width, ring.length), flat(ring.color, 0.5))
      pivot.add(petal)
      bloom.add(pivot)
      return { petal, lag: ring.lag }
    }),
  )
  bloom.position.y = 0.06
  group.add(bloom)

  const halos = ['#f472b6', '#22d3ee'].map((color) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 6, 48), glow(color, 0.65))
    ring.rotation.x = Math.PI / 2
    group.add(ring)
    return ring
  })
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.42, 1.3, 24, 1, true).translate(0, 0.65, 0),
    flat('#fbcfe8', 0.16),
  )
  group.add(column)

  const dustCount = scaledCount(ctx, 16)
  const dust = vertexColorPoints(dustCount, ['#f9a8d4', '#67e8f9', '#e9d5ff', '#99f6e4'], 0.07)
  const dustSeeds = Array.from({ length: dustCount }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: 0.2 + Math.random() * 0.4,
    height: Math.random() * 0.3,
    speed: 0.5 + Math.random() * 0.7,
    phase: Math.random() * Math.PI * 2,
  }))
  group.add(dust.points)

  fx(ctx, delay, duration, group, (p, now) => {
    const base = ally.root.position
    group.position.set(base.x + ally.pose.offset.x, 0, base.z + ally.pose.offset.z)
    drops.forEach((item) => {
      const fall = phase(p, item.lag, item.lag + landAt) ** 2
      item.drop.position.set(item.x, 2.5 - fall * 2.4, item.z)
      item.drop.scale.set(1, 1 + fall * 0.5, 1)
      item.drop.visible = p >= item.lag && fall < 1
    })
    glitterSeeds.forEach((seed, index) => {
      const item = drops[seed.drop]
      const falling = item.drop.visible
      glitter.positions.set(
        [
          item.drop.position.x + seed.jitter.x,
          falling ? item.drop.position.y + seed.trail : -50,
          item.drop.position.z + seed.jitter.z,
        ],
        index * 3,
      )
    })
    glitter.points.geometry.attributes.position.needsUpdate = true
    glitter.material.opacity = 0.5 + 0.4 * Math.sin(now * 0.04)

    const bloomFade = 1 - phase(p, 0.6, 1)
    petals.forEach(({ petal, lag }) => {
      const open = easeOut(phase(p, landAt + lag, landAt + lag + 0.3))
      petal.rotation.x = 0.15 + open * (Math.PI / 2 - 0.3)
      petal.scale.setScalar(Math.max(0.01, 0.3 + 0.7 * open))
      ;(petal.material as THREE.MeshBasicMaterial).opacity = 0.5 * open * bloomFade
    })
    bloom.rotation.y = p * 0.8

    halos.forEach((ring, index) => {
      const local = easeInOut(phase(p, landAt + 0.05 + index * 0.1, landAt + 0.6 + index * 0.1))
      ring.position.y = 0.1 + local * 1.25
      ring.scale.setScalar(1 - 0.2 * local)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.65 * pulse(local)
    })
    column.scale.set(1, Math.max(0.01, easeOut(phase(p, landAt, landAt + 0.2))), 1)
    ;(column.material as THREE.MeshBasicMaterial).opacity = 0.16 * pulse(phase(p, landAt, 1))

    const rise = phase(p, landAt, 1)
    dustSeeds.forEach((seed, index) => {
      const angle = seed.angle + rise * 2 * seed.speed
      dust.positions.set(
        [
          Math.cos(angle) * seed.radius,
          rise > 0 ? 0.1 + seed.height + rise * 1.1 * seed.speed : -50,
          Math.sin(angle) * seed.radius,
        ],
        index * 3,
      )
    })
    dust.points.geometry.attributes.position.needsUpdate = true
    dust.material.opacity = 0.85 * fadeInOut(rise, 0.1, 0.35) * (0.7 + 0.3 * Math.sin(now * 0.02))
  })
}

const mewLifeDew: Choreography = (ctx, { source }) => {
  const m = motionScale(ctx)
  const rainAt = 700
  const land = rainAt + 170

  fx(ctx, 0, 1500, undefined, (p, now) => {
    const hover = easeOut(phase(p, 0, 0.2)) * (1 - easeInOut(phase(p, 0.8, 1)))
    source.pose.lift += (0.5 + 0.06 * Math.sin(now * 0.008)) * hover * m
    source.pose.offset.x += Math.sin(p * Math.PI * 3) * 0.12 * m
    source.pose.offset.z += Math.sin(p * Math.PI * 6) * 0.05 * m
    source.pose.tilt += Math.sin(now * 0.01) * 0.12 * hover * m
    source.pose.scale *= 1 + 0.06 * Math.sin(p * Math.PI * 6) * hover
    if (!ctx.reducedMotion) source.pose.spin += easeInOut(phase(p, 0.05, 0.5)) * Math.PI * 4
  })

  // Pink bubble around Mew with a flowing rainbow rim and a small crescent sheen.
  const bubble = new THREE.Group()
  const film = new THREE.Mesh(new THREE.SphereGeometry(0.62, 28, 20), flat('#f9a8d4', 0.2))
  const facingParts = new THREE.Group()
  const rim = spectrumRing(0.58, 0.66, PASTEL_SPECTRUM, 0.55)
  const sheen = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.46, 24, 1, Math.PI * 0.55, Math.PI * 0.3),
    glow('#fce7f3', 0.5),
  )
  facingParts.add(rim, sheen)
  bubble.add(film, facingParts)
  fx(ctx, 40, 680, bubble, (p, now) => {
    bodyPoint(source, 0.55, bubble.position)
    billboard(ctx, facingParts)
    rim.rotation.z = now * 0.003
    const grow = easeOut(phase(p, 0, 0.25))
    const wobble = Math.sin(now * 0.02) * 0.06
    const pop = phase(p, 0.86, 1)
    bubble.scale.set(
      Math.max(0.01, grow * (1 + wobble) + pop * 0.35),
      Math.max(0.01, grow * (1 - wobble) + pop * 0.35),
      Math.max(0.01, grow * (1 + wobble * 0.5) + pop * 0.35),
    )
    setOpacity(bubble, 1 - pop)
  })
  burst(ctx, at(source), {
    color: '#f9a8d4',
    count: 22,
    delay: 660,
    speed: 1.8,
    gravity: 0.3,
    duration: 700,
  })

  // Rainbow sparkles in a double helix, plus pink and cyan ribbons looping around Mew.
  const sparkleCount = scaledCount(ctx, 40)
  const sparkles = vertexColorPoints(sparkleCount, PASTEL_SPECTRUM, 0.09)
  fx(ctx, 0, 1250, sparkles.points, (p) => {
    const base = source.root.position
    for (let index = 0; index < sparkleCount; index++) {
      const strand = index % 2
      const local = (index / sparkleCount + p * 1.4) % 1
      const angle = strand * Math.PI + local * Math.PI * 4 + p * 6
      const radius = 0.75 * (1 - 0.35 * local)
      sparkles.positions.set(
        [
          base.x + source.pose.offset.x + Math.cos(angle) * radius,
          0.1 + local * 1.5 + source.pose.lift,
          base.z + source.pose.offset.z + Math.sin(angle) * radius,
        ],
        index * 3,
      )
    }
    sparkles.points.geometry.attributes.position.needsUpdate = true
    sparkles.material.opacity = 0.85 * fadeInOut(p, 0.1, 0.3)
  })
  const center = new THREE.Vector3()
  ;[
    { color: '#f472b6', sign: 1, offset: 0 },
    { color: '#22d3ee', sign: -1, offset: Math.PI },
  ].forEach(({ color, sign, offset }) => {
    tube(ctx, {
      material: glow(color, 0.6),
      controlPoints: 10,
      radius: 0.022,
      tubularSegments: 40,
      taper: true,
      delay: 60,
      duration: 1000,
      path: (p, points) => {
        bodyPoint(source, 0.5, center)
        points.forEach((point, index) => {
          const s = index / (points.length - 1)
          const angle = sign * (p * 10 - s * 2.4) + offset
          point.set(
            center.x + Math.cos(angle) * (0.55 + 0.08 * Math.sin(s * 6)),
            center.y + Math.sin(p * 7 + s * 3 + offset) * 0.3,
            center.z + Math.sin(angle) * (0.55 + 0.08 * Math.sin(s * 6)),
          )
        })
      },
      opacity: (p) => 0.6 * fadeInOut(p, 0.1, 0.3),
    })
  })
  orbit(ctx, source, {
    color: '#f9a8d4',
    count: 5,
    radius: 0.85,
    turns: 1.8,
    heightFactor: 0.75,
    billboard: true,
    delay: 100,
    duration: 1100,
    build: (index) =>
      new THREE.Mesh(
        starGeometry(5, 0.09, 0.04),
        glow(['#f9a8d4', '#67e8f9', '#fcd34d', '#d8b4fe', '#5eead4'][index % 5], 0.8),
      ),
  })
  sigil(ctx, ground(source), {
    color: '#f472b6',
    secondary: '#22d3ee',
    radius: 0.9,
    points: 5,
    delay: 80,
    duration: 1300,
  })

  // Mew lofts a dew orb that bursts into a glittering rain over the team.
  const orb = new THREE.Group()
  const orbCore = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), glow('#a5f3fc', 0.7))
  const orbShell = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), flat('#f9a8d4', 0.35))
  const orbRim = spectrumRing(0.24, 0.29, PASTEL_SPECTRUM, 0.6)
  orb.add(orbCore, orbShell, orbRim)
  const orbFrom = new THREE.Vector3()
  const apex = above(source, 2.7)
  fx(ctx, 540, rainAt - 540 + 60, orb, (p, now) => {
    bodyPoint(source, 0.6, orbFrom)
    const rise = easeInOut(phase(p, 0, 0.8))
    orb.position.lerpVectors(orbFrom, apex(), rise)
    billboard(ctx, orbRim)
    orbRim.rotation.z = now * 0.004
    orb.scale.setScalar(Math.max(0.01, 0.5 + 0.6 * rise + 0.8 * phase(p, 0.8, 1)))
    setOpacity(orb, 1 - phase(p, 0.82, 1))
  })
  burst(ctx, apex, {
    color: '#67e8f9',
    count: 24,
    delay: rainAt,
    speed: 2,
    gravity: 0.25,
    duration: 700,
  })
  burst(ctx, apex, {
    color: '#f472b6',
    count: 16,
    delay: rainAt + 40,
    speed: 1.6,
    gravity: 0.25,
    duration: 700,
  })

  alliesAround(ctx, source, 4.2, 5).forEach((ally, index) =>
    dewBlessing(ctx, ally, rainAt + index * 45),
  )
  driftMotes(ctx, ground(source), {
    twinkle: true,
    cycles: 1,
    colors: PASTEL_SPECTRUM,
    count: 20,
    radius: 0.7,
    height: 1.1,
    delay: 700,
    duration: 1100,
  })
  return land
}

function reflectWall(ctx: FxContext, ally: UnitView, delay: number): void {
  const enemy = nearestEnemy(ctx, ally)
  const direction = enemy ? flatDirection(ally, enemy) : new THREE.Vector3(0, 0, 1)
  const barrier = hexBarrier(0.2)
  const facing = new THREE.Vector3()
  fx(ctx, delay, 1450, barrier.group, (p, now) => {
    barrier.group.position.copy(ally.root.position).addScaledVector(direction, 0.5).setY(0.62)
    barrier.group.lookAt(facing.copy(barrier.group.position).add(direction))
    animateBarrier(barrier, p, now)
  })
}

const mrMimeReflect: Choreography = (ctx, { source }) => {
  const m = motionScale(ctx)
  const build = 320
  const facingEnemy = nearestEnemy(ctx, source)
  const facing = facingEnemy ? flatDirection(source, facingEnemy) : new THREE.Vector3(0, 0, 1)

  fx(ctx, 0, 800, undefined, (p) => {
    source.pose.offset.addScaledVector(facing, 0.07 * pulse(phase(p, 0.05, 0.6)) * m)
    source.pose.offset.x += Math.sin(p * Math.PI * 5) * 0.03 * m
    source.pose.tilt += Math.sin(p * Math.PI * 3) * 0.1 * m
  })

  // Pantomime: white gloves feel along an invisible wall, and the glass grows where they press.
  const mime = new THREE.Group()
  const glove = (): THREE.Material =>
    standard('#f1f5f9', { roughness: 0.65, emissive: '#fbcfe8', emissiveIntensity: 0.15 })
  const gloves = [-1, 1].map((sideSign) => {
    const hand = palmMesh(0.11, glove)
    mime.add(hand)
    return { hand, sideSign }
  })
  const ownWall = hexBarrier(0.17)
  ownWall.group.position.z = 0.04
  mime.add(ownWall.group)
  const anchor = new THREE.Vector3()
  const look = new THREE.Vector3()
  fx(ctx, 0, 1300, mime, (p, now) => {
    const elapsed = p * 1300
    anchor.copy(source.root.position).add(source.pose.offset).addScaledVector(facing, 0.5)
    anchor.y = 0.72 + source.pose.lift
    mime.position.copy(anchor)
    mime.lookAt(look.copy(anchor).add(facing))
    const handsFade = 1 - phase(elapsed, 520, 760)
    gloves.forEach(({ hand, sideSign }) => {
      const feel = Math.sin(elapsed * 0.012 + sideSign)
      hand.position.set(
        sideSign * (0.22 + 0.05 * feel),
        0.08 * Math.sin(elapsed * 0.01 * sideSign + 1),
        -0.03 + 0.03 * Math.abs(feel),
      )
      hand.rotation.z = -sideSign * 0.15
      hand.scale.setScalar(Math.max(0.01, easeOut(phase(elapsed, 0, 120)) * handsFade))
    })
    animateBarrier(ownWall, clamp01((elapsed - 120) / 1180), now)
  })

  alliesAround(ctx, source, 4.2)
    .filter((ally) => ally !== source)
    .forEach((ally, index) => reflectWall(ctx, ally, 220 + index * 70))
  alliesAround(ctx, source, 4.2).forEach((ally, index) =>
    halo(ctx, ally, { color: '#a5b4fc', delay: build + index * 70, duration: 700 }),
  )

  // A shimmering glass wave rolls out across the team.
  const shimmer = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.4, 64, 1, true).translate(0, 0.2, 0),
    glow('#c4b5fd', 0.35),
  )
  fx(ctx, 180, 800, shimmer, (p, now) => {
    shimmer.position.copy(source.root.position).setY(0)
    const radius = 0.3 + easeOut(p) * 3.6
    shimmer.scale.set(radius, 1 - 0.5 * p, radius)
    const material = shimmer.material as THREE.MeshBasicMaterial
    iridescent(material.color, now * 0.006)
    material.opacity = 0.35 * (1 - p)
  })
  shockwave(ctx, ground(source), { color: '#f0abfc', delay: 180, radius: 2.6, duration: 650 })
  aura(ctx, source, { color: '#f5d0fe', duration: 900, count: 16 })
  driftMotes(ctx, ground(source), {
    twinkle: true,
    cycles: 1,
    colors: ['#f5d0fe', '#bae6fd', '#c7d2fe', '#fbcfe8'],
    count: 18,
    radius: 0.8,
    height: 0.8,
    delay: 250,
    duration: 1200,
  })
  return build
}

const gengarDreamEater: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  const bite = 900
  const direction = flatDirection(source, target)

  fx(ctx, 0, 1350, undefined, (p, now) => {
    const elapsed = p * 1350
    const swell = pulse(phase(p, 0, 0.75))
    source.pose.scale *= 1 + 0.2 * swell + 0.12 * pulse(phase(elapsed, bite - 60, bite + 260))
    source.pose.lift += (0.2 * swell + Math.sin(now * 0.008) * 0.05 * swell) * m
    source.pose.tilt += Math.sin(now * 0.01) * 0.08 * swell * m
  })
  shiver(ctx, source, { delay: bite, duration: 350, amount: 0.05 })

  // Deep violet ghost mist: dark puffs with a slow violet swirl above them.
  cloud(ctx, ground(source), {
    color: '#2e1065',
    count: 8,
    radius: 0.7,
    size: 0.35,
    rise: 0.35,
    opacity: 0.5,
    duration: 1350,
  })
  vortex(ctx, ground(source), {
    color: '#7c3aed',
    secondary: '#a21caf',
    height: 0.7,
    radius: 0.85,
    rings: 4,
    duration: 1250,
  })
  cloud(ctx, ground(target), {
    color: '#3b0764',
    count: 8,
    radius: 0.8,
    size: 0.32,
    rise: 0.3,
    opacity: 0.5,
    delay: 150,
    duration: 1400,
  })
  sigil(ctx, ground(target), {
    color: '#6d28d9',
    secondary: '#c026d3',
    radius: 0.9,
    points: 5,
    delay: 100,
    duration: 1300,
  })

  // The dream: a thought bubble above the sleeping target, drained as its energy is siphoned away.
  const dream = new THREE.Group()
  const dreamShell = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), flat('#7c3aed', 0.28))
  const dreamRim = spectrumRing(0.31, 0.36, ['#c084fc', '#f0abfc', '#a78bfa', '#e879f9'], 0.6)
  const trailBubbles = [0.1, 0.065].map((size, index) => {
    const small = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 8), flat('#a855f7', 0.4))
    small.position.set(-0.22 - index * 0.14, -0.36 - index * 0.16, 0)
    dream.add(small)
    return small
  })
  const dreamStars = Array.from({ length: 3 }, (_, index) => {
    const star = new THREE.Mesh(
      starGeometry(5, 0.07, 0.03),
      glow(index === 1 ? '#fde68a' : '#f0abfc', 0.8),
    )
    dream.add(star)
    return star
  })
  dream.add(dreamShell, dreamRim)
  const dreamSpot = new THREE.Vector3()
  const dreamAt = (): THREE.Vector3 => {
    bodyPoint(target, 1, dreamSpot)
    dreamSpot.y += 0.5
    return dreamSpot
  }
  fx(ctx, 100, bite - 100 + 120, dream, (p, now) => {
    const elapsed = 100 + p * (bite + 20)
    dream.position.copy(dreamAt())
    billboard(ctx, dream)
    const appear = easeOut(phase(elapsed, 100, 300))
    const drain = easeInOut(phase(elapsed, 420, bite))
    const pop = phase(elapsed, bite - 20, bite + 120)
    dream.scale.setScalar(Math.max(0.01, appear * (1 - 0.45 * drain) + pop * 0.5))
    dreamRim.rotation.z = now * 0.004
    dreamStars.forEach((star, index) => {
      const angle = now * 0.003 + (index / 3) * Math.PI * 2
      star.position.set(Math.cos(angle) * 0.16, Math.sin(angle) * 0.12, 0.02)
      star.rotation.z = now * 0.005
    })
    trailBubbles.forEach((small, index) =>
      small.scale.setScalar(1 + 0.1 * Math.sin(now * 0.01 + index)),
    )
    setOpacity(dream, 1 - pop)
  })
  zzz(ctx, target, { color: '#ddd6fe', delay: 150, duration: 1100 })

  // The grinning shadow rises behind the target, looms, and lunges to eat the dream.
  const shade = gengarShade(0.75)
  const shadeSpot = new THREE.Vector3()
  fx(ctx, 200, 1050, shade.group, (p, now) => {
    const elapsed = 200 + p * 1050
    const rise = easeOut(phase(elapsed, 200, 560))
    const lunge = easeIn(phase(elapsed, bite - 140, bite))
    const dissolve = phase(elapsed, bite + 60, 1250)
    shadeSpot.copy(target.root.position).addScaledVector(direction, 0.45 - 0.55 * lunge)
    shade.group.position.set(
      shadeSpot.x,
      -0.5 + rise * 1.35 + lunge * 0.1 + dissolve * 0.4 + Math.sin(now * 0.006) * 0.04,
      shadeSpot.z,
    )
    shade.group.rotation.set(0, cameraYaw(ctx), Math.sin(now * 0.004) * 0.05)
    shade.group.scale.setScalar(
      Math.max(0.01, (0.7 + 0.3 * rise) * (1 + 0.2 * lunge + 0.3 * dissolve)),
    )
    const glare = easeOut(phase(elapsed, 380, 520))
    shade.eyes.scale.set(1, Math.max(0.01, glare), 1)
    const chomp = pulse(phase(elapsed, bite - 90, bite + 60))
    shade.grin.scale.set(1 + 0.15 * rise, Math.max(0.05, rise * (1 - 0.7 * chomp)), 1)
    setOpacity(shade.group, rise * (1 - dissolve))
  })

  // Dream energy siphoned to Gengar in twisting violet ribbons and a mote stream.
  const mouth = new THREE.Vector3()
  const mouthAt = (): THREE.Vector3 => bodyPoint(source, 0.6, mouth)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const lateral = new THREE.Vector3()
  ;[
    { color: '#a855f7', radius: 0.034, twist: 0, amplitude: 0.22 },
    { color: '#d946ef', radius: 0.024, twist: 2.1, amplitude: 0.28 },
    { color: '#6d28d9', radius: 0.03, twist: 4.2, amplitude: 0.18 },
  ].forEach(({ color, radius, twist, amplitude }, index) => {
    const start = 380 + index * 50
    tube(ctx, {
      material: glow(color, 0.65),
      controlPoints: 10,
      radius,
      tubularSegments: 40,
      delay: start,
      duration: bite + 260 - start,
      path: (p, points) => {
        from.copy(dreamAt())
        to.copy(mouthAt())
        lateral.subVectors(to, from).cross(UP)
        if (lateral.lengthSq() < 1e-6) lateral.set(1, 0, 0)
        lateral.normalize()
        const tail = easeIn(phase(p, 0.55, 1))
        const span = Math.max(0.06, easeOut(phase(p, 0, 0.45)) - tail)
        points.forEach((point, k) => {
          const s = tail + span * (k / (points.length - 1))
          const envelope = Math.sin(Math.PI * clamp01(s))
          point.lerpVectors(from, to, s)
          point.addScaledVector(
            lateral,
            Math.sin(s * Math.PI * 3 + p * 14 + twist) * amplitude * envelope,
          )
          point.y +=
            Math.cos(s * Math.PI * 2 + p * 10 + twist) * amplitude * 0.6 * envelope +
            envelope * 0.35
        })
      },
      opacity: (p) => 0.65 * fadeInOut(p, 0.1, 0.25),
    })
  })
  stream(ctx, dreamAt, mouthAt, {
    color: '#e879f9',
    count: 30,
    size: 0.1,
    delay: 420,
    duration: bite - 420,
    spread: 0.25,
    travel: 0.4,
    wobble: 0.15,
    rise: 0.4,
  })

  burst(ctx, at(target), { color: '#a855f7', count: 26, delay: bite, speed: 2.3 })
  shockwave(ctx, ground(target), { color: '#7c3aed', delay: bite, radius: 1.6, duration: 650 })
  squash(ctx, target, { delay: bite, amount: 0.2 })
  orbit(ctx, target, {
    color: '#a855f7',
    count: 3,
    radius: 0.38,
    heightFactor: 1.15,
    turns: 2,
    billboard: true,
    delay: bite,
    duration: 1000,
    build: (index) => {
      const wisp = new THREE.Group()
      const color = index === 1 ? '#e879f9' : '#a855f7'
      wisp.add(
        new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), glow(color, 0.8)),
        new THREE.Mesh(teardropGeometry(0.05, 0.16).translate(0, 0.02, 0), flat(color, 0.55)),
      )
      return wisp
    },
  })
  driftMotes(ctx, ground(target), {
    twinkle: true,
    cycles: 1,
    colors: ['#7c3aed', '#a855f7', '#c084fc', '#e879f9'],
    count: 20,
    radius: 0.6,
    height: 0.9,
    delay: bite + 20,
    duration: 900,
  })
  aura(ctx, source, { color: '#a855f7', delay: bite, duration: 700, count: 18 })
  halo(ctx, source, { color: '#d946ef', delay: bite + 60, duration: 600 })
  cameraPunch(ctx, at(target), 0.5, bite - 40)
  shake(ctx, strength + 1, bite, 340)
  return bite
}

function aquaRings(ctx: FxContext, ally: UnitView, delay: number, duration: number): void {
  const group = new THREE.Group()
  const rings = [0, 1, 2].map((index) => {
    const holder = new THREE.Group()
    const spinner = new THREE.Group()
    const radius = [0.52, 0.46, 0.5][index]
    const water = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.05, 10, 64),
      standard('#0ea5e9', {
        opacity: 0.6,
        roughness: 0.05,
        metalness: 0.25,
        emissive: '#0369a1',
        emissiveIntensity: 0.6,
      }),
    )
    const current = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.016, 6, 64),
      glow('#7dd3fc', 0.6),
    )
    const sheen = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.028, 6, 16, Math.PI * 0.35),
      glow('#bae6fd', 0.55),
    )
    spinner.add(water, current, sheen)
    const droplets = Array.from({ length: 5 }, () => {
      const droplet = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), glow('#a5f3fc', 0.7))
      spinner.add(droplet)
      return droplet
    })
    holder.rotation.set(Math.PI / 2 + [0.25, -0.35, 0.12][index], index * 1.05, 0)
    holder.add(spinner)
    group.add(holder)
    return { holder, spinner, droplets, radius, height: [0.3, 0.62, 0.92][index] }
  })
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.4, 1.2, 24, 1, true).translate(0, 0.6, 0),
    glow('#22d3ee', 0.14),
  )
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), flat('#0284c7', 0.3))
  pool.rotation.x = -Math.PI / 2
  pool.position.y = 0.05
  group.add(column, pool)
  fx(ctx, delay, duration, group, (p, now) => {
    group.position.set(
      ally.root.position.x + ally.pose.offset.x,
      0,
      ally.root.position.z + ally.pose.offset.z,
    )
    const enter = easeOut(phase(p, 0, 0.22))
    const exit = easeIn(phase(p, 0.82, 1))
    rings.forEach((ring, index) => {
      const turn = index % 2 ? -1 : 1
      ring.holder.position.y =
        ring.height + Math.sin(now * 0.004 + index * 2) * 0.05 + (1 - enter) * 0.6
      ring.holder.scale.setScalar(Math.max(0.01, (1.7 - 0.7 * enter) * (1 - 0.6 * exit)))
      ring.holder.rotation.y = index * 1.05 + now * 0.0012 * turn
      ring.spinner.rotation.z = now * 0.004 * (1 + index * 0.3) * turn
      ring.droplets.forEach((droplet, k) => {
        const angle = (k / ring.droplets.length) * Math.PI * 2 - now * 0.003 * turn
        const bob = 1 + 0.14 * Math.sin(now * 0.01 + k * 1.7)
        droplet.position.set(
          Math.cos(angle) * ring.radius * bob,
          Math.sin(angle) * ring.radius * bob,
          0.05 * Math.sin(now * 0.013 + k),
        )
      })
    })
    column.scale.set(1, Math.max(0.01, enter), 1)
    pool.scale.setScalar(Math.max(0.01, 0.6 + 0.4 * enter + 0.05 * Math.sin(now * 0.008)))
    setOpacity(group, fadeInOut(p, 0.1, 0.2))
  })
}

function risingBubbles(ctx: FxContext, ally: UnitView, delay: number, duration: number): void {
  const group = new THREE.Group()
  const count = Math.max(4, Math.round(9 * Math.min(1, ctx.particleScale + 0.3)))
  const list = Array.from({ length: count }, (_, index) => {
    const size = 0.035 + Math.random() * 0.04
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(size, 12, 8),
      standard('#7dd3fc', {
        opacity: 0.45,
        roughness: 0.05,
        metalness: 0.2,
        emissive: '#0e7490',
        emissiveIntensity: 0.5,
      }),
    )
    const gleam = new THREE.Mesh(
      new THREE.RingGeometry(size * 0.45, size * 0.65, 10, 1, 0, Math.PI * 0.5),
      glow('#e0f2fe', 0.6),
    )
    gleam.position.z = size * 0.8
    const holder = new THREE.Group()
    holder.add(bubble, gleam)
    group.add(holder)
    return {
      holder,
      gleam,
      angle: Math.random() * Math.PI * 2,
      radius: 0.15 + Math.random() * 0.3,
      launch: (index / count) * 0.55,
      phase: Math.random() * Math.PI * 2,
    }
  })
  fx(ctx, delay, duration, group, (p, now) => {
    const base = ally.root.position
    list.forEach((item) => {
      const t = (p - item.launch) / 0.4
      item.holder.visible = t > 0 && t < 1.1
      if (!item.holder.visible) return
      const angle = item.angle + t * 2
      item.holder.position.set(
        base.x + Math.cos(angle) * item.radius + Math.sin(now * 0.01 + item.phase) * 0.03,
        0.1 + Math.min(1, t) * 1.2,
        base.z + Math.sin(angle) * item.radius,
      )
      billboard(ctx, item.holder)
      const pop = t > 1 ? (t - 1) / 0.1 : 0
      item.holder.scale.setScalar(1 + pop * 1.2)
      setOpacity(item.holder, 1 - pop)
    })
  })
}

const seelAquaRing: Choreography = (ctx, { source, target }) => {
  const m = motionScale(ctx)
  const impact = 420
  fx(ctx, 0, 650, undefined, (p, now) => {
    source.pose.tilt += Math.sin(now * 0.012) * 0.12 * pulse(p) * m
    source.pose.lift += 0.12 * pulse(phase(p, 0, 0.6)) * m
  })
  squash(ctx, source, { delay: 150, duration: 220, amount: 0.12 })
  chargeOrb(ctx, () => bodyPoint(source, 1.05, new THREE.Vector3()), {
    color: '#38bdf8',
    core: '#a5f3fc',
    size: 0.16,
    count: 12,
    duration: 260,
  })

  // A graceful water ribbon arcs from Seel's nose to the ally.
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  ;[
    { color: '#0ea5e9', opacity: 0.55, radius: 0.06 },
    { color: '#a5f3fc', opacity: 0.6, radius: 0.02 },
  ].forEach(({ color, opacity, radius }) => {
    tube(ctx, {
      material: glow(color, opacity),
      controlPoints: 10,
      radius,
      tubularSegments: 36,
      delay: 180,
      duration: 520,
      path: (p, points) => {
        bodyPoint(source, 1.05, from)
        bodyPoint(target, 0.7, to)
        const tail = easeIn(phase(p, 0.55, 1))
        const span = Math.max(0.06, easeOut(phase(p, 0, 0.45)) - tail)
        points.forEach((point, k) => {
          const s = tail + span * (k / (points.length - 1))
          point.lerpVectors(from, to, s)
          point.y += Math.sin(Math.PI * clamp01(s)) * 1.1
          point.x += Math.sin(s * 12 + p * 8) * 0.03
        })
      },
      opacity: (p) => opacity * fadeInOut(p, 0.08, 0.25),
    })
  })
  burst(ctx, at(target, 0.7), {
    color: '#7dd3fc',
    count: 16,
    delay: impact,
    speed: 1.4,
    gravity: 1.2,
    duration: 600,
  })

  aquaRings(ctx, target, 380, 1350)
  risingBubbles(ctx, target, 450, 1200)
  shockwave(ctx, ground(target), { color: '#22d3ee', delay: impact, radius: 1.1, duration: 650 })
  shockwave(ctx, ground(target), { color: '#7dd3fc', delay: 760, radius: 1, duration: 650 })
  driftMotes(ctx, ground(target), {
    twinkle: true,
    cycles: 1,
    colors: ['#a5f3fc', '#67e8f9', '#e0f2fe', '#38bdf8'],
    count: 22,
    radius: 0.55,
    height: 1.2,
    swirl: 2.5,
    delay: 500,
    duration: 1200,
  })
  halo(ctx, target, { color: '#5eead4', delay: impact + 100, duration: 700 })
  burst(ctx, at(target, 0.45), {
    color: '#7dd3fc',
    count: 18,
    delay: 1400,
    speed: 1.4,
    gravity: 1.2,
    duration: 600,
  })
  shockwave(ctx, ground(target), { color: '#38bdf8', delay: 1400, radius: 1.2, duration: 600 })
  return impact
}

export const POKEMON_MYTHIC_ULTIMATES: UltimateSet = {
  mewtwo: mewtwoPsystrike,
  mew: mewLifeDew,
  mr_mime: mrMimeReflect,
  gengar: gengarDreamEater,
  seel: seelAquaRing,
}
