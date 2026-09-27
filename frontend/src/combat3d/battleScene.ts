import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { getAnimationRenderPolicy } from '../animations/renderPolicy'
import { getArena, type ArenaHandle } from './arenas'
import { playAttack, playHeal, playShield, playUltimate } from './choreography/registry'
import { abilityTick } from './choreography/attacks/generic'
import {
  at,
  burst,
  ground,
  shake,
  shockwave,
  type FloatKind,
  type FxContext,
} from './choreography/primitives'
import { CameraRig, EffectSystem, disposeObject } from './effects'
import type { CombatEvent3d, CombatUnit3d } from './types'
import { UnitView, disposePortraitTextures, portraitTexture } from './unitView'
import { TEAM_COLORS } from '../utils/colorUtils'

const MAX_EFFECTS = 90
const CROWDED_UNITS = 12
const DEFAULT_CAMERA = new THREE.Vector3(0, 7.4, 9.6)
const DEFAULT_TARGET = new THREE.Vector3(0, 0.2, 0.6)

export interface BattleSceneOptions {
  arenaId: string
  reducedMotion: boolean
  onContextLost: () => void
}

export class BattleScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 140)
  private readonly rig: CameraRig
  private readonly controls: OrbitControls
  private cameraMoved = false
  private readonly effects: EffectSystem
  private readonly views = new Map<string, UnitView>()
  private readonly arenaRoot = new THREE.Group()
  private readonly arena: ArenaHandle
  private readonly resizeObserver: ResizeObserver
  private readonly startedAt = performance.now()
  private readonly tmp = new THREE.Vector3()
  private frameHandle = 0
  private disposed = false
  private now = 0

  constructor(
    private readonly host: HTMLElement,
    private readonly overlay: HTMLElement,
    private readonly options: BattleSceneOptions,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost)
    host.appendChild(this.renderer.domElement)

    this.camera.position.copy(DEFAULT_CAMERA)
    this.rig = new CameraRig(this.camera, options.reducedMotion)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.copy(DEFAULT_TARGET)
    this.controls.enableDamping = !options.reducedMotion
    this.controls.enablePan = false
    this.controls.minDistance = 5
    this.controls.maxDistance = 22
    this.controls.minPolarAngle = Math.PI * 0.08
    this.controls.maxPolarAngle = Math.PI * 0.46
    this.controls.addEventListener('start', this.handleCameraStart)
    this.renderer.domElement.addEventListener('dblclick', this.resetCamera)
    this.renderer.domElement.title = 'Drag to rotate, scroll to zoom, double-click to reset'
    this.effects = new EffectSystem(this.scene, MAX_EFFECTS)

    this.scene.add(this.arenaRoot)
    this.arena = getArena(options.arenaId).build(this.scene, this.arenaRoot)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(host)
    this.resize()
    this.frameHandle = requestAnimationFrame(this.loop)
  }

  sync(units: readonly CombatUnit3d[]): void {
    const seen = new Set<string>()
    for (const unit of units) {
      seen.add(unit.id)
      const existing = this.views.get(unit.id)
      if (existing && !existing.isDying) {
        existing.sync(unit, this.now)
        continue
      }
      if (existing) continue
      const ringColor = unit.isMine ? TEAM_COLORS.FRIENDLY : TEAM_COLORS.OPPONENT
      const view = new UnitView(unit, portraitTexture(unit.portraitUrl, ringColor), this.now)
      this.views.set(unit.id, view)
      this.scene.add(view.root)
      this.overlay.appendChild(view.label)
    }
    for (const view of this.views.values()) {
      if (!seen.has(view.id)) view.die(this.now)
    }
  }

  play(events: readonly CombatEvent3d[]): void {
    const crowded = this.aliveCount() >= CROWDED_UNITS || events.length > 6
    const ctx = this.fxContext(crowded)
    for (const event of events) {
      this.handleEvent(ctx, event)
    }
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.frameHandle)
    this.resizeObserver.disconnect()
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost)
    this.renderer.domElement.removeEventListener('dblclick', this.resetCamera)
    this.controls.removeEventListener('start', this.handleCameraStart)
    this.controls.dispose()
    this.effects.clear()
    this.views.forEach((view) => view.dispose())
    this.views.clear()
    disposeObject(this.scene)
    disposePortraitTextures()
    this.renderer.dispose()
    this.renderer.domElement.remove()
    this.overlay.replaceChildren()
  }

  private handleCameraStart = () => {
    this.cameraMoved = true
  }

  private resetCamera = () => {
    this.cameraMoved = false
    this.controls.target.copy(DEFAULT_TARGET)
    this.fitDefaultCamera()
  }

  private fitDefaultCamera(): void {
    // Keep the whole 9x6 arena in frame on narrow viewports by pulling the camera back.
    const distanceScale = Math.max(1, 1.5 / Math.max(this.camera.aspect, 0.1))
    this.camera.position
      .copy(DEFAULT_TARGET)
      .addScaledVector(DEFAULT_CAMERA.clone().sub(DEFAULT_TARGET), distanceScale)
    this.controls.update()
  }

  private handleContextLost = (event: Event) => {
    event.preventDefault()
    this.options.onContextLost()
  }

  private aliveCount(): number {
    let alive = 0
    this.views.forEach((view) => {
      if (!view.isDying) alive++
    })
    return alive
  }

  private fxContext(crowded: boolean): FxContext {
    const policy = getAnimationRenderPolicy(
      { particleScale: 1 },
      { crowded, reducedMotion: this.options.reducedMotion },
    )
    const living = () => [...this.views.values()].filter((view) => !view.isDying)
    return {
      now: this.now,
      effects: this.effects,
      camera: this.rig,
      particleScale: policy.particleScale,
      reducedMotion: this.options.reducedMotion,
      floatText: (view, text, kind, delayMs) => this.floatText(view, text, kind, delayMs),
      // Screen flashes strobe in big fights, so the 3D view deliberately ignores them.
      flash: () => undefined,
      enemiesOf: (view) => living().filter((other) => other.unit.ownerId !== view.unit.ownerId),
      alliesOf: (view) =>
        living().filter((other) => other !== view && other.unit.ownerId === view.unit.ownerId),
    }
  }

  private nearestEnemy(source: UnitView): UnitView | null {
    let nearest: UnitView | null = null
    let best = Number.POSITIVE_INFINITY
    for (const view of this.views.values()) {
      if (view.isDying || view.unit.ownerId === source.unit.ownerId) continue
      const distance = view.root.position.distanceToSquared(source.root.position)
      if (distance < best) {
        best = distance
        nearest = view
      }
    }
    return nearest
  }

  private handleEvent(ctx: FxContext, event: CombatEvent3d): void {
    const target = this.views.get(event.targetId)
    const source = this.views.get(event.sourceId) ?? target
    if (!source) return

    switch (event.type) {
      case 'DAMAGE': {
        if (!target) return
        if (event.value < 0) {
          playHeal(ctx, source, target)
          this.floatText(target, `+${Math.abs(event.value)}`, 'heal', 150)
          return
        }
        if (event.value === 0) return
        if (event.skillName) {
          const tick = abilityTick(ctx, source, target)
          target.onHit(ctx.now + tick, source.root.position)
          this.floatText(target, `${event.value}`, 'skill', tick)
          return
        }
        const impact = playAttack(ctx, source, target)
        target.onHit(ctx.now + impact, source.root.position)
        this.floatText(target, `${event.value}`, 'damage', impact)
        return
      }
      case 'SKILL': {
        const isHeal = source.unit.abilityType === 'HEAL' || event.value < 0
        const skillTarget = target ?? (isHeal ? source : (this.nearestEnemy(source) ?? source))
        source.onCast(ctx.now)
        const impact = playUltimate(ctx, source, skillTarget)
        this.floatText(
          source,
          event.skillName || source.unit.ability.signature || 'Ability!',
          'skill-name',
        )
        if (isHeal) {
          this.floatText(skillTarget, `+${Math.abs(event.value)}`, 'heal', impact)
        } else if (event.value > 0 && skillTarget !== source) {
          skillTarget.onHit(ctx.now + impact, source.root.position)
          this.floatText(skillTarget, `${event.value}`, 'skill', impact)
        }
        return
      }
      case 'HEAL': {
        const healTarget = target ?? source
        playHeal(ctx, source, healTarget)
        this.floatText(healTarget, `+${Math.abs(event.value)}`, 'heal', 150)
        return
      }
      case 'SHIELD': {
        const shieldTarget = target ?? source
        playShield(ctx, source, shieldTarget)
        this.floatText(shieldTarget, `+${event.value}`, 'shield', 150)
        return
      }
      case 'DEATH': {
        const victim = target ?? source
        this.playKnockout(ctx, victim)
        victim.die(ctx.now)
        return
      }
    }
  }

  // KO beat: white pop, spark burst, a team-colored soul rising and a ground ring.
  private playKnockout(ctx: FxContext, victim: UnitView): void {
    const team = victim.color.getStyle()
    burst(ctx, at(victim), {
      color: '#ffffff',
      count: 20,
      speed: 2.2,
      gravity: 2,
      priority: 'standard',
    })
    burst(ctx, at(victim, 0.4), {
      color: team,
      count: 14,
      delay: 120,
      duration: 900,
      speed: 0.9,
      spread: 'up',
      gravity: -0.6,
      priority: 'standard',
    })
    shockwave(ctx, ground(victim), { color: team, delay: 60, radius: 1.1, duration: 500 })
    shake(ctx, 1.5, 0, 180)
  }

  private floatText(view: UnitView, text: string, kind: FloatKind, delayMs = 0): void {
    const element = document.createElement('div')
    element.className = `float-text ${kind}`
    element.textContent = text
    element.style.animationDelay = `${delayMs}ms`
    view.focusPoint(this.tmp, 1).setY(view.height + 0.6)
    const screen = this.toScreen(this.tmp)
    element.style.left = `${screen.x + (Math.random() - 0.5) * 24}px`
    element.style.top = `${screen.y}px`
    element.addEventListener('animationend', () => element.remove())
    this.overlay.appendChild(element)
  }

  private loop = (timestamp: number): void => {
    if (this.disposed) return
    this.frameHandle = requestAnimationFrame(this.loop)
    this.now = timestamp - this.startedAt

    this.views.forEach((view) => view.resetPose())
    this.effects.update(this.now)
    for (const [id, view] of this.views) {
      view.update(this.now, this.options.reducedMotion)
      if (view.isGone(this.now)) {
        this.scene.remove(view.root)
        view.dispose()
        this.views.delete(id)
      }
    }
    this.arena.update(this.now)
    this.rig.crowded = this.aliveCount() >= CROWDED_UNITS
    this.controls.update()
    this.rig.base.copy(this.camera.position)
    this.rig.target.copy(this.controls.target)
    this.rig.apply(this.now)
    this.renderer.render(this.scene, this.camera)
    this.updateLabels()
    this.rig.restore()
  }

  private toScreen(position: THREE.Vector3): { x: number; y: number } {
    const projected = this.tmp.copy(position).project(this.camera)
    return {
      x: ((projected.x + 1) / 2) * this.host.clientWidth,
      y: ((1 - projected.y) / 2) * this.host.clientHeight,
    }
  }

  private updateLabels(): void {
    for (const view of this.views.values()) {
      view.focusPoint(this.tmp, 1).setY(view.height + 0.35 + view.pose.lift)
      const screen = this.toScreen(this.tmp)
      view.label.style.transform = `translate(${screen.x}px, ${screen.y}px) translate(-50%, -100%)`
    }
  }

  private resize(): void {
    const width = this.host.clientWidth
    const height = this.host.clientHeight
    if (width === 0 || height === 0) return
    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    if (!this.cameraMoved) this.fitDefaultCamera()
  }
}

export function isWebGlAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}
