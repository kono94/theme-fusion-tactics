const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ROOM_CODE_LENGTH = 6
const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/

export const generateRoomCode = (): string => {
    const randomValues = new Uint8Array(ROOM_CODE_LENGTH)
    crypto.getRandomValues(randomValues)
    return Array.from(randomValues, (value) => ROOM_CODE_ALPHABET[value % ROOM_CODE_ALPHABET.length]).join('')
}

export const buildInviteUrl = (roomId: string, currentUrl = window.location.href): string => {
    const url = new URL(currentUrl)
    url.hash = `/join/${encodeURIComponent(roomId)}`
    return url.toString()
}

export const parseInviteRoomId = (hash: string): string | null => {
    const match = /^#\/join\/([^/?#]+)$/.exec(hash)
    if (!match) return null

    try {
        const roomId = decodeURIComponent(match[1])
        return ROOM_ID_PATTERN.test(roomId) ? roomId : null
    } catch {
        return null
    }
}

export const isInviteRoute = (hash: string): boolean => hash.startsWith('#/join/')
