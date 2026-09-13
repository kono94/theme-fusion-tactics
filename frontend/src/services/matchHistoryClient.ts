import type { PublicMatchHistoryResponse } from '../types/analytics'

export class MatchHistoryApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message)
    }
}

const readErrorMessage = async (response: Response) => {
    try {
        const body = (await response.json()) as { message?: string; error?: string }
        return body.message || body.error || `Request failed (${response.status})`
    } catch {
        return `Request failed (${response.status})`
    }
}

export const getMatchHistory = async (signal?: AbortSignal): Promise<PublicMatchHistoryResponse> => {
    const response = await fetch('/api/match-history', {
        signal,
        cache: 'no-store',
        headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new MatchHistoryApiError(response.status, await readErrorMessage(response))
    return (await response.json()) as PublicMatchHistoryResponse
}
