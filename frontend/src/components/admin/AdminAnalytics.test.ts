import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveAdminSession } from '../../services/analyticsClient'
import AdminAnalytics from './AdminAnalytics.vue'

const jsonResponse = (body: unknown) =>
    new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    })

describe('AdminAnalytics', () => {
    beforeEach(() => {
        sessionStorage.clear()
        window.location.hash = '#/admin/analytics'
        saveAdminSession({ accessToken: 'token', expiresAt: '2099-01-01T00:00:00Z' })
    })

    afterEach(() => {
        vi.restoreAllMocks()
        sessionStorage.clear()
    })

    it('uses balance-safe defaults, warns on low samples, and opens run drill-down', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
            const url = String(input)
            if (url.startsWith('/api/admin/analytics/summary?')) {
                return jsonResponse({
                    gamesStarted: 1,
                    gamesCompleted: 1,
                    gamesInterrupted: 0,
                    humanRuns: 1,
                    abandonmentCount: 0,
                    abandonmentRate: 0,
                    averageFinalRound: 4,
                    maxFinalRound: 4,
                    modeCounts: { pokemon: 1 },
                    placementDistribution: { 1: 1 },
                    outcomeDistribution: { WIN: 1 },
                    botRoundOutcomes: [],
                    buildCohorts: [
                        {
                            mode: 'pokemon',
                            backendVersion: '2.0.0',
                            backendCommit: 'abc123',
                            runs: 1,
                        },
                    ],
                    anonymousPlayerIds: ['browser-1', 'browser-2'],
                })
            }
            if (url.startsWith('/api/admin/analytics/unit-presence?')) {
                return jsonResponse({
                    cohorts: [
                        {
                            mode: 'pokemon',
                            backendVersion: '2.0.0',
                            backendCommit: 'abc123',
                            topFourRuns: 1,
                            bottomFourRuns: 1,
                            lowSample: true,
                            units: [
                                {
                                    definitionId: 'pikachu',
                                    topFourCount: 1,
                                    topFourRate: 1,
                                    bottomFourCount: 0,
                                    bottomFourRate: 0,
                                    deltaPercentagePoints: 100,
                                },
                            ],
                        },
                    ],
                })
            }
            if (url.startsWith('/api/admin/analytics/runs?')) {
                return jsonResponse({
                    items: [
                        {
                            runId: 'run-1',
                            matchId: 'match-1',
                            matchRuleId: 'volatile',
                            anonymousPlayerId: 'browser-1',
                            mode: 'pokemon',
                            backendVersion: '2.0.0',
                            backendCommit: 'abc123',
                            startedAt: '2026-08-01T00:00:00Z',
                            status: 'COMPLETED',
                            abandonedAt: null,
                            finalPlacement: 1,
                            finalRound: 4,
                            finalHealth: 10,
                            placementFinalizedAt: '2026-08-01T00:10:00Z',
                            finalComposition: [
                                {
                                    definitionId: 'pikachu',
                                    lineId: 'pikachu',
                                    starLevel: 2,
                                    itemIds: [],
                                },
                            ],
                            wins: 4,
                            losses: 0,
                            draws: 0,
                        },
                    ],
                    nextCursor: null,
                })
            }
            throw new Error(`Unexpected request: ${url}`)
        })

        const wrapper = mount(AdminAnalytics)
        await flushPromises()

        const runRequest = fetchMock.mock.calls
            .map(([input]) => String(input))
            .find((url) => url.startsWith('/api/admin/analytics/runs?'))
        expect(runRequest).toContain('completed=true')
        expect(runRequest).toContain('abandoned=false')
        expect(wrapper.text()).toContain('Low sample: advantage ranking is suppressed')
        expect(wrapper.find('.runs-panel').text()).toContain('volatile')
        expect(wrapper.findAll('#analytics-mode option').map((option) => option.text())).toEqual([
            'All modes',
            'pokemon',
        ])
        expect(wrapper.findAll('#analytics-version option').map((option) => option.text())).toEqual([
            'All versions',
            '2.0.0',
        ])
        expect(wrapper.findAll('#analytics-commit option').map((option) => option.text())).toEqual([
            'All commits',
            'abc123',
        ])
        expect(wrapper.findAll('#analytics-player option').map((option) => option.text())).toEqual([
            'All players',
            'browser-1',
            'browser-2',
        ])

        await wrapper.find('.runs-panel tbody tr').trigger('keyup', { key: 'Enter' })

        expect(window.location.hash).toBe('#/admin/analytics/runs/run-1')
        wrapper.unmount()
    })

    it('shows the match rule and equipment in round snapshots', async () => {
        window.location.hash = '#/admin/analytics/runs/run-1'
        vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
            if (String(input).startsWith('/api/items?')) return jsonResponse([])
            return jsonResponse({
                run: {
                    runId: 'run-1',
                    mode: 'pokemon',
                    matchRuleId: 'volatile',
                    backendVersion: '3.0.0',
                    backendCommit: 'abc123',
                    startedAt: '2026-09-30T00:00:00Z',
                    status: 'COMPLETED',
                    finalPlacement: 1,
                    abandonedAt: null,
                    placementFinalizedAt: null,
                    finalComposition: [],
                },
                rounds: [{
                    round: 4,
                    healthBefore: 100,
                    healthAfter: 100,
                    gold: 20,
                    level: 4,
                    xp: 0,
                    outcome: 'WIN',
                    opponentType: 'BOT',
                    board: [{ definitionId: 'pikachu', lineId: 'pikachu', starLevel: 2, itemIds: ['choice-band', 'leftovers'] }],
                    augments: [],
                }],
            })
        })

        const wrapper = mount(AdminAnalytics)
        await flushPromises()
        expect(wrapper.find('.run-heading').text()).toContain('volatile')
        expect(wrapper.find('.round-card').text()).toContain('Items: choice-band, leftovers')
        wrapper.unmount()
    })
})
