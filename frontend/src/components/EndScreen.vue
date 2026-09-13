<template>
  <div class="end-screen">
    <div class="end-screen__card">
      <!-- Background accent -->
      <div class="end-screen__accent"></div>

      <div class="end-screen__burst-container" ref="burstContainer">
        <div class="end-screen__burst-icon" :class="getPlaceClass(myPlace)">
          {{ getPlaceIcon(myPlace) }}
        </div>
        <h1 class="end-screen__title" :class="getPlaceClass(myPlace)">
          {{ getPlaceTitle(myPlace) }}
        </h1>
      </div>

      <div class="end-screen__result">
        You finished <span :class="getPlaceClass(myPlace)">#{{ myPlace || '-' }}</span>
      </div>

      <section class="match-summary" aria-labelledby="match-summary-title">
        <header class="match-summary__header">
          <h2 id="match-summary-title">{{ summaryTitle }}</h2>
          <span class="match-record">
            <strong class="win">{{ matchStats.roundsWon }}W</strong>
            <strong class="loss">{{ matchStats.roundsLost }}L</strong>
            <strong v-if="matchStats.roundsDrawn" class="draw"
              >{{ matchStats.roundsDrawn }}D</strong
            >
          </span>
        </header>
        <div class="match-summary__totals">
          <div>
            <span>Damage dealt</span>
            <strong>{{ formatStat(matchStats.damageDealt) }}</strong>
          </div>
          <div>
            <span>Damage taken</span>
            <strong>{{ formatStat(matchStats.damageTaken) }}</strong>
          </div>
          <div>
            <span>Healing done</span>
            <strong>{{ formatStat(matchStats.healingDone) }}</strong>
          </div>
          <div>
            <span>Shielding done</span>
            <strong>{{ formatStat(matchStats.shieldingDone) }}</strong>
          </div>
        </div>
        <div v-if="matchStats.rounds.length" class="round-history" aria-label="Round results">
          <span
            v-for="round in matchStats.rounds"
            :key="round.round"
            class="round-result"
            :class="round.outcome.toLowerCase()"
            :title="`Round ${round.round}: ${round.outcome.toLowerCase()}`"
          >
            <small>R{{ round.round }}</small>
            <strong>{{ round.outcome.charAt(0) }}</strong>
          </span>
        </div>
        <div class="unit-totals">
          <h3>Unit totals</h3>
          <div v-if="sortedUnitStats.length" class="unit-totals__table">
            <div class="unit-totals__row unit-totals__header" aria-hidden="true">
              <span>Unit</span>
              <span>Dealt</span>
              <span>Taken</span>
              <span>Heal</span>
              <span>Shield</span>
            </div>
            <div v-for="unit in sortedUnitStats" :key="unit.lineId" class="unit-totals__row">
              <span class="unit-totals__unit">
                <img :src="getUnitIconPath(unit.definitionId, gameMode)" :alt="unit.unitName" />
                <span>
                  <strong>{{ unit.unitName }}</strong>
                  <small>{{ unit.starLevel }}★</small>
                </span>
              </span>
              <span>{{ formatStat(unit.damageDealt) }}</span>
              <span>{{ formatStat(unit.damageTaken) }}</span>
              <span>{{ formatStat(unit.healingDone) }}</span>
              <span>{{ formatStat(unit.shieldingDone) }}</span>
            </div>
          </div>
          <p v-else class="unit-totals__empty">No unit combat stats recorded.</p>
        </div>
      </section>

      <div class="end-screen__rankings">
        <div class="end-screen__rankings-header">
          <span>Player</span>
          <span>Rank</span>
        </div>

        <button
          v-for="player in sortedPlayers"
          :key="player.playerId"
          type="button"
          class="end-screen__player"
          :class="{
            'end-screen__player--me': player.playerId === myPlayerId,
            'end-screen__player--selected': player.playerId === selectedPlayerId,
          }"
          :aria-pressed="player.playerId === selectedPlayerId"
          @click="selectedPlayerId = player.playerId"
        >
          <div class="end-screen__player-info">
            <div class="end-screen__player-level">
              {{ player.level }}
            </div>
            <span class="end-screen__player-name">{{ player.name }}</span>
            <span v-if="player.playerId === myPlayerId" class="end-screen__you-badge">YOU</span>
          </div>

          <div class="end-screen__player-place" :class="getPlaceClass(player.place)">
            #{{ player.place || '-' }}
          </div>
        </button>
      </div>

      <div class="end-screen__actions">
        <button @click="reloadGame" class="end-screen__play-again">Play Again</button>
        <button @click="returnHome" class="end-screen__return-home">Return to Home</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { GameMode, MatchStats, PlayerState } from '../types'
import { getUnitIconPath } from '../utils/iconUtils'

const props = defineProps<{
  players: PlayerState[]
  myPlayerId: string | undefined
  gameMode: GameMode
}>()

const emit = defineEmits(['exit'])

const sortedPlayers = computed(() => {
  return [...props.players].sort((a, b) => {
    const pA = a.place || 99
    const pB = b.place || 99
    return pA - pB
  })
})

const myPlayer = computed(() => props.players.find((p) => p.playerId === props.myPlayerId))
const myPlace = computed(() => (myPlayer.value ? myPlayer.value.place : '?'))
const isWinner = computed(() => myPlace.value === 1)
const selectedPlayerId = ref(props.myPlayerId ?? sortedPlayers.value[0]?.playerId)
const selectedPlayer = computed(
  () =>
    props.players.find((player) => player.playerId === selectedPlayerId.value) ?? myPlayer.value,
)
const emptyMatchStats: MatchStats = {
  damageDealt: 0,
  damageTaken: 0,
  healingDone: 0,
  shieldingDone: 0,
  roundsWon: 0,
  roundsLost: 0,
  roundsDrawn: 0,
  rounds: [],
  unitStats: [],
}
const matchStats = computed(() => selectedPlayer.value?.matchStats ?? emptyMatchStats)
const summaryTitle = computed(() => {
  if (!selectedPlayer.value || selectedPlayer.value.playerId === props.myPlayerId) {
    return 'Your Match Summary'
  }
  return `${selectedPlayer.value.name}'s Match Summary`
})
const sortedUnitStats = computed(() =>
  [...matchStats.value.unitStats].sort(
    (a, b) => b.damageDealt - a.damageDealt || a.unitName.localeCompare(b.unitName),
  ),
)

watch(
  () => props.players,
  (players) => {
    if (!players.some((player) => player.playerId === selectedPlayerId.value)) {
      selectedPlayerId.value = props.myPlayerId ?? sortedPlayers.value[0]?.playerId
    }
  },
)

const formatStat = (value: number) => new Intl.NumberFormat().format(value)

function getPlaceClass(place: number | string | null | undefined) {
  if (place === 1) return 'place--gold'
  if (place === 2) return 'place--silver'
  if (place === 3) return 'place--bronze'
  return 'place--default'
}

function getPlaceIcon(place: number | string | null | undefined) {
  if (place === 1) return '🏆'
  if (place === 2) return '🥈'
  if (place === 3) return '🥉'
  return '💀'
}

function getPlaceTitle(place: number | string | null | undefined) {
  if (place === 1) return '1st Place'
  if (place === 2) return '2nd Place'
  if (place === 3) return '3rd Place'
  return 'Game Over'
}

function reloadGame() {
  emit('exit')
}

function returnHome() {
  emit('exit')
}

// === GOLDEN BURST & CONFETTI ===
const burstContainer = ref<HTMLElement | null>(null)
const animationTimers = new Set<number>()

function scheduleAnimation(callback: () => void, delay: number) {
  const timer = window.setTimeout(() => {
    animationTimers.delete(timer)
    callback()
  }, delay)
  animationTimers.add(timer)
}

onMounted(() => {
  // Slight delay to ensure DOM is ready and entry animation is playing
  scheduleAnimation(triggerBurst, 100)
})

onUnmounted(() => {
  animationTimers.forEach((timer) => window.clearTimeout(timer))
  animationTimers.clear()
})

function triggerBurst() {
  if (!burstContainer.value) return

  let particleColor = '#64748b' // default slate
  if (isWinner.value)
    particleColor = '#fbbf24' // gold
  else if (myPlace.value === 2)
    particleColor = '#e2e8f0' // silver
  else if (myPlace.value === 3) particleColor = '#d97706' // bronze

  // Burst particles
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div')
    p.className = 'burst-particle'

    // Randomly mix standard color with a bit of white or darker variants
    const colors = [particleColor, '#ffffff', particleColor]
    p.style.background = colors[Math.floor(Math.random() * colors.length)]

    p.style.left = '50%'
    p.style.top = '20%'

    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * 300 + 50
    const duration = Math.random() * 0.8 + 0.4

    p.style.transition = `all ${duration}s cubic-bezier(0.1, 0.8, 0.3, 1)`
    burstContainer.value.appendChild(p)

    // Force reflow
    void p.offsetWidth

    const tx = Math.cos(angle) * distance
    const ty = Math.sin(angle) * distance
    p.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`
    p.style.opacity = '0'

    scheduleAnimation(() => p.remove(), duration * 1000)
  }

  // Confetti (falling from top)
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('div')
    c.className = 'confetti-particle'
    const colors = [particleColor, '#ffffff', particleColor, particleColor]
    c.style.background = colors[Math.floor(Math.random() * colors.length)]

    c.style.width = c.style.height = Math.random() * 8 + 4 + 'px'
    c.style.left = Math.random() * 100 + '%'
    c.style.top = '-20px'
    c.style.borderRadius = Math.random() > 0.5 ? '0' : '50%'

    const duration = Math.random() * 2 + 1.5
    const drift = Math.random() * 200 - 100 + 'px'

    c.style.transition = `top ${duration}s cubic-bezier(.37,0,.63,1), left ${duration}s ease, transform ${duration}s linear`
    burstContainer.value.appendChild(c)

    // Force reflow
    void c.offsetWidth

    c.style.top = '120%'
    c.style.left = `calc(${c.style.left} + ${drift})`
    c.style.transform = `rotate(${Math.random() * 720}deg)`

    scheduleAnimation(() => c.remove(), duration * 1000)
  }
}
</script>

<style scoped>
.end-screen {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(4px);
  animation: fadeIn 0.5s ease-out;
}

.end-screen__card {
  background: #0f172a;
  border: 1px solid #334155;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  max-width: 820px;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center; /* keep everything centered */
  gap: 24px;
  position: relative;
  max-height: calc(100vh - 32px);
  overflow-x: hidden;
  overflow-y: auto;
}

.end-screen__accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(to right, transparent, #f59e0b, transparent);
  opacity: 0.5;
}

.end-screen__burst-container {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: scale(0.5);
  opacity: 0;
  animation: burstIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.end-screen__burst-icon {
  font-size: 80px;
  filter: drop-shadow(0 0 20px currentColor);
  animation: pulseIcon 2s infinite alternate;
  margin-bottom: 8px;
  z-index: 2;
}

.end-screen__title {
  font-size: 48px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.025em;
  margin: 0;
  text-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
  z-index: 2;
}

.end-screen__title--winner {
  background: linear-gradient(to bottom, #fcd34d, #d97706);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
}

.end-screen__title--loser {
  color: #94a3b8;
}

.end-screen__result {
  font-size: 20px;
  color: #cbd5e1;
  font-weight: 500;
}

.match-summary {
  width: 100%;
  padding: 16px;
  border: 1px solid #334155;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.7);
  box-sizing: border-box;
  text-align: left;
}

.match-summary__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.match-summary__header h2 {
  margin: 0;
  color: #e2e8f0;
  font-size: 15px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.match-record {
  display: flex;
  gap: 8px;
  font-size: 14px;
}

.match-record .win,
.round-result.win {
  color: #4ade80;
}

.match-record .loss,
.round-result.loss {
  color: #f87171;
}

.match-record .draw,
.round-result.draw {
  color: #facc15;
}

.match-summary__totals {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.match-summary__totals div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 7px;
  background: #1e293b;
}

.match-summary__totals span {
  color: #94a3b8;
  font-size: 11px;
}

.match-summary__totals strong {
  color: #f8fafc;
  font-size: 18px;
}

.round-history {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  padding-bottom: 2px;
  overflow-x: auto;
}

.round-result {
  display: grid;
  flex: 0 0 auto;
  min-width: 31px;
  padding: 5px;
  border: 1px solid #334155;
  border-radius: 6px;
  background: #0f172a;
  place-items: center;
}

.round-result small {
  color: #64748b;
  font-size: 9px;
}

.unit-totals {
  margin-top: 14px;
}

.unit-totals h3 {
  margin: 0 0 8px;
  color: #cbd5e1;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.unit-totals__table {
  min-width: 560px;
  overflow: hidden;
  border: 1px solid #334155;
  border-radius: 8px;
}

.unit-totals__row {
  display: grid;
  grid-template-columns: minmax(170px, 1.6fr) repeat(4, minmax(64px, 0.7fr));
  align-items: center;
  min-height: 44px;
  padding: 5px 10px;
  border-top: 1px solid rgba(51, 65, 85, 0.65);
  color: #e2e8f0;
  font-size: 12px;
  text-align: right;
}

.unit-totals__row:first-child {
  border-top: 0;
}

.unit-totals__header {
  min-height: 28px;
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.unit-totals__row > :first-child {
  text-align: left;
}

.unit-totals__unit {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.unit-totals__unit img {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  border-radius: 5px;
  object-fit: cover;
}

.unit-totals__unit > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.unit-totals__unit strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-totals__unit small,
.unit-totals__empty {
  color: #94a3b8;
}

.unit-totals__empty {
  margin: 10px 0 0;
  font-size: 12px;
}

.end-screen__rankings {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(30, 41, 59, 0.5);
  border-radius: 8px;
  padding: 16px;
  max-height: 50vh;
  overflow-y: auto;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
}

.end-screen__rankings-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  padding: 0 16px 8px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}

.end-screen__player {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 6px;
  background: #1e293b;
  border: 1px solid transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: background 0.2s;
}

.end-screen__player:hover {
  background: #334155;
}

.end-screen__player--me {
  box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.3);
  background: rgba(51, 65, 85, 0.5);
}

.end-screen__player--selected {
  border-color: #f59e0b;
  background: #334155;
}

.end-screen__player-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.end-screen__player-level {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #e2e8f0;
}

.end-screen__player-name {
  font-weight: 700;
  color: #e2e8f0;
}

.end-screen__you-badge {
  font-size: 11px;
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
  padding: 2px 6px;
  border-radius: 4px;
}

.end-screen__player-place {
  font-weight: 900;
  font-size: 20px;
}

.end-screen__actions {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  width: 100%;
}

.end-screen__play-again,
.end-screen__return-home {
  flex: 1;
  padding: 12px 24px;
  font-weight: 700;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.end-screen__play-again {
  background: #d97706;
  color: white;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
}

.end-screen__play-again:hover {
  background: #f59e0b;
  box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.3);
  transform: translateY(-2px);
}

.end-screen__return-home {
  background: #334155;
  color: #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.end-screen__return-home:hover {
  background: #475569;
  transform: translateY(-2px);
}

/* Place ranking colors */
.place--gold {
  color: #fbbf24;
}

.place--silver {
  color: #cbd5e1;
}

.place--bronze {
  color: #b45309;
}

.place--default {
  color: #64748b;
}

:deep(.burst-particle) {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;
}

:deep(.confetti-particle) {
  position: absolute;
  pointer-events: none;
  z-index: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes burstIn {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes pulseIcon {
  from {
    filter: drop-shadow(0 0 10px currentColor);
    transform: scale(0.95);
  }
  to {
    filter: drop-shadow(0 0 30px currentColor);
    transform: scale(1.05);
  }
}

@media (max-width: 680px) {
  .end-screen__card {
    padding: 20px;
  }

  .match-summary__totals {
    grid-template-columns: repeat(2, 1fr);
  }

  .unit-totals {
    overflow-x: auto;
  }
}
</style>
