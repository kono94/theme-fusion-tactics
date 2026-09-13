<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
    AnalyticsApiError,
    clearAdminSession,
    getRun,
    getRuns,
    getSummary,
    getUnitPresence,
    loadAdminSession,
    login,
    logout,
    saveAdminSession,
} from '../../services/analyticsClient'
import type {
    AdminSession,
    AnalyticsRunDetail,
    AnalyticsRunSummary,
    AnalyticsSummary,
    AnalyticsUnitPresenceResponse,
} from '../../types/analytics'
import FinalCompositionStrip from '../FinalCompositionStrip.vue'

const session = ref<AdminSession | null>(loadAdminSession())
const password = ref('')
const authError = ref('')
const error = ref('')
const loading = ref(false)
const loadingMore = ref(false)
const summary = ref<AnalyticsSummary | null>(null)
const presence = ref<AnalyticsUnitPresenceResponse | null>(null)
const runs = ref<AnalyticsRunSummary[]>([])
const detail = ref<AnalyticsRunDetail | null>(null)
const nextCursor = ref<string | null>(null)
const lastRefresh = ref<Date | null>(null)
const mode = ref('')
const backendVersion = ref('')
const backendCommit = ref('')
const buildCohort = ref('')
const placement = ref('')
const anonymousPlayerId = ref('')
const abandoned = ref('false')
const completed = ref('true')
let requestController: AbortController | null = null

const toLocalInput = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60_000
    return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const now = new Date()
const from = ref(toLocalInput(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)))
const to = ref(toLocalInput(now))

const runIdFromHash = () => {
    const match = window.location.hash.match(/^#\/admin\/analytics\/runs\/([^/?#]+)/)
    return match ? decodeURIComponent(match[1]) : null
}

const selectedRunId = ref<string | null>(runIdFromHash())
const isAuthenticated = computed(() => Boolean(session.value?.accessToken))
const buildCohorts = computed(() => summary.value?.buildCohorts ?? [])
const distinctValues = (values: string[]) => [...new Set(values)].sort((left, right) => left.localeCompare(right))
const modeOptions = computed(() => distinctValues(buildCohorts.value.map((cohort) => cohort.mode)))
const versionOptions = computed(() =>
    distinctValues(buildCohorts.value.map((cohort) => cohort.backendVersion)),
)
const commitOptions = computed(() =>
    distinctValues(buildCohorts.value.map((cohort) => cohort.backendCommit)),
)
const anonymousPlayerOptions = computed(() => summary.value?.anonymousPlayerIds ?? [])

watch(buildCohort, (key) => {
    if (!key) return
    const selected = buildCohorts.value.find(
        (cohort) => `${cohort.mode}|${cohort.backendVersion}|${cohort.backendCommit}` === key,
    )
    if (!selected) return
    mode.value = selected.mode
    backendVersion.value = selected.backendVersion
    backendCommit.value = selected.backendCommit
})

const asIso = (value: string) => new Date(value).toISOString()
const filters = () => ({
    from: asIso(from.value),
    to: asIso(to.value),
    mode: mode.value || undefined,
    backendVersion: backendVersion.value || undefined,
    backendCommit: backendCommit.value || undefined,
})

const runFilters = () => ({
    ...filters(),
    analyticsClientId: anonymousPlayerId.value || undefined,
    abandoned: abandoned.value === '' ? undefined : abandoned.value === 'true',
    completed: completed.value === '' ? undefined : completed.value === 'true',
    placement: placement.value ? Number(placement.value) : undefined,
    size: 50,
})

const handleApiError = (cause: unknown) => {
    if (cause instanceof DOMException && cause.name === 'AbortError') return
    if (cause instanceof AnalyticsApiError && cause.status === 401) {
        clearAdminSession()
        session.value = null
        detail.value = null
        authError.value = 'Your admin session expired. Please sign in again.'
        return
    }
    error.value = cause instanceof Error ? cause.message : 'Analytics could not be loaded.'
}

const loadDashboard = async () => {
    if (!session.value) return
    requestController?.abort()
    requestController = new AbortController()
    loading.value = true
    error.value = ''
    try {
        const [summaryResponse, runsResponse, presenceResponse] = await Promise.all([
            getSummary(session.value.accessToken, filters(), requestController.signal),
            getRuns(session.value.accessToken, runFilters(), requestController.signal),
            getUnitPresence(session.value.accessToken, filters(), requestController.signal),
        ])
        summary.value = summaryResponse
        runs.value = runsResponse.items
        nextCursor.value = runsResponse.nextCursor
        presence.value = presenceResponse
        lastRefresh.value = new Date()
    } catch (cause) {
        handleApiError(cause)
    } finally {
        loading.value = false
    }
}

const loadDetail = async (runId: string) => {
    if (!session.value) return
    requestController?.abort()
    requestController = new AbortController()
    loading.value = true
    error.value = ''
    detail.value = null
    try {
        detail.value = await getRun(session.value.accessToken, runId, requestController.signal)
    } catch (cause) {
        handleApiError(cause)
    } finally {
        loading.value = false
    }
}

const authenticate = async () => {
    if (!password.value) return
    loading.value = true
    authError.value = ''
    try {
        const response = await login(password.value)
        saveAdminSession(response)
        session.value = response
        password.value = ''
        if (selectedRunId.value) await loadDetail(selectedRunId.value)
        else await loadDashboard()
    } catch (cause) {
        if (cause instanceof AnalyticsApiError && cause.status === 429) {
            authError.value = 'Too many attempts. Please wait before trying again.'
        } else {
            authError.value = cause instanceof Error ? cause.message : 'Sign-in failed.'
        }
    } finally {
        loading.value = false
    }
}

const signOut = async () => {
    const token = session.value?.accessToken
    clearAdminSession()
    session.value = null
    summary.value = null
    runs.value = []
    presence.value = null
    detail.value = null
    if (token) await logout(token).catch(() => undefined)
}

const loadMore = async () => {
    if (!session.value || !nextCursor.value) return
    loadingMore.value = true
    error.value = ''
    try {
        const response = await getRuns(session.value.accessToken, {
            ...runFilters(),
            cursor: nextCursor.value,
        })
        const existing = new Set(runs.value.map((run) => run.runId))
        runs.value.push(...response.items.filter((run) => !existing.has(run.runId)))
        nextCursor.value = response.nextCursor
    } catch (cause) {
        handleApiError(cause)
    } finally {
        loadingMore.value = false
    }
}

const openRun = (runId: string) => {
    window.location.hash = `#/admin/analytics/runs/${encodeURIComponent(runId)}`
}

const backToDashboard = () => {
    window.location.hash = '#/admin/analytics'
}

const resetFilters = () => {
    const resetNow = new Date()
    from.value = toLocalInput(new Date(resetNow.getTime() - 30 * 24 * 60 * 60 * 1000))
    to.value = toLocalInput(resetNow)
    mode.value = ''
    backendVersion.value = ''
    backendCommit.value = ''
    buildCohort.value = ''
    placement.value = ''
    anonymousPlayerId.value = ''
    abandoned.value = 'false'
    completed.value = 'true'
    void loadDashboard()
}

const formatDate = (value: string | null | undefined) =>
    value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
const formatPercent = (value: number) => `${(value <= 1 ? value * 100 : value).toFixed(1)}%`
const shortId = (value: string) => (value.length > 12 ? `${value.slice(0, 8)}…` : value)
const entries = (value: Record<string, number> | undefined) => Object.entries(value ?? {})

const onHashChange = () => {
    selectedRunId.value = runIdFromHash()
    if (!session.value) return
    if (selectedRunId.value) void loadDetail(selectedRunId.value)
    else void loadDashboard()
}

onMounted(() => {
    window.addEventListener('hashchange', onHashChange)
    if (!session.value) return
    if (selectedRunId.value) void loadDetail(selectedRunId.value)
    else void loadDashboard()
})

onBeforeUnmount(() => {
    window.removeEventListener('hashchange', onHashChange)
    requestController?.abort()
})
</script>

<template>
  <main class="analytics-admin">
    <section v-if="!isAuthenticated" class="login-card" aria-labelledby="admin-login-title">
      <p class="eyebrow">Tactics Arena</p>
      <h1 id="admin-login-title">Analytics admin</h1>
      <p>Enter the admin password to continue.</p>
      <form @submit.prevent="authenticate">
        <label for="admin-password">Admin password</label>
        <input id="admin-password" v-model="password" type="password" autocomplete="current-password" autofocus />
        <p v-if="authError" class="error" role="alert">{{ authError }}</p>
        <button type="submit" :disabled="loading || !password">{{ loading ? 'Signing in…' : 'Sign in' }}</button>
      </form>
    </section>

    <template v-else>
      <header class="admin-header">
        <div>
          <p class="eyebrow">Tactics Arena</p>
          <h1>Gameplay analytics</h1>
          <small v-if="lastRefresh">Last refreshed {{ formatDate(lastRefresh.toISOString()) }}</small>
        </div>
        <div class="header-actions">
          <button v-if="!selectedRunId" class="secondary" type="button" :disabled="loading" @click="loadDashboard">Refresh</button>
          <button class="secondary" type="button" @click="signOut">Logout</button>
        </div>
      </header>

      <div v-if="error" class="error-banner" role="alert">
        <span>{{ error }}</span>
        <button type="button" @click="selectedRunId ? loadDetail(selectedRunId) : loadDashboard()">Retry</button>
      </div>

      <section v-if="selectedRunId" class="content">
        <button class="back" type="button" @click="backToDashboard">← Back to runs</button>
        <div v-if="loading" class="state">Loading run…</div>
        <template v-else-if="detail">
          <div class="panel run-heading">
            <div><span>Run</span><strong>{{ detail.run.runId }}</strong></div>
            <div><span>Started</span><strong>{{ formatDate(detail.run.startedAt) }}</strong></div>
            <div><span>Mode</span><strong>{{ detail.run.mode }}</strong></div>
            <div><span>Build</span><strong>{{ detail.run.backendVersion }} · {{ shortId(detail.run.backendCommit) }}</strong></div>
            <div><span>Status</span><strong>{{ detail.run.status }}</strong></div>
            <div><span>Placement</span><strong>{{ detail.run.finalPlacement ?? '—' }}</strong></div>
            <div><span>Abandoned</span><strong>{{ detail.run.abandonedAt ? formatDate(detail.run.abandonedAt) : 'No' }}</strong></div>
            <div><span>Finalized</span><strong>{{ formatDate(detail.run.placementFinalizedAt) }}</strong></div>
          </div>

          <section class="panel final-board-panel">
            <h2>Final deployed board</h2>
            <FinalCompositionStrip :mode="detail.run.mode" :composition="detail.run.finalComposition" />
          </section>

          <div v-if="detail.rounds.length === 0" class="state">No round snapshots were recorded.</div>
          <article v-for="round in detail.rounds" :key="round.round" class="panel round-card">
            <header>
              <h2>Round {{ round.round }}</h2>
              <div class="round-outcome"><span v-if="round.opponentType" class="opponent">vs {{ round.opponentType.toLowerCase() }}</span><span :class="['outcome', round.outcome?.toLowerCase() || 'unresolved']">{{ round.outcome || 'Unresolved' }}</span></div>
            </header>
            <dl class="round-stats">
              <div><dt>Health</dt><dd>{{ round.healthBefore }} → {{ round.healthAfter ?? '—' }}</dd></div>
              <div><dt>Gold</dt><dd>{{ round.gold }}</dd></div>
              <div><dt>Level</dt><dd>{{ round.level }}</dd></div>
              <div><dt>XP</dt><dd>{{ round.xp }}</dd></div>
            </dl>
            <div class="round-section">
              <h3>Board</h3>
              <div v-if="round.board.length" class="chips">
                <span v-for="(unit, index) in round.board" :key="`${unit.definitionId}-${index}`" class="chip">
                  {{ unit.definitionId }} <b>{{ '★'.repeat(unit.starLevel) }}</b>
                </span>
              </div>
              <p v-else class="muted">Empty board</p>
            </div>
            <div class="round-section">
              <h3>Augments</h3>
              <div v-if="round.augments.length" class="chips">
                <span v-for="augment in round.augments" :key="augment.id" class="chip augment">{{ augment.id }} · {{ augment.tier }}</span>
              </div>
              <p v-else class="muted">No augments</p>
            </div>
          </article>
        </template>
      </section>

      <section v-else class="content">
        <form class="panel filters" @submit.prevent="loadDashboard">
          <label>From (local time)<input v-model="from" type="datetime-local" required /></label>
          <label>To (local time)<input v-model="to" type="datetime-local" required /></label>
          <label>Mode<select id="analytics-mode" v-model="mode"><option value="">All modes</option><option v-for="option in modeOptions" :key="option" :value="option">{{ option }}</option></select></label>
          <label>Build cohort<select v-model="buildCohort"><option value="">Choose from loaded cohorts</option><option v-for="cohort in buildCohorts" :key="`${cohort.mode}-${cohort.backendVersion}-${cohort.backendCommit}`" :value="`${cohort.mode}|${cohort.backendVersion}|${cohort.backendCommit}`">{{ cohort.mode }} · {{ cohort.backendVersion }} · {{ shortId(cohort.backendCommit) }} ({{ cohort.runs }})</option></select></label>
          <label>Version<select id="analytics-version" v-model="backendVersion"><option value="">All versions</option><option v-for="option in versionOptions" :key="option" :value="option">{{ option }}</option></select></label>
          <label>Commit<select id="analytics-commit" v-model="backendCommit"><option value="">All commits</option><option v-for="option in commitOptions" :key="option" :value="option">{{ option }}</option></select></label>
          <label>Placement<select v-model="placement"><option value="">All places</option><option v-for="place in 8" :key="place" :value="String(place)">#{{ place }}</option></select></label>
          <label>Anonymous ID<select id="analytics-player" v-model="anonymousPlayerId"><option value="">All players</option><option v-for="option in anonymousPlayerOptions" :key="option" :value="option">{{ option }}</option></select></label>
          <label>Completed<select v-model="completed"><option value="true">Completed</option><option value="false">Incomplete</option><option value="">All</option></select></label>
          <label>Abandoned<select v-model="abandoned"><option value="false">No</option><option value="true">Yes</option><option value="">All</option></select></label>
          <div class="filter-actions"><button type="submit" :disabled="loading">Apply</button><button class="secondary" type="button" @click="resetFilters">Reset</button></div>
        </form>

        <div v-if="loading" class="state">Loading analytics…</div>
        <template v-else-if="summary">
          <div class="metric-grid">
            <div class="metric"><span>Games started</span><strong>{{ summary.gamesStarted }}</strong></div>
            <div class="metric"><span>Completed</span><strong>{{ summary.gamesCompleted }}</strong></div>
            <div class="metric"><span>Interrupted</span><strong>{{ summary.gamesInterrupted }}</strong></div>
            <div class="metric"><span>Human runs</span><strong>{{ summary.humanRuns }}</strong></div>
            <div class="metric"><span>Abandoned</span><strong>{{ summary.abandonmentCount }} · {{ formatPercent(summary.abandonmentRate) }}</strong></div>
            <div class="metric"><span>Avg / max round</span><strong>{{ summary.averageFinalRound.toFixed(1) }} / {{ summary.maxFinalRound }}</strong></div>
          </div>

          <div class="distribution-grid">
            <section class="panel"><h2>Modes</h2><p v-if="!entries(summary.modeCounts).length" class="muted">No data</p><div v-for="[label, count] in entries(summary.modeCounts)" :key="label" class="bar-row"><span>{{ label }}</span><strong>{{ count }}</strong></div></section>
            <section class="panel"><h2>Placements</h2><p v-if="!entries(summary.placementDistribution).length" class="muted">No data</p><div v-for="[label, count] in entries(summary.placementDistribution)" :key="label" class="bar-row"><span>#{{ label }}</span><strong>{{ count }}</strong></div></section>
            <section class="panel"><h2>Round outcomes</h2><p v-if="!entries(summary.outcomeDistribution).length" class="muted">No data</p><div v-for="[label, count] in entries(summary.outcomeDistribution)" :key="label" class="bar-row"><span>{{ label }}</span><strong>{{ count }}</strong></div></section>
            <section class="panel"><h2>Human vs bot by round</h2><p v-if="!summary.botRoundOutcomes.length" class="muted">No human-vs-bot rounds recorded yet.</p><div v-for="outcome in summary.botRoundOutcomes" :key="outcome.round" class="bar-row bot-round"><span>Round {{ outcome.round }}</span><strong><i class="win">{{ outcome.wins }}W</i> / <i class="loss">{{ outcome.losses }}L</i> / {{ outcome.draws }}D</strong></div></section>
          </div>

          <section class="panel presence-panel">
            <h2>Final-composition unit presence</h2>
            <p class="muted">Completed, non-abandoned runs with a captured final board. Each unit counts once per board.</p>
            <div v-if="!presence?.cohorts.length" class="state compact">No eligible final boards match these build filters.</div>
            <article v-for="cohort in presence?.cohorts" :key="`${cohort.mode}-${cohort.backendVersion}-${cohort.backendCommit}`" class="cohort">
              <header class="cohort-heading">
                <div><h3>{{ cohort.mode }}</h3><span>{{ cohort.backendVersion }} · {{ shortId(cohort.backendCommit) }}</span></div>
                <strong>Top 4: {{ cohort.topFourRuns }} · Bottom 4: {{ cohort.bottomFourRuns }}</strong>
              </header>
              <p v-if="cohort.lowSample" class="sample-warning" role="note">Low sample: advantage ranking is suppressed until both groups reach 20 runs.</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Unit</th><th>Top 4</th><th>Bottom 4</th><th v-if="!cohort.lowSample">Delta</th></tr></thead>
                  <tbody><tr v-for="unit in cohort.units" :key="unit.definitionId"><td>{{ unit.definitionId }}</td><td>{{ unit.topFourCount }} · {{ formatPercent(unit.topFourRate) }}</td><td>{{ unit.bottomFourCount }} · {{ formatPercent(unit.bottomFourRate) }}</td><td v-if="!cohort.lowSample">{{ unit.deltaPercentagePoints.toFixed(1) }} pp</td></tr></tbody>
                </table>
              </div>
            </article>
          </section>

          <section class="panel runs-panel">
            <h2>Player runs</h2>
            <div v-if="runs.length === 0" class="state compact">No runs match these filters.</div>
            <div v-else class="table-wrap">
              <table>
                <thead><tr><th>Started</th><th>Mode</th><th>Build</th><th>Anonymous ID</th><th>Status</th><th>Abandoned</th><th>Place</th><th>Final board</th><th>W / L / D</th></tr></thead>
                <tbody><tr v-for="run in runs" :key="run.runId" tabindex="0" @click="openRun(run.runId)" @keyup.enter="openRun(run.runId)"><td>{{ formatDate(run.startedAt) }}</td><td>{{ run.mode }}</td><td :title="run.backendCommit">{{ run.backendVersion }}</td><td :title="run.anonymousPlayerId">{{ shortId(run.anonymousPlayerId) }}</td><td>{{ run.status }}</td><td>{{ run.abandonedAt ? 'Yes' : 'No' }}</td><td>{{ run.finalPlacement ?? '—' }}</td><td><FinalCompositionStrip :mode="run.mode" :composition="run.finalComposition" compact /></td><td>{{ run.wins }} / {{ run.losses }} / {{ run.draws }}</td></tr></tbody>
              </table>
            </div>
            <button v-if="nextCursor" class="load-more" type="button" :disabled="loadingMore" @click="loadMore">{{ loadingMore ? 'Loading…' : 'Load more' }}</button>
          </section>
        </template>
      </section>
    </template>
  </main>
</template>

<style scoped>
.analytics-admin { min-height: 100vh; overflow-y: auto; background: #07111f; color: #e5edf8; padding: 28px; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
.content, .admin-header { width: min(1380px, 100%); margin: 0 auto; }
.admin-header { display: flex; justify-content: space-between; gap: 20px; align-items: center; margin-bottom: 24px; }
h1 { margin: 3px 0; font-size: clamp(1.7rem, 4vw, 2.5rem); } h2 { margin: 0 0 16px; font-size: 1.05rem; } h3 { font-size: .85rem; color: #94a3b8; }
.eyebrow { margin: 0; color: #38bdf8; font-size: .75rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
button { border: 0; border-radius: 8px; background: #0ea5e9; color: #07111f; padding: 10px 16px; font-weight: 750; cursor: pointer; } button:disabled { opacity: .55; cursor: wait; } button.secondary, .back { background: #1e293b; color: #e2e8f0; }
.header-actions, .filter-actions { display: flex; gap: 9px; }
.panel, .metric { border: 1px solid #22324a; border-radius: 12px; background: #0d1929; box-shadow: 0 12px 36px #0004; }
.login-card { width: min(420px, 100%); margin: 13vh auto; padding: 28px; border: 1px solid #28405d; border-radius: 14px; background: #0d1929; }
.login-card form { display: grid; gap: 10px; margin-top: 24px; }
label { color: #aebed2; font-size: .78rem; font-weight: 650; }
input, select { display: block; width: 100%; margin-top: 6px; border: 1px solid #33465f; border-radius: 7px; background: #07111f; color: #f8fafc; padding: 10px; }
.error { color: #fca5a5; } .error-banner { width: min(1380px, 100%); margin: 0 auto 18px; display: flex; justify-content: space-between; align-items: center; gap: 15px; border: 1px solid #7f1d1d; border-radius: 10px; padding: 12px 15px; background: #450a0a80; color: #fecaca; }
.filters { display: grid; grid-template-columns: repeat(4, minmax(130px, 1fr)); gap: 12px; padding: 16px; align-items: end; }
.metric-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin: 18px 0; }
.metric { padding: 16px; } .metric span, .run-heading span { display: block; color: #91a3ba; font-size: .75rem; margin-bottom: 7px; } .metric strong { font-size: 1.45rem; }
.distribution-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; } .distribution-grid .panel { padding: 18px; }
.bar-row { display: flex; justify-content: space-between; border-top: 1px solid #1d2c40; padding: 9px 0; text-transform: capitalize; }
.bot-round strong { font-size: .78rem; }.bot-round i { font-style: normal; }.bot-round .win { color: #86efac; }.bot-round .loss { color: #fca5a5; }
.runs-panel { margin-top: 12px; padding: 18px; } .table-wrap { overflow-x: auto; } table { width: 100%; border-collapse: collapse; font-size: .83rem; } th, td { padding: 11px 9px; border-bottom: 1px solid #203047; white-space: nowrap; text-align: left; } th { color: #91a3ba; } tbody tr { cursor: pointer; } tbody tr:hover, tbody tr:focus { background: #15253a; outline: none; }
.load-more { display: block; margin: 18px auto 0; }.state { padding: 60px; text-align: center; color: #91a3ba; }.state.compact { padding: 25px; }.muted { color: #8293aa; }
.back { margin-bottom: 18px; }.run-heading { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; padding: 18px; overflow-wrap: anywhere; }.final-board-panel, .presence-panel { margin-top: 12px; padding: 18px; }.cohort { margin-top: 18px; padding-top: 14px; border-top: 1px solid #203047; }.cohort-heading { display: flex; justify-content: space-between; gap: 12px; align-items: center; }.cohort-heading h3 { margin: 0 0 3px; color: #e5edf8; text-transform: capitalize; }.cohort-heading span { color: #8293aa; font-size: .75rem; }.sample-warning { margin: 10px 0; color: #fde68a; font-size: .8rem; }.round-card { padding: 18px; margin-top: 12px; }.round-card header { display: flex; justify-content: space-between; align-items: center; }.round-card header h2 { margin: 0; }.round-outcome { display: flex; gap: 8px; align-items: center; }.opponent { color: #94a3b8; font-size: .72rem; text-transform: capitalize; }.outcome { border-radius: 999px; padding: 4px 9px; background: #334155; font-size: .72rem; font-weight: 800; }.outcome.win { background: #14532d; color: #86efac; }.outcome.loss { background: #7f1d1d; color: #fecaca;}.outcome.draw { background: #713f12; color: #fde68a;}.round-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }.round-stats div { padding: 10px; background: #07111f; border-radius: 7px; }.round-stats dt { color: #8293aa; font-size: .72rem; }.round-stats dd { margin: 4px 0 0; font-weight: 700; }.chips { display: flex; flex-wrap: wrap; gap: 7px; }.chip { padding: 6px 9px; border: 1px solid #33465f; border-radius: 7px; background: #122238; font-size: .78rem; }.chip b { color: #fbbf24; }.chip.augment { color: #c4b5fd; }.round-section { margin-top: 15px; }
@media (max-width: 1000px) { .filters { grid-template-columns: repeat(3, 1fr); }.metric-grid { grid-template-columns: repeat(3, 1fr); }.run-heading { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 650px) { .analytics-admin { padding: 16px; }.admin-header { align-items: flex-start; flex-direction: column; }.filters, .distribution-grid { grid-template-columns: 1fr; }.metric-grid { grid-template-columns: repeat(2, 1fr); }.run-heading { grid-template-columns: repeat(2, 1fr); }.round-stats { grid-template-columns: repeat(2, 1fr); }.header-actions { width: 100%; }.header-actions button { flex: 1; } }
@media (max-width: 360px) { .metric-grid { grid-template-columns: 1fr; } }
</style>
