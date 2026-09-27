<template>
  <div class="player-list">
    <div class="list-container custom-scrollbar">
      <div
        v-for="player in sortedPlayers"
        :key="player.playerId"
        class="player-item"
        :class="[
          player.playerId === myPlayerId ? 'my-player' : 'other-player',
          player.playerId === selectedPlayerId ? 'selected-player' : '',
          player.health <= 0 ? 'dead' : '',
          isSelectable(player) ? 'selectable' : ''
        ]"
        :tabindex="isSelectable(player) ? 0 : -1"
        :role="isSelectable(player) ? 'button' : undefined"
        @click="selectPlayer(player)"
        @keydown.enter="selectPlayer(player)"
        @keydown.space.prevent="selectPlayer(player)"
      >
        <!-- Avatar/Icon Placeholder -->
        <div class="avatar-box">
           <span class="level-text">{{ player.level }}</span>
        </div>
      
        <!-- Info -->
        <div class="info-col">
           <div class="name-row">
              <span class="player-name" :title="player.name">
                {{ player.name }} {{ player.isGhost ? '(Ghost)' : '' }}
              </span>
              <span v-if="player.isBot && player.botPersonality" class="bot-personality">
                {{ botPersonalityLabel(player.botPersonality) }}
              </span>
              <span class="health-text" :class="getHealthColor(player.health)">
                {{ player.health }}
              </span>
           </div>
           <!-- HP Bar -->
           <div class="hp-bar-bg">
              <div 
                class="hp-bar-fill"
                :class="getHealthBarClass(player.health)"
                :style="{ width: Math.max(0, player.health) + '%' }"
              ></div>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BotPersonality, PlayerState } from '../types';

const props = defineProps<{
  players: PlayerState[];
  myPlayerId: string | undefined;
  selectedPlayerId: string | undefined;
}>();

const emit = defineEmits<{
  'select-player': [playerId: string]
}>();

const sortedPlayers = computed(() => {
  return [...props.players].sort((a, b) => {
    const aDead = a.health <= 0;
    const bDead = b.health <= 0;
    
    // 1. Living players above dead players
    if (aDead !== bDead) {
      return aDead ? 1 : -1;
    }
    
    // 2. If both dead, sort by Place (ASC)
    if (aDead && bDead) {
       if (a.place && b.place) return a.place - b.place;
       if (a.place) return -1;
       if (b.place) return 1;
    }
    
    // 3. Keep Active players sorted by HP (DESC)
    if (b.health !== a.health) {
        return b.health - a.health;
    }
    
    return 0;
  });
});

function isSelectable(player: PlayerState) {
    if (player.playerId === props.myPlayerId) return true;
    return player.health > 0 && !player.isGhost;
}

function selectPlayer(player: PlayerState) {
    if (!isSelectable(player)) return;
    emit('select-player', player.playerId);
}

function botPersonalityLabel(personality: BotPersonality) {
    const labels: Record<BotPersonality, string> = {
        BALANCED: 'Balanced',
        ECONOMY: 'Economy',
        REROLL: 'Reroll',
        FAST_LEVEL: 'Fast level',
        TRAIT_FOCUSED: 'Trait focused',
    }
    return labels[personality]
}

function getHealthColor(health: number) {
    if (health > 50) return 'text-green-400';
    if (health > 20) return 'text-yellow-400';
    return 'text-red-500';
}

function getHealthBarClass(health: number) {
    if (health > 50) return 'bg-green-500';
    if (health > 20) return 'bg-yellow-500';
    return 'bg-red-600';
}
</script>

<style scoped>
.player-list {
    width: 100%;
    height: 100%;
    min-height: 0;
    padding: 8px;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
}


.list-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1; /* Fill remaining space */
    min-height: 0; /* Allow shrinking */
    overflow-y: auto;
}

.player-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: rgba(30, 41, 59, 0.4);
    transition: all 0.2s;
}

.player-item.selectable {
    cursor: pointer;
}

.player-item.my-player {
    background: rgba(51, 65, 85, 0.6);
    border: 1px solid rgba(245, 158, 11, 0.5);
}

.player-item.selectable:hover,
.player-item.selectable:focus-visible {
    background: rgba(51, 65, 85, 0.8);
    outline: none;
}

.player-item.selected-player {
    background: rgba(30, 64, 175, 0.46);
    border: 1px solid rgba(96, 165, 250, 0.8);
    box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.22), 0 0 16px rgba(37, 99, 235, 0.22);
}

.player-item.dead {
    opacity: 0.6;
    filter: grayscale(1);
}

.avatar-box {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    background: #334155;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #475569;
    flex-shrink: 0;
}

.level-text {
    font-size: 12px;
    font-weight: bold;
    color: white;
}

.info-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
}

.name-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.player-name {
    font-size: 12px;
    font-weight: 500;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}

.bot-personality {
    flex-shrink: 0;
    padding: 1px 5px;
    border: 1px solid rgba(56, 189, 248, 0.35);
    border-radius: 999px;
    color: #7dd3fc;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.04em;
    line-height: 1.4;
    text-transform: uppercase;
}

.health-text {
    margin-left: auto;
    font-size: 12px;
    font-weight: bold;
}

.hp-bar-bg {
    height: 6px;
    width: 100%;
    background: #020617;
    border-radius: 3px;
    overflow: hidden;
}

.hp-bar-fill {
    height: 100%;
    transition: width 0.5s ease-out;
}

/* Colors helpers that were Tailwind classes */
.text-green-400 { color: #4ade80; }
.text-yellow-400 { color: #facc15; }
.text-red-500 { color: #ef4444; }

.bg-green-500 { background-color: #22c55e; }
.bg-yellow-500 { background-color: #eab308; }
.bg-red-600 { background-color: #dc2626; }

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(30, 41, 59, 0.5);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 2px;
}
</style>
