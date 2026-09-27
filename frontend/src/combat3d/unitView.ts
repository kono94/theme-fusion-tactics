import * as THREE from 'three'
import { TEAM_COLORS } from '../utils/colorUtils'
import { gridToWorld, type CombatUnit3d } from './types'

const MOVE_MS = 300
const LUNGE_MS = 260
const HIT_MS = 220
const CAST_MS = 650
export const DEATH_MS = 900
const SHIELD_POP_MS = 320

export const PORTRAIT_HEIGHT = 1.1

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function progress(timeMs: number, startMs: number, durationMs: number): number | null {
  if (startMs < 0 || timeMs < startMs) return null
  const p = (timeMs - startMs) / durationMs
  return p > 1 ? null : p
}

export function easeInOut(p: number): number {
  return p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2
}

// Choreographies write into the pose each frame; it is reset before effects update.
export interface UnitPose {
  offset: THREE.Vector3
  lift: number
  spin: number
  scale: number
  tilt: number
}

export class UnitView {
  readonly root = new THREE.Group()
  readonly body = new THREE.Group()
  readonly label: HTMLDivElement
  readonly color: THREE.Color
  readonly accent: THREE.Color
  readonly height = PORTRAIT_HEIGHT
  readonly pose: UnitPose = {
    offset: new THREE.Vector3(),
    lift: 0,
    spin: 0,
    scale: 1,
    tilt: 0,
  }

  private readonly hpFill: HTMLDivElement
  private readonly shieldFill: HTMLDivElement
  private readonly manaFill: HTMLDivElement
  private readonly shieldBubble: THREE.Mesh
  private readonly shieldLattice: THREE.Mesh
  private readonly stunRing: THREE.Group
  private readonly stunSwirl: THREE.Mesh
  private readonly ring: THREE.Mesh
  private readonly castCircle: THREE.Mesh
  private readonly portrait: THREE.Sprite
  private readonly glowSprite: THREE.Sprite
  private readonly portraitScale: number
  private readonly phase = Math.random() * Math.PI * 2
  private moveFrom = new THREE.Vector3()
  private moveTo = new THREE.Vector3()
  private moveStart = -1
  private lungeStart = -1
  private lungeReach = 0
  private readonly lungeDirection = new THREE.Vector3()
  private hitStart = -1
  private readonly hitDirection = new THREE.Vector3()
  private castStart = -1
  private deathStart = -1
  private shieldChangeStart = -1
  private shieldBroke = false
  private lastShield = 0

  constructor(
    public unit: CombatUnit3d,
    texture: THREE.Texture,
    now: number,
  ) {
    this.color = new THREE.Color(unit.isMine ? TEAM_COLORS.FRIENDLY : TEAM_COLORS.OPPONENT)
    this.accent = new THREE.Color(unit.ability.color)
    this.root.add(this.body)
    this.hitDirection.set(0, 0, unit.isMine ? 1 : -1)

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.34, 0.42, 40),
      new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.85 }),
    )
    this.ring.rotation.x = -Math.PI / 2
    this.ring.position.y = 0.075
    this.root.add(this.ring)

    this.castCircle = new THREE.Mesh(
      new THREE.RingGeometry(0.46, 0.56, 6, 1),
      new THREE.MeshBasicMaterial({
        color: this.accent,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    )
    this.castCircle.rotation.x = -Math.PI / 2
    this.castCircle.position.y = 0.085
    this.castCircle.visible = false
    this.root.add(this.castCircle)

    this.portraitScale = 0.95 + 0.07 * (unit.starLevel - 1)
    this.portrait = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }))
    this.portrait.scale.setScalar(this.portraitScale)
    this.portrait.position.y = 0.66
    this.body.add(this.portrait)

    this.glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    this.glowSprite.scale.setScalar(this.portraitScale * 1.35)
    this.glowSprite.position.y = 0.66
    this.glowSprite.visible = false
    this.body.add(this.glowSprite)

    this.shieldBubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 24, 16),
      new THREE.MeshBasicMaterial({
        color: '#9fd8ff',
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    this.shieldBubble.position.y = 0.62
    this.shieldLattice = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.6, 1),
      new THREE.MeshBasicMaterial({
        color: '#e0f2fe',
        wireframe: true,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    this.shieldBubble.add(this.shieldLattice)
    this.root.add(this.shieldBubble)

    this.stunRing = new THREE.Group()
    for (let index = 0; index < 3; index++) {
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.07),
        new THREE.MeshBasicMaterial({ color: '#ffe95c' }),
      )
      const angle = (index / 3) * Math.PI * 2
      star.position.set(Math.cos(angle) * 0.28, 0, Math.sin(angle) * 0.28)
      this.stunRing.add(star)
    }
    this.stunSwirl = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.012, 6, 36, Math.PI * 1.5),
      new THREE.MeshBasicMaterial({ color: '#fff7c2', transparent: true, opacity: 0.7 }),
    )
    this.stunSwirl.rotation.x = Math.PI / 2
    this.stunRing.add(this.stunSwirl)
    this.stunRing.position.y = this.height + 0.2
    this.root.add(this.stunRing)

    this.label = document.createElement('div')
    this.label.className = `unit-label ${unit.isMine ? 'side-mine' : 'side-enemy'}`
    const name = document.createElement('div')
    name.className = 'unit-name'
    name.textContent = `${unit.name} ${'★'.repeat(unit.starLevel)}`
    const hpBar = document.createElement('div')
    hpBar.className = 'bar hp'
    this.hpFill = document.createElement('div')
    this.hpFill.className = 'fill'
    this.shieldFill = document.createElement('div')
    this.shieldFill.className = 'shield'
    hpBar.append(this.hpFill, this.shieldFill)
    const manaBar = document.createElement('div')
    manaBar.className = 'bar mana'
    this.manaFill = document.createElement('div')
    this.manaFill.className = 'fill'
    manaBar.append(this.manaFill)
    this.label.append(name, hpBar, manaBar)

    const world = gridToWorld(unit.gridX, unit.gridY)
    this.moveTo.set(world.x, 0, world.z)
    this.moveFrom.copy(this.moveTo)
    this.root.position.copy(this.moveTo)
    this.moveStart = now - MOVE_MS
    this.lastShield = unit.shield
  }

  get id(): string {
    return this.unit.id
  }

  get isDying(): boolean {
    return this.deathStart >= 0
  }

  isGone(now: number): boolean {
    return this.deathStart >= 0 && now - this.deathStart > DEATH_MS
  }

  focusPoint(target: THREE.Vector3, heightFactor = 0.55): THREE.Vector3 {
    return target.copy(this.root.position).setY(this.height * heightFactor)
  }

  sync(unit: CombatUnit3d, now: number): void {
    if (this.lastShield > 0 !== unit.shield > 0) {
      this.shieldChangeStart = now
      this.shieldBroke = unit.shield <= 0
    }
    this.lastShield = unit.shield
    this.unit = unit
    const world = gridToWorld(unit.gridX, unit.gridY)
    if (world.x !== this.moveTo.x || world.z !== this.moveTo.z) {
      this.moveFrom.copy(this.root.position).setY(0)
      this.moveTo.set(world.x, 0, world.z)
      this.moveStart = now
    }
  }

  onAttack(now: number, target: UnitView): void {
    this.lungeStart = now
    this.lungeReach = this.unit.range > 1 ? -0.12 : 0.34
    this.lungeDirection.subVectors(target.root.position, this.root.position).setY(0).normalize()
  }

  onCast(now: number): void {
    if (this.castStart >= 0 && now - this.castStart < 50) return
    this.castStart = now
  }

  // `from` is optional so choreographies can flinch victims without a source; knockback then
  // pushes the unit toward its own side of the arena.
  onHit(now: number, from?: THREE.Vector3): void {
    this.hitStart = now
    if (from) {
      this.hitDirection.subVectors(this.root.position, from).setY(0)
      if (this.hitDirection.lengthSq() < 1e-6)
        this.hitDirection.set(0, 0, this.unit.isMine ? 1 : -1)
      this.hitDirection.normalize()
    } else {
      this.hitDirection.set(0, 0, this.unit.isMine ? 1 : -1)
    }
  }

  die(now: number): void {
    if (this.deathStart < 0) this.deathStart = now
  }

  resetPose(): void {
    this.pose.offset.set(0, 0, 0)
    this.pose.lift = 0
    this.pose.spin = 0
    this.pose.scale = 1
    this.pose.tilt = 0
  }

  update(now: number, reducedMotion: boolean): void {
    const moveP = progress(now, this.moveStart, MOVE_MS)
    const moving = moveP !== null
    if (moving) {
      this.root.position.lerpVectors(this.moveFrom, this.moveTo, easeInOut(moveP))
    } else {
      this.root.position.copy(this.moveTo)
    }

    const unit = this.unit
    const dying = this.deathStart >= 0
    const stunned = !dying && unit.stunned
    const body = this.body
    body.position.set(0, 0, 0)
    body.rotation.set(0, 0, 0)
    body.scale.set(1, 1, 1)
    let roll = 0
    if (!reducedMotion && !stunned) {
      const bob = Math.sin(now * 0.006 + this.phase)
      body.position.y = 0.03 * (bob + 1)
      body.scale.set(1 + 0.02 * bob, 1 - 0.02 * bob, 1)
    }
    if (stunned && !reducedMotion) {
      roll += Math.sin(now * 0.007 + this.phase) * 0.14
      body.position.x += Math.sin(now * 0.0035 + this.phase) * 0.03
    }
    if (moving) {
      body.position.y += Math.sin(Math.PI * moveP) * (reducedMotion ? 0.08 : 0.32)
    }

    const lungeP = progress(now, this.lungeStart, LUNGE_MS)
    if (lungeP !== null) {
      body.position.addScaledVector(
        this.lungeDirection,
        Math.sin(Math.PI * lungeP) * this.lungeReach,
      )
      body.scale.multiplyScalar(1 + 0.08 * Math.sin(Math.PI * lungeP))
    }

    let glowAmount = 0
    const castP = progress(now, this.castStart, CAST_MS)
    this.castCircle.visible = castP !== null && !dying
    if (castP !== null) {
      if (!reducedMotion) {
        // Anticipation squash, then a stretched rise, then settle.
        if (castP < 0.22) {
          const squash = Math.sin((castP / 0.22) * Math.PI * 0.5)
          body.scale.x *= 1 + 0.12 * squash
          body.scale.y *= 1 - 0.14 * squash
          body.position.y -= 0.05 * squash
        } else {
          const rise = Math.sin(((castP - 0.22) / 0.78) * Math.PI)
          body.position.y += rise * 0.3
          body.scale.x *= 1 + 0.1 * rise
          body.scale.y *= 1 + 0.22 * rise
        }
      }
      const circleMaterial = this.castCircle.material as THREE.MeshBasicMaterial
      circleMaterial.opacity = 0.85 * Math.sin(Math.PI * castP)
      this.castCircle.scale.setScalar(0.7 + 0.6 * easeInOut(castP))
      this.castCircle.rotation.z = castP * 3
      glowAmount = 0.3 * Math.sin(Math.PI * Math.min(1, castP * 1.4))
    }

    const hitP = progress(now, this.hitStart, HIT_MS)
    const hit = hitP === null ? 0 : 1 - hitP
    if (hitP !== null) {
      const knock = hitP < 0.2 ? hitP / 0.2 : 1 - easeInOut((hitP - 0.2) / 0.8)
      const reach = reducedMotion ? 0.03 : 0.13
      body.position.addScaledVector(this.hitDirection, knock * reach)
      if (!reducedMotion) {
        body.scale.x *= 1 + 0.12 * knock
        body.scale.y *= 1 - 0.1 * knock
        roll += knock * 0.18 * (this.hitDirection.x >= 0 ? -1 : 1)
      }
    }

    body.position.add(this.pose.offset)
    body.position.y += this.pose.lift
    body.scale.multiplyScalar(this.pose.scale)

    const deathP = dying ? clamp01((now - this.deathStart) / DEATH_MS) : 0
    let opacity = 1
    let grey = 0
    if (dying) {
      const fall = easeInOut(clamp01((deathP - 0.1) / 0.6))
      const fade = clamp01((deathP - 0.45) / 0.55)
      if (!reducedMotion) {
        roll += fall * (Math.PI / 2) * (this.hitDirection.x >= 0 ? -1 : 1)
        body.position.addScaledVector(this.hitDirection, fall * 0.3)
        body.position.y += Math.sin(Math.PI * clamp01(deathP / 0.3)) * 0.18 - fall * 0.4
      }
      const pop = deathP < 0.12 ? 1 + 0.14 * Math.sin((deathP / 0.12) * Math.PI) : 1
      body.scale.multiplyScalar(pop * (1 - 0.3 * fade))
      opacity = 1 - fade
      grey = clamp01(deathP / 0.4)
    }

    this.portrait.material.rotation = this.pose.spin + this.pose.tilt + roll
    const shade = 1 - grey * 0.5
    this.portrait.material.color.setRGB(shade, shade * (1 - hit * 0.45), shade * (1 - hit * 0.5))
    this.portrait.material.opacity = opacity

    // Only the cast wind-up glows (softly, in the ability color); hits and knockouts just tint the portrait.
    const glowMaterial = this.glowSprite.material
    this.glowSprite.visible = glowAmount > 0.01
    glowMaterial.color.copy(this.accent)
    glowMaterial.opacity = glowAmount * opacity
    glowMaterial.rotation = this.portrait.material.rotation

    const ringMaterial = this.ring.material as THREE.MeshBasicMaterial
    ringMaterial.opacity = 0.85 * (dying ? 1 - clamp01(deathP / 0.5) : 1)
    this.ring.visible = !dying || deathP < 0.5
    this.root.visible = !dying || deathP < 1

    this.updateShield(now, dying)
    this.stunRing.visible = stunned
    if (stunned) {
      this.stunRing.rotation.y = now * 0.008
      this.stunRing.position.y = this.height + 0.2 + this.pose.lift + Math.sin(now * 0.01) * 0.03
      this.stunRing.children.forEach((star, index) => {
        if (star === this.stunSwirl) return
        star.position.y = Math.sin(now * 0.012 + index * 2.1) * 0.05
        star.rotation.y = now * 0.02
      })
      this.stunRing.position.x = body.position.x
      this.stunRing.position.z = body.position.z
    }

    const effectiveMax = Math.max(unit.maxHp, unit.hp + unit.shield, 1)
    this.hpFill.style.width = `${(unit.hp / effectiveMax) * 100}%`
    this.shieldFill.style.left = `${(unit.hp / effectiveMax) * 100}%`
    this.shieldFill.style.width = `${(unit.shield / effectiveMax) * 100}%`
    this.manaFill.style.width = `${unit.maxMana > 0 ? Math.min(1, unit.mana / unit.maxMana) * 100 : 0}%`
    this.label.style.display = dying ? 'none' : ''
  }

  private updateShield(now: number, dying: boolean): void {
    const changeP = progress(now, this.shieldChangeStart, SHIELD_POP_MS)
    const bubbleMaterial = this.shieldBubble.material as THREE.MeshBasicMaterial
    const latticeMaterial = this.shieldLattice.material as THREE.MeshBasicMaterial
    const shimmer = 0.18 + 0.06 * Math.sin(now * 0.01)
    this.shieldBubble.position.set(this.pose.offset.x, 0.62 + this.pose.lift, this.pose.offset.z)
    this.shieldLattice.rotation.set(now * 0.0006, now * 0.001, 0)
    if (this.shieldBroke && changeP !== null) {
      this.shieldBubble.visible = !dying
      this.shieldBubble.scale.setScalar(1 + 0.45 * easeInOut(changeP))
      bubbleMaterial.opacity = (0.4 + shimmer) * (1 - changeP)
      latticeMaterial.opacity = 0.6 * (1 - changeP)
      return
    }
    const shielded = !dying && this.unit.shield > 0
    this.shieldBubble.visible = shielded
    if (!shielded) return
    const appear = changeP === null ? 1 : changeP
    this.shieldBubble.scale.setScalar(
      0.6 + 0.4 * easeInOut(appear) + (changeP === null ? 0 : 0.08 * Math.sin(Math.PI * appear)),
    )
    bubbleMaterial.opacity = shimmer + (changeP === null ? 0 : 0.25 * (1 - appear))
    latticeMaterial.opacity = 0.16 + 0.05 * Math.sin(now * 0.004 + this.phase)
  }

  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        ;(object.material as THREE.Material).dispose()
      }
    })
    this.portrait.material.dispose()
    this.glowSprite.material.dispose()
    this.label.remove()
  }
}

let sharedGlowTexture: THREE.CanvasTexture | null = null

// Soft radial glow shared by every unit's cast wind-up sprite; disposed with the portrait textures.
function glowTexture(): THREE.CanvasTexture {
  if (sharedGlowTexture) return sharedGlowTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    )
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.55)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
  }
  sharedGlowTexture = new THREE.CanvasTexture(canvas)
  return sharedGlowTexture
}

const textureCache = new Map<string, THREE.CanvasTexture>()

export function portraitTexture(url: string, ringColor: string): THREE.CanvasTexture {
  const key = `${url}|${ringColor}`
  const cached = textureCache.get(key)
  if (cached) return cached

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const drawRing = () => {
    if (!context) return
    context.lineWidth = 12
    context.strokeStyle = ringColor
    context.beginPath()
    context.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2)
    context.stroke()
  }
  if (context) {
    context.fillStyle = '#1e293b'
    context.beginPath()
    context.arc(size / 2, size / 2, size / 2 - 12, 0, Math.PI * 2)
    context.fill()
    drawRing()
  }
  const image = new Image()
  image.onload = () => {
    if (!context) return
    context.save()
    context.beginPath()
    context.arc(size / 2, size / 2, size / 2 - 12, 0, Math.PI * 2)
    context.clip()
    context.drawImage(image, 0, 0, size, size)
    context.restore()
    drawRing()
    texture.needsUpdate = true
  }
  image.src = url
  textureCache.set(key, texture)
  return texture
}

export function disposePortraitTextures(): void {
  textureCache.forEach((texture) => texture.dispose())
  textureCache.clear()
  sharedGlowTexture?.dispose()
  sharedGlowTexture = null
}
