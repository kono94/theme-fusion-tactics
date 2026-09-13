<script setup lang="ts">
import { computed, ref, watch, onUnmounted, onMounted } from 'vue'
import CombatEffectsCanvas from './game/CombatEffectsCanvas.vue'
import { resolveAbilityConfig, resolveAttackConfig } from '../utils/combatAnimationConfig'
import type { EmergencyDropPayload, GameState, GameUnit, GamePhase, RenderedUnit, RenderedOrb, PlayerState, DisplayedUnit, CombatEvent, SelectedAugment } from '../types'
import type { NormalizedCombatVisualEvent } from '../types/combatEffects'
import { getUnitIconPath } from '../utils/iconUtils'
import { getRarityColor, TEAM_COLORS } from '../utils/colorUtils'
import { setUnitDragPreview } from '../utils/dragPreview'
import { isBenchCoordinate, projectBoardCoordinate, type BoardProjectionPhase } from '../utils/boardProjection'
import { normalizeTraitId } from '../data/traitData'

const props = defineProps<{
    state: GameState | null,
    actingPlayerId?: string,
    viewedPlayerId?: string,
    isReadOnly?: boolean,
    isDraggingProp?: boolean,
    highlightedTraitId?: string | null,
    emergencyDrop?: EmergencyDropPayload | null,
    emergencyDropActive?: boolean
}>()

const emit = defineEmits(['move', 'drag-start', 'drag-end', 'collect-orb', 'update:cell-size', 'update:is-over-grid', 'show-tooltip', 'hide-tooltip'])

// Grid Constants
const GRID_ROWS = 6
const GRID_COLS = 9
const PLAYER_ROWS = 3 // Height of one player's board (half of arena)
const GRID_GUTTER = 6 // Space between cells and board border to prevent clipping

const reportedInvalidCoordinateKeys = new Set<string>()

function reportInvalidCoordinate(unit: GameUnit, phase: BoardProjectionPhase) {
    if (!import.meta.env.DEV) return

    const key = `${phase}:${unit.id}:${unit.x}:${unit.y}`
    if (reportedInvalidCoordinateKeys.has(key)) return

    reportedInvalidCoordinateKeys.add(key)
    console.warn('[GameCanvas] Ignoring invalid authoritative unit coordinates', {
        unitId: unit.id,
        phase,
        x: unit.x,
        y: unit.y
    })
}

const currentViewedPlayerId = computed(() => props.viewedPlayerId || props.actingPlayerId)
const isHomeView = computed(() => !!props.actingPlayerId && currentViewedPlayerId.value === props.actingPlayerId)

function isHighlightedTraitContributor(unit: DisplayedUnit): boolean {
    if (!props.highlightedTraitId || !unit.isMine || unit.isDying) return false
    return unit.traits.some((trait) => normalizeTraitId(trait) === props.highlightedTraitId)
}

function isDimmedByTraitHighlight(unit: DisplayedUnit): boolean {
    return !!props.highlightedTraitId && unit.isMine && !unit.isDying && !isHighlightedTraitContributor(unit)
}

const renderedUnits = computed((): RenderedUnit[] => {
    const state = props.state
    const viewedId = currentViewedPlayerId.value
    if (!state || !state.players || !viewedId) return []
    const allUnits: RenderedUnit[] = []
    
    const isCombat = state.phase === 'COMBAT'
    const projectionPhase: BoardProjectionPhase = isCombat ? 'COMBAT' : 'PLANNING'
    const viewedPlayer = state.players[viewedId]
    const shouldFlip = isCombat && viewedPlayer?.combatSide === 'TOP'
    const opponentId = isCombat ? state.matchups?.[viewedId] : null
    const visiblePlayerIds = new Set<string>([viewedId])
    if (opponentId) visiblePlayerIds.add(opponentId)
    
    Object.values(state.players).forEach((player: PlayerState) => {
        if (!visiblePlayerIds.has(player.playerId)) {
            return
        }

        if (!isCombat && player.playerId !== viewedId) {
            return
        }

        const board = player.boardUnits || player.board
        if (board) {
            board.forEach((u: GameUnit) => {
                if (!isCombat && isBenchCoordinate(u.x, u.y)) return

                const projection = projectBoardCoordinate(u.x, u.y, projectionPhase, shouldFlip)
                if (!projection) {
                    reportInvalidCoordinate(u, projectionPhase)
                    return
                }
                if (u.currentHealth <= 0) return

                allUnits.push({
                    ...u,
                    visualX: projection.x,
                    visualY: projection.y,
                    ownerId: player.playerId,
                    isMine: player.playerId === viewedId,
                    image: getUnitIconPath(u.definitionId, props.state?.gameMode)
                })
            })
        }
    })
    return allUnits
})

const renderedOrbs = computed((): RenderedOrb[] => {
    const state = props.state
    if (!state || !state.players || !props.actingPlayerId || !isHomeView.value) return []
    const myPlayer = state.players[props.actingPlayerId]
    if (!myPlayer || !myPlayer.lootOrbs) return []

    return myPlayer.lootOrbs.map((orb): RenderedOrb => {
        // Place orbs in the top half (visual rows 0-3)
        return {
            ...orb,
            visualX: orb.x,
            visualY: orb.y
        }
    })
})

const emergencyOrbIndexes = computed(() => {
    const indexes = new Map<string, number>()
    const drop = props.emergencyDrop
    if (!drop || drop.playerId !== props.actingPlayerId) return indexes

    drop.orbIds.forEach((orbId, index) => indexes.set(orbId, index))
    return indexes
})

const isEmergencyOrb = (orbId: string) => emergencyOrbIndexes.value.has(orbId)

const emergencyOrbStyle = (orbId: string) => ({
    '--emergency-drop-delay': `${(emergencyOrbIndexes.value.get(orbId) ?? 0) * 140}ms`,
})

const containerRef = ref<HTMLElement | null>(null)
const CELL_SIZE = ref(60)

const updateCellSize = () => {
    if (!containerRef.value) return
    
    const container = containerRef.value
    const padding = 60 // Increased padding for more breathing room
    const availableWidth = container.clientWidth - padding
    const availableHeight = container.clientHeight - padding
    
    // Calculate max cell size for width and height
    const maxCellWidth = availableWidth / GRID_COLS
    const maxCellHeight = availableHeight / GRID_ROWS
    
    // Use the smaller of the two, capped at a reasonable max/min
    // REFINED: Clamping to 85px max to prevent "oversized" look
    CELL_SIZE.value = Math.max(40, Math.min(85, Math.min(maxCellWidth, maxCellHeight)))
    emit('update:cell-size', CELL_SIZE.value)
}

let resizeObserver: ResizeObserver | null = null
let foregroundRecoveryFrames: number[] = []

function cancelForegroundRecovery() {
    foregroundRecoveryFrames.forEach((frame) => window.cancelAnimationFrame(frame))
    foregroundRecoveryFrames = []
}

function scheduleForegroundRecovery() {
    cancelForegroundRecovery()

    const firstFrame = window.requestAnimationFrame(() => {
        foregroundRecoveryFrames = foregroundRecoveryFrames.filter((frame) => frame !== firstFrame)
        const secondFrame = window.requestAnimationFrame(() => {
            foregroundRecoveryFrames = foregroundRecoveryFrames.filter((frame) => frame !== secondFrame)
            updateCellSize()
            reconcileCombatRenderState()
        })
        foregroundRecoveryFrames.push(secondFrame)
    })
    foregroundRecoveryFrames.push(firstFrame)
}

const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') scheduleForegroundRecovery()
}

const onPageShow = () => scheduleForegroundRecovery()

onMounted(() => {
    updateCellSize()
    resizeObserver = new ResizeObserver(() => {
        updateCellSize()
    })
    if (containerRef.value) {
        resizeObserver.observe(containerRef.value)
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pageshow', onPageShow)
})

onUnmounted(() => {
    cleanupBoardDragPreview()
    cancelForegroundRecovery()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pageshow', onPageShow)
    if (resizeObserver) {
        resizeObserver.disconnect()
    }
})

// Drag state
const isDragging = ref(false)
const draggingUnitId = ref<string|null>(null)
const dragOverCellIndex = ref(-1)
const hoveredUnitId = ref<string|null>(null)
let boardDragPreviewCleanup: (() => void) | null = null

function cleanupBoardDragPreview() {
    boardDragPreviewCleanup?.()
    boardDragPreviewCleanup = null
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, value))

const getHealthPercent = (unit: RenderedUnit | DisplayedUnit) => {
    if (unit.maxHealth <= 0) return 0
    return clampPercent((unit.currentHealth / unit.maxHealth) * 100)
}

const getShieldPercent = (unit: RenderedUnit | DisplayedUnit) => {
    if (unit.maxHealth <= 0) return 0
    return clampPercent(((unit.shield ?? 0) / unit.maxHealth) * 100)
}

const getShieldStyle = (unit: RenderedUnit | DisplayedUnit) => {
    const healthPercent = getHealthPercent(unit)
    const shieldPercent = getShieldPercent(unit)
    const overflowsHealthBar = healthPercent + shieldPercent > 100

    if (overflowsHealthBar) {
        return {
            width: `${shieldPercent}%`,
            right: '0',
            left: 'auto'
        }
    }

    return {
        width: `${Math.min(shieldPercent, 100 - healthPercent)}%`,
        left: `${healthPercent}%`,
        right: 'auto'
    }
}


const getUnitStyle = (unit: RenderedUnit) => {
    // Disable pointer events on units when dragging, EXCEPT the unit being dragged.
    // This allows drops to fall through to the grid cell for swapping.
    const shouldDisablePointer = (isDragging.value || props.isDraggingProp) 
                                 && unit.id !== draggingUnitId.value;

    const styles: Record<string, string | number> = {
        left: (unit.visualX * CELL_SIZE.value + 5) + 'px',
        top: (unit.visualY * CELL_SIZE.value + 5) + 'px',
        width: (CELL_SIZE.value - 10) + 'px',
        height: (CELL_SIZE.value - 10) + 'px',
        borderColor: getRarityColor(unit.cost), 
        borderWidth: '2px',
        borderStyle: 'solid',
        boxShadow: unit.isMine ? `0 0 10px ${TEAM_COLORS.FRIENDLY}99` : 'none',
        zIndex: hoveredUnitId.value === unit.id ? 100 : 10,
        pointerEvents: shouldDisablePointer ? 'none' : 'auto',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '--rarity-color': getRarityColor(unit.cost)
    }

    // Apply status effect visuals
    if (unit.stunSecondsRemaining > 0) {
        styles.filter = 'grayscale(1) brightness(0.8)';
    } else {
        // Clean look: team-only glow
        if (unit.isMine) {
            styles.boxShadow = `0 0 10px ${TEAM_COLORS.FRIENDLY}99`;
        }
    }

    return styles;
}

const viewedPlayerName = computed(() => {
     const state = props.state
     if (!state || !state.players || !currentViewedPlayerId.value) return 'Me'
     const p = state.players[currentViewedPlayerId.value]
     return p ? p.name : 'Me'
})

const opponentPlayer = computed((): PlayerState | null => {
     const state = props.state
     if (!state || !state.matchups || !currentViewedPlayerId.value) return null
     const oppId = state.matchups[currentViewedPlayerId.value]
     if (!oppId) return null
     return state.players[oppId] || null
})

const opponentName = computed(() => {
     const p = opponentPlayer.value
     if (!p) return null
     return p.isGhost ? `${p.name} (Ghost)` : p.name
})

const viewedAugments = computed((): SelectedAugment[] => {
    const state = props.state
    const viewedId = currentViewedPlayerId.value
    if (!state || !state.players || !viewedId) return []
    return state.players[viewedId]?.selectedAugments || []
})

const opponentAugments = computed((): SelectedAugment[] => {
    return opponentPlayer.value?.selectedAugments || []
})

function formatAugmentTier(tier: string): string {
    return tier.charAt(0) + tier.slice(1).toLowerCase()
}

function augmentImagePath(augment: SelectedAugment): string {
    return augment.image || '/assets/augments/placeholder.svg'
}

const onDragStart = (evt: DragEvent, unit: RenderedUnit) => {
    if (props.isReadOnly || unit.ownerId !== props.actingPlayerId || props.state?.phase === 'COMBAT') {
        evt.preventDefault()
        return
    }
    isDragging.value = true
    draggingUnitId.value = unit.id
    // Clear hover state on drag start
    hoveredUnitId.value = null
    emit('drag-start', { unit, x: evt.clientX, y: evt.clientY })
    if (evt.dataTransfer) {
        evt.dataTransfer.setData('unitId', unit.id)
        evt.dataTransfer.effectAllowed = 'move'
        cleanupBoardDragPreview()
        const img = (evt.currentTarget as HTMLElement)?.querySelector<HTMLImageElement>('.unit-img')
        boardDragPreviewCleanup = setUnitDragPreview(evt, img ?? unit.image)
    }
}

const onDragEnd = () => {
    cleanupBoardDragPreview()
    isDragging.value = false
    draggingUnitId.value = null
    dragOverCellIndex.value = -1
    emit('drag-end')
}

const onDrop = (evt: DragEvent, x: number, y: number) => {
    evt.preventDefault()
    isDragging.value = false
    dragOverCellIndex.value = -1
    
    if (props.isReadOnly || props.state?.phase === 'COMBAT') {
        onDragEnd() // Ensure drag state is cleared immediately (fixes lag)
        return 
    }
    if (evt.dataTransfer) {
        const unitId = evt.dataTransfer.getData('unitId')
        if (unitId) {
            // Translate Visual Drop Y to Backend Y (Planning Phase)
            // Visual (PLAYER_ROWS -> GRID_ROWS-1) -> Backend (0 -> PLAYER_ROWS-1)
            const backendY = y - PLAYER_ROWS
            if (backendY >= 0) {
                 emit('move', { unitId, x, y: backendY })
            }
        }
    }
}

const onDragOver = (evt: DragEvent, cellIndex: number) => {
    evt.preventDefault() 
    
    if (props.isReadOnly || props.state?.phase === 'COMBAT') {
        dragOverCellIndex.value = -1
        if (evt.dataTransfer) {
            evt.dataTransfer.dropEffect = 'none'
        }
        return
    }

    dragOverCellIndex.value = cellIndex
    emit('update:is-over-grid', true)
    if (evt.dataTransfer) {
        evt.dataTransfer.dropEffect = 'move'
    }
}

const onDragLeave = () => {
    dragOverCellIndex.value = -1
    emit('update:is-over-grid', false)
}

interface AutoPickupEffect {
    id: number
    visualX: number
    visualY: number
    label: string
}

const autoPickupEffects = ref<AutoPickupEffect[]>([])
const lastVisibleOrbs = ref<RenderedOrb[]>([])
let nextAutoPickupEffectId = 0

function triggerAutoPickupEffects(orbs: RenderedOrb[]) {
    if (!orbs.length) return

    const grouped = new Map<string, AutoPickupEffect>()
    orbs.forEach((orb) => {
        const label = formatPickupLabel(orb)
        const key = `${orb.visualX}:${orb.visualY}:${label}`
        const existing = grouped.get(key)
        if (existing) {
            existing.label = combinePickupLabels(existing.label, label)
            return
        }
        grouped.set(key, {
            id: nextAutoPickupEffectId++,
            visualX: orb.visualX,
            visualY: orb.visualY,
            label
        })
    })

    const effects = Array.from(grouped.values())
    autoPickupEffects.value = [...autoPickupEffects.value, ...effects]

    const timer = window.setTimeout(() => {
        const expiredIds = new Set(effects.map((effect) => effect.id))
        autoPickupEffects.value = autoPickupEffects.value.filter((effect) => !expiredIds.has(effect.id))
    }, 900)
    deathTimers.value.push(timer)
}

function formatPickupLabel(orb: RenderedOrb): string {
    const type = orb.type as string
    if (type === 'GOLD') return `+${orb.amount}g`
    if (type === 'XP' || type === 'EXP') return `+${orb.amount} XP`
    if (type === 'UNIT') return '+Unit'
    return '+Reward'
}

function combinePickupLabels(currentLabel: string, nextLabel: string): string {
    const currentMatch = currentLabel.match(/^\+(\d+)(g| XP)$/)
    const nextMatch = nextLabel.match(/^\+(\d+)(g| XP)$/)
    if (currentMatch && nextMatch && currentMatch[2] === nextMatch[2]) {
        return `+${Number(currentMatch[1]) + Number(nextMatch[1])}${currentMatch[2]}`
    }
    if (currentLabel === '+Unit' && nextLabel === '+Unit') {
        return '+2 Units'
    }
    const unitsMatch = currentLabel.match(/^\+(\d+) Units$/)
    if (unitsMatch && nextLabel === '+Unit') {
        return `+${Number(unitsMatch[1]) + 1} Units`
    }
    return currentLabel
}

// Hover handlers for Tooltip
const onUnitMouseEnter = (evt: MouseEvent, unit: RenderedUnit) => {
    if (!isDragging.value && !props.isDraggingProp) {
        hoveredUnitId.value = unit.id
        emit('show-tooltip', {
            rect: (evt.currentTarget as HTMLElement).getBoundingClientRect(),
            unit: unit,
            placement: unit.visualY < 4 ? 'bottom' : 'top'
        })
    }
}
const onUnitMouseLeave = () => {
    hoveredUnitId.value = null
    emit('hide-tooltip')
}

// ========== ANIMATION SYSTEM ==========

const combatVisualEvents = ref<NormalizedCombatVisualEvent[]>([])
let nextVisualEventId = 0

const hitFlashUnits = ref<Set<string>>(new Set())
const attackingUnits = ref<Set<string>>(new Set())
const castingUnits = ref<Set<string>>(new Set())

// Track previous health to detect attacks
const prevHealthMap = ref<Record<string, number>>({})

// ========== DEATH ANIMATION SYSTEM ==========
// Track units that are dying (animating death)
const dyingUnits = ref<Set<string>>(new Set())
// Store the last known position/data for dead units during animation
const dyingUnitData = ref<Map<string, DisplayedUnit>>(new Map())
const DEATH_ANIMATION_DURATION = 600 // ms
const deathAnimationTimers = ref<number[]>([])

// Cleanup timers on unmount
const deathTimers = ref<number[]>([])
onUnmounted(() => {
    deathTimers.value.forEach(timer => clearTimeout(timer))
    deathAnimationTimers.value.forEach(timer => clearTimeout(timer))
    transientAnimationTimers.value.forEach(timer => clearTimeout(timer))
})

// ========== STAR-UP CELEBRATION SYSTEM ==========
// Track units that just leveled up for celebration animation
const starUpUnits = ref<Set<string>>(new Set())
const prevStarLevelMap = ref<Record<string, number>>({})
const STAR_UP_ANIMATION_DURATION = 1200 // ms

// Floating Text for ability names (keep existing)
interface FloatingText {
    id: number
    x: number
    y: number
    text: string
}
const castingAnimations = ref<FloatingText[]>([])
const floatingHeals = ref<FloatingText[]>([])
const transientAnimationTimers = ref<number[]>([])

function scheduleTransientAnimationCleanup(callback: () => void, duration: number) {
    const timer = window.setTimeout(() => {
        transientAnimationTimers.value = transientAnimationTimers.value.filter((item) => item !== timer)
        callback()
    }, duration)
    transientAnimationTimers.value.push(timer)
}

function clearCombatVisualState() {
    prevHealthMap.value = {}
    prevUnitsMap.value.clear()
    dyingUnits.value.clear()
    dyingUnitData.value.clear()
    deathAnimationTimers.value.forEach(timer => clearTimeout(timer))
    deathAnimationTimers.value = []
    combatVisualEvents.value = []
    hitFlashUnits.value = new Set()
    attackingUnits.value = new Set()
    castingUnits.value = new Set()
    castingAnimations.value = []
    floatingHeals.value = []
    transientAnimationTimers.value.forEach(timer => clearTimeout(timer))
    transientAnimationTimers.value = []
    lastProcessedEventTime.value = 0
}

// Find nearest enemy for a unit (to animate attacks toward)
function findNearestEnemy(unit: RenderedUnit, allUnits: RenderedUnit[]): RenderedUnit | null {
    const enemies = allUnits.filter(u => u.ownerId !== unit.ownerId && u.currentHealth > 0)
    if (enemies.length === 0) return null
    
    let nearest = enemies[0]
    let minDist = Math.max(Math.abs(nearest.visualX - unit.visualX), Math.abs(nearest.visualY - unit.visualY))
    
    for (const enemy of enemies) {
        const dist = Math.max(Math.abs(enemy.visualX - unit.visualX), Math.abs(enemy.visualY - unit.visualY))
        if (dist < minDist) {
            minDist = dist
            nearest = enemy
        }
    }
    return nearest
}

// Watch for health changes to spawn attack animations
// Store previous units for death detection
const prevUnitsMap = ref<Map<string, RenderedUnit>>(new Map())
const prevPhase = ref<GamePhase | undefined | null>(null)
const lastProcessedEventTime = ref(0)

function reconcileCombatRenderState() {
    clearCombatVisualState()
    prevPhase.value = props.state?.phase

    if (props.state?.phase !== 'COMBAT') return

    renderedUnits.value.forEach((unit) => {
        prevUnitsMap.value.set(unit.id, { ...unit })
    })
    lastProcessedEventTime.value = (props.state.recentEvents ?? []).reduce(
        (latest, event) => Math.max(latest, event.timestamp),
        0
    )
}

const unitsById = computed(() => {
    const map = new Map<string, RenderedUnit>()
    if (renderedUnits.value) {
        renderedUnits.value.forEach((u: RenderedUnit) => map.set(u.id, u))
    }
    return map
})

function lookupUnit(unitId: string): RenderedUnit | DisplayedUnit | undefined {
    return unitsById.value.get(unitId) || dyingUnitData.value.get(unitId) || prevUnitsMap.value.get(unitId)
}

function pointForUnit(unit: RenderedUnit | DisplayedUnit) {
    return {
        x: unit.visualX * CELL_SIZE.value + CELL_SIZE.value / 2,
        y: unit.visualY * CELL_SIZE.value + CELL_SIZE.value / 2
    }
}

function addTimedFeedback(targetSet: typeof hitFlashUnits, unitId: string, duration: number) {
    const next = new Set(targetSet.value)
    next.add(unitId)
    targetSet.value = next

    const timer = window.setTimeout(() => {
        const updated = new Set(targetSet.value)
        updated.delete(unitId)
        targetSet.value = updated
    }, duration)
    deathTimers.value.push(timer)
}

function normalizeCombatEvent(
    event: CombatEvent,
    source: RenderedUnit | DisplayedUnit,
    target: RenderedUnit | DisplayedUnit,
    batchSize: number
): NormalizedCombatVisualEvent {
    const isSkill = event.type === 'SKILL'
    const attack = resolveAttackConfig(source)
    const ability = resolveAbilityConfig(source)
    const aliveUnits = renderedUnits.value.filter(unit => unit.currentHealth > 0).length

    return {
        id: nextVisualEventId++,
        timestamp: event.timestamp,
        type: event.type,
        sourceId: event.sourceId,
        targetId: event.targetId,
        value: event.value,
        skillName: event.skillName,
        source: source as RenderedUnit,
        target: target as RenderedUnit,
        start: pointForUnit(source),
        end: pointForUnit(target),
        definitionId: source.definitionId,
        attack,
        ability,
        pattern: source.ability?.pattern || 'SINGLE',
        starLevel: source.starLevel || 1,
        intensity: isSkill ? 'ultimate' : (event.type === 'DAMAGE' ? 'normal' : 'low'),
        batchSize,
        crowded: aliveUnits >= 12 || batchSize > 6
    }
}

function isHealingCombatEvent(event: CombatEvent, source: RenderedUnit | DisplayedUnit): boolean {
    return event.type === 'HEAL' || event.value < 0 || source.ability?.type === 'HEAL'
}

watch(() => props.state?.recentEvents, (newEvents) => {
    if (!newEvents || newEvents.length === 0) return
    
    // Deduplication based on timestamp
    let maxTime = lastProcessedEventTime.value
    
    newEvents.forEach((event: CombatEvent) => {
        if (event.timestamp <= lastProcessedEventTime.value) return
        if (event.timestamp > maxTime) maxTime = event.timestamp
        
        const targetFromEvent = lookupUnit(event.targetId)
        const source = lookupUnit(event.sourceId) || targetFromEvent
        if (!source) return

        if (event.type === 'DAMAGE') {
            const target = targetFromEvent
            // Value can be positive (damage) or negative (heal)
            if (event.value > 0 && target) {
                combatVisualEvents.value.push(normalizeCombatEvent(event, source, target, newEvents.length))
                addTimedFeedback(attackingUnits, source.id, 360)
                addTimedFeedback(hitFlashUnits, target.id, 420)
            } else if (event.value < 0) {
                const target = targetFromEvent || source
                combatVisualEvents.value.push(normalizeCombatEvent(event, source, target, newEvents.length))
                const healAmount = Math.abs(event.value)
                const healId = nextVisualEventId++
                floatingHeals.value.push({
                    id: healId,
                    x: target.visualX * CELL_SIZE.value + CELL_SIZE.value / 2,
                    y: target.visualY * CELL_SIZE.value + 10,
                    text: `+${healAmount}`
                })
                scheduleTransientAnimationCleanup(() => {
                    floatingHeals.value = floatingHeals.value.filter(h => h.id !== healId)
                }, 1000)
            }
        } else if (event.type === 'SKILL') {
            let target = targetFromEvent || source
            const isHealingSkill = isHealingCombatEvent(event, source)
            
            if (!targetFromEvent && !isHealingSkill) {
                const nearest = findNearestEnemy(source, renderedUnits.value)
                if (nearest) {
                    target = nearest
                }
            }

            combatVisualEvents.value.push(normalizeCombatEvent(event, source, target, newEvents.length))
            addTimedFeedback(castingUnits, source.id, 900)
            if (!isHealingSkill && target.id !== source.id) addTimedFeedback(hitFlashUnits, target.id, 520)
            if (isHealingSkill) addTimedFeedback(hitFlashUnits, target.id, 420)
            
            // Floating text for skill
            const animationId = nextVisualEventId++
            castingAnimations.value.push({
                id: animationId,
                x: source.visualX * CELL_SIZE.value + CELL_SIZE.value / 2,
                y: source.visualY * CELL_SIZE.value,
                text: event.skillName || resolveAbilityConfig(source).signature || source.activeAbility || (source.ability ? source.ability.name : 'Ability!')
            })
            scheduleTransientAnimationCleanup(() => {
                castingAnimations.value = castingAnimations.value.filter((animation) => animation.id !== animationId)
            }, 1000)
            if (isHealingSkill) {
                const healAmount = Math.abs(event.value)
                const healId = nextVisualEventId++
                floatingHeals.value.push({
                    id: healId,
                    x: target.visualX * CELL_SIZE.value + CELL_SIZE.value / 2,
                    y: target.visualY * CELL_SIZE.value + 10,
                    text: `+${healAmount}`
                })
                scheduleTransientAnimationCleanup(() => {
                    floatingHeals.value = floatingHeals.value.filter(h => h.id !== healId)
                }, 1000)
            }
        } else if (event.type === 'HEAL') {
            const target = targetFromEvent || source
            combatVisualEvents.value.push(normalizeCombatEvent(event, source, target, newEvents.length))
            const healAmount = Math.abs(event.value)
            const healId = nextVisualEventId++
            floatingHeals.value.push({
                id: healId,
                x: target.visualX * CELL_SIZE.value + CELL_SIZE.value / 2,
                y: target.visualY * CELL_SIZE.value + 10,
                text: `+${healAmount}`
            })
            scheduleTransientAnimationCleanup(() => {
                floatingHeals.value = floatingHeals.value.filter(h => h.id !== healId)
            }, 1000)
        } else if (event.type === 'SHIELD') {
            const target = targetFromEvent || source
            combatVisualEvents.value.push(normalizeCombatEvent(event, source, target, newEvents.length))
        } else if (event.type === 'DEATH') {
            const target = targetFromEvent || source
            combatVisualEvents.value.push(normalizeCombatEvent(event, source, target, newEvents.length))
            addTimedFeedback(hitFlashUnits, target.id, 500)
        }
    })
    
    if (combatVisualEvents.value.length > 120) {
        combatVisualEvents.value = combatVisualEvents.value.slice(-80)
    }
    lastProcessedEventTime.value = maxTime
}, { deep: true })

watch(() => renderedUnits.value, (newUnits) => {
    const currentPhase = props.state?.phase
    const isCombat = currentPhase === 'COMBAT'
    const wasInCombat = prevPhase.value === 'COMBAT'
    
    // Update phase tracking
    prevPhase.value = currentPhase
    
    if (!isCombat) {
        clearCombatVisualState()
        return
    }
    
    // Build map of current alive units
    const newUnitIds = new Set(newUnits.map((u: RenderedUnit) => u.id))
    
    // DEATH DETECTION: Only trigger if we were already in combat (not transitioning INTO combat)
    // This prevents false deaths when combat starts or ends
    if (wasInCombat) {
        prevUnitsMap.value.forEach((prevUnit, unitId) => {
            if (!newUnitIds.has(unitId) && !dyingUnits.value.has(unitId)) {
                // Unit disappeared during combat - trigger death animation
                triggerDeathAnimation(prevUnit)
                // IMPORTANT: Remove from prevUnitsMap to prevent re-triggering
                prevUnitsMap.value.delete(unitId)
            }
        })
    }
    
    // Check for health decreases (indicates unit was attacked)
    newUnits.forEach((unit: RenderedUnit) => {
        // Update health tracking
        prevHealthMap.value[unit.id] = unit.currentHealth
        
        // Store current unit data for next frame's death detection
        prevUnitsMap.value.set(unit.id, { ...unit })
    })
})

// Trigger death animation for a unit
function triggerDeathAnimation(unit: RenderedUnit) {
    if (dyingUnits.value.has(unit.id)) return // Already dying
    
    dyingUnits.value.add(unit.id)
    dyingUnitData.value.set(unit.id, { ...unit, isDying: true })
    
    // Remove after animation completes
    const timer = window.setTimeout(() => {
        dyingUnits.value.delete(unit.id)
        dyingUnitData.value.delete(unit.id)
        delete prevHealthMap.value[unit.id]
    }, DEATH_ANIMATION_DURATION)
    
    deathAnimationTimers.value.push(timer)
}

// Combined units: alive units + dying units (for animation)
const displayedUnits = computed((): DisplayedUnit[] => {
    const alive = renderedUnits.value
    const aliveUnitIds = new Set(alive.map((unit) => unit.id))
    const currentPlayerIds = new Set(Object.keys(props.state?.players ?? {}))
    const dying = Array.from(dyingUnitData.value.values())
        .filter(() => props.state?.phase === 'COMBAT')
        .filter((unit) => !aliveUnitIds.has(unit.id))
        .filter((unit) => currentPlayerIds.has(unit.ownerId))
    return [...alive, ...dying]
})

// Trigger star-up celebration for a unit
function triggerStarUpCelebration(unitId: string) {
    if (starUpUnits.value.has(unitId)) return // Already celebrating
    
    starUpUnits.value.add(unitId)
    
    // Remove after animation completes
    const timer = window.setTimeout(() => {
        starUpUnits.value.delete(unitId)
    }, STAR_UP_ANIMATION_DURATION)
    
    deathTimers.value.push(timer)
}

// Watch for star level changes (happens during planning phase when combining units)
watch(() => props.state, (newState) => {
    if (!newState || !newState.players || !currentViewedPlayerId.value) return
    
    const viewedPlayer = newState.players[currentViewedPlayerId.value]
    if (!viewedPlayer) return
    
    const viewedBoardUnits = viewedPlayer.board || []
    
    viewedBoardUnits.forEach((unit: GameUnit) => {
        if (!unit) return
        const prevStarLevel = prevStarLevelMap.value[unit.id]
        const currentStarLevel = unit.starLevel || 1
        
        // Trigger celebration if:
        // 1. Existing unit's star level increased, OR
        // 2. New unit appeared with star level >= 2 (just combined)
        if (prevStarLevel !== undefined && currentStarLevel > prevStarLevel) {
            // Existing unit leveled up
            triggerStarUpCelebration(unit.id)
        } else if (prevStarLevel === undefined && currentStarLevel >= 2) {
            // New high-star unit appeared (result of combining)
            triggerStarUpCelebration(unit.id)
        }
        
        // Update tracking
        prevStarLevelMap.value[unit.id] = currentStarLevel
    })
}, { deep: true })

watch(currentViewedPlayerId, () => {
    clearCombatVisualState()
    prevStarLevelMap.value = {}
    dragOverCellIndex.value = -1
    hoveredUnitId.value = null
    autoPickupEffects.value = []
    lastVisibleOrbs.value = []
})

watch(() => opponentPlayer.value?.playerId ?? null, () => {
    clearCombatVisualState()
})

watch([() => props.state?.phase, renderedOrbs], ([newPhase], [oldPhase]) => {
    if (oldPhase === 'PLANNING' && newPhase === 'COMBAT' && lastVisibleOrbs.value.length > 0) {
        triggerAutoPickupEffects(lastVisibleOrbs.value)
    }

    if (newPhase === 'PLANNING') {
        lastVisibleOrbs.value = renderedOrbs.value.map((orb) => ({ ...orb }))
    } else if (newPhase !== 'COMBAT') {
        lastVisibleOrbs.value = []
    }
}, { deep: true })

// Check if a unit is celebrating star-up
function isStarringUp(unitId: string): boolean {
    return starUpUnits.value.has(unitId)
}

const onOrbClick = (orbId: string) => {
    const orb = renderedOrbs.value.find((renderedOrb) => renderedOrb.id === orbId)
    if (orb) {
        triggerAutoPickupEffects([orb])
    }
    emit('collect-orb', orbId)
}
</script>

<template>
  <div class="main-canvas-container" ref="containerRef">
    <div class="board-container" :style="{ 
        width: (GRID_COLS * CELL_SIZE + (GRID_GUTTER * 2)) + 'px', 
        height: (GRID_ROWS * CELL_SIZE + (GRID_GUTTER * 2)) + 'px'
    }">
        <div class="board-clipper">
            <div class="grid" :style="{
                gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_SIZE}px)`,
                gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL_SIZE}px)`
            }" @mouseleave="dragOverCellIndex = -1">
                <!-- Render Grid Cells as Drop Zones -->
                <div v-for="i in (GRID_ROWS * GRID_COLS)" :key="'cell-'+i"
                     class="cell"
                     :class="{
                        'player-half': Math.floor((i-1)/GRID_COLS) >= PLAYER_ROWS,
                        'enemy-half': Math.floor((i-1)/GRID_COLS) < PLAYER_ROWS,
                        'highlight-drop': (isDragging || isDraggingProp) && !isReadOnly && Math.floor((i-1)/GRID_COLS) >= PLAYER_ROWS && props.state?.phase !== 'COMBAT',
                        'active-drop': dragOverCellIndex === (i-1) && !isReadOnly && Math.floor((i-1)/GRID_COLS) >= PLAYER_ROWS && props.state?.phase !== 'COMBAT'
                     }"
                     @dragover="(e) => onDragOver(e, i-1)"
                     @dragleave="onDragLeave"
                     @drop="(e) => onDrop(e, (i-1)%GRID_COLS, Math.floor((i-1)/GRID_COLS))">
                </div>

                <!-- Absolute content overlay (aligned to grid cells) -->
                <div class="grid-overlay" :style="{ inset: GRID_GUTTER + 'px' }">
                    <CombatEffectsCanvas
                        :events="combatVisualEvents"
                        :units="displayedUnits"
                        :cell-size="CELL_SIZE"
                        :grid-rows="GRID_ROWS"
                        :grid-cols="GRID_COLS"
                        :phase="props.state?.phase"
                    />

                    <!-- Render Units -->
                    <div v-for="unit in displayedUnits" :key="unit.id"
                         class="unit"
                         :style="getUnitStyle(unit)"
                         :class="{
                            'mine': unit.isMine,
                            'dying': unit.isDying,
                            'star-up': isStarringUp(unit.id),
                            'hit-flash': hitFlashUnits.has(unit.id),
                            'attacking-lunge': attackingUnits.has(unit.id),
                            'casting-glow': castingUnits.has(unit.id),
                            'ultimate-caster': castingUnits.has(unit.id) && (unit.starLevel || 1) >= 3,
                            'trait-contributor': isHighlightedTraitContributor(unit),
                            'trait-dimmed': isDimmedByTraitHighlight(unit)
                         }"
                         :draggable="unit.ownerId === actingPlayerId && !isReadOnly && props.state?.phase !== 'COMBAT' && !unit.isDying"
                         @dragstart="(e) => onDragStart(e, unit)"
                         @dragend="onDragEnd"
                         @mouseenter="(e) => onUnitMouseEnter(e, unit)"
                         @mouseleave="onUnitMouseLeave">

                        <div class="hp-bar-container">
                            <div class="hp-bar-fill" :style="{
                                width: getHealthPercent(unit) + '%',
                                backgroundColor: unit.isMine ? TEAM_COLORS.FRIENDLY : TEAM_COLORS.OPPONENT
                            }"></div>
                            <div
                                v-if="unit.shield > 0"
                                class="shield-bar-fill"
                                :style="getShieldStyle(unit)">
                            </div>
                        </div>
                        <div v-if="unit.maxMana > 0" class="mana-pill">
                            <div class="mana-fill-btm" :style="{ height: (unit.mana / unit.maxMana * 100) + '%' }"></div>
                        </div>
                        <div class="buff-container">
                            <div v-if="unit.atkBuff > 1.01" class="buff-icon atk-buff">⚔️</div>
                            <div v-if="unit.spdBuff > 1.01" class="buff-icon spd-buff">⚡</div>
                            <div v-if="unit.atkBuff < 0.99" class="buff-icon atk-debuff">🔻</div>
                            <div v-if="unit.spdBuff < 0.99" class="buff-icon spd-debuff">❄️</div>
                        </div>
                        <img :src="unit.image" class="unit-img" :alt="unit.name" draggable="false" />
                        <div class="cost-top-glow"></div>
                        <div v-if="unit.starLevel === 2" class="star-2-halo"></div>
                        <div v-if="unit.starLevel === 3" class="star-3-flow"></div>
                        <div v-if="unit.stunSecondsRemaining > 0" class="stun-badge">STUNNED ({{ unit.stunSecondsRemaining.toFixed(1) }}s)</div>
                        <div v-if="isStarringUp(unit.id)" class="star-up-burst">
                            <span v-for="i in 8" :key="i" class="star-particle" :style="{ '--particle-index': i }"></span>
                        </div>
                    </div>

                    <!-- Render Loot Orbs -->
                    <div v-for="orb in renderedOrbs" :key="orb.id"
                         class="loot-orb"
                         :class="[orb.type.toLowerCase(), {
                            'emergency-drop-orb': emergencyDropActive && isEmergencyOrb(orb.id),
                            'emergency-drop-orb-pending': !emergencyDropActive && isEmergencyOrb(orb.id)
                         }]"
                         :style="{ 
                            left: (orb.visualX * CELL_SIZE + (CELL_SIZE - (CELL_SIZE - 20))/2) + 'px', 
                            top: (orb.visualY * CELL_SIZE + (CELL_SIZE - (CELL_SIZE - 20))/2) + 'px',
                            width: (CELL_SIZE - 20) + 'px',
                            height: (CELL_SIZE - 20) + 'px',
                            ...emergencyOrbStyle(orb.id)
                         }"
                         @click="onOrbClick(orb.id)">
                        <div class="orb-inner">
                            <div class="orb-glow"></div>
                            <div class="orb-content" :style="{ fontSize: (CELL_SIZE * 0.45) + 'px' }">
                                <span v-if="orb.type === 'GOLD'">🪙</span>
                                <span v-else>🎁</span>
                            </div>
                        </div>
                    </div>

                    <div v-for="effect in autoPickupEffects" :key="effect.id"
                         class="auto-pickup-effect"
                         :style="{
                            left: (effect.visualX * CELL_SIZE + CELL_SIZE / 2) + 'px',
                            top: (effect.visualY * CELL_SIZE + CELL_SIZE / 2) + 'px'
                         }">
                        <div class="auto-pickup-ring"></div>
                        <div class="auto-pickup-spark spark-a"></div>
                        <div class="auto-pickup-spark spark-b"></div>
                        <div class="auto-pickup-spark spark-c"></div>
                        <div class="auto-pickup-label">{{ effect.label }}</div>
                    </div>

                </div>
            </div>
        </div>

        <!-- Player Names Overlay -->
        <div class="overlays">
             <div class="name-tag enemy" v-if="opponentName">{{ opponentName }}</div>
             <div v-if="opponentAugments.length" class="augment-rail enemy" aria-label="Opponent selected augments">
                 <button
                     v-for="augment in opponentAugments"
                     :key="augment.id"
                     class="augment-chip"
                     :class="`augment-tier-${augment.tier.toLowerCase()}`"
                     type="button"
                     :aria-label="`${augment.name}: ${augment.description}`">
                     <img :src="augmentImagePath(augment)" :alt="augment.name" draggable="false" />
                     <span class="augment-tooltip" role="tooltip">
                         <span class="augment-tooltip-tier">{{ formatAugmentTier(augment.tier) }}</span>
                         <span class="augment-tooltip-name">{{ augment.name }}</span>
                         <span class="augment-tooltip-description">{{ augment.description }}</span>
                     </span>
                 </button>
             </div>
             <div v-if="viewedAugments.length" class="augment-rail me" aria-label="Selected augments">
                 <button
                     v-for="augment in viewedAugments"
                     :key="augment.id"
                     class="augment-chip"
                     :class="`augment-tier-${augment.tier.toLowerCase()}`"
                     type="button"
                     :aria-label="`${augment.name}: ${augment.description}`">
                     <img :src="augmentImagePath(augment)" :alt="augment.name" draggable="false" />
                     <span class="augment-tooltip" role="tooltip">
                         <span class="augment-tooltip-tier">{{ formatAugmentTier(augment.tier) }}</span>
                         <span class="augment-tooltip-name">{{ augment.name }}</span>
                         <span class="augment-tooltip-description">{{ augment.description }}</span>
                     </span>
                 </button>
             </div>
             <div class="name-tag me" v-if="viewedPlayerName">{{ viewedPlayerName }}</div>
             
             <!-- Ability Floating Text -->
             <div v-for="anim in castingAnimations" :key="anim.id"
                  class="floating-text"
                  :style="{ left: anim.x + 'px', top: anim.y + 'px' }">
                  {{ anim.text }}
             </div>

             <!-- Heal Floating Text -->
             <div v-for="heal in floatingHeals" :key="heal.id"
                  class="floating-text heal"
                  :style="{ left: heal.x + 'px', top: heal.y + 'px' }">
                  {{ heal.text }}
             </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* (Keep existing styles) */
.main-canvas-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    overflow: visible; /* CRITICAL: Allow tooltips to float over panels */
    padding: 30px;
}

.board-container {
    position: relative;
    padding: 0;
    background: rgba(15, 23, 42, 0.4);
    border-radius: 12px;
    border: 3px solid rgba(51, 65, 85, 0.8);
    box-shadow: 
        0 20px 50px rgba(0, 0, 0, 0.6),
        inset 0 0 40px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    overflow: visible; /* CRITICAL: Allow names/tooltips outside grid */
}

.board-clipper {
    position: absolute;
    inset: 0;
    border-radius: 9px; /* Slightly inner for the outer border */
    overflow: hidden; /* CRITICAL: Clips cell backgrounds/units at board edge */
    z-index: 1;
}

.board-container::before {
    content: '';
    position: absolute;
    inset: 4px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    pointer-events: none;
}

.overlays {
    position: absolute;
    inset: 0;
    z-index: 60;
    pointer-events: none;
}

.name-tag {
    position: absolute;
    left: -132px;
    width: 118px;
    padding: 7px 16px;
    overflow: hidden;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    color: #f8fafc;
    background: rgba(15, 23, 42, 0.86);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.36);
    font-size: 13px;
    font-weight: 850;
    line-height: 1.1;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.name-tag.enemy {
    top: 18px;
    border-left: 4px solid #ef4444;
}

.name-tag.me {
    bottom: 18px;
    border-left: 4px solid #10b981;
}

.augment-rail {
    position: absolute;
    left: -132px;
    z-index: 70;
    display: flex;
    width: 118px;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 6px;
    pointer-events: auto;
}

.augment-rail.enemy {
    top: 58px;
}

.augment-rail.me {
    bottom: 58px;
}

.augment-chip {
    position: relative;
    display: flex;
    width: 38px;
    height: 38px;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--augment-border);
    border-radius: 8px;
    background:
        radial-gradient(circle at 50% 18%, var(--augment-glow), transparent 68%),
        linear-gradient(180deg, var(--augment-bg), rgba(15, 23, 42, 0.96));
    box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.1) inset,
        0 10px 24px rgba(0, 0, 0, 0.34),
        0 0 18px var(--augment-glow);
    cursor: help;
    padding: 0;
    transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}

.augment-chip:hover,
.augment-chip:focus-visible {
    z-index: 90;
    transform: scale(1.12);
    box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.16) inset,
        0 12px 30px rgba(0, 0, 0, 0.45),
        0 0 28px var(--augment-glow-strong);
    outline: none;
}

.augment-chip img {
    width: 27px;
    height: 27px;
    object-fit: contain;
    filter: drop-shadow(0 5px 7px rgba(0, 0, 0, 0.45));
    pointer-events: none;
}

.augment-tooltip {
    position: absolute;
    left: calc(100% + 11px);
    top: 50%;
    display: flex;
    width: 240px;
    flex-direction: column;
    gap: 5px;
    padding: 12px 13px;
    border: 1px solid var(--augment-border);
    border-radius: 8px;
    color: #e2e8f0;
    background: rgba(15, 23, 42, 0.96);
    box-shadow:
        0 16px 42px rgba(0, 0, 0, 0.5),
        0 0 24px var(--augment-glow);
    opacity: 0;
    text-align: left;
    transform: translateY(-50%) translateX(-5px);
    transition: opacity 0.14s ease, transform 0.14s ease;
    pointer-events: none;
}

.augment-tooltip-tier {
    color: var(--augment-soft);
    font-size: 10px;
    font-weight: 900;
    line-height: 1;
    text-transform: uppercase;
}

.augment-tooltip-name {
    color: #fff;
    font-size: 15px;
    font-weight: 900;
    line-height: 1.15;
}

.augment-tooltip-description {
    color: #cbd5e1;
    font-size: 12px;
    font-weight: 650;
    line-height: 1.3;
}

.augment-chip:hover .augment-tooltip,
.augment-chip:focus-visible .augment-tooltip {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
}

.augment-tier-silver {
    --augment-border: #cbd5e1;
    --augment-bg: rgba(71, 85, 105, 0.76);
    --augment-glow: rgba(203, 213, 225, 0.2);
    --augment-glow-strong: rgba(226, 232, 240, 0.42);
    --augment-soft: #e2e8f0;
}

.augment-tier-gold {
    --augment-border: #fbbf24;
    --augment-bg: rgba(146, 64, 14, 0.76);
    --augment-glow: rgba(251, 191, 36, 0.28);
    --augment-glow-strong: rgba(253, 224, 71, 0.56);
    --augment-soft: #fde68a;
}

.augment-tier-diamond {
    --augment-border: #f0abfc;
    --augment-bg: rgba(88, 28, 135, 0.84);
    --augment-glow: rgba(217, 70, 239, 0.46);
    --augment-glow-strong: rgba(34, 211, 238, 0.66);
    --augment-soft: #f5d0fe;
    box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.2) inset,
        0 10px 28px rgba(0, 0, 0, 0.38),
        0 0 20px rgba(217, 70, 239, 0.5),
        0 0 34px rgba(34, 211, 238, 0.34);
    animation: diamond-chip-pulse 2.4s ease-in-out infinite;
}

@keyframes diamond-chip-pulse {
    0%, 100% {
        filter: brightness(1);
    }
    50% {
        filter: brightness(1.28);
    }
}

.grid {
    position: relative;
    display: grid;
    width: 100%;
    height: 100%;
    z-index: 1;
    background: transparent;
    transition: width 0.2s, height 0.2s;
    padding: 6px; /* GRID_GUTTER constant value */
    box-sizing: border-box;
}

.grid-overlay {
    position: absolute;
    pointer-events: none;
    z-index: 10;
}

.cell {
    border: 1px solid rgba(255, 255, 255, 0.05); 
    box-sizing: border-box;
    transition: all 0.2s;
    background: radial-gradient(circle at center, rgba(30, 41, 59, 0.1) 0%, transparent 70%);
}

.cell.player-half {
    background-color: rgba(59, 130, 246, 0.03);
}

.cell.enemy-half {
    background-color: rgba(239, 68, 68, 0.03);
}

/* Hover effect for cells when NOT dragging */
.cell:not(.highlight-drop):hover {
    background-color: rgba(255,255,255,0.1);
}

/* Highlight available drop zones */
.cell.highlight-drop {
    border-color: #60a5fa;
    background-color: rgba(59, 130, 246, 0.15);
}

/* Active drop target (cursor is over this cell) */
.cell.active-drop {
    background-color: rgba(59, 130, 246, 0.4);
    box-shadow: inset 0 0 10px #3b82f6;
}

.unit {
    position: absolute;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 2px solid white;
    transition: left 0.2s, top 0.2s, border-color 0.2s, box-shadow 0.2s; 
    box-shadow: 0 4px 6px rgba(0,0,0,0.5);
    z-index: 10;
    pointer-events: auto; 
    background-color: #1e293b; 
}
.unit.mine {
    cursor: grab;
}
.unit:hover {
    z-index: 2000; /* Unified top layer */
}
.unit.mine:active {
    cursor: grabbing;
}

.unit.trait-contributor {
    z-index: 30;
    border-color: #fde047;
    filter: brightness(1.2) saturate(1.15);
    box-shadow:
        0 0 0 3px rgba(253, 224, 71, 0.34),
        0 0 24px rgba(250, 204, 21, 0.9),
        0 4px 6px rgba(0, 0, 0, 0.5);
}

.unit.trait-dimmed {
    filter: grayscale(0.75) brightness(0.55);
    opacity: 0.45;
}

.unit.hit-flash {
    animation: unitHitFlash 0.42s ease-out;
}

.unit.attacking-lunge {
    animation: unitAttackLunge 0.36s ease-out;
}

.unit.casting-glow {
    animation: unitCastingGlow 0.9s ease-out;
}

.unit.ultimate-caster {
    animation: unitUltimateCaster 0.9s ease-out;
}

.unit.dying {
    pointer-events: none;
    animation: unitDeath 0.6s ease-out forwards;
    z-index: 5;
}

@keyframes unitHitFlash {
    0% {
        filter: brightness(1);
        transform: translate(0, 0) scale(1);
    }
    18% {
        filter: brightness(2.8) saturate(0.7);
        transform: translate(-2px, 1px) scale(1.08);
        box-shadow: 0 0 22px rgba(255, 255, 255, 0.95);
    }
    44% {
        transform: translate(2px, -1px) scale(0.98);
    }
    100% {
        filter: brightness(1);
        transform: translate(0, 0) scale(1);
    }
}

@keyframes unitAttackLunge {
    0% {
        transform: translate(0, 0) scale(1);
    }
    45% {
        transform: translate(5px, -5px) scale(1.08);
        filter: brightness(1.35);
    }
    100% {
        transform: translate(0, 0) scale(1);
        filter: brightness(1);
    }
}

@keyframes unitCastingGlow {
    0% {
        filter: brightness(1);
        box-shadow: 0 0 10px var(--rarity-color);
    }
    24% {
        filter: brightness(1.8) saturate(1.4);
        box-shadow: 0 0 26px var(--rarity-color), 0 0 42px rgba(255, 255, 255, 0.36);
    }
    100% {
        filter: brightness(1);
        box-shadow: 0 0 10px var(--rarity-color);
    }
}

@keyframes unitUltimateCaster {
    0% {
        transform: scale(1);
    }
    25% {
        transform: scale(1.18);
        filter: brightness(2);
    }
    100% {
        transform: scale(1);
    }
}

/* Cost Top Glow */
.cost-top-glow {
    position: absolute;
    top: 5px;
    left: 50%;
    transform: translateX(-50%);
    width: 30px;
    height: 10px;
    background: radial-gradient(ellipse at center, var(--rarity-color), transparent 70%);
    opacity: 0.6;
    pointer-events: none;
    z-index: 5;
    filter: blur(2px);
}

.unit-img {
    width: 100%;
    height: 100%;
    object-fit: cover; 
    border-radius: 50%;
    pointer-events: none;
    z-index: 2; /* Relative to parent .unit, ensures it stays above halos but under bars */
}

.hp-bar-container {
    position: absolute;
    top: -6px; /* Moved lower, closer to unit */
    left: 2px;
    right: 2px;
    height: 6px;
    background-color: rgba(0, 0, 0, 0.6);
    border-radius: 3px;
    /* Removed heavy border for a cleaner "glass" look */
    box-shadow: 0 2px 4px rgba(0,0,0,0.5);
    overflow: hidden;
    z-index: 20;
}

.hp-bar-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    transition: width 0.3s cubic-bezier(0.1, 0.7, 0.1, 1);
}

.shield-bar-fill {
    position: absolute;
    top: 0;
    height: 100%;
    border-left: 1px solid rgba(255, 255, 255, 0.85);
    background: linear-gradient(180deg, #f8fafc 0%, #dbe4ee 100%);
    box-shadow:
        0 0 4px rgba(248, 250, 252, 0.9),
        inset 0 1px 0 rgba(255, 255, 255, 0.95);
    transition:
        width 0.3s cubic-bezier(0.1, 0.7, 0.1, 1),
        left 0.3s cubic-bezier(0.1, 0.7, 0.1, 1),
        right 0.3s cubic-bezier(0.1, 0.7, 0.1, 1);
}

.mana-pill {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 20px; /* Reduced size from 24px */
    height: 20px;
    background-color: rgba(15, 23, 42, 0.9);
    border-radius: 50%;
    /* Use a themed, transparent border to make it less dominant */
    border: 1.5px solid rgba(125, 211, 252, 0.4); 
    box-shadow: 0 2px 6px rgba(0,0,0,0.6);
    z-index: 30;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
}

.mana-fill-btm {
    width: 100%;
    background-color: #2563eb; /* Slightly deeper, more vibrant blue */
    transition: height 0.3s ease-out;
}

.buff-container {
    position: absolute;
    left: -15px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 50;
    pointer-events: none;
}

.buff-icon {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 1px solid white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.5);
    background-color: #0f172a;
    color: white;
}

.buff-icon.atk-buff { background-color: #22c55e; }
.buff-icon.spd-buff { background-color: #3b82f6; }
.buff-icon.atk-debuff { background-color: #ef4444; }
.buff-icon.spd-debuff { background-color: #6366f1; }

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.floating-text {
    position: absolute;
    color: #fbbf24; /* Amber */
    font-weight: bold;
    font-size: 14px;
    text-shadow: 0 2px 2px black;
    pointer-events: none;
    animation: floatUp 1s ease-out forwards;
    z-index: 20;
    width: 100px; /* arbitrary, prevents wrapping too early */
    text-align: center;
    transform: translate(-25px, -20px); /* Centerish above unit */
}

/* 2-Star Energy Halo Effect */
.star-2-halo {
    position: absolute;
    top: -6px;
    left: -6px;
    width: calc(100% + 12px);
    height: calc(100% + 12px);
    transform: none;
    border-radius: 50%;
    border: 1px dashed var(--rarity-color);
    opacity: 0.6;
    animation: rotate-halo 10s linear infinite;
    z-index: 2;
    pointer-events: none;
}

/* 3-Star Conqueror Flow Effect */
.star-3-flow {
    position: absolute;
    top: -4px;
    left: -4px;
    width: calc(100% + 8px);
    height: calc(100% + 8px);
    transform: none;
    border-radius: 50%;
    pointer-events: none;
    z-index: 5;
}

.star-3-flow::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    width: calc(100% + 4px);
    height: calc(100% + 4px);
    border-radius: 50%;
    background: conic-gradient(from 0deg, var(--rarity-color), #fff, var(--rarity-color), #000, var(--rarity-color));
    animation: rotate-halo 1.5s linear infinite;
    z-index: -1;
    -webkit-mask: radial-gradient(circle at center, transparent 65%, black 66%);
    mask: radial-gradient(circle at center, transparent 65%, black 66%);
}

.star-3-flow::after {
    content: '';
    position: absolute;
    top: -6px;
    left: -6px;
    width: calc(100% + 12px);
    height: calc(100% + 12px);
    border-radius: 50%;
    box-shadow: 0 0 20px var(--rarity-color);
    opacity: 0.6;
    z-index: -2;
}

@keyframes rotate-halo {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

@keyframes floatUp {
    0% { transform: translate(-25px, -20px); opacity: 0; scale: 0.5; }
    20% { transform: translate(-25px, -40px); opacity: 1; scale: 1.2; }
    100% { transform: translate(-25px, -60px); opacity: 0; scale: 1.0; }
}

@keyframes unitDeath {
    0% {
        opacity: 1;
        transform: scale(1);
        filter: brightness(1);
    }
    30% {
        opacity: 1;
        transform: scale(1.1);
        filter: brightness(1.5) saturate(0.5);
        box-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
    }
    100% {
        opacity: 0;
        transform: scale(0.3);
        filter: brightness(0.5) saturate(0);
    }
}

/* ========== STAR-UP CELEBRATION ========== */
.unit.star-up {
    animation: starUpGlow 1.2s ease-out;
}

@keyframes starUpGlow {
    0% {
        filter: brightness(1);
        box-shadow: 0 0 0 rgba(251, 191, 36, 0);
    }
    15% {
        filter: brightness(2);
        box-shadow: 0 0 30px rgba(251, 191, 36, 1);
    }
    50% {
        filter: brightness(1.5);
        box-shadow: 0 0 20px rgba(251, 191, 36, 0.8);
    }
    100% {
        filter: brightness(1);
        box-shadow: 0 0 0 rgba(251, 191, 36, 0);
    }
}

.star-up-burst {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 20;
}

.star-particle {
    position: absolute;
    width: 6px;
    height: 6px;
    background: linear-gradient(135deg, #fef3c7, #fbbf24);
    border-radius: 50%;
    animation: particleBurst 1s ease-out forwards;
    /* Spread particles in a circle using CSS variable */
    --angle: calc(var(--particle-index) * 45deg);
    transform-origin: center;
}

@keyframes particleBurst {
    0% {
        opacity: 1;
        transform: rotate(var(--angle)) translateY(0) scale(1);
    }
    50% {
        opacity: 1;
        transform: rotate(var(--angle)) translateY(-35px) scale(1.2);
    }
    100% {
        opacity: 0;
        transform: rotate(var(--angle)) translateY(-50px) scale(0.5);
    }
}

.stun-badge {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: #94a3b8;
    font-size: 8px;
    font-weight: bold;
    padding: 2px 4px;
    border-radius: 4px;
    border: 1px solid #475569;
    z-index: 100;
    pointer-events: none;
    letter-spacing: 0.5px;
}

.floating-text.heal {
    color: #22c55e; /* Green */
    font-size: 16px;
}

.unit.atk-buffed {
    animation: atkBuffPulse 2s infinite alternate;
}

.unit.spd-buffed {
    animation: spdBuffPulse 2s infinite alternate;
}

@keyframes atkBuffPulse {
    from { box-shadow: 0 0 10px rgba(249, 115, 22, 0.4); }
    to { box-shadow: 0 0 20px rgba(249, 115, 22, 0.8); }
}

@keyframes spdBuffPulse {
    from { box-shadow: 0 0 10px rgba(59, 130, 246, 0.4); }
    to { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
}
@keyframes float-up-particle {
    0% { transform: translate(0, 0) scale(0); opacity: 0; }
    20% { opacity: 1; scale: 1.2; }
    100% { transform: translate(var(--tx), var(--ty)) scale(0.5); opacity: 0; }
}

/* Loot Orbs */
.loot-orb {
    position: absolute;
    width: 35px;
    height: 35px;
    cursor: pointer;
    z-index: 60;
    pointer-events: auto; /* Ensure they work inside overlay */
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.loot-orb:hover {
    transform: scale(1.2);
}

.loot-orb.emergency-drop-orb {
    animation: emergencyOrbDrop 0.9s var(--emergency-drop-delay, 0ms) cubic-bezier(0.16, 1, 0.3, 1) both;
}

.loot-orb.emergency-drop-orb-pending {
    opacity: 0;
}

.loot-orb.emergency-drop-orb .orb-inner {
    animation: emergencyOrbFlash 1.15s var(--emergency-drop-delay, 0ms) ease-out both;
}

.orb-inner {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), rgba(255,255,255,0));
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
}

.loot-orb.gold .orb-inner {
    background-color: #fbbf24; /* Gold color */
    border: 2px solid #d97706;
}

.loot-orb.unit .orb-inner {
    background-color: #a855f7; /* Purple color */
    border: 2px solid #7e22ce;
}

.orb-glow {
    position: absolute;
    top: -5px;
    left: -5px;
    right: -5px;
    bottom: -5px;
    border-radius: 50%;
    background: inherit;
    filter: blur(8px);
    opacity: 0.6;
    animation: orb-pulse 2s infinite ease-in-out;
}

.orb-content {
    font-size: 18px;
    z-index: 1;
}

@keyframes orb-pulse {
    0%, 100% { transform: scale(1); opacity: 0.4; }
    50% { transform: scale(1.2); opacity: 0.8; }
}

@keyframes emergencyOrbDrop {
    0% {
        opacity: 0;
        transform: translateY(-120px) scale(0.45) rotate(-24deg);
    }
    58% {
        opacity: 1;
        transform: translateY(8px) scale(1.16) rotate(4deg);
    }
    78% {
        transform: translateY(-5px) scale(0.94) rotate(-2deg);
    }
    100% {
        opacity: 1;
        transform: translateY(0) scale(1) rotate(0deg);
    }
}

@keyframes emergencyOrbFlash {
    0%, 18% {
        box-shadow: 0 0 0 rgba(245, 158, 11, 0);
        filter: brightness(1);
    }
    48% {
        box-shadow: 0 0 14px 8px rgba(245, 158, 11, 0.65), 0 0 34px rgba(217, 70, 239, 0.72);
        filter: brightness(1.55);
    }
    100% {
        filter: brightness(1);
    }
}

/* Collection animation */
.loot-orb:active {
    transform: scale(0.8);
    opacity: 0.5;
}

.auto-pickup-effect {
    position: absolute;
    z-index: 80;
    width: 48px;
    height: 48px;
    transform: translate(-50%, -50%);
    pointer-events: none;
    animation: autoPickupLift 0.9s ease-out forwards;
}

.auto-pickup-ring {
    position: absolute;
    inset: 8px;
    border: 2px solid rgba(251, 191, 36, 0.95);
    border-radius: 50%;
    box-shadow:
        0 0 12px rgba(251, 191, 36, 0.72),
        0 0 26px rgba(34, 211, 238, 0.38);
    animation: autoPickupRing 0.9s ease-out forwards;
}

.auto-pickup-spark {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #fef3c7;
    box-shadow: 0 0 10px rgba(254, 243, 199, 0.95);
    animation: autoPickupSpark 0.72s ease-out forwards;
}

.auto-pickup-spark.spark-a {
    --spark-x: -24px;
    --spark-y: -18px;
}

.auto-pickup-spark.spark-b {
    --spark-x: 22px;
    --spark-y: -20px;
    animation-delay: 0.05s;
}

.auto-pickup-spark.spark-c {
    --spark-x: 0;
    --spark-y: 24px;
    animation-delay: 0.1s;
}

.auto-pickup-label {
    position: absolute;
    left: 50%;
    top: 50%;
    min-width: 28px;
    width: max-content;
    max-width: 72px;
    transform: translate(-50%, -50%);
    color: #fff7ed;
    font-size: 14px;
    font-weight: 900;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
    text-shadow:
        0 1px 2px rgba(0, 0, 0, 0.9),
        0 0 10px rgba(251, 191, 36, 0.95);
}

@keyframes autoPickupLift {
    0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.72);
    }
    20% {
        opacity: 1;
        transform: translate(-50%, -58%) scale(1);
    }
    100% {
        opacity: 0;
        transform: translate(-50%, -92%) scale(0.86);
    }
}

@keyframes autoPickupRing {
    0% {
        opacity: 0;
        transform: scale(0.5);
    }
    28% {
        opacity: 1;
    }
    100% {
        opacity: 0;
        transform: scale(1.75);
    }
}

@keyframes autoPickupSpark {
    0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.4);
    }
    25% {
        opacity: 1;
    }
    100% {
        opacity: 0;
        transform: translate(calc(-50% + var(--spark-x)), calc(-50% + var(--spark-y))) scale(0.85);
    }
}

@media (prefers-reduced-motion: reduce) {
    .loot-orb,
    .loot-orb.emergency-drop-orb,
    .loot-orb.emergency-drop-orb .orb-inner,
    .orb-glow,
    .auto-pickup-effect,
    .auto-pickup-ring,
    .auto-pickup-spark {
        animation: none;
        transition: none;
    }
}
</style>
