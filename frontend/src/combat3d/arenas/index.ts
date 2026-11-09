import { baratie } from './baratie'
import { bellTower } from './bellTower'
import { fooshaVillage } from './foosha'
import type { ArenaTheme } from './kit'
import { marineford } from './marineford'
import { neutral } from './neutral'
import { rockGym } from './rockGym'
import { sabaody } from './sabaody'
import { seaRoute } from './seaRoute'
import { stadium } from './stadium'
import { wano } from './wano'

export type { ArenaHandle, ArenaTheme } from './kit'

const ARENAS: ArenaTheme[] = [neutral, fooshaVillage, baratie, sabaody, marineford, wano, stadium, rockGym, bellTower, seaRoute]

const ARENAS_BY_ID = new Map(ARENAS.map((arena) => [arena.id, arena]))

export function getArena(id: string): ArenaTheme {
  return ARENAS_BY_ID.get(id) ?? neutral
}

export function isArenaId(id: string): boolean {
  return ARENAS_BY_ID.has(id)
}
