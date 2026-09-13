export type AnalyticsMatchStatus = 'STARTED' | 'COMPLETED' | 'INTERRUPTED'
export type AnalyticsRunStatus = AnalyticsMatchStatus
export type AnalyticsRoundOutcome = 'WIN' | 'LOSS' | 'DRAW' | null

export interface AnalyticsBotRoundOutcome {
    round: number
    wins: number
    losses: number
    draws: number
}

export interface AnalyticsSummary {
    gamesStarted: number
    gamesCompleted: number
    gamesInterrupted: number
    humanRuns: number
    abandonmentCount: number
    abandonmentRate: number
    averageFinalRound: number
    maxFinalRound: number
    modeCounts: Record<string, number>
    placementDistribution: Record<string, number>
    outcomeDistribution: Record<string, number>
    botRoundOutcomes: AnalyticsBotRoundOutcome[]
    buildCohorts: AnalyticsBuildCohort[]
    anonymousPlayerIds: string[]
}

export interface AnalyticsBuildCohort {
    mode: string
    backendVersion: string
    backendCommit: string
    runs: number
}

export interface AnalyticsRunSummary {
    runId: string
    matchId: string
    anonymousPlayerId: string
    mode: string
    backendVersion: string
    backendCommit: string
    startedAt: string
    status: AnalyticsRunStatus
    abandonedAt: string | null
    finalPlacement: number | null
    finalRound: number | null
    finalHealth: number | null
    placementFinalizedAt: string | null
    finalComposition: AnalyticsBoardUnit[] | null
    wins: number
    losses: number
    draws: number
}

export interface AnalyticsBoardUnit {
    definitionId: string
    lineId: string
    starLevel: number
    itemIds: string[]
}

export interface PublicMatch {
    historyId: string
    mode: string
    completedAt: string
    finalRound: number
    finalPlacement: number
    finalComposition: AnalyticsBoardUnit[] | null
}

export interface PublicMatchHistoryResponse {
    matches: PublicMatch[]
}

export interface AnalyticsAugment {
    id: string
    tier: string
}

export interface AnalyticsRound {
    round: number
    capturedAt: string
    resolvedAt: string | null
    healthBefore: number
    healthAfter: number | null
    gold: number
    level: number
    xp: number
    outcome: AnalyticsRoundOutcome
    opponentType: string | null
    board: AnalyticsBoardUnit[]
    augments: AnalyticsAugment[]
}

export interface AnalyticsRunDetail {
    run: AnalyticsRunSummary
    rounds: AnalyticsRound[]
}

export interface AnalyticsRunsPage {
    items: AnalyticsRunSummary[]
    nextCursor: string | null
}

export interface AnalyticsFilters {
    from: string
    to: string
    mode?: string
    backendVersion?: string
    backendCommit?: string
}

export interface AnalyticsRunFilters extends AnalyticsFilters {
    analyticsClientId?: string
    abandoned?: boolean
    placement?: number
    completed?: boolean
    cursor?: string
    size?: number
}

export interface AnalyticsUnitPresence {
    definitionId: string
    topFourCount: number
    topFourRate: number
    bottomFourCount: number
    bottomFourRate: number
    deltaPercentagePoints: number
}

export interface AnalyticsUnitPresenceCohort {
    mode: string
    backendVersion: string
    backendCommit: string
    topFourRuns: number
    bottomFourRuns: number
    lowSample: boolean
    units: AnalyticsUnitPresence[]
}

export interface AnalyticsUnitPresenceResponse {
    cohorts: AnalyticsUnitPresenceCohort[]
}

export interface AdminSession {
    accessToken: string
    expiresAt: string
}
