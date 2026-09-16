const ANALYTICS_ID_KEY = 'tactics.analytics.clientId'
const ACTIVE_ROOM_KEY = 'tactics.activeRoom'
const PLAYER_NAME_KEY = 'tactics.playerName'

export const PLAYER_NAME_MAX_LENGTH = 32

export interface ActiveRoomSession {
    roomId: string
    playerName: string
    reconnectToken: string
    playerId?: string
}

const randomId = () => crypto.randomUUID()

const parseActiveRoomSession = (raw: string | null): ActiveRoomSession | null => {
    if (!raw) return null
    try {
        const value = JSON.parse(raw) as ActiveRoomSession
        return value.roomId && value.playerName && value.reconnectToken ? value : null
    } catch {
        return null
    }
}

export const getAnalyticsClientId = () => {
    const existing = localStorage.getItem(ANALYTICS_ID_KEY)
    if (existing) return existing
    const id = randomId()
    localStorage.setItem(ANALYTICS_ID_KEY, id)
    return id
}

export const loadPlayerName = () => {
    const playerName = localStorage.getItem(PLAYER_NAME_KEY)?.trim() ?? ''
    return playerName.length <= PLAYER_NAME_MAX_LENGTH ? playerName : ''
}

export const savePlayerName = (playerName: string) => {
    const normalizedPlayerName = playerName.trim()
    if (!normalizedPlayerName) {
        localStorage.removeItem(PLAYER_NAME_KEY)
        return
    }

    localStorage.setItem(PLAYER_NAME_KEY, normalizedPlayerName.slice(0, PLAYER_NAME_MAX_LENGTH))
}

export const createActiveRoomSession = (roomId: string, playerName: string): ActiveRoomSession => {
    const session = { roomId, playerName, reconnectToken: randomId() }
    localStorage.setItem(ACTIVE_ROOM_KEY, JSON.stringify(session))
    sessionStorage.removeItem(ACTIVE_ROOM_KEY)
    return session
}

export const loadActiveRoomSession = (): ActiveRoomSession | null => {
    const storedSession = parseActiveRoomSession(localStorage.getItem(ACTIVE_ROOM_KEY))
    if (storedSession) return storedSession

    localStorage.removeItem(ACTIVE_ROOM_KEY)
    const legacySession = parseActiveRoomSession(sessionStorage.getItem(ACTIVE_ROOM_KEY))
    sessionStorage.removeItem(ACTIVE_ROOM_KEY)
    if (legacySession) {
        localStorage.setItem(ACTIVE_ROOM_KEY, JSON.stringify(legacySession))
    }
    return legacySession
}

export const setActiveRoomPlayerId = (roomId: string, playerId: string) => {
    const session = loadActiveRoomSession()
    if (!session || session.roomId !== roomId) return
    localStorage.setItem(ACTIVE_ROOM_KEY, JSON.stringify({ ...session, playerId }))
}

export const clearActiveRoomSession = () => {
    localStorage.removeItem(ACTIVE_ROOM_KEY)
    sessionStorage.removeItem(ACTIVE_ROOM_KEY)
}
