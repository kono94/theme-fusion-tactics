<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import GameCanvas from './GameCanvas.vue'
import UnitTooltip from './UnitTooltip.vue'
import PhaseAnnouncement from './PhaseAnnouncement.vue'
import TraitSidebar from './TraitSidebar.vue'
import PlayerList from './PlayerList.vue'
import EndScreen from './EndScreen.vue'
import AugmentSelectionOverlay from './AugmentSelectionOverlay.vue'
import type { AugmentOffer, EmergencyDropPayload, GameState, GameUnit, UnitDefinition, PlayerState } from '../types'
import { getUnitIconPath } from '../utils/iconUtils'
import { getRarityColor } from '../utils/colorUtils'
import { setUnitDragPreview } from '../utils/dragPreview'
import { calculateSellRefund } from '../utils/economy'
import { SHOP_ODDS } from '../data/shopOdds'

const props = defineProps<{
  state: GameState | null,
  currentPlayerId: string,
  emergencyDrop?: EmergencyDropPayload | null,
  queuedEmergencyDrop?: EmergencyDropPayload | null,
  suppressPlanningAnnouncement?: boolean
}>()

const emit = defineEmits(['action', 'view-player', 'exit-game', 'abandon-game'])

const myPlayer = computed((): PlayerState | null => {
    if (!props.state?.players || !props.currentPlayerId) return null
    return props.state.players[props.currentPlayerId] ?? null
})

const allPlayers = computed((): PlayerState[] => {
    if (!props.state?.players) return []
    return Object.values(props.state.players)
})

const viewedPlayerId = ref<string | null>(null)
const hoveredTraitId = ref<string | null>(null)

const effectiveViewedPlayerId = computed(() => {
    return viewedPlayerId.value || myPlayer.value?.playerId
})

const viewedPlayer = computed((): PlayerState | null => {
    if (!props.state?.players || !effectiveViewedPlayerId.value) return myPlayer.value
    return props.state.players[effectiveViewedPlayerId.value] || myPlayer.value
})

const isSpectating = computed(() => {
    return !!myPlayer.value?.playerId && !!viewedPlayer.value && viewedPlayer.value.playerId !== myPlayer.value.playerId
})

const isDead = computed(() => {
    return myPlayer.value && myPlayer.value.health <= 0
})

const canManageTeam = computed(() => props.state?.phase === 'PLANNING' && !isDead.value && !isSpectating.value)
const canManageShopAndBench = computed(() => {
    const phase = props.state?.phase
    return (phase === 'PLANNING' || phase === 'COMBAT') && !isDead.value && !isSpectating.value
})

const shopCards = computed((): UnitDefinition[] => {
    return myPlayer.value?.shop || []
})

const pendingAugmentChoices = computed((): AugmentOffer[] => {
    return myPlayer.value?.augmentChoices || []
})

const hasPendingAugmentChoices = computed(() => pendingAugmentChoices.value.length > 0)

const benchUnits = computed((): (GameUnit | null)[] => {
    return myPlayer.value?.bench || []
})

const myPlayerBoardUnits = computed((): GameUnit[] => {
    if (!myPlayer.value) return []
    return myPlayer.value.boardUnits || myPlayer.value.board || []
})

function lineIdentity(value: string | null | undefined): string | null {
    const trimmedValue = value?.trim()
    return trimmedValue ? trimmedValue : null
}

const ownedLineIds = computed((): Set<string> => {
    const ownedIds = new Set<string>()
    const units = [...benchUnits.value, ...myPlayerBoardUnits.value]

    units.forEach((unit) => {
        const identity = lineIdentity(unit?.lineId) ?? lineIdentity(unit?.definitionId) ?? lineIdentity(unit?.name)
        if (identity) {
            ownedIds.add(identity)
        }
    })

    return ownedIds
})

function isShopCardOwned(card: UnitDefinition): boolean {
    const identity = lineIdentity(card.lineId) ?? lineIdentity(card.id) ?? lineIdentity(card.name)
    return identity ? ownedLineIds.value.has(identity) : false
}

const viewedPlayerBoardUnits = computed((): GameUnit[] => {
    if (!viewedPlayer.value) return []
    return viewedPlayer.value.boardUnits || viewedPlayer.value.board || []
})

interface BenchSlot {
    index: number
    unit: GameUnit | null
}

const benchSlots = computed((): BenchSlot[] => {
    const bench = benchUnits.value
    return Array.from({ length: 9 }, (_, i) => ({
        index: i,
        unit: bench[i] ?? null
    }))
})

function returnHome() {
    viewedPlayerId.value = null
}

const isAbandonDialogVisible = ref(false)

function requestAbandonGame() {
    isAbandonDialogVisible.value = true
}

function cancelAbandonGame() {
    isAbandonDialogVisible.value = false
}

function confirmAbandonGame() {
    isAbandonDialogVisible.value = false
    emit('abandon-game')
}

function selectViewedPlayer(playerId: string) {
    if (!myPlayer.value?.playerId) return
    if (playerId === myPlayer.value.playerId) {
        returnHome()
        return
    }

    const target = props.state?.players?.[playerId]
    if (!target || target.health <= 0 || target.isGhost) return

    viewedPlayerId.value = target.playerId
    handleHideTooltip()
}


function buyUnit(index: number) {
    if (!myPlayer.value || !canManageShopAndBench.value) return
    emit('action', { type: 'BUY', shopIndex: index, playerId: myPlayer.value.playerId })
}

function refreshShop() {
    if (!myPlayer.value || !canManageShopAndBench.value) return
    emit('action', { type: 'REROLL', playerId: myPlayer.value.playerId })
}

function buyXp() {
    if (!myPlayer.value || !canManageShopAndBench.value) return
    emit('action', { type: 'EXP', playerId: myPlayer.value.playerId })
}

function selectAugment(augmentId: string) {
    if (!myPlayer.value) return
    emit('action', { type: 'SELECT_AUGMENT', augmentId, playerId: myPlayer.value.playerId })
}

let benchDragPreviewCleanup: (() => void) | null = null

function cleanupBenchDragPreview() {
    benchDragPreviewCleanup?.()
    benchDragPreviewCleanup = null
}

const onBenchDragStart = (evt: DragEvent, unit: GameUnit) => {
    if (!canManageShopAndBench.value) {
        evt.preventDefault()
        return
    }
    isDraggingUnit.value = true
    draggedUnit.value = unit
    // Clear hover states when drag starts
    handleHideTooltip()
    
    if (evt.dataTransfer) {
        evt.dataTransfer.setData('unitId', unit.id)
        evt.dataTransfer.effectAllowed = 'move'
        cleanupBenchDragPreview()
        const img = (evt.currentTarget as HTMLElement)?.querySelector<HTMLImageElement>('.bench-unit-img')
        benchDragPreviewCleanup = setUnitDragPreview(evt, img ?? getUnitIconPath(unit.definitionId, props.state?.gameMode))
    }
}

const onBenchDragEnd = () => {
    cleanupBenchDragPreview()
    isDraggingUnit.value = false
    draggedUnit.value = null
    isSellZoneHovered.value = false
    dragOverBenchIndex.value = -1
    isOverGrid.value = false
}

const onBenchDrop = (evt: DragEvent, index: number) => {
    evt.preventDefault()
    if (!canManageShopAndBench.value) return
    dragOverBenchIndex.value = -1
    if (evt.dataTransfer) {
        const unitId = evt.dataTransfer.getData('unitId')
        if (unitId) {
             emit('action', { type: 'MOVE', unitId, targetX: index, targetY: -1, playerId: myPlayer.value?.playerId })
        }
    }
}

const onBenchDragOver = (evt: DragEvent, index: number) => {
    evt.preventDefault()
    dragOverBenchIndex.value = index
    if (evt.dataTransfer) {
        evt.dataTransfer.dropEffect = 'move'
    }
}

const onBenchDragLeave = () => {
    dragOverBenchIndex.value = -1
}

interface MovePayload {
    unitId: string
    x: number
    y: number
}

const handleBoardMove = (movePayload: MovePayload) => {
    if (!canManageTeam.value) return
    console.log("Emitting MOVE action", movePayload)
    emit('action', { type: 'MOVE', unitId: movePayload.unitId, targetX: movePayload.x, targetY: movePayload.y, playerId: myPlayer.value?.playerId })
}

const handleCollectOrb = (orbId: string) => {
    if (!canManageTeam.value) return
    console.log("Emitting COLLECT_ORB action", orbId)
    emit('action', { type: 'COLLECT_ORB', orbId, playerId: myPlayer.value?.playerId })
}

// Unified Global Tooltip State
const activeTooltip = ref<{
    unit: GameUnit | UnitDefinition,
    rect: DOMRect,
    placement: 'top' | 'bottom',
    shift?: 'left' | 'more-left' | 'center'
} | null>(null)
const hoveredOwnedUnitId = ref<string | null>(null)

function findOwnedUnit(unitId: string): GameUnit | null {
    return [...benchUnits.value, ...myPlayerBoardUnits.value].find(unit => unit?.id === unitId) ?? null
}

const handleShowTooltip = (rect: DOMRect, unit: GameUnit | UnitDefinition, placement: 'top' | 'bottom' = 'top', shift?: 'left' | 'more-left' | 'center') => {
    if (isDraggingUnit.value) return
    hoveredOwnedUnitId.value = findOwnedUnit(unit.id)?.id ?? null
    activeTooltip.value = {
        unit,
        rect,
        placement,
        shift
    }
}

const handleHideTooltip = () => {
    activeTooltip.value = null
    hoveredOwnedUnitId.value = null
}

// ========== DRAG AND SELL STATE ==========
const isDraggingUnit = ref(false)
const draggedUnit = ref<GameUnit | null>(null)
const isSellZoneHovered = ref(false)
const isDraggingFromGrid = ref(false)
const dragOverBenchIndex = ref(-1)
const isOverGrid = ref(false)

function sellUnit(unitId: string) {
    if (!myPlayer.value || !canManageShopAndBench.value) return
    emit('action', { type: 'SELL', unitId, playerId: myPlayer.value.playerId })
}

function isTextEntryTarget(target: EventTarget | null) {
    return target instanceof HTMLElement
        && target.matches('input, textarea, select, [contenteditable="true"]')
}

function handleKeyboardShortcut(event: KeyboardEvent) {
    if (event.defaultPrevented
        || event.repeat
        || event.ctrlKey
        || event.metaKey
        || event.altKey
        || isTextEntryTarget(event.target)
        || isAbandonDialogVisible.value
        || hasPendingAugmentChoices.value
        || props.state?.phase === 'END_CELEBRATION'
        || props.state?.phase === 'END') return

    const key = event.key.toLowerCase()
    if (key === 'r' && canManageShopAndBench.value && (myPlayer.value?.gold ?? 0) >= 2) {
        event.preventDefault()
        refreshShop()
        return
    }

    if (key !== 's' || !hoveredOwnedUnitId.value || !canManageShopAndBench.value) return
    const unitId = hoveredOwnedUnitId.value
    const isBenchUnit = benchUnits.value.some(unit => unit?.id === unitId)
    if (props.state?.phase === 'COMBAT' && !isBenchUnit) return
    event.preventDefault()
    sellUnit(unitId)
    handleHideTooltip()
}

const onSellDragOver = (evt: DragEvent) => {
    evt.preventDefault()
    if (!draggedUnit.value) return
    isSellZoneHovered.value = true
    if (evt.dataTransfer) {
        evt.dataTransfer.dropEffect = 'move'
    }
}

const onSellDragLeave = () => {
    isSellZoneHovered.value = false
}

const onSellDrop = (evt: DragEvent) => {
    evt.preventDefault()
    isSellZoneHovered.value = false
    if (evt.dataTransfer) {
        const unitId = evt.dataTransfer.getData('unitId')
        if (unitId) {
            sellUnit(unitId)
        }
    }
    draggedUnit.value = null
    isDraggingUnit.value = false
}

// Grid drag handlers
const onGridDragStart = (data: { unit: GameUnit, x: number, y: number }) => {
    if (!canManageTeam.value) return
    isDraggingUnit.value = true
    isDraggingFromGrid.value = true
    draggedUnit.value = data.unit
    // Clear hover states
    handleHideTooltip()
}

const onGridDragEnd = () => {
    isDraggingUnit.value = false
    isDraggingFromGrid.value = false
    draggedUnit.value = null
    isSellZoneHovered.value = false
    isOverGrid.value = false
}

// ========== STAR-UP CELEBRATION FOR BENCH ==========
const starUpUnits = ref<Set<string>>(new Set())
const prevStarLevelMap = ref<Record<string, number>>({})
const STAR_UP_ANIMATION_DURATION = 1200

// Cleanup timers on unmount
const starUpTimers = ref<number[]>([])
onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyboardShortcut)
    cleanupBenchDragPreview()
    starUpTimers.value.forEach(timer => clearTimeout(timer))
})

onMounted(() => {
    window.addEventListener('keydown', handleKeyboardShortcut)
})

function triggerStarUpCelebration(unitId: string) {
    if (starUpUnits.value.has(unitId)) return
    starUpUnits.value.add(unitId)
    
    const timer = window.setTimeout(() => {
        starUpUnits.value.delete(unitId)
    }, STAR_UP_ANIMATION_DURATION)
    starUpTimers.value.push(timer)
}

function isStarringUp(unitId: string): boolean {
    return starUpUnits.value.has(unitId)
}

// Watch for star level changes in bench units
watch(() => benchUnits.value, (newBench) => {
    newBench.forEach((unit: GameUnit | null) => {
        if (!unit) return
        const prevStarLevel = prevStarLevelMap.value[unit.id]
        const currentStarLevel = unit.starLevel || 1
        
        if (prevStarLevel !== undefined && currentStarLevel > prevStarLevel) {
            triggerStarUpCelebration(unit.id)
        } else if (prevStarLevel === undefined && currentStarLevel >= 2) {
            triggerStarUpCelebration(unit.id)
        }
        
        prevStarLevelMap.value[unit.id] = currentStarLevel
    })
}, { deep: true })

// ========== SHOP ODDS TOOLTIP ==========
const hoveredLevelBadge = ref(false)

const currentShopOdds = computed(() => {
    if (!myPlayer.value) return [0, 0, 0, 0, 0]
    const levelIndex = Math.max(0, Math.min(myPlayer.value.level - 1, SHOP_ODDS.length - 1))
    return SHOP_ODDS[levelIndex]
})

const rarityColors = [
    '#94a3b8', // 1-cost
    '#22c55e', // 2-cost
    '#3b82f6', // 3-cost
    '#a855f7', // 4-cost
    '#eab308'  // 5-cost
]

const canReadyForCombat = computed(() => {
    return props.state?.phase === 'PLANNING'
        && props.state.planningTimerPaused
        && props.state.planningPauseReason !== 'AUGMENT_SELECTION'
        && !hasPendingAugmentChoices.value
        && !!myPlayer.value?.playerId
        && props.state.planningReadyPlayerId === myPlayer.value.playerId
})

const timerFillPercent = computed(() => {
    if (!props.state) return 0
    if (props.state.phase === 'PLANNING' && props.state.planningTimerPaused) return 100
    const duration = Math.max(1, props.state.totalPhaseDuration || (props.state.phase === 'PLANNING' ? 8000 : 20000))
    return Math.max(0, Math.min(100, props.state.timeRemainingMs / duration * 100))
})

const timerFillColor = computed(() => {
    if (!props.state) return '#3b82f6'
    if (props.state.phase === 'COMBAT') return '#ef4444'
    if (props.state.phase === 'END_CELEBRATION') return '#eab308'
    if (props.state.phase === 'PLANNING' && props.state.planningPauseReason === 'AUGMENT_SELECTION') return '#67e8f9'
    if (props.state.phase === 'PLANNING' && props.state.planningPauseReason === 'SOLO_READY') return '#22c55e'
    if (props.state.phase === 'PLANNING' && props.state.planningTimerPaused) return '#22c55e'
    return '#3b82f6'
})

function readyForCombat() {
    if (!myPlayer.value || !canReadyForCombat.value) return
    emit('action', { type: 'READY_FOR_COMBAT', playerId: myPlayer.value.playerId })
}

// ========== END SCREEN ==========
const showEndScreen = ref(false)

watch(() => props.state?.phase, (newPhase) => {
    showEndScreen.value = newPhase === 'END_CELEBRATION' || newPhase === 'END'
}, { immediate: true })

watch(() => props.state, () => {
    if (!myPlayer.value?.playerId) {
        viewedPlayerId.value = null
        return
    }

    const currentId = viewedPlayerId.value
    if (!currentId || currentId === myPlayer.value.playerId) {
        viewedPlayerId.value = null
        return
    }

    const currentViewedPlayer = props.state?.players?.[currentId]
    if (!currentViewedPlayer || currentViewedPlayer.health <= 0 || currentViewedPlayer.isGhost) {
        viewedPlayerId.value = null
    }
}, { immediate: true, deep: true })

watch(effectiveViewedPlayerId, (playerId) => {
    emit('view-player', playerId || null)
}, { immediate: true })

</script>

<template>
  <div class="game-interface">
    <PhaseAnnouncement v-if="state"
        :phase="state.phase"
        :emergency-drop="emergencyDrop"
        :suppress-planning-announcement="suppressPlanningAnnouncement" />
    <EndScreen v-if="showEndScreen"
               :players="allPlayers"
               :my-player-id="myPlayer?.playerId"
               @exit="emit('exit-game')" />
    <AugmentSelectionOverlay
        v-if="state?.phase === 'PLANNING' && hasPendingAugmentChoices"
        :choices="pendingAugmentChoices"
        @select="selectAugment" />


    <template v-if="state">
        <!-- Top Bar -->
        <div class="top-bar" :class="{ 'combat': state.phase === 'COMBAT' }">
            <div class="phase-info">
                <span class="phase-name">{{ state.phase }}</span>
                <div class="game-meta">
                    <span class="game-mode">{{ state.gameMode }}</span>
                    <div class="room-details">
                        <span class="room-id">Room: {{ state.roomId }}</span>
                        <button v-if="myPlayer && state.phase !== 'END'"
                                class="abandon-game-btn"
                                type="button"
                                aria-label="Abandon game"
                                title="Abandon game"
                                @click="requestAbandonGame">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 4.75A1.75 1.75 0 0 1 5.75 3h9.5A1.75 1.75 0 0 1 17 4.75v14.5A1.75 1.75 0 0 1 15.25 21h-9.5A1.75 1.75 0 0 1 4 19.25v-14.5Z" />
                                <path d="M12 12h8m-3-3 3 3-3 3M8 12h4" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="round-actions">
                    <span class="round-name">Round {{ state.round }}</span>
                    <button
                        v-if="canReadyForCombat"
                        class="ready-btn"
                        type="button"
                        @click="readyForCombat">
                        Ready
                    </button>
                </div>
            </div>
            <div class="timer-bar-container">
                <div class="timer-bar-fill" 
                     :style="{ 
                        width: timerFillPercent + '%',
                        backgroundColor: timerFillColor
                     }">
                </div>
            </div>
        </div>

        <!-- Main Game Area -->
        <div class="main-area" :class="{ 'dead-state': isDead }">
            <TraitSidebar
                v-if="viewedPlayer"
                :units="viewedPlayerBoardUnits"
                :game-mode="state.gameMode"
                @hover-trait="(traitId) => hoveredTraitId = traitId"
            />
            <div v-if="isSpectating && viewedPlayer" class="spectator-notice">
                <span>Viewing {{ viewedPlayer.name }}</span>
                <button class="home-btn" type="button" @click="returnHome">Home</button>
            </div>
            <GameCanvas :state="state"
                :acting-player-id="myPlayer?.playerId"
                :viewed-player-id="effectiveViewedPlayerId"
                :is-read-only="isSpectating || !canManageTeam"
                :is-dragging-prop="isDraggingUnit"
                :highlighted-trait-id="hoveredTraitId"
                :emergency-drop="emergencyDrop || queuedEmergencyDrop"
                :emergency-drop-active="!!emergencyDrop"
                @move="handleBoardMove" 
                @drag-start="onGridDragStart"
                @drag-end="onGridDragEnd"
                @collect-orb="handleCollectOrb"
                @update:is-over-grid="(val) => isOverGrid = val"
                @show-tooltip="(data) => handleShowTooltip(data.rect, data.unit, data.placement)"
                @hide-tooltip="handleHideTooltip" />
            <PlayerList v-if="state"
                :players="allPlayers"
                :my-player-id="myPlayer?.playerId"
                :selected-player-id="effectiveViewedPlayerId"
                @select-player="selectViewedPlayer" />
        </div>

        <!-- Bottom UI -->
        <div class="bottom-ui" v-if="myPlayer && !isSpectating" :class="{ 'dead-state': isDead }">
            <!-- Player Stats -->
            <div class="stats-panel">
                <div class="level-info">
                    <div class="level-badge" 
                         @mouseenter="hoveredLevelBadge = true" 
                         @mouseleave="hoveredLevelBadge = false">
                        Lvl {{ myPlayer.level }}
                        
                        <!-- Shop Odds Tooltip -->
                        <transition name="fade">
                            <div v-if="hoveredLevelBadge" class="odds-tooltip">
                                <div class="odds-header">Shop Odds</div>
                                <div class="odds-grid">
                                    <div v-for="(prob, tier) in currentShopOdds" :key="tier" class="odds-row">
                                        <span class="tier-indicator" :style="{ backgroundColor: rarityColors[tier] }"></span>
                                        <span class="tier-label">{{ tier + 1 }}-Cost:</span>
                                        <span class="prob-value">{{ prob }}%</span>
                                    </div>
                                </div>
                            </div>
                        </transition>
                    </div>
                    <div class="xp-bar" :title="myPlayer.level >= 9 ? 'Maximum level' : `XP: ${myPlayer.xp} / ${myPlayer.nextLevelXp}`">
                        <div class="xp-fill" :style="{ width: myPlayer.level >= 9 ? '100%' : (myPlayer.xp / myPlayer.nextLevelXp * 100) + '%' }"></div>
                        <span class="xp-text">{{ myPlayer.level >= 9 ? 'MAX' : `${myPlayer.xp} / ${myPlayer.nextLevelXp} XP` }}</span>
                    </div>
                </div>
                <div class="stats-row">
                    <div class="gold-info">
                        <span class="gold-amount" style="font-size: 28px;">{{ myPlayer.gold }}</span>
                        <span class="gold-label" style="font-size: 14px;">Gold</span>
                    </div>
                    <div class="unit-count" :class="{ 'max-units': myPlayerBoardUnits.length >= myPlayer.level }" style="font-size: 18px;">
                        {{ myPlayerBoardUnits.length }}/{{ myPlayer.level }}
                    </div>
                </div>
                <button class="xp-btn" @click="buyXp" :disabled="!canManageShopAndBench || myPlayer.gold < 4 || myPlayer.level >= 9">
                    {{ myPlayer.level >= 9 ? 'MAX LEVEL' : 'XP (4g)' }}
                </button>
            </div>

            <!-- Bench Area -->
            <div class="bench-area-wrapper">
                <div class="bench-area">
                    <div class="bench-slots">
                        <!-- 9 slots or however many -->
                        <div v-for="slot in benchSlots" :key="'slot-'+slot.index" 
                             class="bench-slot"
                             :class="{ 
                                'highlight-drop': isDraggingUnit,
                                'active-drop': dragOverBenchIndex === slot.index
                             }"
                             @dragover="(e) => onBenchDragOver(e, slot.index)"
                             @dragleave="onBenchDragLeave"
                             @drop="(e) => onBenchDrop(e, slot.index)">
                            
                           <div v-if="slot.unit" 
                                class="bench-unit" 
                                :class="{ 'star-up': isStarringUp(slot.unit.id) }"
                                :style="{ '--rarity-color': getRarityColor(slot.unit.cost) }"
                                :draggable="canManageShopAndBench"
                                @dragstart="(e) => onBenchDragStart(e, slot.unit!)"
                                @dragend="onBenchDragEnd"
                                @mouseenter="(e) => handleShowTooltip((e.currentTarget as HTMLElement).getBoundingClientRect(), slot.unit!)"
                                @mouseleave="handleHideTooltip">
                               <!-- Cost Top Glow (Outside inner to avoid clipping) -->
                               <div class="cost-top-glow"></div>

                               <!-- 2-Star Energy Halo Effect (Before inner to be behind) -->
                               <div v-if="slot.unit.starLevel === 2" class="star-2-halo">
                                   <div class="halo-ring"></div>
                               </div>

                               <!-- 3-Star Conqueror Flow Effect (Before inner to be behind) -->
                               <div v-if="slot.unit.starLevel === 3" class="star-3-flow"></div>

                               <div class="bench-unit-inner" :style="{ borderColor: getRarityColor(slot.unit.cost) }">
                                  <div v-if="isStarringUp(slot.unit.id)" class="star-up-burst">
                                   <span v-for="j in 8" :key="j" class="star-particle" :style="{ '--particle-index': j }"></span>
                               </div>
                                  <img :src="getUnitIconPath(slot.unit.definitionId, props.state?.gameMode)" 
                                       class="bench-unit-img"
                                       draggable="false" />
                               </div>
                               
                              
                           </div>
                        </div>
                    </div>
                </div>

                <!-- Permanent Sell Zone (Below Bench) -->
                <div class="sell-zone bench-sell-zone" 
                     :class="{ 'active': draggedUnit && canManageShopAndBench, 'hovered': isSellZoneHovered }"
                     @dragover="onSellDragOver"
                     @dragleave="onSellDragLeave"
                     @drop="onSellDrop">
                    <div class="sell-content">
                        <span class="sell-icon">💰</span>
                        <span class="sell-text">{{ draggedUnit ? 'SELL UNIT FOR' : 'DRAG HERE TO SELL' }}</span>
                        <div v-if="draggedUnit" class="sell-refund">+{{ calculateSellRefund(draggedUnit) }} gold</div>
                    </div>
                </div>
            </div>

            <!-- Shop -->
            <div class="shop-area">
                <!-- Shop Cards (Top) -->
                <div class="shop-cards">
                    <div v-for="(card, idx) in shopCards" :key="idx" class="shop-card" 
                         :class="{ 'empty': !card, 'can-buy': canManageShopAndBench && card && myPlayer.gold >= card.cost, 'owned-line': card && isShopCardOwned(card), [`rarity-${card?.cost || 1}`]: card }"
                         @click="card && buyUnit(Number(idx))"
                         @mouseenter="(e) => card ? handleShowTooltip((e.currentTarget as HTMLElement).getBoundingClientRect(), card, 'top', idx === 4 ? 'more-left' : idx === 3 ? 'left' : undefined) : null"
                         @mouseleave="handleHideTooltip">
                         <template v-if="card">
                             <div class="shop-card-portrait">
                                 <img :src="getUnitIconPath(card.id, props.state?.gameMode)" class="shop-card-img" draggable="false" />
                             </div>
                             <div class="shop-card-content">
                                 <div class="name">{{ card.name }}</div>
                                 <div class="cost">{{ card.cost }}g</div>
                             </div>
                         </template>
                    </div>
                </div>
                
                <!-- Refresh Button (Middle) -->
                <div class="shop-actions">
                    <button class="reroll-btn horizontal" @click="refreshShop" :disabled="!canManageShopAndBench || myPlayer.gold < 2">
                        <span class="refresh-icon">⚓</span>
                        <span class="btn-text">Refresh Shop</span>
                        <span class="cost">2g</span>
                    </button>
                </div>

            </div>
        </div>
        <div v-else-if="!myPlayer" class="waiting-message">
            Waiting for player data...
        </div>
    </template>
    
    <div v-else class="waiting-message">
        Waiting for game state...
    </div>

    <div v-if="isAbandonDialogVisible" class="abandon-dialog-backdrop" @click.self="cancelAbandonGame">
        <section class="abandon-dialog" role="dialog" aria-modal="true" aria-labelledby="abandon-game-title">
            <h2 id="abandon-game-title">Abandon this game?</h2>
            <p>You will be removed from this match and returned to the home screen. This cannot be undone.</p>
            <div class="abandon-dialog__actions">
                <button class="abandon-dialog__cancel" type="button" @click="cancelAbandonGame">Cancel</button>
                <button class="abandon-dialog__confirm" type="button" @click="confirmAbandonGame">Abandon Game</button>
            </div>
        </section>
    </div>

    <!-- Global Tooltip Teleport -->
    <Teleport to="body">
        <transition name="fade">
            <div v-if="activeTooltip" 
                 class="global-tooltip-container"
                 :style="{ 
                    position: 'fixed',
                    left: activeTooltip.rect.left + 'px',
                    top: activeTooltip.rect.top + 'px',
                    width: activeTooltip.rect.width + 'px',
                    height: activeTooltip.rect.height + 'px',
                    zIndex: 100000,
                    pointerEvents: 'none'
                 }">
                <UnitTooltip 
                    :unit="activeTooltip.unit" 
                    :placement="activeTooltip.placement"
                    :shift="activeTooltip.shift" />
            </div>
        </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.game-interface {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    font-family: var(--app-font-family);
    color: white;
    background: var(--app-bg);
}

.top-bar {
    display: flex;
    flex-direction: column;
    padding: 0;
    background: rgba(15, 23, 42, 0.7);
    border-bottom: 2px solid rgba(51, 65, 85, 0.5);
    backdrop-filter: blur(12px);
    z-index: 100;
    transition: background-color 0.5s;
}

.top-bar.combat {
    background: rgba(69, 10, 10, 0.7);
    border-bottom-color: rgba(239, 68, 68, 0.5);
}

.phase-info {
    display: flex;
    justify-content: space-between;
    padding: 10px 24px;
    font-size: 18px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 2px;
    align-items: center;
}

.game-meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
}

.game-mode {
    font-size: 10px;
    opacity: 0.6;
    text-transform: uppercase;
}

.room-id {
    font-size: 12px;
    color: #94a3b8;
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 8px;
    border-radius: 4px;
    letter-spacing: 0.5px;
}

.room-details {
    display: flex;
    align-items: center;
    gap: 5px;
}

.round-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    min-width: 128px;
}

.ready-btn {
    height: 28px;
    padding: 0 12px;
    border: 1px solid rgba(34, 197, 94, 0.75);
    border-radius: 6px;
    background: rgba(22, 163, 74, 0.22);
    color: #dcfce7;
    font-size: 12px;
    font-weight: 900;
    line-height: 1;
    text-transform: uppercase;
    cursor: pointer;
}

.ready-btn:hover {
    background: rgba(22, 163, 74, 0.34);
}

.timer-bar-container {
    width: 100%;
    height: 4px;
    background: #1e293b;
}

.timer-bar-fill {
    height: 100%;
    transition: width 0.1s linear, background-color 0.5s;
}

.bench-unit {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative; /* For tooltip positioning */
    cursor: grab;
    z-index: 10;
    transition: transform 0.2s ease;
}
.bench-unit:hover {
    cursor: grabbing;
    z-index: 2000; /* Unified top layer */
    transform: scale(1.1) translateY(-5px);
    filter: brightness(1.1);
}

.bench-unit-inner {
    position: relative;
    width: 64px;  /* Synced to bench-slot */
    height: 64px; /* Synced to bench-slot */
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: bold;
    color: black;
    font-size: 13px;
    background-color: #1e293b;
    border: 3px solid #334155; 
    box-shadow: 0 8px 16px rgba(0,0,0,0.6);
    overflow: hidden;
    z-index: 5;
}
.bench-unit-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    pointer-events: none;
    z-index: 2; /* Ensures portrait stays above halos/flows */
}

.main-area {
    position: relative;
    flex: 1;
    min-height: 0; /* Critical for flex shrinking */
    display: flex;
    justify-content: center;
    align-items: center;
    background: #1a1a1a;
    overflow: visible;
    z-index: 60; /* Under bottom-ui (70) so bottom tooltips can overlap */
}

.spectator-notice {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 120;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: rgba(15, 23, 42, 0.92);
    border: 1px solid rgba(96, 165, 250, 0.55);
    border-radius: 8px;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
    color: #e2e8f0;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.5px;
    pointer-events: auto;
}

.home-btn {
    height: 28px;
    padding: 0 10px;
    border: 1px solid rgba(251, 191, 36, 0.8);
    border-radius: 6px;
    background: rgba(251, 191, 36, 0.12);
    color: #fbbf24;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    cursor: pointer;
}

.home-btn:hover {
    background: rgba(251, 191, 36, 0.22);
    border-color: #fbbf24;
}

.bottom-ui {
    flex-shrink: 0;
    height: 180px; /* Increased height */
    background: rgba(15, 23, 42, 0.8);
    border-top: 2px solid rgba(51, 65, 85, 0.5);
    backdrop-filter: blur(16px);
    display: grid;
    grid-template-columns: 200px 1.2fr 1fr; /* Optimized distribution */
    padding: 12px 20px;
    gap: 20px;
    position: relative;
    z-index: 70; /* Above main-area (60) so odds tooltip can overlap */
    overflow: visible;
}

/* Stats Panel */
.stats-panel {
    width: 200px; /* Increased from 160px */
    min-width: 200px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: rgba(30, 41, 59, 0.4);
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(51, 65, 85, 0.5);
    backdrop-filter: blur(8px);
}

.level-info {
    display: flex;
    align-items: center;
    gap: 8px;
}

.level-badge {
    background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
    padding: 4px 12px;
    border-radius: 14px;
    font-weight: 900;
    font-size: 14px;
    border: 1px solid rgba(255,255,255,0.2);
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    white-space: nowrap; /* Fix: prevent wrapping */
    flex-shrink: 0;
    cursor: default;
    user-select: none;
    position: relative;
}

.odds-tooltip {
    position: absolute;
    bottom: 130%;
    left: 0;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 10px;
    border-radius: 8px;
    width: 140px;
    z-index: 1000;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
    pointer-events: none;
}

.odds-header {
    font-size: 11px;
    font-weight: 800;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 4px;
}

.odds-grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.odds-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
}

.tier-indicator {
    width: 8px;
    height: 8px;
    border-radius: 2px;
}

.tier-label {
    flex: 1;
    color: #cbd5e1;
    font-weight: 500;
}

.prob-value {
    color: white;
    font-weight: 800;
}

.xp-bar {
    height: 24px;
    width: 100%;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid #334155;
    border-radius: 12px;
    position: relative;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
    display: block; /* Ensure visibility */
}

.xp-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    border-radius: 10px;
    transition: width 0.3s ease;
}
.xp-text {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 10px;
    font-weight: 800;
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
    pointer-events: none;
}

.stats-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 4px;
    width: 100%;
}

.gold-info {
    display: flex;
    align-items: baseline;
    gap: 8px;
}
.gold-amount {
    color: #fbbf24;
    font-size: 28px; /* Reduced from 32px */
    font-weight: 900;
    line-height: 1;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    cursor: default;
    user-select: none;
}
.gold-label {
    font-size: 11px;
    opacity: 0.8;
    cursor: default;
    user-select: none;
}



.unit-count {
    background: rgba(15, 23, 42, 0.6);
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid #334155;
    text-align: center;
    font-size: 14px;
    font-weight: 900;
    color: #94a3b8;
    cursor: default;
    user-select: none;
}
.unit-count.max-units {
    color: #ef4444;
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
}

/* Bench */
.bench-area {
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(15, 23, 42, 0.4);
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 12px;
    box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
    flex: 1; /* Stretch to fill available vertical space */
    overflow: visible;
}

.bench-slots {
    display: flex;
    gap: 4px; /* Tightened gap */
    overflow: visible;
}

.bench-slot {
    width: 64px; 
    height: 64px; 
    background: rgba(30, 41, 59, 0.6);
    border: 1px solid #334155;
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.2s ease;
    position: relative;
    z-index: 1;
    overflow: visible;
}

.bench-slot.highlight-drop {
    border-color: #60a5fa;
    background: rgba(59, 130, 246, 0.2);
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
}

.bench-slot.active-drop {
    background: rgba(59, 130, 246, 0.4);
    box-shadow: inset 0 0 10px #3b82f6;
    border-color: #3b82f6;
}

/* Bench Area Wrapper */
.bench-area-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: stretch; /* Enforce uniform width */
    gap: 6px; /* Reduced from 8px to accommodate larger sell zone */
    min-width: 0;
    height: 100%;
}

/* Sell Zone */
.sell-zone {
    height: 52px; /* Increased from 40px */
    width: 100%;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid #334155;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0.8;
    padding: 12px; /* Sync with bench area padding */
}

.sell-zone.active {
    opacity: 1;
    border-color: #fbbf24;
    background: linear-gradient(90deg, rgba(234, 179, 8, 0.1) 0%, rgba(234, 179, 8, 0.3) 50%, rgba(234, 179, 8, 0.1) 100%);
    box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
    border-style: solid;
    transform: scale(1.01);
}

.sell-zone.hovered {
    border-color: #f87171;
    background: linear-gradient(90deg, rgba(127, 29, 29, 0.24) 0%, rgba(239, 68, 68, 0.34) 50%, rgba(127, 29, 29, 0.24) 100%);
    box-shadow: 0 0 24px rgba(248, 113, 113, 0.42), inset 0 0 0 1px rgba(254, 202, 202, 0.28);
    transform: translateY(-1px) scale(1.015);
}

.sell-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.sell-icon {
    font-size: 24px;
}

.sell-text {
    font-weight: 800;
    font-size: 14px;
    letter-spacing: 2px;
    color: #94a3b8;
    text-transform: uppercase;
    cursor: default;
    user-select: none;
}

.sell-zone.active .sell-text {
    color: #f87171;
    text-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
}

.sell-zone.hovered .sell-icon,
.sell-zone.hovered .sell-text {
    color: #fecaca;
    text-shadow: 0 0 10px rgba(248, 113, 113, 0.8);
}

.sell-refund {
    font-size: 14px;
    color: #fbbf24;
    font-weight: 800;
    margin-left: 8px;
}

.slide-up-enter-active, .slide-up-leave-active {
    transition: all 0.3s ease;
}
.slide-up-enter-from, .slide-up-leave-to {
    opacity: 0;
    transform: translateY(10px);
}

/* Shop */
.shop-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
    min-width: 0; /* Allow shrinking */
    overflow: visible;
}

.shop-cards {
    display: flex;
    gap: 6px;
    height: 105px; /* Enforce stable height to prevent refresh button jump */
    flex-shrink: 0;
}

.shop-card {
    position: relative;
    flex: 1 1 0;
    min-width: 80px; /* Further reduced min-width */
    flex-shrink: 1;
    height: 100%;
    background: #1e293b;
    border: 2px solid #334155;
    border-radius: 8px; /* Slightly tighter radius */
    cursor: pointer;
    display: flex;
    flex-direction: column;
    padding: 4px; /* Reduced padding */
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    /* overflow: hidden; -- Allows tooltips to be visible */
}

.shop-card.rarity-1 { border-color: #64748b; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); }
.shop-card.rarity-2 { border-color: #22c55e; background: linear-gradient(135deg, #064e3b 0%, #1e293b 100%); }
.shop-card.rarity-3 { border-color: #1a0dab; background: linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%); }
.shop-card.rarity-4 { border-color: #a855f7; background: linear-gradient(135deg, #581c87 0%, #1e293b 100%); }
.shop-card.rarity-5 { border-color: #eab308; background: linear-gradient(135deg, #78350f 0%, #1e293b 100%); }

.shop-card {
    position: relative;
    flex: 1 1 0;
    min-width: 80px; /* Further reduced min-width */
    flex-shrink: 1;
    height: 100%;
    background: #1e293b;
    border: 2px solid #334155;
    border-radius: 8px; /* Slightly tighter radius */
    cursor: pointer;
    display: flex;
    flex-direction: column;
    padding: 4px; /* Reduced padding */
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    /* overflow: hidden; -- Allows tooltips to be visible */
    z-index: 1;
}

.shop-card.can-buy:hover {
    transform: scale(1.05) translateY(-5px); /* Unified scale and lift */
    z-index: 2000; /* Unified top layer */
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.8), 0 0 20px rgba(96, 165, 250, 0.4);
    border-color: #60a5fa;
    filter: brightness(1.1);
}

.shop-card.owned-line {
    box-shadow: inset 0 0 0 2px rgba(34, 211, 238, 0.95), 0 0 18px rgba(34, 211, 238, 0.35);
}

.shop-card.owned-line::after {
    content: "";
    position: absolute;
    top: 6px;
    right: 6px;
    width: 12px;
    height: 12px;
    border-radius: 999px;
    background: #67e8f9;
    box-shadow: 0 0 10px rgba(103, 232, 249, 0.95), 0 0 18px rgba(34, 211, 238, 0.75);
    pointer-events: none;
}

.shop-card.owned-line.can-buy:hover {
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.8), 0 0 20px rgba(96, 165, 250, 0.4), inset 0 0 0 2px rgba(34, 211, 238, 0.95);
}

.shop-card.rarity-1.can-buy:hover { border-color: #94a3b8; box-shadow: 0 0 10px rgba(148, 163, 184, 0.3); }
.shop-card.rarity-2.can-buy:hover { border-color: #4ade80; box-shadow: 0 0 10px rgba(74, 222, 128, 0.3); }
.shop-card.rarity-3.can-buy:hover { border-color: #60a5fa; box-shadow: 0 0 10px rgba(96, 165, 250, 0.3); }
.shop-card.rarity-4.can-buy:hover { border-color: #c084fc; box-shadow: 0 0 10px rgba(192, 132, 252, 0.3); }
.shop-card.rarity-5.can-buy:hover { border-color: #fbbf24; box-shadow: 0 0 10px rgba(251, 191, 36, 0.3); }

.shop-card.owned-line.rarity-1.can-buy:hover { box-shadow: 0 0 10px rgba(148, 163, 184, 0.3), inset 0 0 0 2px rgba(34, 211, 238, 0.95), 0 0 18px rgba(34, 211, 238, 0.35); }
.shop-card.owned-line.rarity-2.can-buy:hover { box-shadow: 0 0 10px rgba(74, 222, 128, 0.3), inset 0 0 0 2px rgba(34, 211, 238, 0.95), 0 0 18px rgba(34, 211, 238, 0.35); }
.shop-card.owned-line.rarity-3.can-buy:hover { box-shadow: 0 0 10px rgba(96, 165, 250, 0.3), inset 0 0 0 2px rgba(34, 211, 238, 0.95), 0 0 18px rgba(34, 211, 238, 0.35); }
.shop-card.owned-line.rarity-4.can-buy:hover { box-shadow: 0 0 10px rgba(192, 132, 252, 0.3), inset 0 0 0 2px rgba(34, 211, 238, 0.95), 0 0 18px rgba(34, 211, 238, 0.35); }
.shop-card.owned-line.rarity-5.can-buy:hover { box-shadow: 0 0 10px rgba(251, 191, 36, 0.3), inset 0 0 0 2px rgba(34, 211, 238, 0.95), 0 0 18px rgba(34, 211, 238, 0.35); }


.shop-card.empty {
    opacity: 0.2;
    cursor: default;
    background: transparent;
    border: 1px solid #1e293b;
}

.shop-card-portrait {
    width: 100%;
    height: 48px; /* Reduced from 60px as requested */
    margin-bottom: 4px; 
    flex-shrink: 0;
    overflow: hidden;
    border-radius: 6px;
    background: #000;
}

.shop-card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.shop-card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-width: 0;
    width: 100%;
}

.shop-card .name {
    width: 100%;
    text-align: center;
    font-weight: 800;
    font-size: 15px; /* Increased from 13px */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #ffffff;
    text-shadow: 0 1px 3px rgba(0,0,0,0.8);
    margin-bottom: 4px;
}

.shop-card .cost {
    font-size: 14px; /* Increased from 11px */
    color: #fbbf24;
    font-weight: 800;
}

.shop-tooltip, .bench-tooltip {
    position: absolute;
    z-index: 10000;
    pointer-events: none;
}

.shop-actions {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-top: 4px; /* Ensure space for button shadow/hover */
}

.reroll-btn.horizontal {
    flex-direction: row;
    height: 34px; /* Reduced from 42px */
    width: 100%;
    gap: 8px;
    padding: 0 15px;
    background: linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%);
    border: 2px solid #3b82f6;
    border-radius: 4px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    font-family: inherit;
    transition: all 0.2s ease;
}

.reroll-btn.horizontal:hover:not(:disabled) {
    background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
    border-color: #60a5fa;
    transform: translateY(-1px);
}

.reroll-btn.horizontal .refresh-icon { 
    font-size: 18px; 
    filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.5));
}
.reroll-btn.horizontal .btn-text { 
    font-size: 13px; 
    font-weight: 800; 
    text-transform: uppercase;
    letter-spacing: 1px;
}
.reroll-btn.horizontal .cost { 
    font-size: 14px; 
    color: #fbbf24; 
    font-weight: 900;
    text-shadow: 0 0 10px rgba(251, 191, 36, 0.4);
}

.xp-btn {
    height: 34px; /* Reduced from 42px */
    width: 100%;
    font-size: 13px;
    background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
    border: 2px solid #60a5fa;
    border-radius: 6px;
    color: white;
    font-weight: 800;
    cursor: pointer;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 1px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
}

.xp-btn:hover:not(:disabled) {
    background: linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%);
    transform: translateY(-1px);
}

.reroll-btn:disabled, .xp-btn:disabled {
    opacity: 0.5;
    background: #1e293b;
    border-color: #334155;
    box-shadow: none;
    transform: none;
    cursor: not-allowed;
}

.reroll-btn {
    background: #ef4444; 
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.dead-state {
    filter: grayscale(100%) brightness(0.6);
    pointer-events: none;
    transition: all 1s ease;
}

/* ========== STAR-UP CELEBRATION ========== */
.bench-unit.star-up .bench-unit-inner {
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

.abandon-game-btn {
    display: grid;
    width: 20px;
    height: 20px;
    padding: 3px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: #ef4444;
    cursor: pointer;
}

.abandon-game-btn:hover {
    background: rgba(239, 68, 68, 0.18);
    color: #f87171;
}

.abandon-game-btn svg {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2;
}

.abandon-dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100000;
    display: grid;
    place-items: center;
    padding: 24px;
    background: rgba(2, 6, 23, 0.78);
    backdrop-filter: blur(4px);
}

.abandon-dialog {
    width: min(100%, 430px);
    padding: 28px;
    border: 1px solid rgba(248, 113, 113, 0.45);
    border-radius: 14px;
    background: #0f172a;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.48);
}

.abandon-dialog h2 {
    margin: 0;
    color: #fee2e2;
    font-size: 1.5rem;
}

.abandon-dialog p {
    margin: 12px 0 24px;
    color: #cbd5e1;
    line-height: 1.5;
}

.abandon-dialog__actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.abandon-dialog__actions button {
    padding: 9px 14px;
    border-radius: 7px;
    font-weight: 800;
    cursor: pointer;
}

.abandon-dialog__cancel {
    border: 1px solid #475569;
    background: #1e293b;
    color: #e2e8f0;
}

.abandon-dialog__confirm {
    border: 1px solid #ef4444;
    background: #b91c1c;
    color: #fff;
}
</style>

<style>
/* Global styles for teleported Drag Ghost and Shared Unit Effects */
.cost-top-glow {
    position: absolute;
    top: 5px;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 8px;
    background: radial-gradient(ellipse at center, var(--rarity-color), transparent 70%);
    opacity: 0.6;
    pointer-events: none;
    z-index: 5;
    filter: blur(2px);
}

.star-2-halo {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 118%;
    height: 118%;
    pointer-events: none;
    z-index: 1; /* Under unit-img */
}

.halo-ring {
    position: absolute;
    inset: 0;
    border: 2px dashed var(--rarity-color);
    border-radius: 50%;
    opacity: 0.5;
    animation: rotate-halo 15s linear infinite;
    box-shadow: 0 0 8px var(--rarity-color);
}

@keyframes rotate-halo { 
    from { transform: rotate(0deg); } 
    to { transform: rotate(360deg); } 
}

.star-3-flow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 118%;
    height: 118%;
    border-radius: 50%;
    padding: 5px;
    background-clip: content-box;
    pointer-events: none;
    z-index: 1; /* Under unit-img */
}

.star-3-flow::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    background: conic-gradient(from 0deg, var(--rarity-color), #fff, var(--rarity-color), #000, var(--rarity-color));
    animation: rotate-halo 1.5s linear infinite;
    z-index: -1;
}

.star-3-flow::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    box-shadow: 0 0 20px var(--rarity-color);
    opacity: 0.6;
    z-index: -2;
}

</style>
