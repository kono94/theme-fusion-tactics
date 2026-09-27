import * as THREE from 'three'
import { TEAM_COLORS } from '../utils/colorUtils'
import { gridToWorld, type CombatUnit3d } from './types'

const MOVE_MS = 300
const LUNGE_MS = 260
const HIT_MS = 220
const CAST_MS = 650
export const DEATH_MS = 900

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
  private readonly stunRing: THREE.Group
  private readonly ring: THREE.Mesh
  private readonly portrait: THREE.Sprite
  private readonly phase = Math.random() * Math.PI * 2
  private moveFrom = new THREE.Vector3()
  private moveTo = new THREE.Vector3()
  private moveStart = -1
  private lungeStart = -1
  private lungeReach = 0
  private readonly lungeDirection = new THREE.Vector3()
  private hitStart = -1
  private castStart = -1
  private deathStart = -1

  constructor(
    public unit: CombatUnit3d,
    texture: THREE.Texture,
    now: number,
  ) {
    this.color = new THREE.Color(unit.isMine ? TEAM_COLORS.FRIENDLY : TEAM_COLORS.OPPONENT)
    this.accent = new THREE.Color(unit.ability.color)
    this.root.add(this.body)

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.34, 0.42, 40),
      new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.85 }),
    )
    this.ring.rotation.x = -Math.PI / 2
    this.ring.position.y = 0.075
    this.root.add(this.ring)

    this.portrait = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }))
    this.portrait.scale.setScalar(0.95 + 0.07 * (unit.starLevel - 1))
    this.portrait.position.y = 0.66
    this.body.add(this.portrait)

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

  onHit(now: number): void {
    this.hitStart = now
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

    this.body.position.set(0, 0, 0)
    this.body.rotation.set(0, 0, 0)
    this.body.scale.set(1, 1, 1)
    if (!reducedMotion) {
      const bob = Math.sin(now * 0.006 + this.phase)
      this.body.position.y = 0.03 * (bob + 1)
      this.body.scale.set(1 + 0.02 * bob, 1 - 0.02 * bob, 1)
    }
    if (moving) {
      this.body.position.y += Math.sin(Math.PI * moveP) * (reducedMotion ? 0.08 : 0.32)
    }

    const lungeP = progress(now, this.lungeStart, LUNGE_MS)
    if (lungeP !== null) {
      this.body.position.addScaledVector(this.lungeDirection, Math.sin(Math.PI * lungeP) * this.lungeReach)
      this.body.scale.multiplyScalar(1 + 0.08 * Math.sin(Math.PI * lungeP))
    }

    const castP = progress(now, this.castStart, CAST_MS)
    if (castP !== null && !reducedMotion) {
      this.body.position.y += Math.sin(Math.PI * castP) * 0.3
      this.body.scale.multiplyScalar(1 + 0.18 * Math.sin(Math.PI * castP))
    }

    this.body.position.add(this.pose.offset)
    this.body.position.y += this.pose.lift
    this.body.scale.multiplyScalar(this.pose.scale)
    this.portrait.material.rotation = this.pose.spin + this.pose.tilt

    const hitP = progress(now, this.hitStart, HIT_MS)
    const flash = hitP === null ? 0 : 1 - hitP
    if (hitP !== null && !reducedMotion) {
      this.body.position.x += Math.sin(now * 0.12) * 0.05 * flash
    }
    this.portrait.material.color.setRGB(1, 1 - flash * 0.5, 1 - flash * 0.5)

    const dying = this.deathStart >= 0
    const deathP = dying ? clamp01((now - this.deathStart) / DEATH_MS) : 0
    if (dying) {
      this.portrait.material.rotation += easeInOut(deathP) * (Math.PI / 2)
      this.body.position.y -= easeInOut(deathP) * 0.35
    }
    this.portrait.material.opacity = dying ? 1 - deathP : 1
    this.ring.visible = !dying
    this.root.visible = !dying || deathP < 1

    const unit = this.unit
    this.shieldBubble.visible = !dying && unit.shield > 0
    const bubbleMaterial = this.shieldBubble.material as THREE.MeshBasicMaterial
    bubbleMaterial.opacity = 0.18 + 0.06 * Math.sin(now * 0.01)
    this.stunRing.visible = !dying && unit.stunned
    this.stunRing.rotation.y = now * 0.008

    const effectiveMax = Math.max(unit.maxHp, unit.hp + unit.shield, 1)
    this.hpFill.style.width = `${(unit.hp / effectiveMax) * 100}%`
    this.shieldFill.style.left = `${(unit.hp / effectiveMax) * 100}%`
    this.shieldFill.style.width = `${(unit.shield / effectiveMax) * 100}%`
    this.manaFill.style.width = `${unit.maxMana > 0 ? Math.min(1, unit.mana / unit.maxMana) * 100 : 0}%`
    this.label.style.display = dying ? 'none' : ''
  }

  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        ;(object.material as THREE.Material).dispose()
      }
    })
    this.portrait.material.dispose()
    this.label.remove()
  }
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
}
