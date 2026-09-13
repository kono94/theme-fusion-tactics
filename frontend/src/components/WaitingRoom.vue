<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { GameMode, GameState, PlayerState } from '../types'
import { getGameModeMetadata, sortGameModes } from '../data/gameModeMetadata'
import { buildInviteUrl } from '../utils/roomInvite'

const props = defineProps<{
  gameState: GameState
  currentPlayerId: string
  availableModes: GameMode[]
  defaultMode: GameMode
  themeClass?: string
}>()

const emit = defineEmits(['start', 'leave', 'mode-change'])

const isHost = computed(() => {
    return props.currentPlayerId === props.gameState.hostId
})

const players = computed((): PlayerState[] => {
    if (!props.gameState || !props.gameState.players) return []
    return Object.values(props.gameState.players)
})

const selectedMode = ref<GameMode>(props.gameState?.gameMode ?? props.defaultMode ?? 'onepiece')

watch(
    () => props.gameState?.gameMode,
    (mode) => {
        if (mode && mode !== selectedMode.value) {
            selectedMode.value = mode
        }
    }
)

const modeOptions = computed((): GameMode[] => {
    return props.availableModes && props.availableModes.length > 0
        ? sortGameModes(props.availableModes)
        : ['onepiece', 'pokemon']
})

const modeMetadata = (mode: GameMode) => getGameModeMetadata(mode)

const modeDescriptions: Record<GameMode, string> = {
    onepiece: 'Set sail with legendary pirates',
    pokemon: 'Build a team of iconic trainers',
}

const themeClass = computed(() => {
    return props.themeClass ?? getGameModeMetadata(props.gameState?.gameMode ?? props.defaultMode).themeClass
})

const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
let copyResetTimer: number | null = null

async function copyInviteLink() {
    try {
        await navigator.clipboard.writeText(buildInviteUrl(props.gameState.roomId))
        copyState.value = 'copied'
    } catch {
        copyState.value = 'failed'
    }

    if (copyResetTimer !== null) window.clearTimeout(copyResetTimer)
    copyResetTimer = window.setTimeout(() => {
        copyState.value = 'idle'
        copyResetTimer = null
    }, 2000)
}

onUnmounted(() => {
    if (copyResetTimer !== null) window.clearTimeout(copyResetTimer)
})

function selectMode(mode: GameMode) {
    if (mode === selectedMode.value) return

    selectedMode.value = mode
    emit('mode-change', mode)
}

</script>

<template>
  <div :class="['waiting-room', themeClass]">
    <div class="header">
        <h2>Lobby: {{ gameState.roomId }}</h2>
        <button class="invite-btn" type="button" @click="copyInviteLink">
            {{ copyState === 'copied' ? 'Copied!' : copyState === 'failed' ? 'Copy failed' : 'Copy Invite Link' }}
        </button>
    </div>

    <div class="player-list">
        <h3>Connected Players ({{ players.length }}/8)</h3>
        <div class="players-grid">
            <div v-for="player in players" :key="player.playerId" class="player-card">
                <div class="avatar">
                    <!-- Placeholder avatar -->
                    {{ player.name.charAt(0).toUpperCase() }}
                </div>
                <div class="name">
                    {{ player.name }}
                    <span v-if="player.playerId === gameState.hostId" class="host-badge">HOST</span>
                    <span v-if="player.playerId === currentPlayerId" class="me-badge">YOU</span>
                </div>
            </div>
             <!-- Empty slots -->
             <div v-for="i in (8 - players.length)" :key="'empty-' + i" class="player-card empty">
                <div class="avatar empty-avatar">?</div>
                <div class="name">Waiting...</div>
            </div>
        </div>
    </div>

    <div class="mode-panel">
        <div class="mode-heading">
            <div>
                <div class="mode-label">Game theme</div>
                <h3>Choose your battlefield</h3>
                <p>Pick the world your room will play in.</p>
            </div>
            <div class="mode-status" :class="{ locked: !isHost }">
                <span class="status-dot" aria-hidden="true"></span>
                {{ isHost ? 'Host selection' : 'Host controlled' }}
            </div>
        </div>
        <div class="mode-control" role="group" aria-label="Select game theme">
            <button
                v-for="mode in modeOptions"
                :key="mode"
                type="button"
                class="mode-option"
                :class="[`mode-option-${mode}`, { active: selectedMode === mode }]"
                :aria-pressed="selectedMode === mode"
                :aria-label="`Select ${modeMetadata(mode).label} mode`"
                :aria-disabled="!isHost"
                :disabled="!isHost"
                @click="selectMode(mode)"
            >
                <span class="mode-motif" :class="`motif-${mode}`" aria-hidden="true">
                    <span v-if="mode === 'onepiece'" class="mode-motif-star">✦</span>
                </span>
                <span class="mode-name">{{ modeMetadata(mode).label }}</span>
                <span class="mode-caption">{{ modeDescriptions[mode] }}</span>
                <span v-if="selectedMode === mode" class="mode-check" aria-hidden="true">✓</span>
            </button>
        </div>
    </div>

    <div class="actions">
        <button class="leave-btn" @click="$emit('leave')">Leave Lobby</button>
        <button v-if="isHost" class="start-btn" @click="$emit('start')">START GAME</button>
        <div v-else class="waiting-msg">Waiting for host to start...</div>
    </div>
  </div>
</template>

<style scoped>
.waiting-room {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 28px 40px 24px;
    height: 100vh;
    color: var(--room-fg);
    background: var(--room-bg);
    transition: background 0.4s ease, color 0.4s ease;
    overflow: auto;
}

.header {
    text-align: center;
    margin-bottom: 14px;
}

.invite-btn {
    margin-top: 10px;
    padding: 8px 14px;
    border: 1px solid color-mix(in srgb, var(--room-accent) 55%, transparent);
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.5);
    color: var(--room-fg);
    font: inherit;
    font-size: 0.82rem;
    font-weight: 800;
    cursor: pointer;
}

.invite-btn:hover {
    border-color: var(--room-accent);
    background: rgba(15, 23, 42, 0.72);
}

.header h2 {
    font-size: 2.5em;
    margin: 0;
    color: var(--room-accent);
}

.player-list {
    width: 100%;
    max-width: 800px;
    margin-bottom: 24px;
}

.player-list h3 {
    text-align: center;
    margin-bottom: 12px;
    color: var(--room-muted);
}

.players-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
}

.player-card {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: transform 0.2s;
}

.player-card:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.15);
}

.player-card.empty {
    opacity: 0.5;
    border-style: dashed;
}

.avatar {
    width: 60px;
    height: 60px;
    background: var(--room-avatar);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.5em;
    font-weight: bold;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.empty-avatar {
    background: transparent;
    border: 2px solid rgba(255, 255, 255, 0.3);
}

.name {
    font-weight: bold;
    display: flex;
    gap: 5px;
    align-items: center;
}

.host-badge, .me-badge {
    font-size: 0.7em;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--room-accent);
    color: var(--room-accent-contrast);
}

.me-badge {
    background: #4ade80;
    color: #0f172a;
}

.mode-panel {
    width: 100%;
    max-width: 760px;
    padding: 18px;
    border-radius: 20px;
    margin-bottom: 16px;
    background: rgba(9, 15, 30, 0.34);
    border: 1px solid rgba(255, 255, 255, 0.16);
    box-shadow: 0 18px 45px rgba(2, 6, 23, 0.22);
    backdrop-filter: blur(16px);
}

.mode-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 14px;
}

.mode-label {
    font-size: 0.72em;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--room-muted);
}

.mode-heading h3 {
    margin: 3px 0 2px;
    color: var(--room-fg);
    font-size: 1.12em;
}

.mode-heading p {
    margin: 0;
    color: var(--room-muted);
    font-size: 0.78em;
}

.mode-status {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 8px;
    padding: 6px 9px;
    border: 1px solid rgba(74, 222, 128, 0.34);
    border-radius: 999px;
    background: rgba(34, 197, 94, 0.12);
    color: #bbf7d0;
    font-size: 0.65em;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.mode-status.locked {
    border-color: rgba(148, 163, 184, 0.28);
    background: rgba(148, 163, 184, 0.12);
    color: var(--room-muted);
}

.status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #4ade80;
    box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.14);
}

.locked .status-dot {
    background: #94a3b8;
    box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.12);
}

.mode-control {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.mode-option {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 62px;
    padding: 10px 12px;
    gap: 10px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 16px;
    background: rgba(15, 23, 42, 0.42);
    color: var(--room-fg);
    text-align: left;
    cursor: pointer;
    transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
    -webkit-user-select: none;
    user-select: none;
}

.mode-option:focus-visible {
    outline: 3px solid #fbbf24;
    outline-offset: 2px;
}

.mode-option:disabled {
    cursor: default;
}

.mode-option:disabled:not(.active) {
    opacity: 0.72;
}

.mode-motif {
    position: relative;
    display: flex;
    flex: 0 0 38px;
    width: 38px;
    height: 38px;
    align-items: center;
    justify-content: center;
    border: 2px solid currentColor;
    border-radius: 50%;
    font-size: 1.05em;
    line-height: 1;
    box-shadow: inset 0 0 0 5px rgba(255, 255, 255, 0.1);
}

.motif-onepiece {
    border-color: #fbbf24;
    background: radial-gradient(circle, #fef3c7 0 20%, #f59e0b 21% 38%, #172554 39% 100%);
    color: #fff7ed;
}

.motif-pokemon {
    overflow: hidden;
    border-color: #f97316;
    background: linear-gradient(180deg, #f97316 0 44%, #172554 44% 56%, #f8fafc 56%);
    color: #172554;
}

.motif-pokemon::after {
    width: 18px;
    height: 18px;
    border: 4px solid #172554;
    border-radius: 50%;
    background: #f8fafc;
    content: '';
}

.mode-motif-star {
    transform: translateY(-1px);
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.75);
}

.mode-name {
    font-size: 0.95em;
    font-weight: 800;
}

.mode-caption {
    display: none;
    color: var(--room-muted);
    font-size: 0.78em;
    line-height: 1.3;
}

.mode-check {
    position: absolute;
    top: 7px;
    right: 8px;
    display: grid;
    width: 18px;
    height: 18px;
    place-items: center;
    border-radius: 50%;
    background: var(--room-accent);
    color: var(--room-accent-contrast);
    font-size: 0.68em;
    font-weight: 900;
}

.mode-option:hover:not(:disabled) {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.32);
    background: rgba(255, 255, 255, 0.1);
}

.mode-option.active {
    border-color: var(--room-accent);
    background: color-mix(in srgb, var(--room-accent) 16%, rgba(15, 23, 42, 0.72));
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--room-accent) 34%, transparent), 0 12px 26px rgba(2, 6, 23, 0.18);
}

.actions {
    display: flex;
    gap: 20px;
    align-items: center;
}

button {
    padding: 15px 40px;
    border-radius: 8px;
    border: none;
    font-size: 1.2em;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
}

.start-btn {
    background: linear-gradient(to right, #ffd700, #f59e0b);
    color: black;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}

.start-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
}

.leave-btn {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.leave-btn:hover {
    background: rgba(255, 0, 0, 0.2);
    border-color: rgba(255, 0, 0, 0.4);
}

.waiting-msg {
    font-size: 1.2em;
    color: #94a3b8;
    font-style: italic;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
}

@media (max-width: 720px) {
    .waiting-room {
        padding: 28px 14px;
    }

    .players-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
    }

    .mode-panel {
        padding: 18px;
        border-radius: 20px;
    }

    .mode-heading {
        flex-direction: column;
        gap: 12px;
    }

    .mode-control {
        width: 100%;
        grid-template-columns: 1fr;
    }

    .mode-option {
        min-height: 58px;
    }
}

@media (prefers-reduced-motion: reduce) {
    .waiting-room *,
    .waiting-room *::before,
    .waiting-room *::after {
        animation: none !important;
        transition-duration: 0.01ms !important;
    }
}
</style>
