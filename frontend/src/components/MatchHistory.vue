<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getMatchHistory, MatchHistoryApiError } from '../services/matchHistoryClient'
import type { PublicMatch } from '../types/analytics'
import FinalCompositionStrip from './FinalCompositionStrip.vue'

defineOptions({
    name: 'PublicMatchHistory',
})

const emit = defineEmits<{
    back: []
}>()

const matches = ref<PublicMatch[]>([])
const loading = ref(true)
const error = ref('')
let requestController: AbortController | null = null

const loadMatches = async () => {
    requestController?.abort()
    requestController = new AbortController()
    loading.value = true
    error.value = ''
    try {
        const response = await getMatchHistory(requestController.signal)
        matches.value = response.matches
    } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        if (cause instanceof MatchHistoryApiError) {
            error.value = cause.message
        } else {
            error.value = 'Match history could not be loaded.'
        }
    } finally {
        loading.value = false
    }
}

const formatDate = (value: string) =>
    new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

const modeLabel = (mode: string) => mode === 'onepiece' ? 'One Piece' : mode === 'pokemon' ? 'Pokemon' : mode

onMounted(() => void loadMatches())

onBeforeUnmount(() => {
    requestController?.abort()
})
</script>

<template>
  <main class="match-history-page">
    <button class="back-button" type="button" @click="emit('back')">Back</button>
    <header class="match-history-header">
      <p class="eyebrow">Public feed</p>
      <h1>Match history</h1>
      <p>Last completed solo matches played by real players against seven bots.</p>
    </header>

    <div v-if="loading" class="match-history-state" data-test="match-history-loading" role="status">
      Loading match history…
    </div>
    <div v-else-if="error" class="match-history-state match-history-error" data-test="match-history-error" role="alert">
      <p>{{ error }}</p>
      <button type="button" data-test="match-history-retry" @click="loadMatches">Retry</button>
    </div>
    <div v-else-if="matches.length === 0" class="match-history-state" data-test="match-history-empty" role="status">
      No completed solo matches yet.
    </div>
    <section v-else class="match-history-list" aria-label="Last completed matches">
      <article v-for="match in matches" :key="match.historyId" class="match-history-card" data-test="match-history-card">
        <div class="match-history-card__meta">
          <div>
            <h2>{{ modeLabel(match.mode) }} solo match</h2>
            <time :datetime="match.completedAt">{{ formatDate(match.completedAt) }}</time>
          </div>
          <div class="match-history-card__result">
            <strong>#{{ match.finalPlacement }}</strong>
            <span>Placement</span>
          </div>
        </div>
        <p class="match-history-card__round">Final round <strong>{{ match.finalRound }}</strong> · 1 real player vs 7 bots</p>
        <FinalCompositionStrip
          :mode="match.mode"
          :composition="match.finalComposition"
          readable-labels
          compact
        />
      </article>
    </section>
  </main>
</template>

<style scoped>
.match-history-page {
  min-height: 100vh;
  padding: 28px clamp(18px, 5vw, 72px) 64px;
  overflow: auto;
  color: #f8fafc;
  background: radial-gradient(circle at top, #1f2937 0%, #0b1120 70%);
}

.back-button {
  border: 1px solid #475569;
  border-radius: 8px;
  padding: 8px 14px;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.75);
  cursor: pointer;
}

.match-history-header {
  max-width: 760px;
  margin: 48px auto 30px;
  text-align: center;
}

.match-history-header h1 {
  margin: 8px 0;
  font-size: clamp(2rem, 5vw, 3.2rem);
}

.match-history-header p:last-child {
  margin: 0;
  color: #cbd5e1;
}

.eyebrow {
  margin: 0;
  color: #fbbf24;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.match-history-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 460px), 1fr));
  gap: 16px;
  max-width: 1100px;
  margin: 0 auto;
}

.match-history-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border: 1px solid #33465f;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.86);
  box-shadow: 0 16px 35px rgba(2, 6, 23, 0.24);
}

.match-history-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.match-history-card h2 {
  margin: 0 0 4px;
  font-size: 1.1rem;
}

.match-history-card time,
.match-history-card__round,
.match-history-card__result span {
  color: #94a3b8;
  font-size: 0.82rem;
}

.match-history-card__result {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  white-space: nowrap;
}

.match-history-card__result strong {
  color: #fbbf24;
  font-size: 1.5rem;
}

.match-history-card__round {
  margin: 0;
}

.match-history-state {
  display: grid;
  place-items: center;
  gap: 12px;
  max-width: 620px;
  min-height: 180px;
  margin: 0 auto;
  color: #cbd5e1;
  text-align: center;
}

.match-history-error button {
  border: 0;
  border-radius: 8px;
  padding: 9px 16px;
  color: #0f172a;
  background: #fbbf24;
  font-weight: 800;
  cursor: pointer;
}

@media (max-width: 520px) {
  .match-history-card__meta {
    align-items: flex-start;
  }

  .match-history-card__result strong {
    font-size: 1.2rem;
  }
}
</style>
