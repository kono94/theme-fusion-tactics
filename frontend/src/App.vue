<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, shallowRef } from 'vue'
import type { Component } from 'vue'
import { Client } from '@stomp/stompjs'
import type { StompSubscription } from '@stomp/stompjs'
import Lobby from './components/Lobby.vue'
import Changelog from './components/Changelog.vue'
import WaitingRoom from './components/WaitingRoom.vue'
import GameInterface from './components/GameInterface.vue'
import OutcomeOverlay from './components/game/OutcomeOverlay.vue'
import DamageReport from './components/game/DamageReport.vue'
import VersionDisplay from './components/VersionDisplay.vue'
import AdminAnalytics from './components/admin/AdminAnalytics.vue'
import MatchHistory from './components/MatchHistory.vue'

import { setTraitData } from './data/traitData'
import {
    getGameModeMetadata,
    isGameMode,
    parseGalleryModeHash,
    sortGameModes,
} from './data/gameModeMetadata'
import type {
    CombatResultPayload,
    EmergencyDropPayload,
    GameAction,
    GameMode,
    GameState,
    RoomRequestResult,
    RoomGameEvent,
} from './types'
import {
    clearActiveRoomSession,
    createActiveRoomSession,
    getAnalyticsClientId,
    loadPlayerName,
    loadActiveRoomSession,
    PLAYER_NAME_MAX_LENGTH,
    savePlayerName,
    setActiveRoomPlayerId,
} from './utils/clientIdentity'
import { generateRoomCode, isInviteRoute, parseInviteRoomId } from './utils/roomInvite'

type PendingRoomRequestKind = 'create' | 'join' | 'restore'

const ACTIVE_ROOM_CONTROL_KEY = 'tactics.activeRoomControl'

const isConnected = ref(false)
const gameState = ref<GameState | null>(null)
const client = ref<Client | null>(null)
const currentView = ref<'lobby' | 'game' | 'changelog'>('lobby')
const currentRoomId = ref('')
const fallbackModes = sortGameModes(['onepiece', 'pokemon'])
const availableModes = ref<GameMode[]>(fallbackModes)
const defaultMode = ref<GameMode>('onepiece')
const activeTraitMode = ref<GameMode | null>(null)
const roomSubscription = ref<StompSubscription | null>(null)
const eventSubscription = ref<StompSubscription | null>(null)
const roomResultSubscription = ref<StompSubscription | null>(null)
const isUltimateGallery = ref(false)
const isAdminAnalytics = ref(false)
const isMatchHistory = ref(false)
const ultimateGalleryMode = ref<GameMode>('onepiece')
const UltimateGallery = shallowRef<Component | null>(null)
const viewedPlayerId = ref<string | null>(null)
const pendingJoinRoomId = ref<string | null>(null)
const pendingRoomRequestKind = ref<PendingRoomRequestKind | null>(null)
const pendingInviteRoomId = ref<string | null>(null)
const lobbyError = ref('')
const hasLostRoomControl = ref(false)
const controllerTabId = crypto.randomUUID()
let traitRequestGeneration = 0
let restoredRoomTimeout: number | null = null
let generatedCreateAttempts = 0

const activeVisualMode = computed<GameMode>(() => gameState.value?.gameMode ?? defaultMode.value)
const gameTitle = 'Theme Fusion Tactics'

const restoredRoom = loadActiveRoomSession()
const playerName = ref(loadPlayerName())
const activePlayerName = ref(restoredRoom?.playerName ?? '')
const currentPlayerId = ref<string | null>(restoredRoom?.playerId ?? null)
const analyticsClientId = getAnalyticsClientId()

onMounted(async () => {
    updateStandaloneRoute()
    window.addEventListener('hashchange', updateStandaloneRoute)
    if (isUltimateGallery.value || isAdminAnalytics.value || isMatchHistory.value) return
    window.addEventListener('storage', handleActiveRoomControlChange)

    applyThemeMeta(defaultMode.value)
    try {
        const configRes = await fetch('/api/config');

        if (configRes.ok) {
            const data = await configRes.json();
            const configuredModes = Array.isArray(data.availableModes)
                ? data.availableModes.filter((mode: unknown): mode is GameMode => {
                    if (!isGameMode(mode)) {
                        console.warn('Ignoring unknown game mode from config', mode)
                        return false
                    }
                    return true
                })
                : []
            if (configuredModes.length > 0) {
                availableModes.value = sortGameModes(configuredModes)
            }
            if (data.defaultGameMode !== undefined) {
                if (isGameMode(data.defaultGameMode)) {
                    defaultMode.value = data.defaultGameMode
                } else {
                    console.warn('Unknown default game mode from config; using One Piece', data.defaultGameMode)
                }
            }
            applyThemeMeta(defaultMode.value)
        }
    } catch (e) {
        console.error("Failed to fetch initial data", e);
    }

    const envWsUrl = import.meta.env.VITE_WS_URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = envWsUrl || `${protocol}//${window.location.host}/ws`

    client.value = new Client({
        brokerURL: wsUrl,
        onConnect: () => {
            isConnected.value = true
            console.log("Connected to WebSocket")
            subscribeToRoomResults()
            const activeRoom = loadActiveRoomSession()
            if (activeRoom) {
                gameState.value = null
                currentRoomId.value = activeRoom.roomId
                pendingJoinRoomId.value = activeRoom.roomId
                pendingRoomRequestKind.value = 'restore'
                subscribeToRoom(activeRoom.roomId)
                client.value?.publish({
                    destination: '/app/join',
                    body: JSON.stringify({
                        roomId: activeRoom.roomId,
                        playerName: activeRoom.playerName,
                        analyticsClientId,
                        reconnectToken: activeRoom.reconnectToken,
                    }),
                })
                currentView.value = 'game'
                startRestoredRoomTimeout(activeRoom.roomId)
            } else if (pendingInviteRoomId.value) {
                if (playerName.value.trim().length > 0 && playerName.value.trim().length <= PLAYER_NAME_MAX_LENGTH) {
                    handleJoin(pendingInviteRoomId.value)
                } else {
                    currentView.value = 'lobby'
                }
            }
        },
        onDisconnect: () => {
            isConnected.value = false
            console.log("Disconnected")
        },
        onStompError: (frame) => {
            lobbyError.value = frame.headers.message || 'The server rejected the WebSocket request.'
        },
        onWebSocketError: () => {
            if (pendingJoinRoomId.value) lobbyError.value = 'Unable to reach the game server.'
        },
        reconnectDelay: 5000,
    })
    
    client.value.activate()
})

onUnmounted(() => {
    window.removeEventListener('hashchange', updateStandaloneRoute)
    window.removeEventListener('storage', handleActiveRoomControlChange)
    clearRestoredRoomTimeout()
    clearEmergencyDropPresentation()
    roomResultSubscription.value?.unsubscribe()
    if (outcomeTimer !== null) window.clearTimeout(outcomeTimer)
    client.value?.deactivate()
})

const encounterResult = ref<'WON' | 'LOST' | 'DRAW' | null>(null)
const emergencyDrop = ref<EmergencyDropPayload | null>(null)
const pendingEmergencyDrop = ref<EmergencyDropPayload | null>(null)
const hasQueuedEmergencyDrop = computed(() => emergencyDrop.value !== null || pendingEmergencyDrop.value !== null)
let outcomeTimer: number | null = null
let emergencyDropDelayTimer: number | null = null
let emergencyDropClearTimer: number | null = null

const myPlayerId = computed(() => {
    return currentPlayerId.value ?? undefined
});

const opponentId = computed(() => {
    if (!gameState.value || !damageReportPlayerId.value) return undefined;
    return gameState.value.matchups[damageReportPlayerId.value];
});

const opponentName = computed(() => {
    if (!gameState.value || !opponentId.value) return undefined;
    return gameState.value.players[opponentId.value]?.name || 'Opponent';
});

const damageReportPlayerId = computed(() => {
    return viewedPlayerId.value || myPlayerId.value;
});

const damageReportPlayerName = computed(() => {
    if (!gameState.value || !damageReportPlayerId.value || damageReportPlayerId.value === myPlayerId.value) {
        return 'YOU';
    }
    return gameState.value.players[damageReportPlayerId.value]?.name || 'Viewed';
});

const showVersion = computed(() => {
    if (isUltimateGallery.value) return false
    // Show version only on lobby view or during LOBBY phase in game view
    return currentView.value === 'lobby' || gameState.value?.phase === 'LOBBY';
});

const parseGameStateMessage = (body: string): GameState => {
    const candidate: unknown = JSON.parse(body)
    if (!candidate || typeof candidate !== 'object' || !('gameMode' in candidate)) {
        throw new Error('Unsupported game mode received from server: missing')
    }

    const mode = (candidate as { gameMode?: unknown }).gameMode
    if (!isGameMode(mode)) {
        throw new Error(`Unsupported game mode received from server: ${String(mode)}`)
    }

    return candidate as GameState
}


const subscribeToRoom = (roomId: string) => {
    if (!client.value || !isConnected.value) return
    
    // Unsubscribe from previous if exists
    if (roomSubscription.value) {
        roomSubscription.value.unsubscribe()
        roomSubscription.value = null
    }
    if (eventSubscription.value) {
        eventSubscription.value.unsubscribe()
        eventSubscription.value = null
    }
    
    // Subscribe to state updates
    roomSubscription.value = client.value.subscribe(`/topic/room/${roomId}`, (message) => {
        try {
            gameState.value = parseGameStateMessage(message.body)
            if (gameState.value.phase === 'END_CELEBRATION' || gameState.value.phase === 'END') {
                releaseActiveRoomControl()
                clearActiveRoomSession()
                hasLostRoomControl.value = false
            }
            
            // Check Game Mode and Update Title
            const mode = gameState.value.gameMode;

            // console.log("Received Game Mode:", mode);
            
            applyThemeMeta(mode);

            if (activeTraitMode.value !== mode) {
                activeTraitMode.value = mode;
                fetchTraitsForMode(mode);
            }

        } catch (e) {
            if (e instanceof Error && e.message.startsWith('Unsupported game mode received from server:')) {
                rejectPendingJoin(e.message)
            } else {
                console.error("Failed to parse game state", e)
            }
        }
    })

    // Subscribe to events
    eventSubscription.value = client.value.subscribe(`/topic/room/${roomId}/event`, (message) => {
        try {
            const event = JSON.parse(message.body) as RoomGameEvent
            console.log("Received Game Event:", event)
            if (event.type === 'COMBAT_RESULT') {
                handleCombatResult(event.payload)
            } else if (event.type === 'EMERGENCY_DROP') {
                handleEmergencyDrop(event.payload)
            }
        } catch (e) {
            console.error("Failed to parse event", e)
        }
    })
}

const subscribeToRoomResults = () => {
    roomResultSubscription.value?.unsubscribe()
    roomResultSubscription.value = client.value?.subscribe('/user/queue/room-result', (message) => {
        try {
            const result = JSON.parse(message.body) as RoomRequestResult
            if (pendingJoinRoomId.value && result.roomId && result.roomId !== pendingJoinRoomId.value) return
            if (!result.accepted || !result.roomId || !result.playerId) {
                if (
                    pendingRoomRequestKind.value === 'create'
                    && result.code === 'ROOM_EXISTS'
                    && generatedCreateAttempts < 3
                ) {
                    startGeneratedRoomCreation()
                    return
                }
                rejectPendingJoin(result.message || 'The room request was rejected.')
                return
            }

            if (pendingRoomRequestKind.value === 'restore' && pendingInviteRoomId.value) {
                consumeInviteRoute()
            }
            currentPlayerId.value = result.playerId
            setActiveRoomPlayerId(result.roomId, result.playerId)
            claimActiveRoomControl(result.roomId)
            pendingJoinRoomId.value = null
            pendingRoomRequestKind.value = null
            generatedCreateAttempts = 0
            clearRestoredRoomTimeout()
        } catch (error) {
            console.error('Failed to parse room result', error)
            rejectPendingJoin('The server returned an invalid room response.')
        }
    }) ?? null
}

const claimActiveRoomControl = (roomId: string) => {
    hasLostRoomControl.value = false
    localStorage.setItem(ACTIVE_ROOM_CONTROL_KEY, JSON.stringify({ roomId, tabId: controllerTabId }))
}

const releaseActiveRoomControl = () => {
    try {
        const currentControl = JSON.parse(localStorage.getItem(ACTIVE_ROOM_CONTROL_KEY) || '{}') as {
            tabId?: string
        }
        if (currentControl.tabId === controllerTabId) {
            localStorage.removeItem(ACTIVE_ROOM_CONTROL_KEY)
        }
    } catch {
        localStorage.removeItem(ACTIVE_ROOM_CONTROL_KEY)
    }
}

function handleActiveRoomControlChange(event: StorageEvent) {
    if (event.key !== ACTIVE_ROOM_CONTROL_KEY || !event.newValue || currentView.value !== 'game') return
    try {
        const control = JSON.parse(event.newValue) as { roomId?: string; tabId?: string }
        if (control.roomId === currentRoomId.value && control.tabId && control.tabId !== controllerTabId) {
            hasLostRoomControl.value = true
        }
    } catch {
        // Ignore malformed cross-tab messages.
    }
}

const clearRoomSubscriptions = () => {
    if (roomSubscription.value) {
        roomSubscription.value.unsubscribe()
        roomSubscription.value = null
    }
    if (eventSubscription.value) {
        eventSubscription.value.unsubscribe()
        eventSubscription.value = null
    }
}

const rejectPendingJoin = (message: string) => {
    const inviteAfterFailedRestore = pendingRoomRequestKind.value === 'restore'
        ? pendingInviteRoomId.value
        : null
    clearRestoredRoomTimeout()
    clearRoomSubscriptions()
    clearActiveRoomSession()
    pendingJoinRoomId.value = null
    pendingRoomRequestKind.value = null
    generatedCreateAttempts = 0
    currentView.value = 'lobby'
    gameState.value = null
    currentRoomId.value = ''
    activeTraitMode.value = null
    traitRequestGeneration += 1
    viewedPlayerId.value = null
    currentPlayerId.value = null
    lobbyError.value = message
    applyThemeMeta(defaultMode.value)

    if (
        inviteAfterFailedRestore
        && client.value
        && isConnected.value
        && playerName.value.trim().length > 0
        && playerName.value.trim().length <= PLAYER_NAME_MAX_LENGTH
    ) {
        handleJoin(inviteAfterFailedRestore)
    }
}

const clearRestoredRoomTimeout = () => {
    if (restoredRoomTimeout !== null) {
        window.clearTimeout(restoredRoomTimeout)
        restoredRoomTimeout = null
    }
}

const startRestoredRoomTimeout = (roomId: string, message = 'Your previous game is no longer available.') => {
    clearRestoredRoomTimeout()
    restoredRoomTimeout = window.setTimeout(() => {
        if (pendingJoinRoomId.value === roomId) {
            rejectPendingJoin(message)
        }
    }, 5000)
}

const handleCombatResult = (payload: CombatResultPayload) => {
    console.log("Handling Combat Result:", payload)
    if (!gameState.value) return

    const myId = currentPlayerId.value
    if (!myId) return
    
    // Was I in this combat?
    const wasParticipant = payload.participantIds.includes(myId)
    if (!wasParticipant) return

    if (emergencyDrop.value) {
        pendingEmergencyDrop.value = emergencyDrop.value
        emergencyDrop.value = null
    }
    if (emergencyDropDelayTimer !== null) {
        window.clearTimeout(emergencyDropDelayTimer)
        emergencyDropDelayTimer = null
    }
    if (emergencyDropClearTimer !== null) {
        window.clearTimeout(emergencyDropClearTimer)
        emergencyDropClearTimer = null
    }

    // Determine result type
    if (payload.winnerId === myId) {
        encounterResult.value = 'WON'
    } else if (payload.loserId === myId) {
        encounterResult.value = 'LOST'
    } else {
        encounterResult.value = 'DRAW'
    }

    // Store damage report (deprecated, using live state now)
    // damageReport.value = payload.damageLog

    // Clear after 3 seconds (Outcome overlay only)
    if (outcomeTimer) clearTimeout(outcomeTimer)
    outcomeTimer = window.setTimeout(() => {
        encounterResult.value = null
        outcomeTimer = null
        scheduleEmergencyDropPresentation()
    }, 3000)
}

const handleEmergencyDrop = (payload: EmergencyDropPayload) => {
    if (!payload.dropId || payload.playerId !== myPlayerId.value) return
    if (emergencyDrop.value?.dropId === payload.dropId || pendingEmergencyDrop.value?.dropId === payload.dropId) return

    pendingEmergencyDrop.value = payload
    scheduleEmergencyDropPresentation()
}

const scheduleEmergencyDropPresentation = () => {
    if (!pendingEmergencyDrop.value || encounterResult.value) return
    if (emergencyDropDelayTimer !== null) window.clearTimeout(emergencyDropDelayTimer)

    // Combat result and emergency-drop events are delivered independently. This
    // brief queueing window lets the outcome claim the foreground first.
    emergencyDropDelayTimer = window.setTimeout(() => {
        emergencyDropDelayTimer = null
        if (!pendingEmergencyDrop.value || encounterResult.value) return

        emergencyDrop.value = pendingEmergencyDrop.value
        pendingEmergencyDrop.value = null
        if (emergencyDropClearTimer !== null) window.clearTimeout(emergencyDropClearTimer)
        emergencyDropClearTimer = window.setTimeout(() => {
            emergencyDrop.value = null
            emergencyDropClearTimer = null
        }, 4500)
    }, 150)
}

const clearEmergencyDropPresentation = () => {
    if (emergencyDropDelayTimer !== null) window.clearTimeout(emergencyDropDelayTimer)
    if (emergencyDropClearTimer !== null) window.clearTimeout(emergencyDropClearTimer)
    emergencyDropDelayTimer = null
    emergencyDropClearTimer = null
    pendingEmergencyDrop.value = null
    emergencyDrop.value = null
}

const beginRoomRequest = (
    roomId: string,
    destination: '/app/create' | '/app/join',
    kind: PendingRoomRequestKind,
    timeoutMessage: string,
) => {
    if (!client.value || !isConnected.value) return false
    const normalizedRoomId = roomId.trim()
    const normalizedPlayerName = playerName.value.trim()
    if (!normalizedRoomId) {
        lobbyError.value = 'Room ID is required.'
        return false
    }
    if (!normalizedPlayerName || normalizedPlayerName.length > PLAYER_NAME_MAX_LENGTH) {
        lobbyError.value = `Player name must be between 1 and ${PLAYER_NAME_MAX_LENGTH} characters.`
        return false
    }
    lobbyError.value = ''
    clearRoomSubscriptions()
    pendingJoinRoomId.value = normalizedRoomId
    pendingRoomRequestKind.value = kind
    currentPlayerId.value = null
    currentRoomId.value = normalizedRoomId
    activePlayerName.value = normalizedPlayerName
    savePlayerName(normalizedPlayerName)
    const roomSession = createActiveRoomSession(normalizedRoomId, normalizedPlayerName)
    
    subscribeToRoom(normalizedRoomId)
    
    client.value.publish({
        destination,
        body: JSON.stringify({
            roomId: normalizedRoomId,
            playerName: normalizedPlayerName,
            analyticsClientId,
            reconnectToken: roomSession.reconnectToken,
        })
    })

    currentView.value = 'game'
    startRestoredRoomTimeout(normalizedRoomId, timeoutMessage)
    return true
}

const startGeneratedRoomCreation = () => {
    generatedCreateAttempts += 1
    beginRoomRequest(generateRoomCode(), '/app/create', 'create', 'The room could not be created.')
}

const handleCreate = () => {
    generatedCreateAttempts = 0
    startGeneratedRoomCreation()
}

const handleJoin = (roomId: string) => {
    generatedCreateAttempts = 0
    if (beginRoomRequest(roomId, '/app/join', 'join', 'That room did not respond.')) {
        consumeInviteRoute()
    }
}

const handlePlayerNameChange = (updatedPlayerName: string) => {
    playerName.value = updatedPlayerName
    savePlayerName(updatedPlayerName)
    lobbyError.value = ''
}

const handleGameAction = (action: GameAction) => {
    if (!client.value || !isConnected.value) return
    
    console.log("Publishing Action:", action)
    client.value.publish({
        destination: `/app/room/${currentRoomId.value}/action`,
        body: JSON.stringify(action)
    })
}

const handleStartGame = () => {
    console.log("handleStartGame called");
    if (!client.value || !isConnected.value) {
        console.error("Cannot start game: Disconnected");
        return;
    }
    console.log("Publishing /app/start for room:", currentRoomId.value);
    client.value.publish({
        destination: '/app/start',
        body: JSON.stringify({ roomId: currentRoomId.value, playerName: activePlayerName.value })
    })
}

const fetchTraitsForMode = async (mode: GameMode) => {
    const requestGeneration = ++traitRequestGeneration
    try {
        const traitsRes = await fetch(`/api/traits?mode=${mode}`);
        if (traitsRes.ok) {
            const traits = await traitsRes.json();
            if (
                requestGeneration !== traitRequestGeneration
                || activeTraitMode.value !== mode
                || gameState.value?.gameMode !== mode
            ) {
                return
            }
            setTraitData(traits);
        }
    } catch (e) {
        console.error("Failed to fetch traits for mode", mode, e);
    }
}

const handleModeChange = (mode: GameMode) => {
    if (!client.value || !isConnected.value) return
    client.value.publish({
        destination: `/app/room/${currentRoomId.value}/mode`,
        body: JSON.stringify({ playerName: activePlayerName.value, gameMode: mode })
    })
}

const resetToLobby = () => {
    releaseActiveRoomControl()
    clearRoomSubscriptions()
    clearRestoredRoomTimeout()
    clearActiveRoomSession()
    clearEmergencyDropPresentation()

    currentView.value = 'lobby'
    gameState.value = null
    currentRoomId.value = ''
    activeTraitMode.value = null
    hasLostRoomControl.value = false
    traitRequestGeneration += 1
    viewedPlayerId.value = null
    pendingJoinRoomId.value = null
    pendingRoomRequestKind.value = null
    pendingInviteRoomId.value = null
    generatedCreateAttempts = 0
    currentPlayerId.value = null
    activePlayerName.value = ''

    applyThemeMeta(defaultMode.value)
}

const leaveCurrentGame = () => {
    if (client.value && isConnected.value && currentRoomId.value) {
        client.value.publish({
            destination: '/app/leave',
            body: JSON.stringify({ roomId: currentRoomId.value, playerName: activePlayerName.value })
        })
    }
    resetToLobby()
}

const abandonCurrentGame = () => {
    if (client.value && isConnected.value && currentRoomId.value) {
        client.value.publish({
            destination: '/app/abandon',
            body: JSON.stringify({ roomId: currentRoomId.value, playerName: activePlayerName.value })
        })
    }
    resetToLobby()
}

const handleLeaveLobby = () => {
    leaveCurrentGame()
}

const handleMatchHistoryBack = () => {
    window.location.hash = ''
}

const handleOpenMatchHistory = () => {
    window.location.hash = '#/match-history'
}

const activeThemeClass = computed(() => getGameModeMetadata(activeVisualMode.value).themeClass)

const themeClass = computed(() => {
    if (isAdminAnalytics.value) return 'theme-generic'
    if (isUltimateGallery.value) return getGameModeMetadata(ultimateGalleryMode.value).themeClass
    if (currentView.value === 'lobby' || gameState.value?.phase === 'LOBBY') return activeThemeClass.value
    return 'theme-generic'
})

const loadUltimateGallery = async () => {
    if (!import.meta.env.DEV || UltimateGallery.value) return

    const galleryPath = './components/game/UltimateGallery.vue'
    const galleryModule = await import(/* @vite-ignore */ galleryPath)
    UltimateGallery.value = galleryModule.default
}

const consumeInviteRoute = () => {
    pendingInviteRoomId.value = null
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
}

const updateStandaloneRoute = () => {
    const wasAdmin = isAdminAnalytics.value
    const wasMatchHistory = isMatchHistory.value
    const isAdmin = window.location.hash.startsWith('#/admin/analytics')
    const isHistory = window.location.hash === '#/match-history'
    isAdminAnalytics.value = isAdmin
    isMatchHistory.value = isHistory
    if (isAdmin) {
        const validAdminRoute = /^#\/admin\/analytics(?:\/runs\/[^/?#]+)?$/.test(window.location.hash)
        if (!validAdminRoute) window.location.hash = '#/admin/analytics'
        document.title = 'Gameplay Analytics'
        client.value?.deactivate()
        return
    }
    if (isHistory) {
        document.title = 'Match History'
        client.value?.deactivate()
        return
    }
    if (wasAdmin || wasMatchHistory) {
        window.location.reload()
        return
    }
    if (isInviteRoute(window.location.hash)) {
        const roomId = parseInviteRoomId(window.location.hash)
        if (!roomId) {
            lobbyError.value = 'That invite link is invalid.'
            consumeInviteRoute()
            return
        }
        pendingInviteRoomId.value = roomId
        if (
            isConnected.value
            && !gameState.value
            && !pendingJoinRoomId.value
            && playerName.value.trim().length > 0
            && playerName.value.trim().length <= PLAYER_NAME_MAX_LENGTH
        ) {
            handleJoin(roomId)
        }
    } else {
        pendingInviteRoomId.value = null
    }
    const parsedGalleryMode = parseGalleryModeHash(window.location.hash)
    const isGallery = import.meta.env.DEV && parsedGalleryMode !== null
    isUltimateGallery.value = isGallery
    if (isGallery && parsedGalleryMode) {
        ultimateGalleryMode.value = parsedGalleryMode
        applyThemeMeta(ultimateGalleryMode.value)
        void loadUltimateGallery()
    } else if (!isGallery) {
        applyThemeMeta(gameState.value?.gameMode ?? defaultMode.value)
    }
}

const applyThemeMeta = (mode: GameMode) => {
    const iconLinks = Array.from(document.querySelectorAll("link[rel~='icon']")) as HTMLLinkElement[]
    const link = iconLinks[0] ?? document.createElement('link')
    if (!link.parentElement) {
        document.head.appendChild(link)
    }
    iconLinks.slice(1).forEach((duplicate) => duplicate.remove())

    const metadata = getGameModeMetadata(mode)
    link.rel = 'icon'
    link.type = metadata.favicon.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
    link.href = metadata.favicon
    document.title = metadata.documentTitle
}

</script>

<template>
  <MatchHistory v-if="isMatchHistory" @back="handleMatchHistoryBack" />
  <AdminAnalytics v-else-if="isAdminAnalytics" />
  <div v-else :class="['app-container', themeClass]">
    <div v-if="hasLostRoomControl" class="control-lost-overlay" role="alert" aria-live="assertive">
      <div class="control-lost-message">
        <h1>Game opened in another tab</h1>
        <p>The other tab now controls this player.</p>
        <p>Reload this tab if you want to take control here instead.</p>
      </div>
    </div>
    <button v-if="showVersion && currentView === 'lobby'"
            class="changelog-dock"
            type="button"
            @click="currentView = 'changelog'">
        Changelog
    </button>
    <button v-if="showVersion && currentView === 'lobby'"
            class="match-history-dock"
            type="button"
            @click="handleOpenMatchHistory">
        Match history
    </button>
    <VersionDisplay :visible="showVersion" />

    <component :is="UltimateGallery" v-if="isUltimateGallery && UltimateGallery" :mode="ultimateGalleryMode" />

    <div v-else-if="!isConnected" class="loading-screen">
        Connecting to Server...
    </div>
    
    <template v-else>
        <Lobby v-if="currentView === 'lobby'" 
               :title="gameTitle"
               :player-name="playerName"
               :invite-room-id="pendingInviteRoomId || ''"
               :theme-class="activeThemeClass"
               :error="lobbyError"
               @update:player-name="handlePlayerNameChange"
               @create="handleCreate" 
               @join="handleJoin" />

        <Changelog v-else-if="currentView === 'changelog'"
                   @back="currentView = 'lobby'" />
               
        <div v-else class="game-container">
             <!-- If in LOBBY phase, show WaitingRoom -->
             <template v-if="gameState">
                 <WaitingRoom v-if="gameState.phase === 'LOBBY'"
                              :game-state="gameState"
                              :current-player-id="currentPlayerId || ''"
                              :available-modes="availableModes"
                              :default-mode="defaultMode"
                              :theme-class="activeThemeClass"
                              @start="handleStartGame"
                              @leave="handleLeaveLobby"
                              @mode-change="handleModeChange" />

	                 <!-- Otherwise show GameInterface -->
	                 <template v-else>
	                     <GameInterface :state="gameState"
	                                    :current-player-id="currentPlayerId || ''"
	                                    :is-connected="isConnected"
	                                    :emergency-drop="emergencyDrop"
	                                    :queued-emergency-drop="pendingEmergencyDrop"
	                                    :suppress-planning-announcement="hasQueuedEmergencyDrop"
	                                    @action="handleGameAction"
	                                    @view-player="(playerId) => viewedPlayerId = playerId"
	                                    @exit-game="leaveCurrentGame"
	                                    @abandon-game="abandonCurrentGame" />
	                     <Transition name="outcome">
	                        <OutcomeOverlay v-if="encounterResult" :type="encounterResult" />
	                     </Transition>
	                     <DamageReport v-if="gameState.damageLog"
	                                   :damage-log="gameState.damageLog"
	                                   :my-player-id="damageReportPlayerId"
	                                   :my-player-name="damageReportPlayerName"
	                                   :opponent-id="opponentId"
	                                   :opponent-name="opponentName"
	                                   :game-mode="gameState.gameMode" />
	                 </template>
             </template>
             <div v-else class="loading-screen">
                 Initializing Game Room...
             </div>
        </div>
    </template>
  </div>
</template>

<style>
body {
    margin: 0;
    font-family: var(--app-font-family);
    background-color: #0f172a;
    color: #f8fafc;
}

*, *::before, *::after {
    box-sizing: border-box;
}

.app-container {
    width: 100%;
    height: 100vh;
    overflow: hidden;
    background: var(--app-bg);
    color: var(--app-fg);
    transition: background 0.4s ease, color 0.4s ease;
}

.app-container.theme-generic {
    --app-bg: radial-gradient(circle at top, #1f2937 0%, #0b1120 70%);
    --app-fg: #f8fafc;
    --room-bg: radial-gradient(circle at top, #1f2937 0%, #0b1120 70%);
    --room-fg: #f8fafc;
    --room-muted: #94a3b8;
    --room-accent: #f59e0b;
    --room-accent-contrast: #0f172a;
    --room-avatar: #3b82f6;
}

.app-container.theme-onepiece {
    --app-bg: radial-gradient(circle at 20% 10%, #233044 0%, #0b1120 65%);
    --app-fg: #f8fafc;
    --room-bg: radial-gradient(circle at 20% 10%, #233044 0%, #0b1120 65%);
    --room-fg: #f8fafc;
    --room-muted: #cbd5f5;
    --room-accent: #fbbf24;
    --room-accent-contrast: #0b1120;
    --room-avatar: #22d3ee;
}

.app-container.theme-pokemon {
    --app-bg: radial-gradient(circle at top, #1e3a8a 0%, #0f172a 60%);
    --app-fg: #f8fafc;
    --room-bg: radial-gradient(circle at top, #1e3a8a 0%, #0f172a 60%);
    --room-fg: #f8fafc;
    --room-muted: #c7d2fe;
    --room-accent: #fcd34d;
    --room-accent-contrast: #0b1120;
    --room-avatar: #f97316;
}
</style>

<style scoped>
.loading-screen {
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 2em;
}

.control-lost-overlay {
  position: fixed;
  z-index: 1000000;
  display: grid;
  place-items: center;
  inset: 0;
  padding: 24px;
  background: rgba(55, 65, 81, 0.98);
  color: #f8fafc;
  text-align: center;
}

.control-lost-message {
  width: min(520px, 100%);
  padding: 36px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 14px;
  background: rgba(31, 41, 55, 0.88);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}

.control-lost-message h1 {
  margin: 0 0 18px;
  font-size: clamp(1.7rem, 4vw, 2.5rem);
}

.control-lost-message p {
  margin: 8px 0 0;
  color: #d1d5db;
  font-size: 1.05rem;
  line-height: 1.5;
}

.outcome-enter-active {
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.changelog-dock,
.match-history-dock {
  position: fixed;
  bottom: 30px;
  z-index: 10000;
  padding: 5px 8px;
  border: 1px solid rgba(251, 191, 36, 0.34);
  border-radius: 5px;
  background: rgba(15, 23, 42, 0.76);
  color: #fde68a;
  font-family: 'Courier New', monospace;
  font-size: 0.66rem;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.changelog-dock {
  left: 8px;
}

.match-history-dock {
  left: 90px;
}

.changelog-dock:hover,
.match-history-dock:hover {
  border-color: rgba(251, 191, 36, 0.68);
  background: rgba(30, 41, 59, 0.92);
  color: #fef3c7;
}

.outcome-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.outcome-leave-to {
  opacity: 0;
  transform: translate(-50%, -60%) scale(0.8);
}

@keyframes popIn {
  from {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}
</style>
