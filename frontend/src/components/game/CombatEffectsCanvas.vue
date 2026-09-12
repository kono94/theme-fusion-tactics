<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  chooseEffectEvictionIndex,
  getAttackParticleAllocation,
  getRenderEffectPriority
} from '../../animations/renderPolicy'
import type { GamePhase, RenderedUnit } from '../../types'
import type { NormalizedCombatVisualEvent, RenderLayer } from '../../types/combatEffects'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  layer: RenderLayer
  drag: number
  gravity: number
}

interface EffectInstance {
  id: number
  layer: RenderLayer
  kind: 'attack' | 'ultimate' | 'impact' | 'heal' | 'shield' | 'death'
  event: NormalizedCombatVisualEvent
  age: number
  duration: number
  simplified: boolean
  priority: 'ability' | 'standard'
}

interface ScreenShake {
  strength: number
  remaining: number
  duration: number
}

const props = defineProps<{
  events: NormalizedCombatVisualEvent[]
  units: RenderedUnit[]
  cellSize: number
  gridRows: number
  gridCols: number
  phase: GamePhase | undefined | null
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

const width = computed(() => props.gridCols * props.cellSize)
const height = computed(() => props.gridRows * props.cellSize)

const MAX_PARTICLES = 700
const MAX_AUTO_PARTICLES = 180
const MAX_ULT_PARTICLES = 420
const MAX_DEATH_PARTICLES = 100
const MAX_ACTIVE_EFFECTS = 40

let ctx: CanvasRenderingContext2D | null = null
let rafId: number | null = null
let lastFrame = 0
let nextEffectId = 1
let processedEventId = 0
let currentShake: ScreenShake | null = null

const effects: EffectInstance[] = []
const particles: Particle[] = []
const particlePool: Particle[] = []

const layerOrder: RenderLayer[] = ['ground', 'trail', 'impact', 'over-unit']

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  canvas.width = Math.floor(width.value * dpr)
  canvas.height = Math.floor(height.value * dpr)
  canvas.style.width = `${width.value}px`
  canvas.style.height = `${height.value}px`

  ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
}

function clearAll() {
  effects.length = 0
  particles.length = 0
  currentShake = null
  processedEventId = 0
  const canvas = canvasRef.value
  const context = ctx ?? canvas?.getContext('2d')
  context?.clearRect(0, 0, width.value, height.value)
}

function ensureLoop() {
  if (rafId !== null) return
  lastFrame = performance.now()
  rafId = requestAnimationFrame(frame)
}

function stopLoopIfIdle() {
  if (props.phase === 'COMBAT' || effects.length > 0 || particles.length > 0) return
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

function frame(now: number) {
  const dt = Math.min(48, now - lastFrame)
  lastFrame = now
  update(dt)
  draw()

  if (props.phase === 'COMBAT' || effects.length > 0 || particles.length > 0) {
    rafId = requestAnimationFrame(frame)
  } else {
    rafId = null
  }
}

function update(dtMs: number) {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    effects[i].age += dtMs
    if (effects[i].age >= effects[i].duration) {
      effects.splice(i, 1)
    }
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i]
    const dt = dtMs / 16.67
    particle.vx *= particle.drag
    particle.vy = particle.vy * particle.drag + particle.gravity * dt
    particle.x += particle.vx * dt
    particle.y += particle.vy * dt
    particle.life -= dtMs
    if (particle.life <= 0) {
      particles.splice(i, 1)
      particlePool.push(particle)
    }
  }

  if (currentShake) {
    currentShake.remaining -= dtMs
    if (currentShake.remaining <= 0) currentShake = null
  }
}

function draw() {
  if (!ctx) return
  ctx.clearRect(0, 0, width.value, height.value)

  const shake = getShakeOffset()
  ctx.save()
  ctx.translate(shake.x, shake.y)

  for (const layer of layerOrder) {
    for (const effect of effects) {
      if (effect.layer === layer) drawEffect(effect)
    }
    drawParticles(layer)
  }

  ctx.restore()
}

function getShakeOffset() {
  if (!currentShake) return { x: 0, y: 0 }
  const progress = currentShake.remaining / currentShake.duration
  const amount = currentShake.strength * progress
  return {
    x: (Math.random() - 0.5) * amount,
    y: (Math.random() - 0.5) * amount
  }
}

function drawParticles(layer: RenderLayer) {
  if (!ctx) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const particle of particles) {
    if (particle.layer !== layer) continue
    const alpha = Math.max(0, Math.min(1, particle.life / particle.maxLife))
    const radius = particle.size * (0.45 + alpha)
    const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, radius * 2.4)
    gradient.addColorStop(0, withAlpha(particle.color, alpha))
    gradient.addColorStop(0.5, withAlpha(particle.color, alpha * 0.48))
    gradient.addColorStop(1, withAlpha(particle.color, 0))
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawEffect(effect: EffectInstance) {
  switch (effect.kind) {
    case 'attack':
      drawAttack(effect)
      break
    case 'ultimate':
      drawUltimate(effect)
      break
    case 'impact':
      drawImpact(effect)
      break
    case 'heal':
      drawHeal(effect)
      break
    case 'shield':
      drawShield(effect)
      break
    case 'death':
      drawDeath(effect)
      break
  }
}

function progress(effect: EffectInstance) {
  return Math.max(0, Math.min(1, effect.age / effect.duration))
}

function drawAttack(effect: EffectInstance) {
  if (!ctx) return
  const t = progress(effect)
  const { start, end, attack } = effect.event
  const color = attack?.color ?? '#f8fafc'
  const secondary = attack?.secondaryColor ?? '#ffffff'
  const type = attack?.type ?? 'punch'
  const p = pointOnLine(start, end, easeOutCubic(Math.min(1, t * 1.25)))
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  const length = distance(start, end)

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'

  if (type === 'leafCut') {
    drawLeafTrail(start, p, color, secondary, t, 0.75)
    drawSlash(p.x, p.y, angle - 0.22, 46, secondary, 0.68 * (1 - t * 0.1))
  } else if (type === 'flameBurst') {
    drawTracer(start, p, color, secondary, 13, 0.74)
    drawFlameTongue(p.x, p.y, angle, 38 + 22 * t, color, secondary, 0.72 * (1 - t * 0.18))
  } else if (type === 'aquaJet') {
    drawTracer(start, p, color, secondary, 12, 0.6)
    drawArcWave(p.x, p.y, 14 + 20 * t, secondary, 0.48 * (1 - t * 0.2))
  } else if (type === 'thunderJolt') {
    drawLightning(start, p, color, secondary, 0.86)
    glowCircle(p.x, p.y, 10 + 10 * t, secondary, 0.55)
  } else if (type === 'psyPulse') {
    drawTracer(start, p, color, secondary, 8, 0.48)
    drawImpactRing(p.x, p.y, 12 + 18 * t, secondary, 0.7 * (1 - t * 0.2))
    glowCircle(p.x, p.y, 18, color, 0.28)
  } else if (type === 'poisonSting') {
    drawTracer(start, p, color, secondary, 7, 0.62)
    drawFangMark(p.x, p.y, 22, secondary, 0.62 * (1 - t * 0.12))
  } else if (type === 'windGust') {
    drawGustLine(start, p, color, secondary, t, 0.74)
  } else if (type === 'stoneToss') {
    drawTracer(start, p, color, secondary, 10, 0.42)
    drawRockShard(p.x, p.y, angle, 18, secondary, 0.82)
  } else if (type === 'iceShard') {
    drawTracer(start, p, color, secondary, 7, 0.56)
    drawIceShard(p.x, p.y, angle, 28, secondary, 0.86)
  } else if (type === 'shadowOrb') {
    drawTracer(start, p, color, secondary, 11, 0.58)
    drawSoulFlame(p.x, p.y, secondary, 0.72 * (1 - t * 0.16), 1.2)
  } else if (type === 'bugBite') {
    drawTracer(start, p, color, secondary, 6, 0.5)
    for (let i = -1; i <= 1; i += 1) drawSlash(p.x + i * 7, p.y, angle + i * 0.36, 26, i === 0 ? secondary : color, 0.54)
  } else if (type === 'forcePalm') {
    drawTracer(start, p, color, secondary, 11, 0.5)
    drawImpactRing(p.x, p.y, 14 + 20 * t, secondary, 0.74 * (1 - t * 0.2))
  } else if (type === 'dragonSpark') {
    drawTracer(start, p, color, secondary, 11, 0.68)
    drawDragonClaw(p.x, p.y, angle, 32, secondary, color, 0.72)
  } else if (type === 'metalSpark') {
    drawTracer(start, p, color, secondary, 7, 0.62)
    drawDiamondGuard(p.x, p.y, color, secondary, t, 0.34)
  } else if (type === 'rubberPunch') {
    ctx.strokeStyle = withAlpha(color, 0.55 * (1 - t))
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.quadraticCurveTo((start.x + p.x) / 2, start.y - 24, p.x, p.y)
    ctx.stroke()
    glowCircle(p.x, p.y, 12 + 18 * t, color, 0.65 * (1 - t))
  } else if (type === 'tripleSlash') {
    for (let i = -1; i <= 1; i += 1) {
      const offset = i * 12
      drawSlash(end.x + offset, end.y - offset, angle + i * 0.34, 64 + 26 * t, color, 0.8 * (1 - t))
    }
  } else if (type === 'lightning') {
    drawLightning(start, p, color, secondary, 0.85 * (1 - t * 0.5))
  } else if (type === 'fireKick' || type === 'magmaFist') {
    drawTracer(start, p, color, secondary, 12, 0.72)
    glowCircle(p.x, p.y, 15 + 16 * t, secondary, 0.45 * (1 - t))
  } else if (type === 'waterShock') {
    drawTracer(start, p, color, secondary, 8, 0.54)
    drawArcWave(end.x, end.y, 28 + 42 * t, color, 0.6 * (1 - t))
  } else if (type === 'slash') {
    drawSlash(p.x, p.y, angle, 58, color, 0.72 * (1 - t * 0.2))
  } else if (type === 'projectile' || type === 'sniperShot') {
    drawTracer(start, p, color, secondary, type === 'sniperShot' ? 5 : 9, 0.8)
    glowCircle(p.x, p.y, type === 'sniperShot' ? 8 : 12, secondary, 0.9)
  } else {
    drawTracer(start, p, color, secondary, type === 'blunt' ? 14 : 10, 0.55)
    glowCircle(p.x, p.y, 10 + 20 * t, color, 0.45 * (1 - t))
  }

  if (t > 0.52) {
    const hitT = (t - 0.52) / 0.48
    drawImpactFlash(end.x, end.y, 12 + hitT * Math.min(34, length * 0.1), color, secondary, 1 - hitT)
  }

  ctx.restore()
}

function drawUltimate(effect: EffectInstance) {
  if (!ctx) return
  const t = progress(effect)
  const { start, end, ability, starLevel } = effect.event
  const color = ability?.color ?? '#fbbf24'
  const secondary = ability?.secondaryColor ?? '#ffffff'
  const style = ability?.effectStyle ?? 'DEFAULT'
  const premiumScale = effect.event.source.cost >= 5 ? 1.45 : effect.event.source.cost >= 4 ? 1.22 : 1
  const starScale = (1 + (starLevel - 1) * 0.28) * premiumScale
  const p = pointOnLine(start, end, easeInOutCubic(Math.min(1, t * 1.12)))

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'

  if (drawNamedUltimate(effect, t, starScale)) {
    // Character-specific renderer handled it.
  } else if (style.startsWith('POKEMON_')) {
    drawPokemonUltimate(effect, t, starScale)
  } else if (style === 'WHITEBEARD_QUAKE') {
    drawWhitebeardQuake(effect, t, starScale)
  } else if (style === 'GARP_FIST_METEOR') {
    drawGarpGalaxyImpact(effect, t, starScale)
  } else if (style === 'ACE_FIRE_FIST') {
    drawAceFireFist(effect, t, starScale)
  } else if (style === 'KIZARU_LIGHT_BEAM') {
    drawKizaruLight(effect, t, starScale)
  } else if (style === 'BIG_MOM_SOUL_STORM') {
    drawBigMomSoulStorm(effect, t, starScale)
  } else if (style === 'KAIDO_THUNDER_BAGUA') {
    drawKaidoThunderBagua(effect, t, starScale)
  } else if (style === 'AKAINU_MAGMA_RAIN') {
    drawAkainuMagmaRain(effect, t, starScale)
  } else if (style === 'DOFLAMINGO_STRING_CAGE') {
    drawStringCage(effect, t, starScale)
  } else if (style === 'HINA_BINDING_CAGE') {
    drawBindingCage(end.x, end.y, color, secondary, t, starScale)
  } else if (style === 'KUMA_URSUS_SHOCK') {
    drawUrsusShock(effect, t, starScale)
  } else if (style === 'BUGGY_CHOP_FESTIVAL') {
    drawBuggyChop(effect, t, starScale)
  } else if (style === 'MORIA_SHADOW_STEAL') {
    drawShadowSteal(effect, t, starScale)
  } else if (style === 'QUEEN_PLAGUE_ROUND') {
    drawPlagueRound(effect, t, starScale)
  } else if (style === 'CHOPPER_HEAL') {
    drawHealingBloom(end.x, end.y, color, secondary, t, starScale)
  } else if (isBeamStyle(style)) {
    drawBeam(start, end, color, secondary, (18 + starLevel * 6) * (1 - Math.abs(t - 0.45) * 0.7))
  } else if (isSlashStyle(style)) {
    drawSlash(end.x, end.y, -0.75, 120 * starScale, color, 0.95 * (1 - Math.max(0, t - 0.55)))
    drawSlash(end.x, end.y, 0.75, 110 * starScale, secondary, 0.8 * (1 - Math.max(0, t - 0.55)))
  } else if (isStormStyle(style)) {
    drawStorm(end.x, end.y, color, secondary, t, starScale)
  } else if (isQuakeStyle(style)) {
    drawQuake(end.x, end.y, color, secondary, t, starScale)
  } else if (isAuraStyle(style)) {
    drawAura(start.x, start.y, color, secondary, t, starScale)
  } else if (style === 'LUFFY_GATLING') {
    for (let i = 0; i < 6; i += 1) {
      const offset = (i - 2.5) * 9
      drawTracer(start, { x: p.x + offset, y: p.y - offset * 0.35 }, color, secondary, 5 + starLevel * 2, 0.65)
    }
    drawImpactFlash(end.x, end.y, 42 * starScale, color, secondary, 1 - t * 0.65)
  } else if (style === 'USOPP_EXPLOSIVE_STAR') {
    drawTracer(start, p, color, secondary, 10, 0.8)
    drawExplosion(end.x, end.y, color, secondary, t, starScale)
  } else if (style === 'NAMI_LIGHTNING_TEMPO') {
    drawLightning(start, end, color, secondary, 0.95)
    drawImpactFlash(end.x, end.y, 54 * starScale, color, secondary, 1 - t * 0.55)
  } else if (style === 'SANJI_DIABLE_JAMBE') {
    drawTracer(start, p, '#f97316', '#fef3c7', 16, 0.76)
    drawArcWave(end.x, end.y, 34 + 70 * t * starScale, '#fb923c', 1 - t)
  } else {
    drawTracer(start, p, color, secondary, 14, 0.6)
    drawImpactFlash(end.x, end.y, 44 * starScale, color, secondary, 1 - t * 0.55)
  }

  if (starLevel >= 3 && t < 0.45) {
    drawCinematicPulse(start.x, start.y, color, secondary, t / 0.45)
  }

  ctx.restore()
}

function drawImpact(effect: EffectInstance) {
  if (!ctx) return
  const t = progress(effect)
  const color = effect.event.attack?.color ?? effect.event.ability?.color ?? '#f8fafc'
  const secondary = effect.event.attack?.secondaryColor ?? effect.event.ability?.secondaryColor ?? '#ffffff'
  drawImpactFlash(effect.event.end.x, effect.event.end.y, 10 + 28 * t, color, secondary, 1 - t)
}

function drawRing(effect: EffectInstance, color: string, secondary: string) {
  const t = progress(effect)
  drawImpactRing(effect.event.end.x, effect.event.end.y, 18 + 42 * t, color, 1 - t)
  glowCircle(effect.event.end.x, effect.event.end.y, 18 + 20 * t, secondary, 0.36 * (1 - t))
}

function drawHeal(effect: EffectInstance) {
  const t = progress(effect)
  if (!isMajorHealingEvent(effect.event)) {
    drawMinorHeal(effect.event.end.x, effect.event.end.y, t)
    return
  }
  const color = effect.event.ability?.color ?? '#22c55e'
  const secondary = effect.event.ability?.secondaryColor ?? '#dcfce7'
  const style = effect.event.ability?.effectStyle ?? 'DEFAULT'
  const scale = 1 + effect.event.starLevel * 0.16
  if (style === 'MARCO_PHOENIX_FLAME') {
    drawPhoenixHeal(effect, t, scale)
  } else if (style === 'JOZU_DIAMOND_GUARD') {
    drawDiamondGuard(effect.event.end.x, effect.event.end.y, color, secondary, t, scale)
  } else if (style === 'PEROSPERO_CANDY_SHOWER') {
    drawCandyShower(effect.event.end.x, effect.event.end.y, color, secondary, t, scale)
  } else if (style === 'IVANKOV_HORMONE_HEAL') {
    drawHormoneHeal(effect.event.end.x, effect.event.end.y, color, secondary, t, scale)
  } else if (style === 'KOBY_DETERMINATION') {
    drawDeterminationHeal(effect.event.end.x, effect.event.end.y, color, secondary, t, scale)
  } else {
    drawHealingBloom(effect.event.end.x, effect.event.end.y, color, secondary, t, scale)
  }
}

function drawShield(effect: EffectInstance) {
  drawRing(effect, '#38bdf8', '#e0f2fe')
}

function drawDeath(effect: EffectInstance) {
  const t = progress(effect)
  drawImpactRing(effect.event.end.x, effect.event.end.y, 18 + 78 * t, '#f8fafc', 1 - t)
  glowCircle(effect.event.end.x, effect.event.end.y, 30 + 28 * t, '#ef4444', 0.55 * (1 - t))
}

function processEvent(event: NormalizedCombatVisualEvent) {
  const activeUnits = props.units.filter(unit => unit.currentHealth > 0).length
  const crowded = event.crowded || activeUnits >= 12 || event.batchSize > 6
  const simplified = crowded && event.type === 'DAMAGE'

  if (event.type === 'SKILL') {
    const premiumDuration = event.source.cost >= 5 ? 360 : event.source.cost >= 4 ? 220 : 0
    const durationScale = event.ability?.durationScale ?? 1
    addEffect(
      'ultimate',
      'over-unit',
      event,
      (900 + Math.min(2, event.starLevel) * 130 + premiumDuration) * durationScale,
      crowded
    )
    spawnUltimateParticles(event, crowded)
    const costShake = event.source.cost >= 5 ? 1.35 : event.source.cost >= 4 ? 1.15 : 1
    shake((event.ability?.screenShake ?? 4) * costShake, event.starLevel >= 3 ? 620 : 420, crowded)
  } else if (isHealingEvent(event)) {
    const majorHeal = isMajorHealingEvent(event)
    const durationScale = event.ability?.durationScale ?? 1
    addEffect('heal', 'over-unit', event, (majorHeal ? 860 : 360) * durationScale, false)
    if (majorHeal) spawnHealingParticles(event, crowded)
  } else if (event.type === 'DAMAGE' && event.value > 0) {
    addEffect('attack', 'trail', event, simplified ? 360 : 520, simplified)
    addEffect('impact', 'impact', event, 420, simplified)
    spawnAttackParticles(event, simplified)
  } else if (event.type === 'SHIELD') {
    const durationScale = event.ability?.durationScale ?? 1
    addEffect('shield', 'impact', event, 720 * durationScale, false)
    const color = event.ability?.color ?? '#38bdf8'
    const accent = event.ability?.accentColor ?? event.ability?.secondaryColor ?? '#e0f2fe'
    spawnBurst(event.end.x, event.end.y, color, accent, 16, 'impact', 0.55)
  } else if (event.type === 'DEATH') {
    addEffect('death', 'over-unit', event, 720, false)
    spawnBurst(event.end.x, event.end.y, '#ef4444', '#f8fafc', crowded ? 18 : 34, 'over-unit', 1.1)
    shake(4, 260, crowded)
  }

  ensureLoop()
}

function isHealingEvent(event: NormalizedCombatVisualEvent) {
  return event.type === 'HEAL' || event.value < 0 || event.source.ability?.type === 'HEAL' || event.ability?.effectStyle === 'CHOPPER_HEAL'
}

function isMajorHealingEvent(event: NormalizedCombatVisualEvent) {
  return (
    event.source.ability?.type === 'HEAL' ||
    event.ability?.effectStyle === 'CHOPPER_HEAL'
  )
}

function addEffect(kind: EffectInstance['kind'], layer: RenderLayer, event: NormalizedCombatVisualEvent, duration: number, simplified: boolean) {
  const priority = getRenderEffectPriority(event.type)
  const evictionIndex = chooseEffectEvictionIndex(effects, priority, MAX_ACTIVE_EFFECTS)
  if (evictionIndex < 0 && effects.length >= MAX_ACTIVE_EFFECTS) return
  if (evictionIndex >= 0) effects.splice(evictionIndex, 1)

  effects.push({
    id: nextEffectId++,
    layer,
    kind,
    event,
    age: 0,
    duration,
    simplified,
    priority
  })
}

function spawnAttackParticles(event: NormalizedCombatVisualEvent, simplified: boolean) {
  const particleAllocation = getAttackParticleAllocation(
    event.attack ?? {},
    simplified,
    event.source.range
  )
  const color = event.attack?.color ?? '#f8fafc'
  const secondary = event.attack?.secondaryColor ?? color
  spawnLineParticles(event.start, event.end, color, secondary, particleAllocation.trail, 'trail', 0.45, MAX_AUTO_PARTICLES)
  spawnBurst(event.end.x, event.end.y, color, secondary, particleAllocation.impact, 'impact', 0.72, MAX_AUTO_PARTICLES)
}

function spawnUltimateParticles(event: NormalizedCombatVisualEvent, crowded: boolean) {
  const premiumScale = event.source.cost >= 5 ? 1.45 : event.source.cost >= 4 ? 1.22 : 1
  const scale = (event.ability?.particleScale ?? 1) * (1 + (event.starLevel - 1) * 0.35) * premiumScale * (crowded ? 0.7 : 1)
  const count = Math.round(50 * scale)
  const color = event.ability?.color ?? '#fbbf24'
  const secondary = event.ability?.accentColor ?? event.ability?.secondaryColor ?? '#ffffff'
  spawnLineParticles(event.start, event.end, color, secondary, Math.round(count * 0.45), 'trail', 0.68, MAX_ULT_PARTICLES)
  spawnBurst(event.end.x, event.end.y, color, secondary, Math.round(count * 0.65), 'over-unit', 1, MAX_ULT_PARTICLES)
}

function spawnHealingParticles(event: NormalizedCombatVisualEvent, crowded: boolean) {
  const scale =
    (event.ability?.particleScale ?? 1) *
    (1 + (event.starLevel - 1) * 0.22) *
    (crowded ? 0.7 : 1)
  const color = event.ability?.color ?? '#22c55e'
  const accent = event.ability?.accentColor ?? event.ability?.secondaryColor ?? '#dcfce7'
  spawnBurst(
    event.end.x,
    event.end.y,
    color,
    accent,
    Math.round(34 * scale),
    'over-unit',
    0.58,
    MAX_ULT_PARTICLES
  )
  spawnBurst(
    event.end.x,
    event.end.y,
    accent,
    '#ffffff',
    Math.round(16 * scale),
    'impact',
    0.35,
    MAX_ULT_PARTICLES
  )
}

function spawnLineParticles(
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
  secondary: string,
  count: number,
  layer: RenderLayer,
  energy: number,
  budget = MAX_PARTICLES
) {
  for (let i = 0; i < count; i += 1) {
    const t = count <= 1 ? 1 : i / (count - 1)
    const x = start.x + (end.x - start.x) * t + randomBetween(-8, 8)
    const y = start.y + (end.y - start.y) * t + randomBetween(-8, 8)
    spawnParticle(x, y, randomBetween(-1.8, 1.8), randomBetween(-1.8, 1.8), Math.random() > 0.4 ? color : secondary, layer, energy, budget)
  }
}

function spawnBurst(
  x: number,
  y: number,
  color: string,
  secondary: string,
  count: number,
  layer: RenderLayer,
  energy: number,
  budget = MAX_PARTICLES
) {
  const finalCount = Math.min(count, budget === MAX_DEATH_PARTICLES ? MAX_DEATH_PARTICLES : count)
  for (let i = 0; i < finalCount; i += 1) {
    const angle = Math.random() * Math.PI * 2
    const speed = randomBetween(1.2, 5.8) * energy
    spawnParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() > 0.35 ? color : secondary, layer, energy, budget)
  }
}

function spawnParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  color: string,
  layer: RenderLayer,
  energy: number,
  budget: number
) {
  if (particles.length >= MAX_PARTICLES || particles.filter(p => p.layer === layer).length >= budget) return
  const particle = particlePool.pop() ?? {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 0,
    size: 0,
    color: '#fff',
    layer: 'trail' as RenderLayer,
    drag: 0.95,
    gravity: 0
  }
  particle.x = x
  particle.y = y
  particle.vx = vx
  particle.vy = vy
  particle.life = randomBetween(260, 580) * energy
  particle.maxLife = particle.life
  particle.size = randomBetween(2.2, 6.8) * energy
  particle.color = color
  particle.layer = layer
  particle.drag = randomBetween(0.9, 0.98)
  particle.gravity = randomBetween(-0.01, 0.04)
  particles.push(particle)
}

function shake(strength: number, duration: number, crowded: boolean) {
  if (crowded && strength < 5) return
  const nextStrength = crowded ? strength * 0.65 : strength
  if (!currentShake || nextStrength > currentShake.strength) {
    currentShake = {
      strength: nextStrength,
      remaining: duration,
      duration
    }
  }
}

function drawTracer(start: { x: number; y: number }, end: { x: number; y: number }, color: string, secondary: string, width: number, alpha: number) {
  if (!ctx) return
  const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y)
  gradient.addColorStop(0, withAlpha(color, 0))
  gradient.addColorStop(0.55, withAlpha(color, alpha))
  gradient.addColorStop(1, withAlpha(secondary, alpha))
  ctx.strokeStyle = gradient
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.stroke()
}

function drawBeam(start: { x: number; y: number }, end: { x: number; y: number }, color: string, secondary: string, width: number) {
  if (!ctx) return
  drawTracer(start, end, color, secondary, Math.max(4, width), 0.85)
  drawTracer(start, end, '#ffffff', secondary, Math.max(2, width * 0.34), 0.95)
}

function drawSlash(x: number, y: number, angle: number, length: number, color: string, alpha: number) {
  if (!ctx) return
  const half = length / 2
  const nx = Math.cos(angle + Math.PI / 2)
  const ny = Math.sin(angle + Math.PI / 2)
  const sx = x - Math.cos(angle) * half
  const sy = y - Math.sin(angle) * half
  const ex = x + Math.cos(angle) * half
  const ey = y + Math.sin(angle) * half
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(sx, sy)
  ctx.quadraticCurveTo(x + nx * 24, y + ny * 24, ex, ey)
  ctx.stroke()
  ctx.strokeStyle = withAlpha('#ffffff', alpha * 0.6)
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawLightning(start: { x: number; y: number }, end: { x: number; y: number }, color: string, secondary: string, alpha: number) {
  if (!ctx) return
  const segments = 8
  ctx.strokeStyle = withAlpha(secondary, alpha)
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  for (let i = 1; i < segments; i += 1) {
    const t = i / segments
    ctx.lineTo(start.x + (end.x - start.x) * t + randomBetween(-13, 13), start.y + (end.y - start.y) * t + randomBetween(-13, 13))
  }
  ctx.lineTo(end.x, end.y)
  ctx.stroke()
  ctx.strokeStyle = withAlpha(color, alpha * 0.75)
  ctx.lineWidth = 7
  ctx.stroke()
}

function drawImpactRing(x: number, y: number, radius: number, color: string, alpha: number) {
  if (!ctx) return
  ctx.strokeStyle = withAlpha(color, Math.max(0, alpha))
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.stroke()
}

function glowCircle(x: number, y: number, radius: number, color: string, alpha: number) {
  if (!ctx) return
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
  gradient.addColorStop(0, withAlpha(color, alpha))
  gradient.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

function drawArcWave(x: number, y: number, radius: number, color: string, alpha: number) {
  if (!ctx) return
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(x, y, radius, -0.2 * Math.PI, 1.2 * Math.PI)
  ctx.stroke()
}

function drawStorm(x: number, y: number, color: string, secondary: string, t: number, scale: number) {
  if (!ctx) return
  for (let i = 0; i < 4; i += 1) {
    ctx.strokeStyle = withAlpha(i % 2 === 0 ? color : secondary, 0.8 * (1 - t))
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(x, y, (28 + i * 20 + t * 70) * scale, t * Math.PI * 2 + i, t * Math.PI * 2 + i + Math.PI * 1.15)
    ctx.stroke()
  }
}

function drawQuake(x: number, y: number, color: string, secondary: string, t: number, scale: number) {
  if (!ctx) return
  drawImpactRing(x, y, (18 + 130 * t) * scale, secondary, 1 - t)
  ctx.strokeStyle = withAlpha(color, 0.85 * (1 - t))
  ctx.lineWidth = 3
  for (let i = 0; i < 7; i += 1) {
    const angle = (Math.PI * 2 * i) / 7 + t * 0.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * (42 + 120 * t) * scale, y + Math.sin(angle) * (42 + 120 * t) * scale)
    ctx.stroke()
  }
}

function drawAura(x: number, y: number, color: string, secondary: string, t: number, scale: number) {
  glowCircle(x, y, (34 + 70 * t) * scale, color, 0.45 * (1 - t))
  drawImpactRing(x, y, (28 + 88 * t) * scale, secondary, 1 - t)
}

function drawExplosion(x: number, y: number, color: string, secondary: string, t: number, scale: number) {
  glowCircle(x, y, (24 + 64 * t) * scale, color, 0.72 * (1 - t))
  drawImpactRing(x, y, (18 + 86 * t) * scale, secondary, 1 - t)
}

function drawCinematicPulse(x: number, y: number, color: string, secondary: string, t: number) {
  glowCircle(x, y, 42 + 70 * t, color, 0.22 * (1 - t))
  drawImpactRing(x, y, 36 + 80 * t, secondary, 1 - t)
}

function drawImpactFlash(x: number, y: number, radius: number, color: string, secondary: string, alpha: number) {
  glowCircle(x, y, radius * 1.8, color, 0.22 * alpha)
  if (!ctx) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = withAlpha(secondary, 0.65 * alpha)
  ctx.lineWidth = 2
  for (let i = 0; i < 5; i += 1) {
    const angle = (Math.PI * 2 * i) / 5
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(angle) * radius * 0.3, y + Math.sin(angle) * radius * 0.3)
    ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius)
    ctx.stroke()
  }
  ctx.restore()
}

function drawHealingBloom(x: number, y: number, color: string, secondary: string, t: number, scale: number) {
  if (!ctx) return
  const pulse = Math.sin(t * Math.PI)
  glowCircle(x, y, (42 + 46 * pulse) * scale, color, 0.34 * (1 - t * 0.25))

  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8 + t * Math.PI * 1.4
    const radius = (20 + 44 * t) * scale
    const px = x + Math.cos(angle) * radius
    const py = y + Math.sin(angle) * radius
    drawPlus(px, py, 7 + 5 * pulse, i % 2 === 0 ? secondary : color, 0.8 * (1 - t * 0.35))
  }
}

function drawNamedUltimate(effect: EffectInstance, t: number, scale: number) {
  const id = effect.event.definitionId
  switch (id) {
    case 'luffy_v1':
      drawLuffyGatling(effect, t, scale)
      return true
    case 'zoro_v1':
      drawZoroOnigiri(effect, t, scale)
      return true
    case 'nami_v1':
      drawNamiTempo(effect, t, scale)
      return true
    case 'usopp_v1':
      drawUsoppRally(effect, t, scale)
      return true
    case 'sanji_v1':
      drawSanjiJambe(effect, t, scale)
      return true
    case 'robin_v1':
      drawRobinClutch(effect, t, scale)
      return true
    case 'franky_v1':
      drawFrankyBeam(effect, t, scale)
      return true
    case 'brook_v1':
      drawBrookFreeze(effect, t, scale)
      return true
    case 'jinbei_v1':
    case 'hack_v1':
      drawJinbeiWater(effect, t, scale)
      return true
    case 'helmeppo_v1':
      drawBladeBarrage(effect, t, scale, '#8b5cf6', '#ddd6fe', 5, 0.25)
      return true
    case 'tashigi_v1':
      drawBladeBarrage(effect, t, scale, '#6366f1', '#c7d2fe', 4, -0.15)
      return true
    case 'smoker_v1':
      drawSmokeWhiteOut(effect, t, scale)
      return true
    case 'sengoku_v1':
      drawSengokuShock(effect, t, scale)
      return true
    case 'crocodile_v1':
      drawSandstorm(effect, t, scale)
      return true
    case 'mihawk_v1':
      drawMihawkSlash(effect, t, scale)
      return true
    case 'hancock_v1':
      drawLoveArrow(effect, t, scale)
      return true
    case 'gifter_v1':
    case 'ulti_v1':
    case 'sasaki_v1':
      drawBeastRush(effect, t, scale)
      return true
    case 'headliner_v1':
      drawSupportPulse(effect, t, scale, '#450a0a', '#f87171', 'roar')
      return true
    case 'page_one_v1':
      drawSupportPulse(effect, t, scale, '#4c1d95', '#c4b5fd', 'guard')
      return true
    case 'koala_v1':
      drawSupportPulse(effect, t, scale, '#fb7185', '#fecdd3', 'karate')
      return true
    case 'whos_who_v1':
      drawFangPistol(effect, t, scale)
      return true
    case 'king_v1':
      drawKingFlameSlash(effect, t, scale)
      return true
    case 'chess_soldiers_v1':
      drawChessFormation(effect, t, scale)
      return true
    case 'prometheus_v1':
      drawPrometheusSolar(effect, t, scale)
      return true
    case 'daifuku_v1':
      drawGenieStrike(effect, t, scale)
      return true
    case 'cracker_v1':
      drawBiscuitLegion(effect, t, scale)
      return true
    case 'smoothie_v1':
      drawJuiceDrain(effect, t, scale)
      return true
    case 'katakuri_v1':
      drawKatakuriMochi(effect, t, scale)
      return true
    case 'belo_betty_v1':
      drawRebelFlag(effect, t, scale)
      return true
    case 'sabo_v1':
      drawSaboDragonClaw(effect, t, scale)
      return true
    case 'dragon_v1':
      drawDragonStorm(effect, t, scale)
      return true
    case 'thatch_v1':
      drawBladeBarrage(effect, t, scale, '#0d9488', '#5eead4', 5, -0.35)
      return true
    case 'vista_v1':
      drawVistaRoseRondo(effect, t, scale)
      return true
    default:
      if (isBuffVisual(effect)) {
        drawSupportPulse(effect, t, scale, effect.event.ability?.color ?? '#fbbf24', effect.event.ability?.secondaryColor ?? '#ffffff', 'rally')
        return true
      }
      return false
  }
}

function isBuffVisual(effect: EffectInstance) {
  return Boolean(effect.event.source.ability?.type.startsWith('BUFF'))
}

function drawLuffyGatling(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  const normal = { x: Math.cos(angle + Math.PI / 2), y: Math.sin(angle + Math.PI / 2) }
  for (let i = 0; i < 13; i += 1) {
    const delay = i * 0.045
    const local = Math.max(0, Math.min(1, (t - delay) / 0.42))
    if (local <= 0 || local >= 1) continue
    const lane = (i - 6) * 8 * scale
    const startOffset = {
      x: start.x + normal.x * lane * 0.35,
      y: start.y + normal.y * lane * 0.35
    }
    const target = {
      x: end.x + normal.x * lane,
      y: end.y + normal.y * lane * 0.6
    }
    drawRubberArm(startOffset, target, local, i, scale)
    if (local > 0.72) {
      drawImpactFlash(target.x, target.y, 22 * scale, '#ef4444', '#fbbf24', 1 - local)
    }
  }
  if (t > 0.68) drawImpactFlash(end.x, end.y, 58 * scale, '#ef4444', '#fbbf24', 1 - (t - 0.68) / 0.32)
}

function drawZoroOnigiri(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  const p = pointOnLine(start, end, easeInOutCubic(Math.min(1, t * 1.2)))
  drawTracer(start, p, '#22c55e', '#dcfce7', 7 * scale, 0.48)
  const hit = Math.max(0, (t - 0.28) / 0.72)
  for (let i = 0; i < 3; i += 1) {
    drawSlash(end.x, end.y, -0.85 + i * 0.85, (112 + 38 * hit) * scale, i === 1 ? '#ffffff' : '#22c55e', 0.9 * (1 - hit * 0.35))
  }
}

function drawNamiTempo(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  drawLightning(start, end, '#38bdf8', '#fef08a', 0.88)
  for (let i = 0; i < 4; i += 1) {
    const offset = (i - 1.5) * 22 * scale
    drawLightning(
      { x: start.x + offset * 0.35, y: start.y - 28 * scale },
      { x: end.x + offset, y: end.y + 10 * Math.sin(t * 8 + i) * scale },
      '#38bdf8',
      '#ffffff',
      0.48 * (1 - t * 0.25)
    )
  }
  glowCircle(end.x, end.y, (36 + 24 * Math.sin(t * Math.PI)) * scale, '#fef08a', 0.34)
}

function drawUsoppRally(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  drawSupportPulse(effect, t, scale, '#f59e0b', '#fef3c7', 'rally')
  const arc = pointOnLine(start, end, easeOutCubic(Math.min(1, t * 1.25)))
  drawDottedLink(start, arc, '#fef3c7', 0.45 * (1 - t * 0.35), scale)
  drawStar(start.x, start.y - 34 * scale, '#fef3c7', 0.9 * (1 - t * 0.3))
}

function drawSanjiJambe(effect: EffectInstance, t: number, scale: number) {
  const { start } = effect.event
  glowCircle(start.x, start.y, (42 + 36 * Math.sin(t * Math.PI)) * scale, '#f97316', 0.34)
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i - 2) * 0.28 + t * 0.7
    drawFlameTongue(start.x, start.y, a, (44 + 36 * t) * scale, '#f97316', '#fde047', 0.74 * (1 - t * 0.25))
  }
  drawSupportPulse(effect, t, scale * 0.72, '#f97316', '#fde047', 'speed')
}

function drawRobinClutch(effect: EffectInstance, t: number, scale: number) {
  const { end } = effect.event
  glowCircle(end.x, end.y, (34 + 46 * Math.sin(t * Math.PI)) * scale, '#a855f7', 0.24)
  for (let i = 0; i < 12; i += 1) {
    const angle = (Math.PI * 2 * i) / 12 + t * 0.65
    const radius = (34 + 34 * t + (i % 3) * 10) * scale
    drawPetal(end.x + Math.cos(angle) * radius, end.y + Math.sin(angle) * radius, angle, 18 * scale, i % 2 ? '#f0abfc' : '#a855f7', 0.7 * (1 - t * 0.22))
  }
  drawBindingCage(end.x, end.y, '#a855f7', '#f0abfc', t, scale * 0.85)
}

function drawFrankyBeam(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  const charge = Math.min(1, t / 0.32)
  glowCircle(start.x, start.y, 36 * charge * scale, '#bae6fd', 0.42)
  if (t > 0.22) {
    drawBeam(start, end, '#0ea5e9', '#ffffff', (18 + 12 * Math.sin(t * Math.PI)) * scale)
    drawImpactFlash(end.x, end.y, 58 * scale, '#0ea5e9', '#ffffff', 1 - t * 0.65)
  }
}

function drawBrookFreeze(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  drawTracer(start, end, '#22d3ee', '#e0f2fe', 7 * scale, 0.52)
  glowCircle(end.x, end.y, (44 + 38 * Math.sin(t * Math.PI)) * scale, '#22d3ee', 0.26)
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI * 2 * i) / 8
    drawIceShard(end.x, end.y, a, (38 + 44 * t) * scale, '#e0f2fe', 0.76 * (1 - t * 0.25))
  }
}

function drawJinbeiWater(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  const p = pointOnLine(start, end, easeOutCubic(Math.min(1, t * 1.12)))
  drawTracer(start, p, '#1d4ed8', '#67e8f9', 16 * scale, 0.62)
  for (let i = 0; i < 4; i += 1) {
    drawArcWave(end.x, end.y, (30 + i * 20 + 66 * t) * scale, i % 2 ? '#67e8f9' : '#1d4ed8', 0.5 * (1 - t * 0.45))
  }
}

function drawSmokeWhiteOut(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  drawTracer(start, end, '#cbd5e1', '#64748b', 18 * scale, 0.36)
  for (let i = 0; i < 10; i += 1) {
    const a = (Math.PI * 2 * i) / 10 + t
    const r = (22 + 76 * t + (i % 3) * 11) * scale
    glowCircle(end.x + Math.cos(a) * r, end.y + Math.sin(a) * r * 0.58, 24 * scale, i % 2 ? '#cbd5e1' : '#64748b', 0.22 * (1 - t * 0.4))
  }
}

function drawSengokuShock(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  glowCircle(start.x, start.y, (74 + 42 * Math.sin(t * Math.PI)) * scale, '#eab308', 0.34)
  drawBuddhaSilhouette(start.x, start.y, t, scale)
  drawSupportPulse(effect, t, scale * 0.85, '#eab308', '#fef3c7', 'command')
  drawImpactRing(start.x, start.y, (42 + 128 * t) * scale, '#fef3c7', 0.72 * (1 - t))
  drawDottedLink(start, end, '#fef3c7', 0.28 * (1 - t * 0.35), scale)
}

function drawSandstorm(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  drawSandStream(start, end, t, scale)
  drawStorm(end.x, end.y, '#d97706', '#fde68a', t, scale * 1.05)
  for (let i = 0; i < 26; i += 1) {
    const a = t * Math.PI * 4.6 + i * 0.62
    const r = (22 + (i % 9) * 10 + 62 * t) * scale
    const x = end.x + Math.cos(a) * r
    const y = end.y + Math.sin(a) * r * 0.56
    glowCircle(x, y, randomBetween(3, 7) * scale, i % 3 === 0 ? '#fde68a' : '#d97706', 0.28 * (1 - t * 0.55))
  }
}

function drawMihawkSlash(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  const p = pointOnLine(start, end, easeInOutCubic(Math.min(1, t * 1.25)))
  drawTracer(start, p, '#020617', '#4ade80', 16 * scale, 0.45)
  const sweep = -0.32 + Math.sin(t * Math.PI) * 0.18
  drawCrescentSlash(end.x, end.y, sweep, 230 * scale, '#020617', '#4ade80', 0.96 * (1 - t * 0.18))
  drawCrescentSlash(end.x - 18 * scale, end.y + 16 * scale, sweep + 0.18, 152 * scale, '#166534', '#bbf7d0', 0.52 * (1 - t * 0.28))
}

function drawLoveArrow(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  const p = pointOnLine(start, end, easeOutCubic(Math.min(1, t * 1.12)))
  drawTracer(start, p, '#ec4899', '#f9a8d4', 9 * scale, 0.76)
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI * 2 * i) / 6 + t * 1.5
    drawHeart(end.x + Math.cos(a) * 42 * scale, end.y + Math.sin(a) * 28 * scale, 9 * scale, '#f9a8d4', 0.72 * (1 - t * 0.32))
  }
}

function drawBeastRush(effect: EffectInstance, t: number, scale: number) {
  if (isBuffVisual(effect)) {
    drawSupportPulse(effect, t, scale, effect.event.ability?.color ?? '#78350f', effect.event.ability?.secondaryColor ?? '#f59e0b', 'roar')
    return
  }
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#78350f'
  const secondary = ability?.secondaryColor ?? '#f59e0b'
  const p = pointOnLine(start, end, easeInOutCubic(Math.min(1, t * 1.25)))
  drawTracer(start, p, color, secondary, 17 * scale, 0.55)
  drawImpactFlash(end.x, end.y, 50 * scale, color, secondary, 1 - t * 0.55)
  for (let i = -1; i <= 1; i += 1) drawSlash(end.x + i * 12 * scale, end.y, i * 0.45, 74 * scale, secondary, 0.46 * (1 - t * 0.25))
}

function drawFangPistol(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  const p = pointOnLine(start, end, easeOutCubic(Math.min(1, t * 1.28)))
  drawTracer(start, p, '#b91c1c', '#fca5a5', 9 * scale, 0.74)
  drawTracer(start, p, '#ffffff', '#fca5a5', 3 * scale, 0.68)
  drawFangMark(end.x, end.y, 34 * scale, '#fca5a5', 0.78 * (1 - t * 0.35))
}

function drawKingFlameSlash(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  drawTracer(start, end, '#dc2626', '#fb923c', 18 * scale, 0.6)
  for (let i = 0; i < 6; i += 1) {
    const a = -0.75 + (i - 2.5) * 0.16
    drawFlameTongue(end.x - 18 * scale, end.y + 20 * scale, a, (76 + 38 * t) * scale, '#dc2626', '#fef3c7', 0.78 * (1 - t * 0.22))
  }
  drawSlash(end.x, end.y, -0.65, 162 * scale, '#fb923c', 0.9 * (1 - t * 0.2))
  drawExplosion(end.x, end.y, '#dc2626', '#fb923c', t, scale * 1.1)
}

function drawChessFormation(effect: EffectInstance, t: number, scale: number) {
  drawSupportPulse(effect, t, scale, '#ef4444', '#fca5a5', 'formation')
}

function drawPrometheusSolar(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  drawTracer(start, end, '#ea580c', '#fde047', 18 * scale, 0.56)
  glowCircle(end.x, end.y, (44 + 58 * Math.sin(t * Math.PI)) * scale, '#fde047', 0.36)
  drawExplosion(end.x, end.y, '#ea580c', '#fde047', t, scale)
}

function drawGenieStrike(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  drawTracer(start, end, '#2563eb', '#bfdbfe', 14 * scale, 0.52)
  drawSoulFlame(end.x - 24 * scale, end.y - 26 * scale, '#bfdbfe', 0.82 * (1 - t * 0.25), scale * 1.8)
  drawSlash(end.x, end.y, -0.6, 106 * scale, '#bfdbfe', 0.82 * (1 - t * 0.22))
}

function drawBiscuitLegion(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  for (let i = 0; i < 6; i += 1) {
    const lane = (i - 2.5) * 15 * scale
    drawTracer({ x: start.x + lane * 0.2, y: start.y }, { x: end.x + lane, y: end.y }, '#92400e', '#fbbf24', 5 * scale, 0.54)
  }
  drawBindingCage(end.x, end.y, '#92400e', '#fbbf24', t, scale * 0.9)
}

function drawJuiceDrain(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  drawTracer(end, start, '#db2777', '#f9a8d4', 14 * scale, 0.58)
  glowCircle(end.x, end.y, (34 + 42 * t) * scale, '#db2777', 0.3 * (1 - t * 0.25))
  for (let i = 0; i < 5; i += 1) drawSoulFlame(end.x + (i - 2) * 18 * scale, end.y - 18 * scale, '#f9a8d4', 0.6 * (1 - t * 0.2), scale)
}

function drawKatakuriMochi(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  const charge = Math.min(1, t / 0.35)
  glowCircle(start.x, start.y, 44 * scale * charge, '#701a75', 0.24)
  for (let i = -2; i <= 2; i += 1) {
    const local = Math.max(0, Math.min(1, (t - Math.abs(i) * 0.045) / 0.72))
    const lane = i * 15 * scale
    const from = { x: start.x, y: start.y + lane * 0.25 }
    const to = { x: end.x + lane, y: end.y + Math.sin(i) * 10 * scale }
    drawMochiArm(from, to, local, scale)
  }
  if (t > 0.42) {
    const crush = (t - 0.42) / 0.58
    drawMochiBurst(end.x, end.y, crush, scale)
  }
}

function drawRebelFlag(effect: EffectInstance, t: number, scale: number) {
  const { start } = effect.event
  drawAura(start.x, start.y, '#be123c', '#fda4af', t, scale)
  drawFlag(start.x, start.y, '#be123c', '#fda4af', t, scale)
}

function drawSaboDragonClaw(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  const p = pointOnLine(start, end, easeInOutCubic(Math.min(1, t * 1.18)))
  drawTracer(start, p, '#f97316', '#fef3c7', 12 * scale, 0.48)
  drawDragonClaw(p.x, p.y, Math.atan2(end.y - start.y, end.x - start.x), 54 * scale, '#fef3c7', '#f97316', 0.86)
  if (t > 0.42) {
    const hit = (t - 0.42) / 0.58
    drawDragonClaw(end.x, end.y, -0.35, 76 * scale, '#fef3c7', '#f97316', 1 - hit * 0.35)
    drawImpactFlash(end.x, end.y, 52 * scale, '#f97316', '#fef3c7', 1 - hit)
  }
}

function drawDragonStorm(effect: EffectInstance, t: number, scale: number) {
  const { end } = effect.event
  drawStorm(end.x, end.y, '#059669', '#a7f3d0', t, scale * 1.22)
  for (let i = 0; i < 5; i += 1) {
    const x = end.x + (i - 2) * 32 * scale
    drawLightning({ x, y: -props.cellSize * 0.4 }, { x: end.x + (2 - i) * 18 * scale, y: end.y }, '#a7f3d0', '#ffffff', 0.52 * (1 - t * 0.2))
  }
}

function drawVistaRoseRondo(effect: EffectInstance, t: number, scale: number) {
  const { end } = effect.event
  for (let i = 0; i < 10; i += 1) {
    const a = (Math.PI * 2 * i) / 10 + t * Math.PI
    drawPetal(end.x + Math.cos(a) * 52 * scale, end.y + Math.sin(a) * 34 * scale, a, 16 * scale, i % 2 ? '#f0abfc' : '#7c3aed', 0.74 * (1 - t * 0.2))
  }
  drawBladeBarrage(effect, t, scale, '#7c3aed', '#f0abfc', 4, 0.55)
}

function drawBladeBarrage(effect: EffectInstance, t: number, scale: number, color: string, secondary: string, count: number, angleOffset: number) {
  const { start, end } = effect.event
  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * 13 * scale
    const p = { x: end.x + offset, y: end.y - offset * 0.18 }
    drawTracer(start, p, color, secondary, 4 * scale, 0.42)
    drawSlash(p.x, p.y, angleOffset + (i - count / 2) * 0.16, 64 * scale, i % 2 ? secondary : color, 0.7 * (1 - t * 0.2))
  }
}

function drawAceFireFist(effect: EffectInstance, t: number, scale: number) {
  if (!ctx) return
  const { start, end } = effect.event
  const p = pointOnLine(start, end, easeOutCubic(Math.min(1, t * 1.16)))
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  const fistRadius = (18 + 34 * Math.sin(Math.PI * Math.min(1, t))) * scale

  drawTracer(start, p, '#ea580c', '#fef3c7', 18 * scale, 0.82)
  for (let i = 0; i < 5; i += 1) {
    const offsetAngle = angle + Math.PI + (i - 2) * 0.22
    const tail = 22 + i * 10
    drawTracer(
      { x: p.x + Math.cos(offsetAngle) * tail, y: p.y + Math.sin(offsetAngle) * tail },
      p,
      i % 2 === 0 ? '#ea580c' : '#f97316',
      '#fef3c7',
      (8 + i * 2) * scale,
      0.56 * (1 - t * 0.25)
    )
  }

  glowCircle(p.x, p.y, fistRadius * 1.65, '#ea580c', 0.5)
  glowCircle(p.x, p.y, fistRadius, '#fef3c7', 0.44)

  if (t > 0.5) {
    const impactT = (t - 0.5) / 0.5
    drawExplosion(end.x, end.y, '#ea580c', '#fef3c7', impactT, scale * 1.35)
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI * 2 * i) / 8
      drawTracer(
        end,
        { x: end.x + Math.cos(a) * 90 * impactT * scale, y: end.y + Math.sin(a) * 90 * impactT * scale },
        '#f97316',
        '#fef3c7',
        4,
        1 - impactT
      )
    }
  }
}

function drawKizaruLight(effect: EffectInstance, t: number, scale: number) {
  if (!ctx) return
  const { start, end } = effect.event
  const flash = Math.sin(Math.PI * Math.min(1, t * 1.35))
  const midA = { x: end.x, y: start.y - props.cellSize * 0.75 * scale }
  const midB = { x: start.x + props.cellSize * 0.65 * scale, y: end.y + props.cellSize * 0.35 * scale }
  const midC = { x: end.x - props.cellSize * 0.55 * scale, y: end.y - props.cellSize * 0.9 * scale }
  const path = [start, midA, midB, midC, end]
  glowCircle(start.x, start.y, 36 * scale, '#fef9c3', 0.35 * flash)
  drawZigzagLight(path, '#facc15', '#ffffff', t, scale)
  drawZigzagLight([...path].reverse(), '#fef08a', '#ffffff', Math.min(1, t + 0.18), scale * 0.62)
  if (t > 0.62) drawImpactFlash(end.x, end.y, 58 * scale * (1 - (t - 0.62) * 0.65), '#facc15', '#ffffff', 1 - (t - 0.62))
}

function drawBigMomSoulStorm(effect: EffectInstance, t: number, scale: number) {
  if (!ctx) return
  const { start, end } = effect.event
  const center = pointOnLine(start, end, 0.62)
  drawStorm(center.x, center.y, '#f472b6', '#fef08a', t, scale * 1.25)
  glowCircle(center.x, center.y, (58 + 74 * Math.sin(t * Math.PI)) * scale, '#f472b6', 0.28)
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI * 2 * i) / 10 + t * Math.PI * 2.4
    const radius = (32 + i * 7 + 52 * t) * scale
    const x = center.x + Math.cos(angle) * radius
    const y = center.y + Math.sin(angle) * radius
    drawSoulFlame(x, y, i % 2 === 0 ? '#f472b6' : '#fef08a', 0.82 * (1 - t * 0.25), scale)
  }
  if (t > 0.45) drawLightning(center, end, '#fef08a', '#ffffff', 0.82 * (1 - (t - 0.45) * 0.8))
}

function drawKaidoThunderBagua(effect: EffectInstance, t: number, scale: number) {
  if (!ctx) return
  const { start, end } = effect.event
  const p = pointOnLine(start, end, easeInOutCubic(Math.min(1, t * 1.25)))
  drawTracer(start, p, '#1e3a8a', '#a78bfa', 22 * scale, 0.68)
  drawLightning(start, p, '#7c3aed', '#ffffff', 0.9)
  if (t > 0.42) {
    const hitT = (t - 0.42) / 0.58
    drawSlash(end.x, end.y, -0.45, 140 * scale, '#a78bfa', 1 - hitT * 0.25)
    drawImpactFlash(end.x, end.y, 72 * scale * (1 - hitT * 0.45), '#1e3a8a', '#ffffff', 1 - hitT)
    drawLightning({ x: end.x - 70 * scale, y: end.y - 40 * scale }, { x: end.x + 80 * scale, y: end.y + 30 * scale }, '#a78bfa', '#ffffff', 1 - hitT * 0.3)
  }
}

function drawAkainuMagmaRain(effect: EffectInstance, t: number, scale: number) {
  if (!ctx) return
  const { end } = effect.event
  glowCircle(end.x, end.y, (42 + 70 * t) * scale, '#991b1b', 0.28 * (1 - t * 0.2))
  for (let i = 0; i < 9; i += 1) {
    const lane = (i - 4) * props.cellSize * 0.32 * scale
    const fall = easeInOutCubic((t + i * 0.05) % 1)
    const sx = end.x + lane
    const sy = -props.cellSize * 0.5 + fall * (end.y + props.cellSize)
    drawTracer({ x: sx - 18 * scale, y: sy - 46 * scale }, { x: sx, y: sy }, '#991b1b', '#fb923c', 13 * scale, 0.75)
    glowCircle(sx, sy, 18 * scale, '#fb923c', 0.5)
  }
  if (t > 0.55) drawExplosion(end.x, end.y, '#991b1b', '#fb923c', (t - 0.55) / 0.45, scale * 1.2)
}

function drawStringCage(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  drawTracer(start, end, '#f472b6', '#ffffff', 7 * scale, 0.65)
  drawBindingCage(end.x, end.y, '#f472b6', '#fbcfe8', t, scale * 1.15)
}

function drawBindingCage(x: number, y: number, color: string, secondary: string, t: number, scale: number) {
  if (!ctx) return
  const height = (74 + 38 * Math.sin(t * Math.PI)) * scale
  const width = (52 + 28 * t) * scale
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = withAlpha(color, 0.88 * (1 - t * 0.25))
  ctx.lineWidth = 2.4 * scale
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath()
    ctx.moveTo(x + i * width * 0.22, y - height * 0.45)
    ctx.lineTo(x + i * width * 0.32, y + height * 0.45)
    ctx.stroke()
  }
  ctx.strokeStyle = withAlpha(secondary, 0.62 * (1 - t * 0.25))
  ctx.strokeRect(x - width / 2, y - height / 2, width, height)
  ctx.restore()
}

function drawUrsusShock(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  const p = pointOnLine(start, end, easeOutCubic(Math.min(1, t * 1.1)))
  drawTracer(start, p, '#3b82f6', '#bfdbfe', 14 * scale, 0.58)
  drawPawStamp(p.x, p.y, 34 * scale, '#bfdbfe', '#3b82f6', 0.92)
  if (t > 0.42) {
    const shock = (t - 0.42) / 0.58
    drawPawStamp(end.x, end.y, (48 + 28 * shock) * scale, '#ffffff', '#3b82f6', 1 - shock * 0.25)
    drawExplosion(end.x, end.y, '#3b82f6', '#ffffff', shock, scale * 1.1)
  }
}

function drawBuggyChop(effect: EffectInstance, t: number, scale: number) {
  if (!ctx) return
  const { start, end } = effect.event
  const center = pointOnLine(start, end, 0.58)
  for (let i = 0; i < 7; i += 1) {
    const angle = (Math.PI * 2 * i) / 7 + t * Math.PI * 3
    const radius = (26 + 44 * t) * scale
    const x = center.x + Math.cos(angle) * radius
    const y = center.y + Math.sin(angle) * radius
    drawSlash(x, y, angle + Math.PI / 2, 46 * scale, i % 2 ? '#60a5fa' : '#ef4444', 0.86 * (1 - t * 0.3))
  }
  drawTracer(start, end, '#ef4444', '#60a5fa', 6 * scale, 0.45)
}

function drawShadowSteal(effect: EffectInstance, t: number, scale: number) {
  if (!ctx) return
  const { start, end } = effect.event
  drawTracer(end, start, '#1e1b4b', '#c4b5fd', 16 * scale, 0.72)
  glowCircle(end.x, end.y, (46 + 54 * t) * scale, '#4c1d95', 0.36 * (1 - t * 0.2))
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI * 2 * i) / 6 + t * Math.PI
    drawSoulFlame(end.x + Math.cos(a) * 42 * scale, end.y + Math.sin(a) * 26 * scale, '#7c3aed', 0.72 * (1 - t * 0.3), scale)
  }
}

function drawPlagueRound(effect: EffectInstance, t: number, scale: number) {
  const { start, end } = effect.event
  drawTracer(start, end, '#a855f7', '#84cc16', 10 * scale, 0.65)
  glowCircle(end.x, end.y, (36 + 80 * t) * scale, '#84cc16', 0.3 * (1 - t * 0.25))
  for (let i = 0; i < 10; i += 1) {
    const a = (Math.PI * 2 * i) / 10 + t
    const r = (20 + 68 * t) * scale
    glowCircle(end.x + Math.cos(a) * r, end.y + Math.sin(a) * r, 9 * scale, i % 2 ? '#a855f7' : '#84cc16', 0.38 * (1 - t))
  }
}

function drawPhoenixHeal(effect: EffectInstance, t: number, scale: number) {
  if (!ctx) return
  const { end } = effect.event
  glowCircle(end.x, end.y, (54 + 52 * Math.sin(t * Math.PI)) * scale, '#22d3ee', 0.28)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = withAlpha('#60a5fa', 0.82 * (1 - t * 0.35))
  ctx.lineWidth = 5 * scale
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(end.x, end.y)
    ctx.quadraticCurveTo(end.x + side * 58 * scale, end.y - 86 * scale, end.x + side * (112 + 34 * t) * scale, end.y - 26 * scale)
    ctx.quadraticCurveTo(end.x + side * 58 * scale, end.y - 6 * scale, end.x + side * 20 * scale, end.y + 34 * scale)
    ctx.quadraticCurveTo(end.x + side * 34 * scale, end.y + 6 * scale, end.x, end.y)
    ctx.stroke()
    for (let i = 0; i < 3; i += 1) {
      const featherT = (i + 1) / 4
      const fx = end.x + side * (36 + i * 28 + 18 * t) * scale
      const fy = end.y - (48 - i * 12) * scale
      drawFlameTongue({ x: end.x + side * 10 * scale, y: end.y - 6 * scale }.x, { x: end.x, y: end.y }.y, side < 0 ? -1.95 + featherT * 0.28 : -1.2 - featherT * 0.28, Math.hypot(fx - end.x, fy - end.y) * 0.46, '#22d3ee', '#60a5fa', 0.34 * (1 - t * 0.18))
    }
  }
  ctx.restore()
  drawHealingBloom(end.x, end.y, '#22d3ee', '#e0f2fe', t, scale * 0.8)
}

function drawDiamondGuard(x: number, y: number, color: string, secondary: string, t: number, scale: number) {
  if (!ctx) return
  glowCircle(x, y, 48 * scale, color, 0.2 * (1 - t * 0.2))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = withAlpha(secondary, 0.78 * (1 - t * 0.25))
  ctx.lineWidth = 3 * scale
  const r = (28 + 28 * Math.sin(t * Math.PI)) * scale
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x + r * 0.85, y)
  ctx.lineTo(x, y + r)
  ctx.lineTo(x - r * 0.85, y)
  ctx.closePath()
  ctx.stroke()
  ctx.restore()
}

function drawCandyShower(x: number, y: number, color: string, secondary: string, t: number, scale: number) {
  drawHealingBloom(x, y, color, secondary, t, scale * 0.8)
  for (let i = 0; i < 6; i += 1) {
    const fall = (t + i * 0.13) % 1
    const px = x + (i - 2.5) * 18 * scale
    const py = y - 70 * scale + fall * 108 * scale
    drawPlus(px, py, 5 * scale, i % 2 ? '#f9a8d4' : '#bbf7d0', 0.75)
  }
}

function drawHormoneHeal(x: number, y: number, color: string, secondary: string, t: number, scale: number) {
  drawHealingBloom(x, y, color, secondary, t, scale)
  drawLightning({ x: x - 42 * scale, y: y + 24 * scale }, { x: x + 44 * scale, y: y - 22 * scale }, '#a855f7', '#ffffff', 0.48 * (1 - t * 0.2))
}

function drawDeterminationHeal(x: number, y: number, color: string, secondary: string, t: number, scale: number) {
  glowCircle(x, y, (30 + 34 * Math.sin(t * Math.PI)) * scale, color, 0.24)
  drawPlus(x, y, 15 * scale, secondary, 0.8 * (1 - t * 0.3))
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i - 2) * 0.28
    drawTracer({ x, y }, { x: x + Math.cos(a) * 48 * scale, y: y + Math.sin(a) * 48 * scale }, color, secondary, 3, 0.35 * (1 - t))
  }
}

function drawMinorHeal(x: number, y: number, t: number) {
  const alpha = 1 - t
  glowCircle(x, y, 18 + 10 * Math.sin(t * Math.PI), '#22c55e', 0.18 * alpha)
  drawPlus(x, y - 8 * t, 5, '#bbf7d0', 0.6 * alpha)
}

function drawPokemonUltimate(effect: EffectInstance, t: number, scale: number) {
  const style = effect.event.ability?.effectStyle
  const move = effect.event.skillName ?? effect.event.source.ability?.name ?? ''
  if (matchesMove(move, ['Thunderstorm'])) {
    drawPokemonThunderstorm(effect, t, scale)
    return
  }
  if (matchesMove(move, ['Sing', 'Sleep Powder', 'Lovely Kiss', 'Yawn', 'Hypnosis', 'Stun Spore', 'Perish Song', 'Nightmare'])) {
    drawPokemonSleepWave(effect, t, scale)
    return
  }
  if (matchesMove(move, ['Harden', 'Iron Defense', 'Shell Guard', 'Reflect', 'Magnetic Field', 'Acid Armor', 'Psychic Terrain'])) {
    drawPokemonBarrier(effect, t, scale)
    return
  }
  if (matchesMove(move, ['Toxic Spikes', 'Sludge Wave', 'Gunk Shot', 'Acid Spray', 'Acid', 'Sludge', 'Poison Sting', 'Poison Jab', 'Venom Drench'])) {
    drawPokemonToxicPool(effect, t, scale)
    return
  }
  if (matchesMove(move, ['Fire Spin', 'Will-O-Wisp', 'Inferno Wing'])) {
    drawPokemonFireVortex(effect, t, scale)
    return
  }
  if (matchesMove(move, ['Bubble Beam', 'Aqua Ring'])) {
    drawPokemonBubbleField(effect, t, scale)
    return
  }
  if (matchesMove(move, ['Hyper Beam', 'Psystrike', 'Future Sight'])) {
    drawPokemonBeamFinisher(effect, t, scale)
    return
  }
  if (matchesMove(move, ['Tailwind', 'Agility', 'Flame Charge', 'Conversion', 'Transform', 'Helping Hand', 'Bulk Up'])) {
    drawPokemonSupportSurge(effect, t, scale)
    return
  }
  if (matchesMove(move, ['Quick Attack', 'Hyper Fang', 'Super Fang', 'Double Hit', 'Play Rough', 'Dizzy Punch', 'Head Charge', 'Wrap', 'Heavy Slam'])) {
    drawPokemonImpactRush(effect, t, scale)
    return
  }

  switch (style) {
    case 'POKEMON_GRASS_BLOOM':
      drawPokemonGrass(effect, t, scale)
      break
    case 'POKEMON_FIRE_STREAM':
      drawPokemonFire(effect, t, scale)
      break
    case 'POKEMON_WATER_CANNON':
      drawPokemonWater(effect, t, scale)
      break
    case 'POKEMON_ELECTRIC_STORM':
      drawPokemonElectric(effect, t, scale)
      break
    case 'POKEMON_PSYCHIC_WAVE':
      drawPokemonPsychic(effect, t, scale)
      break
    case 'POKEMON_POISON_BURST':
      drawPokemonPoison(effect, t, scale)
      break
    case 'POKEMON_EARTH_SPIKES':
      drawPokemonEarth(effect, t, scale)
      break
    case 'POKEMON_ICE_CRYSTAL':
      drawPokemonIce(effect, t, scale)
      break
    case 'POKEMON_DRAGON_BEAM':
      drawPokemonDragon(effect, t, scale)
      break
    case 'POKEMON_GHOST_NIGHTMARE':
      drawPokemonGhost(effect, t, scale)
      break
    case 'POKEMON_BUG_SWARM':
      drawPokemonBug(effect, t, scale)
      break
    case 'POKEMON_FIGHTING_COMBO':
      drawPokemonFighting(effect, t, scale)
      break
    case 'POKEMON_FLYING_GUST':
      drawPokemonFlying(effect, t, scale)
      break
    case 'POKEMON_STEEL_FIELD':
      drawPokemonSteel(effect, t, scale)
      break
    case 'POKEMON_NORMAL_RALLY':
    default:
      drawPokemonNormal(effect, t, scale)
      break
  }
}

function matchesMove(move: string, names: string[]) {
  return names.some(name => move.toLowerCase().includes(name.toLowerCase()))
}

function drawPokemonThunderstorm(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#facc15'
  const secondary = ability?.secondaryColor ?? '#fef08a'
  const center = pointOnLine(start, end, 0.62)
  glowCircle(center.x, center.y, (84 + 80 * Math.sin(t * Math.PI)) * scale, color, 0.28)
  drawStorm(center.x, center.y, color, secondary, t, scale * 1.2)
  for (let i = 0; i < 9; i += 1) {
    const offset = (i - 4) * props.cellSize * 0.34 * scale
    const target = {
      x: end.x + offset,
      y: end.y + Math.sin(i * 1.7) * props.cellSize * 0.32 * scale
    }
    const source = {
      x: target.x + Math.sin(t * 10 + i) * 18 * scale,
      y: -props.cellSize * (0.45 + (i % 3) * 0.16)
    }
    drawLightning(source, target, color, '#ffffff', 0.82 * (1 - t * 0.12))
    if (t > 0.34) drawImpactFlash(target.x, target.y, 22 * scale, color, secondary, 0.72 * (1 - t * 0.45))
  }
  drawImpactRing(end.x, end.y, (38 + 150 * t) * scale, secondary, 0.8 * (1 - t))
}

function drawPokemonSleepWave(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#f0abfc'
  const secondary = ability?.secondaryColor ?? '#fef3c7'
  drawDottedLink(start, end, secondary, 0.34 * (1 - t * 0.2), scale)
  glowCircle(end.x, end.y, (48 + 54 * Math.sin(t * Math.PI)) * scale, color, 0.24)
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8 + t * Math.PI * 0.8
    const radius = (30 + 58 * t + (i % 2) * 12) * scale
    drawMusicalNote(end.x + Math.cos(angle) * radius, end.y + Math.sin(angle) * radius * 0.68, 14 * scale, i % 2 ? secondary : color, 0.72 * (1 - t * 0.24))
  }
  drawImpactRing(end.x, end.y, (28 + 102 * t) * scale, secondary, 0.62 * (1 - t))
}

function drawPokemonBarrier(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#38bdf8'
  const secondary = ability?.secondaryColor ?? '#e0f2fe'
  const target = effect.event.source.ability?.type === 'SHIELD' ? start : end
  drawDottedLink(start, target, secondary, 0.28 * (1 - t * 0.2), scale)
  glowCircle(target.x, target.y, (48 + 38 * Math.sin(t * Math.PI)) * scale, color, 0.2)
  drawDiamondGuard(target.x, target.y, color, secondary, t, scale * 1.05)
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI * 2 * i) / 6 + t * 0.8
    drawHexShard(target.x + Math.cos(a) * 54 * scale, target.y + Math.sin(a) * 38 * scale, a, 18 * scale, secondary, 0.62 * (1 - t * 0.18))
  }
}

function drawPokemonToxicPool(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#7c3aed'
  const secondary = ability?.secondaryColor ?? '#c4b5fd'
  drawTracer(start, end, color, secondary, 10 * scale, 0.38)
  glowCircle(end.x, end.y, (54 + 66 * t) * scale, color, 0.34 * (1 - t * 0.08))
  for (let i = 0; i < 18; i += 1) {
    const a = (Math.PI * 2 * i) / 18 + t * 1.4
    const r = (16 + (i % 6) * 9 + 62 * t) * scale
    glowCircle(end.x + Math.cos(a) * r, end.y + Math.sin(a) * r * 0.64, (7 + (i % 3) * 3) * scale, i % 2 ? secondary : color, 0.36 * (1 - t * 0.7))
  }
  drawImpactRing(end.x, end.y, (34 + 116 * t) * scale, secondary, 0.46 * (1 - t))
}

function drawPokemonFireVortex(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#f97316'
  const secondary = ability?.secondaryColor ?? '#fef3c7'
  drawTracer(start, end, color, secondary, 11 * scale, 0.42)
  glowCircle(end.x, end.y, (52 + 46 * Math.sin(t * Math.PI)) * scale, color, 0.28)
  for (let i = 0; i < 10; i += 1) {
    const a = t * Math.PI * 3.4 + i * 0.62
    const r = (22 + i * 5 + 42 * t) * scale
    drawFlameTongue(end.x + Math.cos(a) * r, end.y + Math.sin(a) * r * 0.68, a + Math.PI / 2, 34 * scale, color, secondary, 0.64 * (1 - t * 0.28))
  }
}

function drawPokemonBubbleField(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#2563eb'
  const secondary = ability?.secondaryColor ?? '#67e8f9'
  drawTracer(start, end, color, secondary, 9 * scale, 0.4)
  for (let i = 0; i < 13; i += 1) {
    const local = ((t * 1.25 + i / 13) % 1)
    const p = pointOnLine(start, end, local)
    const wave = Math.sin(local * Math.PI * 2 + i) * 24 * scale
    drawBubble(p.x, p.y + wave, (7 + (i % 4) * 3) * scale, i % 2 ? secondary : color, 0.62 * (1 - t * 0.2))
  }
  drawArcWave(end.x, end.y, (36 + 70 * t) * scale, secondary, 0.44 * (1 - t))
}

function drawPokemonBeamFinisher(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#a855f7'
  const secondary = ability?.secondaryColor ?? '#ffffff'
  const charge = Math.min(1, t / 0.32)
  glowCircle(start.x, start.y, (34 + 34 * charge) * scale, secondary, 0.35)
  if (t > 0.18) {
    const fireT = Math.min(1, (t - 0.18) / 0.82)
    const p = pointOnLine(start, end, easeInOutCubic(fireT))
    drawBeam(start, p, color, secondary, (20 + 16 * Math.sin(t * Math.PI)) * scale)
    drawImpactFlash(end.x, end.y, 70 * scale, color, secondary, 1 - t * 0.55)
  }
}

function drawPokemonSupportSurge(effect: EffectInstance, t: number, scale: number) {
  const color = effect.event.ability?.color ?? '#a8a29e'
  const secondary = effect.event.ability?.secondaryColor ?? '#fafaf9'
  drawSupportPulse(effect, t, scale, color, secondary, effect.event.source.ability?.type === 'BUFF_SPD' ? 'speed' : 'rally')
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i - 2) * 0.28
    drawChevron(effect.event.start.x + Math.cos(a) * 48 * scale, effect.event.start.y + Math.sin(a) * 48 * scale, 10 * scale, secondary, 0.5 * (1 - t * 0.35))
  }
}

function drawPokemonImpactRush(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#a8a29e'
  const secondary = ability?.secondaryColor ?? '#fafaf9'
  const p = pointOnLine(start, end, easeInOutCubic(Math.min(1, t * 1.22)))
  drawTracer(start, p, color, secondary, 15 * scale, 0.52)
  glowCircle(p.x, p.y, (18 + 18 * Math.sin(t * Math.PI)) * scale, secondary, 0.26)
  if (t > 0.38) {
    const hit = (t - 0.38) / 0.62
    drawImpactFlash(end.x, end.y, 52 * scale, color, secondary, 1 - hit * 0.55)
    drawImpactRing(end.x, end.y, (26 + 94 * hit) * scale, secondary, 0.55 * (1 - hit))
  }
  for (let i = -1; i <= 1; i += 1) {
    drawChevron(p.x - i * 12 * scale, p.y + i * 8 * scale, 8 * scale, i === 0 ? secondary : color, 0.48 * (1 - t * 0.25))
  }
}

function drawPokemonGrass(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#22c55e'
  const secondary = ability?.secondaryColor ?? '#bbf7d0'
  drawLeafTrail(start, end, color, secondary, t, scale)
  glowCircle(end.x, end.y, (42 + 52 * Math.sin(t * Math.PI)) * scale, color, 0.3)
  for (let i = 0; i < 12; i += 1) {
    const angle = (Math.PI * 2 * i) / 12 + t * Math.PI
    const radius = (28 + 50 * t + (i % 3) * 8) * scale
    drawLeaf(end.x + Math.cos(angle) * radius, end.y + Math.sin(angle) * radius * 0.72, angle, 18 * scale, i % 2 ? secondary : color, 0.74 * (1 - t * 0.28))
  }
  if (effect.event.source.ability?.type === 'HEAL') drawHealingBloom(end.x, end.y, color, secondary, t, scale * 0.75)
}

function drawPokemonFire(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#f97316'
  const secondary = ability?.secondaryColor ?? '#fef3c7'
  const p = pointOnLine(start, end, easeOutCubic(Math.min(1, t * 1.14)))
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  drawTracer(start, p, color, secondary, 20 * scale, 0.72)
  for (let i = 0; i < 7; i += 1) {
    drawFlameTongue(p.x - i * Math.cos(angle) * 12 * scale, p.y - i * Math.sin(angle) * 12 * scale, angle + (i - 3) * 0.08, (48 - i * 3) * scale, color, secondary, 0.58 * (1 - t * 0.22))
  }
  if (t > 0.46) drawExplosion(end.x, end.y, color, secondary, (t - 0.46) / 0.54, scale * 1.26)
}

function drawPokemonWater(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#2563eb'
  const secondary = ability?.secondaryColor ?? '#67e8f9'
  const p = pointOnLine(start, end, easeInOutCubic(Math.min(1, t * 1.08)))
  drawBeam(start, p, color, secondary, 17 * scale)
  for (let i = 0; i < 5; i += 1) drawArcWave(end.x, end.y, (24 + i * 17 + 64 * t) * scale, i % 2 ? secondary : color, 0.5 * (1 - t * 0.42))
  glowCircle(end.x, end.y, (30 + 34 * Math.sin(t * Math.PI)) * scale, secondary, 0.24)
}

function drawPokemonElectric(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#facc15'
  const secondary = ability?.secondaryColor ?? '#fef08a'
  drawLightning(start, end, color, secondary, 0.9)
  for (let i = -2; i <= 2; i += 1) {
    const x = end.x + i * 24 * scale
    drawLightning({ x, y: -props.cellSize * 0.35 }, { x: end.x - i * 10 * scale, y: end.y }, color, '#ffffff', 0.62 * (1 - t * 0.12))
  }
  glowCircle(end.x, end.y, (40 + 44 * Math.sin(t * Math.PI)) * scale, secondary, 0.38)
  drawImpactRing(end.x, end.y, (26 + 116 * t) * scale, secondary, 0.72 * (1 - t))
}

function drawPokemonPsychic(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#a855f7'
  const secondary = ability?.secondaryColor ?? '#f0abfc'
  drawDottedLink(start, end, secondary, 0.52 * (1 - t * 0.24), scale)
  for (let i = 0; i < 4; i += 1) {
    drawImpactRing(end.x, end.y, (24 + i * 20 + 60 * Math.sin(t * Math.PI)) * scale, i % 2 ? secondary : color, 0.55 * (1 - t * 0.24))
  }
  glowCircle(end.x, end.y, (50 + 32 * Math.sin(t * Math.PI)) * scale, color, 0.28)
  drawStar(end.x, end.y - 46 * scale, secondary, 0.75 * (1 - t * 0.2))
}

function drawPokemonPoison(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#7c3aed'
  const secondary = ability?.secondaryColor ?? '#c4b5fd'
  drawTracer(start, end, color, secondary, 13 * scale, 0.48)
  glowCircle(end.x, end.y, (48 + 54 * t) * scale, color, 0.32 * (1 - t * 0.1))
  for (let i = 0; i < 12; i += 1) {
    const a = (Math.PI * 2 * i) / 12 + t * 1.2
    const r = (18 + 64 * t + (i % 4) * 7) * scale
    glowCircle(end.x + Math.cos(a) * r, end.y + Math.sin(a) * r * 0.75, 12 * scale, i % 2 ? secondary : color, 0.34 * (1 - t))
  }
}

function drawPokemonEarth(effect: EffectInstance, t: number, scale: number) {
  const { end, ability } = effect.event
  const color = ability?.color ?? '#78716c'
  const secondary = ability?.secondaryColor ?? '#e7e5e4'
  drawQuake(end.x, end.y, color, secondary, t, scale * 0.92)
  for (let i = -3; i <= 3; i += 1) {
    const local = Math.max(0, Math.min(1, t * 1.5 - Math.abs(i) * 0.08))
    const x = end.x + i * 25 * scale
    drawRockShard(x, end.y + 38 * scale * (1 - local), -Math.PI / 2, (24 + 28 * local) * scale, i % 2 ? secondary : color, 0.82 * local * (1 - t * 0.25))
  }
}

function drawPokemonIce(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#67e8f9'
  const secondary = ability?.secondaryColor ?? '#f0f9ff'
  drawTracer(start, end, color, secondary, 12 * scale, 0.46)
  glowCircle(end.x, end.y, (42 + 42 * Math.sin(t * Math.PI)) * scale, color, 0.28)
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI * 2 * i) / 10
    drawIceShard(end.x, end.y, angle, (44 + 44 * t + (i % 2) * 10) * scale, i % 2 ? secondary : color, 0.78 * (1 - t * 0.2))
  }
}

function drawPokemonDragon(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#6366f1'
  const secondary = ability?.secondaryColor ?? '#c7d2fe'
  drawBeam(start, end, color, secondary, (18 + 14 * Math.sin(t * Math.PI)) * scale)
  for (let i = -1; i <= 1; i += 1) {
    drawDragonClaw(end.x + i * 20 * scale, end.y - i * 8 * scale, -0.35 + i * 0.32, 58 * scale, secondary, color, 0.82 * (1 - t * 0.18))
  }
  if (t > 0.5) drawImpactFlash(end.x, end.y, 64 * scale, color, secondary, 1 - (t - 0.5) / 0.5)
}

function drawPokemonGhost(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#4c1d95'
  const secondary = ability?.secondaryColor ?? '#c4b5fd'
  drawTracer(end, start, color, secondary, 18 * scale, 0.5)
  glowCircle(end.x, end.y, (50 + 52 * t) * scale, color, 0.38 * (1 - t * 0.1))
  for (let i = 0; i < 7; i += 1) {
    const a = (Math.PI * 2 * i) / 7 + t * Math.PI * 1.6
    drawSoulFlame(end.x + Math.cos(a) * 44 * scale, end.y + Math.sin(a) * 30 * scale, i % 2 ? secondary : color, 0.78 * (1 - t * 0.28), scale * 1.25)
  }
}

function drawPokemonBug(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#84cc16'
  const secondary = ability?.secondaryColor ?? '#d9f99d'
  for (let i = 0; i < 9; i += 1) {
    const lane = (i - 4) * 11 * scale
    const to = { x: end.x + lane, y: end.y + Math.sin(i) * 16 * scale }
    const p = pointOnLine(start, to, easeOutCubic(Math.min(1, t * 1.18)))
    drawTracer(start, p, color, secondary, 3.8 * scale, 0.44)
    drawChevron(p.x, p.y, 6 * scale, i % 2 ? secondary : color, 0.7 * (1 - t * 0.2))
  }
  drawImpactFlash(end.x, end.y, 46 * scale, color, secondary, 1 - t * 0.5)
}

function drawPokemonFighting(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#dc2626'
  const secondary = ability?.secondaryColor ?? '#fecaca'
  for (let i = 0; i < 6; i += 1) {
    const local = Math.max(0, Math.min(1, (t - i * 0.055) / 0.5))
    if (local <= 0) continue
    const lane = (i - 2.5) * 12 * scale
    const target = { x: end.x + lane, y: end.y + Math.sin(i) * 10 * scale }
    const p = pointOnLine(start, target, easeOutCubic(local))
    drawTracer(start, p, color, secondary, 8 * scale, 0.48)
    drawImpactRing(p.x, p.y, (10 + 22 * local) * scale, secondary, 0.7 * (1 - local * 0.3))
  }
  if (t > 0.58) drawImpactFlash(end.x, end.y, 58 * scale, color, secondary, 1 - (t - 0.58) / 0.42)
}

function drawPokemonFlying(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#94a3b8'
  const secondary = ability?.secondaryColor ?? '#f8fafc'
  drawGustLine(start, end, color, secondary, t, scale)
  drawStorm(end.x, end.y, color, secondary, t, scale * 0.9)
  for (let i = 0; i < 6; i += 1) {
    const a = -0.9 + i * 0.28 + t * 0.65
    drawArcWave(end.x, end.y, (32 + i * 12 + 46 * t) * scale, i % 2 ? secondary : color, 0.35 * (1 - t))
    drawFeather(end.x + Math.cos(a) * 58 * scale, end.y + Math.sin(a) * 36 * scale, a, 16 * scale, secondary, 0.56 * (1 - t * 0.2))
  }
}

function drawPokemonSteel(effect: EffectInstance, t: number, scale: number) {
  const { start, end, ability } = effect.event
  const color = ability?.color ?? '#94a3b8'
  const secondary = ability?.secondaryColor ?? '#e2e8f0'
  drawBeam(start, end, color, secondary, 10 * scale)
  drawDiamondGuard(end.x, end.y, color, secondary, t, scale)
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * 2 * i) / 6 + t
    drawRockShard(end.x + Math.cos(angle) * 50 * scale, end.y + Math.sin(angle) * 34 * scale, angle, 20 * scale, i % 2 ? secondary : color, 0.68 * (1 - t * 0.2))
  }
}

function drawPokemonNormal(effect: EffectInstance, t: number, scale: number) {
  const color = effect.event.ability?.color ?? '#a8a29e'
  const secondary = effect.event.ability?.secondaryColor ?? '#fafaf9'
  drawSupportPulse(effect, t, scale, color, secondary, 'rally')
  drawImpactRing(effect.event.start.x, effect.event.start.y, (34 + 80 * t) * scale, secondary, 0.55 * (1 - t))
}

function drawSoulFlame(x: number, y: number, color: string, alpha: number, scale: number) {
  glowCircle(x, y, 13 * scale, color, 0.45 * alpha)
  drawPlus(x, y - 4 * scale, 3.5 * scale, '#ffffff', 0.3 * alpha)
}

function drawRubberArm(start: { x: number; y: number }, end: { x: number; y: number }, t: number, index: number, scale: number) {
  if (!ctx) return
  const eased = easeOutCubic(t)
  const p = pointOnLine(start, end, eased)
  const bow = Math.sin(t * Math.PI) * (26 + (index % 3) * 8) * scale
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  const control = {
    x: (start.x + p.x) / 2 + Math.cos(angle + Math.PI / 2) * bow,
    y: (start.y + p.y) / 2 + Math.sin(angle + Math.PI / 2) * bow
  }
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  ctx.strokeStyle = withAlpha('#ef4444', 0.68 * (1 - t * 0.28))
  ctx.lineWidth = 10 * scale
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.quadraticCurveTo(control.x, control.y, p.x, p.y)
  ctx.stroke()
  ctx.strokeStyle = withAlpha('#fbbf24', 0.46 * (1 - t * 0.2))
  ctx.lineWidth = 3 * scale
  ctx.stroke()
  ctx.fillStyle = withAlpha('#fef3c7', 0.84 * (1 - t * 0.16))
  ctx.beginPath()
  ctx.ellipse(p.x, p.y, 12 * scale, 8 * scale, angle, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawSupportPulse(effect: EffectInstance, t: number, scale: number, color: string, secondary: string, motif: string) {
  const { start, end } = effect.event
  const pulse = Math.sin(t * Math.PI)
  glowCircle(start.x, start.y, (34 + 30 * pulse) * scale, color, 0.22)
  glowCircle(end.x, end.y, (28 + 22 * pulse) * scale, secondary, 0.2)
  drawDottedLink(start, end, secondary, 0.22 * (1 - t * 0.35), scale)

  if (motif === 'guard') {
    drawDiamondGuard(end.x, end.y, color, secondary, t, scale * 0.55)
  } else if (motif === 'speed') {
    for (let i = 0; i < 4; i += 1) {
      drawArcWave(end.x, end.y, (20 + i * 12 + 18 * t) * scale, i % 2 ? secondary : color, 0.28 * (1 - t * 0.25))
    }
  } else if (motif === 'formation') {
    for (let i = -2; i <= 2; i += 1) {
      drawChevron(end.x + i * 16 * scale, end.y, 10 * scale, secondary, 0.56 * (1 - t * 0.25))
    }
  } else if (motif === 'karate') {
    drawArcWave(end.x, end.y, (26 + 28 * pulse) * scale, color, 0.36)
    drawPlus(end.x, end.y, 8 * scale, secondary, 0.54)
  } else if (motif === 'roar') {
    for (let i = 0; i < 3; i += 1) drawArcWave(start.x, start.y, (28 + i * 16 + 40 * t) * scale, color, 0.34 * (1 - t))
  } else {
    drawPlus(end.x, end.y, 12 * scale, secondary, 0.58 * (1 - t * 0.25))
  }
}

function drawDottedLink(start: { x: number; y: number }, end: { x: number; y: number }, color: string, alpha: number, scale: number) {
  if (!ctx) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = withAlpha(color, alpha)
  const dots = 7
  for (let i = 1; i < dots; i += 1) {
    const t = i / dots
    const wave = Math.sin(t * Math.PI) * 18 * scale
    const x = start.x + (end.x - start.x) * t
    const y = start.y + (end.y - start.y) * t - wave
    ctx.beginPath()
    ctx.arc(x, y, 2.6 * scale, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawFlameTongue(x: number, y: number, angle: number, length: number, color: string, secondary: string, alpha: number) {
  if (!ctx) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.globalCompositeOperation = 'lighter'
  const gradient = ctx.createLinearGradient(0, 0, length, 0)
  gradient.addColorStop(0, withAlpha(color, 0))
  gradient.addColorStop(0.55, withAlpha(color, alpha))
  gradient.addColorStop(1, withAlpha(secondary, alpha * 0.75))
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(length * 0.46, -length * 0.2, length, 0)
  ctx.quadraticCurveTo(length * 0.42, length * 0.18, 0, 0)
  ctx.fill()
  ctx.restore()
}

function drawBuddhaSilhouette(x: number, y: number, t: number, scale: number) {
  if (!ctx) return
  const alpha = 0.34 + Math.sin(t * Math.PI) * 0.18
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = withAlpha('#eab308', alpha)
  ctx.beginPath()
  ctx.arc(x, y - 42 * scale, 20 * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(x, y + 6 * scale, 42 * scale, 56 * scale, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = withAlpha('#fef3c7', alpha * 1.5)
  ctx.lineWidth = 3 * scale
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI * 0.88 + i * (Math.PI * 1.76 / 9)
    ctx.beginPath()
    ctx.moveTo(x, y - 16 * scale)
    ctx.lineTo(x + Math.cos(a) * 72 * scale, y - 16 * scale + Math.sin(a) * 72 * scale)
    ctx.stroke()
  }
  ctx.restore()
}

function drawSandStream(start: { x: number; y: number }, end: { x: number; y: number }, t: number, scale: number) {
  if (!ctx) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 18; i += 1) {
    const local = ((t * 1.4 + i / 18) % 1)
    const p = pointOnLine(start, end, local)
    const wave = Math.sin(local * Math.PI * 3 + i) * 22 * scale
    glowCircle(p.x, p.y + wave, (4 + (i % 3) * 2) * scale, i % 2 ? '#fde68a' : '#d97706', 0.26)
  }
  ctx.restore()
}

function drawCrescentSlash(x: number, y: number, angle: number, length: number, color: string, edge: string, alpha: number) {
  if (!ctx) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = withAlpha(color, alpha * 0.78)
  ctx.beginPath()
  ctx.ellipse(0, 0, length * 0.52, length * 0.16, 0, -0.1 * Math.PI, 1.1 * Math.PI)
  ctx.ellipse(10, -8, length * 0.46, length * 0.1, 0, 1.1 * Math.PI, -0.1 * Math.PI, true)
  ctx.fill()
  ctx.strokeStyle = withAlpha(edge, alpha)
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(0, 0, length * 0.48, -0.95, 0.95)
  ctx.stroke()
  ctx.restore()
}

function drawFangMark(x: number, y: number, size: number, color: string, alpha: number) {
  if (!ctx) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = 3
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(x + side * size * 0.18, y - size * 0.72)
    ctx.quadraticCurveTo(x + side * size * 0.48, y - size * 0.08, x + side * size * 0.08, y + size * 0.62)
    ctx.stroke()
  }
  ctx.restore()
}

function drawMochiArm(start: { x: number; y: number }, end: { x: number; y: number }, t: number, scale: number) {
  if (!ctx || t <= 0) return
  const eased = easeOutCubic(Math.min(1, t))
  const p = pointOnLine(start, end, eased)
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  ctx.strokeStyle = withAlpha('#701a75', 0.54 * (1 - t * 0.18))
  ctx.lineWidth = (18 - 6 * t) * scale
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.quadraticCurveTo((start.x + p.x) / 2, (start.y + p.y) / 2 - 28 * scale, p.x, p.y)
  ctx.stroke()
  ctx.fillStyle = withAlpha('#f0abfc', 0.68 * (1 - t * 0.12))
  ctx.beginPath()
  ctx.ellipse(p.x, p.y, 18 * scale, 12 * scale, angle, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawMochiBurst(x: number, y: number, t: number, scale: number) {
  glowCircle(x, y, (42 + 48 * Math.sin(t * Math.PI)) * scale, '#701a75', 0.26)
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI * 2 * i) / 8
    drawTracer({ x, y }, { x: x + Math.cos(a) * 78 * t * scale, y: y + Math.sin(a) * 46 * t * scale }, '#701a75', '#f0abfc', 7 * scale, 0.44 * (1 - t))
  }
}

function drawDragonClaw(x: number, y: number, angle: number, size: number, color: string, flame: string, alpha: number) {
  if (!ctx) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath()
    ctx.moveTo(-size * 0.25, i * size * 0.18)
    ctx.quadraticCurveTo(size * 0.12, i * size * 0.12, size * 0.44, i * size * 0.3)
    ctx.stroke()
  }
  drawFlameTongue(0, 0, 0, size * 0.9, flame, color, 0.3 * alpha)
  ctx.restore()
}

function drawZigzagLight(path: Array<{ x: number; y: number }>, color: string, secondary: string, t: number, scale: number) {
  if (!ctx) return
  const visibleSegments = Math.max(1, Math.ceil(t * (path.length - 1)))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  for (let i = 0; i < visibleSegments; i += 1) {
    const a = path[i]
    const b = path[i + 1]
    if (!b) continue
    const local = Math.max(0, Math.min(1, t * (path.length - 1) - i))
    const p = pointOnLine(a, b, easeOutCubic(local))
    drawBeam(a, p, color, secondary, (8 + 10 * (1 - Math.abs(local - 0.5))) * scale)
    glowCircle(p.x, p.y, 13 * scale, secondary, 0.72)
  }
  ctx.restore()
}

function drawPawStamp(x: number, y: number, size: number, color: string, secondary: string, alpha: number) {
  if (!ctx) return
  glowCircle(x, y, size * 1.24, secondary, 0.18 * alpha)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = Math.max(2, size * 0.08)
  ctx.beginPath()
  ctx.ellipse(x, y + size * 0.1, size * 0.42, size * 0.34, 0, 0, Math.PI * 2)
  ctx.stroke()
  for (let i = 0; i < 4; i += 1) {
    const a = -Math.PI * 0.83 + i * Math.PI * 0.55
    ctx.beginPath()
    ctx.ellipse(x + Math.cos(a) * size * 0.55, y + Math.sin(a) * size * 0.42 - size * 0.18, size * 0.18, size * 0.22, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

function drawChevron(x: number, y: number, size: number, color: string, alpha: number) {
  if (!ctx) return
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x - size, y + size * 0.4)
  ctx.lineTo(x, y - size * 0.4)
  ctx.lineTo(x + size, y + size * 0.4)
  ctx.stroke()
}

function drawPetal(x: number, y: number, angle: number, size: number, color: string, alpha: number) {
  if (!ctx) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = withAlpha(color, alpha * 0.52)
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 0.45, size, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = withAlpha('#ffffff', alpha * 0.32)
  ctx.lineWidth = 1.2
  ctx.stroke()
  ctx.restore()
}

function drawLeafTrail(start: { x: number; y: number }, end: { x: number; y: number }, color: string, secondary: string, t: number, scale: number) {
  drawTracer(start, end, color, secondary, 7 * scale, 0.36)
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  for (let i = 0; i < 7; i += 1) {
    const local = ((t * 1.2 + i / 7) % 1)
    const p = pointOnLine(start, end, local)
    const wave = Math.sin(local * Math.PI * 2 + i) * 18 * scale
    drawLeaf(p.x, p.y + wave, angle + wave * 0.02, 10 * scale, i % 2 ? secondary : color, 0.62 * (1 - t * 0.2))
  }
}

function drawLeaf(x: number, y: number, angle: number, size: number, color: string, alpha: number) {
  if (!ctx) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = withAlpha(color, alpha * 0.58)
  ctx.beginPath()
  ctx.moveTo(-size * 0.15, 0)
  ctx.quadraticCurveTo(size * 0.25, -size * 0.78, size, 0)
  ctx.quadraticCurveTo(size * 0.25, size * 0.78, -size * 0.15, 0)
  ctx.fill()
  ctx.strokeStyle = withAlpha('#ffffff', alpha * 0.26)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(-size * 0.05, 0)
  ctx.lineTo(size * 0.76, 0)
  ctx.stroke()
  ctx.restore()
}

function drawGustLine(start: { x: number; y: number }, end: { x: number; y: number }, color: string, secondary: string, t: number, scale: number) {
  if (!ctx) return
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  const normal = { x: Math.cos(angle + Math.PI / 2), y: Math.sin(angle + Math.PI / 2) }
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  for (let i = -2; i <= 2; i += 1) {
    const offset = i * 10 * scale
    const wobble = Math.sin(t * Math.PI * 3 + i) * 12 * scale
    const a = { x: start.x + normal.x * (offset + wobble), y: start.y + normal.y * (offset + wobble) }
    const b = { x: end.x + normal.x * (offset - wobble), y: end.y + normal.y * (offset - wobble) }
    ctx.strokeStyle = withAlpha(i % 2 ? secondary : color, 0.38 * (1 - t * 0.18))
    ctx.lineWidth = (2.5 + Math.abs(i)) * scale
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.quadraticCurveTo((a.x + b.x) / 2 + normal.x * 32 * scale, (a.y + b.y) / 2 + normal.y * 32 * scale, b.x, b.y)
    ctx.stroke()
  }
  ctx.restore()
}

function drawRockShard(x: number, y: number, angle: number, size: number, color: string, alpha: number) {
  if (!ctx) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = withAlpha(color, alpha * 0.58)
  ctx.strokeStyle = withAlpha('#ffffff', alpha * 0.3)
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(size * 0.65, 0)
  ctx.lineTo(-size * 0.25, -size * 0.45)
  ctx.lineTo(-size * 0.55, size * 0.1)
  ctx.lineTo(-size * 0.1, size * 0.5)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawFeather(x: number, y: number, angle: number, size: number, color: string, alpha: number) {
  if (!ctx) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(-size * 0.6, 0)
  ctx.quadraticCurveTo(size * 0.2, -size * 0.65, size * 0.8, 0)
  ctx.quadraticCurveTo(size * 0.15, size * 0.36, -size * 0.6, 0)
  ctx.moveTo(-size * 0.45, 0)
  ctx.lineTo(size * 0.58, 0)
  ctx.stroke()
  ctx.restore()
}

function drawMusicalNote(x: number, y: number, size: number, color: string, alpha: number) {
  if (!ctx) return
  ctx.save()
  ctx.translate(x, y)
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.fillStyle = withAlpha(color, alpha * 0.56)
  ctx.lineWidth = Math.max(1.5, size * 0.14)
  ctx.beginPath()
  ctx.moveTo(0, -size)
  ctx.lineTo(0, size * 0.35)
  ctx.lineTo(size * 0.55, size * 0.12)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(-size * 0.2, size * 0.48, size * 0.34, size * 0.24, -0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawHexShard(x: number, y: number, angle: number, size: number, color: string, alpha: number) {
  if (!ctx) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI * 2 * i) / 6
    const px = Math.cos(a) * size
    const py = Math.sin(a) * size
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.stroke()
  ctx.restore()
}

function drawBubble(x: number, y: number, radius: number, color: string, alpha: number) {
  if (!ctx) return
  glowCircle(x, y, radius * 2, color, 0.12 * alpha)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = Math.max(1, radius * 0.18)
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x - radius * 0.28, y - radius * 0.28, radius * 0.18, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawIceShard(x: number, y: number, angle: number, length: number, color: string, alpha: number) {
  if (!ctx) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(length, 0)
  ctx.moveTo(length * 0.56, 0)
  ctx.lineTo(length * 0.38, -length * 0.16)
  ctx.moveTo(length * 0.56, 0)
  ctx.lineTo(length * 0.38, length * 0.16)
  ctx.stroke()
  ctx.restore()
}

function drawHeart(x: number, y: number, size: number, color: string, alpha: number) {
  if (!ctx) return
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 18, size / 18)
  ctx.fillStyle = withAlpha(color, alpha)
  ctx.beginPath()
  ctx.moveTo(0, 6)
  ctx.bezierCurveTo(-18, -6, -10, -20, 0, -9)
  ctx.bezierCurveTo(10, -20, 18, -6, 0, 6)
  ctx.fill()
  ctx.restore()
}

function drawFlag(x: number, y: number, color: string, secondary: string, t: number, scale: number) {
  if (!ctx) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = withAlpha(secondary, 0.8 * (1 - t * 0.18))
  ctx.lineWidth = 3 * scale
  ctx.beginPath()
  ctx.moveTo(x - 22 * scale, y + 32 * scale)
  ctx.lineTo(x - 22 * scale, y - 44 * scale)
  ctx.stroke()
  ctx.fillStyle = withAlpha(color, 0.48 * (1 - t * 0.18))
  ctx.beginPath()
  ctx.moveTo(x - 20 * scale, y - 42 * scale)
  ctx.quadraticCurveTo(x + 26 * scale, y - 60 * scale + Math.sin(t * 8) * 8 * scale, x + 52 * scale, y - 34 * scale)
  ctx.quadraticCurveTo(x + 16 * scale, y - 20 * scale, x - 20 * scale, y - 28 * scale)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawGarpGalaxyImpact(effect: EffectInstance, t: number, scale: number) {
  if (!ctx) return
  const { start, end } = effect.event
  const charge = Math.min(1, t / 0.45)
  const impact = Math.max(0, (t - 0.35) / 0.65)
  const fist = pointOnLine({ x: start.x, y: -props.cellSize * 0.8 }, end, easeInOutCubic(charge))

  glowCircle(end.x, end.y, 72 * scale * (0.6 + charge), '#1d4ed8', 0.22)
  for (let i = 0; i < 18; i += 1) {
    const a = i * 2.399 + t * Math.PI * 3
    const r = (10 + i * 4.2 + charge * 32) * scale
    drawStar(end.x + Math.cos(a) * r, end.y + Math.sin(a) * r, i % 3 === 0 ? '#ffffff' : '#60a5fa', 1 - t * 0.42)
  }

  drawBeam({ x: start.x, y: start.y - 30 * scale }, fist, '#60a5fa', '#ffffff', 12 * scale)
  glowCircle(fist.x, fist.y, (28 + 28 * charge) * scale, '#ffffff', 0.72)
  drawImpactRing(fist.x, fist.y, (16 + 32 * charge) * scale, '#60a5fa', 0.85)

  if (impact > 0) {
    drawImpactRing(end.x, end.y, (24 + 160 * impact) * scale, '#ffffff', 1 - impact)
    drawImpactRing(end.x, end.y, (50 + 120 * impact) * scale, '#60a5fa', 0.8 * (1 - impact))
    for (let i = 0; i < 10; i += 1) {
      const a = (Math.PI * 2 * i) / 10
      drawTracer(
        end,
        { x: end.x + Math.cos(a) * (80 + 110 * impact) * scale, y: end.y + Math.sin(a) * (80 + 110 * impact) * scale },
        '#ffffff',
        '#60a5fa',
        5,
        1 - impact
      )
    }
  }
}

function drawWhitebeardQuake(effect: EffectInstance, t: number, scale: number) {
  if (!ctx) return
  const { start, end } = effect.event
  const center = pointOnLine(start, end, 0.55)
  const crackT = easeOutCubic(Math.min(1, t * 1.35))
  const shockT = Math.max(0, (t - 0.18) / 0.82)
  const angle = Math.atan2(end.y - start.y, end.x - start.x) + Math.PI / 2
  const length = Math.hypot(width.value, height.value) * 0.72 * crackT

  glowCircle(center.x, center.y, (60 + 150 * shockT) * scale, '#93c5fd', 0.24 * (1 - shockT))
  drawImpactRing(center.x, center.y, (34 + 190 * shockT) * scale, '#ffffff', 1 - shockT)
  drawImpactRing(center.x, center.y, (74 + 170 * shockT) * scale, '#93c5fd', 0.72 * (1 - shockT))

  drawJaggedCrack(center.x, center.y, angle, length, '#ffffff', 0.96 * (1 - t * 0.12), scale)
  drawJaggedCrack(center.x, center.y, angle + Math.PI, length, '#93c5fd', 0.78 * (1 - t * 0.16), scale)

  for (let i = -2; i <= 2; i += 1) {
    const offset = i * props.cellSize * 0.65
    drawJaggedCrack(
      center.x + Math.cos(angle + Math.PI / 2) * offset,
      center.y + Math.sin(angle + Math.PI / 2) * offset,
      angle + randomBetween(-0.18, 0.18),
      length * (0.34 + Math.abs(i) * 0.08),
      i % 2 === 0 ? '#ffffff' : '#93c5fd',
      0.45 * (1 - t),
      scale * 0.65
    )
  }

  if (t < 0.4) {
    drawCinematicPulse(start.x, start.y, '#ffffff', '#93c5fd', t / 0.4)
  }
}

function drawJaggedCrack(x: number, y: number, angle: number, length: number, color: string, alpha: number, scale: number) {
  if (!ctx) return
  const segments = 9
  const points = [{ x, y }]
  for (let i = 1; i <= segments; i += 1) {
    const t = i / segments
    const along = length * t
    const wiggle = (i % 2 === 0 ? 1 : -1) * randomBetween(6, 18) * scale
    points.push({
      x: x + Math.cos(angle) * along + Math.cos(angle + Math.PI / 2) * wiggle,
      y: y + Math.sin(angle) * along + Math.sin(angle + Math.PI / 2) * wiggle
    })
  }

  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.strokeStyle = withAlpha('#020617', alpha * 0.88)
  ctx.lineWidth = 8 * scale
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (const point of points.slice(1)) {
    ctx.lineTo(point.x, point.y)
  }
  ctx.stroke()

  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = 3.5 * scale
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (const point of points.slice(1)) {
    ctx.lineTo(point.x, point.y)
  }
  ctx.stroke()
  ctx.restore()
}

function drawPlus(x: number, y: number, size: number, color: string, alpha: number) {
  if (!ctx) return
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = Math.max(2, size * 0.24)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - size, y)
  ctx.lineTo(x + size, y)
  ctx.moveTo(x, y - size)
  ctx.lineTo(x, y + size)
  ctx.stroke()
}

function drawStar(x: number, y: number, color: string, alpha: number) {
  if (!ctx) return
  ctx.fillStyle = withAlpha(color, alpha)
  ctx.beginPath()
  ctx.arc(x, y, randomBetween(1.3, 2.8), 0, Math.PI * 2)
  ctx.fill()
}

function isBeamStyle(style: string) {
  return ['BEAM_HEAVY', 'FRANKY_RADICAL_BEAM', 'KIZARU_LIGHT_BEAM', 'QUEEN_LASER_VOLLEY'].includes(style)
}

function isSlashStyle(style: string) {
  return ['ZORO_ONIGIRI', 'MIHAWK_BLACK_BLADE', 'KING_FLAME_SLASH', 'WEAPON_BARRAGE'].includes(style)
}

function isStormStyle(style: string) {
  return ['MAGMA_RAIN', 'AKAINU_MAGMA_RAIN', 'DRAGON_ROAR', 'KAIDO_DRAGON_ROAR', 'BIG_MOM_SOUL_STORM', 'SOUL_SPIRAL', 'WIND_STORM', 'CROCODILE_SANDSTORM', 'SMOKER_WHITE_OUT', 'POISON_CLOUD'].includes(style)
}

function isQuakeStyle(style: string) {
  return ['QUAKE', 'WHITEBEARD_QUAKE', 'GARP_FIST_METEOR', 'SENGOKU_BUDDHA_SHOCK', 'KATAKURI_MOCHI_CRUSH'].includes(style)
}

function isAuraStyle(style: string) {
  return ['AURA_COMMAND', 'ROBIN_ARM_FIELD', 'BROOK_SOUL_FREEZE', 'MARCO_PHOENIX_FLAME', 'HANCOCK_LOVE_ARROW', 'DOFLAMINGO_STRING_CAGE', 'CANDY_TRAP', 'LOVE_BURST', 'SHADOW_DRAIN'].includes(style)
}

function pointOnLine(start: { x: number; y: number }, end: { x: number; y: number }, t: number) {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t
  }
}

function distance(start: { x: number; y: number }, end: { x: number; y: number }) {
  return Math.hypot(end.x - start.x, end.y - start.y)
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function withAlpha(color: string, alpha: number) {
  const clamped = Math.max(0, Math.min(1, alpha))
  const hex = color.replace('#', '')
  if (hex.length !== 6) return color
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${clamped})`
}

watch(() => props.events, (events) => {
  const nextEvents = events.filter(event => event.id > processedEventId)
  if (nextEvents.length === 0) return
  for (const event of nextEvents) {
    processEvent(event)
    processedEventId = Math.max(processedEventId, event.id)
  }
}, { deep: true })

watch(() => props.phase, (phase) => {
  if (phase !== 'COMBAT') {
    clearAll()
    stopLoopIfIdle()
  } else {
    ensureLoop()
  }
})

watch([width, height], async () => {
  await nextTick()
  resizeCanvas()
  ensureLoop()
})

onMounted(() => {
  resizeCanvas()
  if (props.phase === 'COMBAT') ensureLoop()
})

onUnmounted(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="combat-effects-canvas"
    :style="{ width: width + 'px', height: height + 'px' }"
    aria-hidden="true"
  />
</template>

<style scoped>
.combat-effects-canvas {
  position: absolute;
  inset: 0;
  z-index: 80;
  pointer-events: none;
  mix-blend-mode: screen;
}
</style>
