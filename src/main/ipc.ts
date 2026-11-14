import { app, ipcMain, shell } from 'electron'
import { playerSchema, type PlayerInput } from '@shared/player'
import { characterProfileInputSchema, characterProfileSchema } from '@shared/characterProfile'
import { monsterInputSchema, monsterSchema } from '@shared/monster'
import { gameInputSchema, gameSchema } from '@shared/game'
import { gameMonsterEntrySchema, gameMonsterInputSchema } from '@shared/gameMonster'
import { realmInputSchema, realmSchema } from '@shared/realm'
import { gameMapInputSchema, gameMapSchema } from '@shared/map'
import { isGameStatus } from '@shared/gameStatus'
import { isThemeName, type SettingsPatch } from '@shared/settings'
import { IPC, type AppInfo } from '@shared/api'
import { addPlayer, listPlayers, removePlayer, updatePlayer } from './storage/playerStore'
import {
  addCharacter,
  listCharacters,
  removeCharacter,
  updateCharacter
} from './storage/characterStore'
import { addMonster, listMonsters, removeMonster, updateMonster } from './storage/monsterStore'
import { addMap, listMaps, removeMap, updateMap } from './storage/mapStore'
import {
  addGame,
  clearMapReferences,
  finishGame,
  listGames,
  removeGame,
  setGameStatus,
  updateGame
} from './storage/gameStore'
import {
  addGameMonster,
  listGameMonsters,
  removeGameMonster,
  updateGameMonster
} from './storage/gameMonsterStore'
import {
  activateRealm,
  addRealm,
  getActiveRealmId,
  listRealms,
  removeRealm,
  updateRealm
} from './storage/realmStore'
import { getSettings, updateSettings } from './storage/settingsStore'

function assertId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) {
    throw new Error('Некорректный идентификатор')
  }
  return value
}

function parsePlayerInput(value: unknown): PlayerInput {
  if (!value || typeof value !== 'object') {
    throw new Error('Некорректные данные игрока')
  }

  const { firstName, lastName } = value as Record<string, unknown>
  if (typeof firstName !== 'string' || typeof lastName !== 'string') {
    throw new Error('Некорректные данные игрока')
  }

  return { firstName, lastName }
}

function parseSettingsPatch(value: unknown): SettingsPatch {
  if (!value || typeof value !== 'object') {
    throw new Error('Некорректные настройки')
  }

  const { theme } = value as Record<string, unknown>
  if (theme !== undefined && !isThemeName(theme)) {
    throw new Error('Некорректная тема оформления')
  }

  return { theme }
}

function parseMonsterIds(value: unknown): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new Error('Некорректный список монстров')
  }

  return value.filter(
    (id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 64
  )
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.appInfo, (): AppInfo => {
    const platform =
      process.platform === 'win32' || process.platform === 'darwin' || process.platform === 'linux'
        ? process.platform
        : 'other'

    return {
      name: app.getName(),
      version: app.getVersion(),
      electron: process.versions.electron ?? '—',
      chrome: process.versions.chrome ?? '—',
      platform,
      dataDir: app.getPath('userData')
    }
  })

  ipcMain.handle(IPC.appOpenDataFolder, async (): Promise<void> => {
    const error = await shell.openPath(app.getPath('userData'))
    if (error) throw new Error(`Не удалось открыть папку: ${error}`)
  })

  ipcMain.handle(IPC.gamesList, async () => listGames(await getActiveRealmId()))

  ipcMain.handle(IPC.gameCreate, async (_event, input: unknown) =>
    addGame(gameInputSchema.parse(input), await getActiveRealmId())
  )

  ipcMain.handle(IPC.gameUpdate, (_event, input: unknown) => updateGame(gameSchema.parse(input)))

  ipcMain.handle(IPC.gameRemove, (_event, id: unknown): Promise<void> =>
    removeGame(assertId(id))
  )

  ipcMain.handle(IPC.gameFinish, (_event, id: unknown, keepMonsterIds: unknown) =>
    finishGame(assertId(id), parseMonsterIds(keepMonsterIds))
  )

  ipcMain.handle(IPC.gameSetStatus, (_event, id: unknown, status: unknown) => {
    if (!isGameStatus(status)) {
      throw new Error('Некорректный статус игры')
    }
    return setGameStatus(assertId(id), status)
  })

  ipcMain.handle(IPC.gameMonstersList, async () => listGameMonsters(await getActiveRealmId()))

  ipcMain.handle(IPC.gameMonsterCreate, async (_event, input: unknown) =>
    addGameMonster(gameMonsterInputSchema.parse(input), await getActiveRealmId())
  )

  ipcMain.handle(IPC.gameMonsterUpdate, (_event, input: unknown) =>
    updateGameMonster(gameMonsterEntrySchema.parse(input))
  )

  ipcMain.handle(IPC.gameMonsterRemove, (_event, id: unknown): Promise<void> =>
    removeGameMonster(assertId(id))
  )

  ipcMain.handle(IPC.playersList, () => listPlayers())

  ipcMain.handle(IPC.playerCreate, (_event, input: unknown) => addPlayer(parsePlayerInput(input)))

  ipcMain.handle(IPC.playerUpdate, (_event, input: unknown) => {
    const player = playerSchema.parse(input)
    return updatePlayer(player)
  })

  ipcMain.handle(IPC.playerRemove, (_event, id: unknown): Promise<void> =>
    removePlayer(assertId(id))
  )

  ipcMain.handle(IPC.charactersList, async () => listCharacters(await getActiveRealmId()))

  ipcMain.handle(IPC.characterCreate, async (_event, input: unknown) =>
    addCharacter(characterProfileInputSchema.parse(input), await getActiveRealmId())
  )

  ipcMain.handle(IPC.characterUpdate, (_event, input: unknown) =>
    updateCharacter(characterProfileSchema.parse(input))
  )

  ipcMain.handle(IPC.characterRemove, (_event, id: unknown): Promise<void> =>
    removeCharacter(assertId(id))
  )

  ipcMain.handle(IPC.monstersList, async () => listMonsters(await getActiveRealmId()))

  ipcMain.handle(IPC.monsterCreate, async (_event, input: unknown) =>
    addMonster(monsterInputSchema.parse(input), await getActiveRealmId())
  )

  ipcMain.handle(IPC.monsterUpdate, (_event, input: unknown) =>
    updateMonster(monsterSchema.parse(input))
  )

  ipcMain.handle(IPC.monsterRemove, (_event, id: unknown): Promise<void> =>
    removeMonster(assertId(id))
  )

  ipcMain.handle(IPC.mapsList, async () => listMaps(await getActiveRealmId()))

  ipcMain.handle(IPC.mapCreate, async (_event, input: unknown) =>
    addMap(gameMapInputSchema.parse(input), await getActiveRealmId())
  )

  ipcMain.handle(IPC.mapUpdate, (_event, input: unknown) =>
    updateMap(gameMapSchema.parse(input))
  )

  ipcMain.handle(IPC.mapRemove, async (_event, id: unknown): Promise<void> => {
    const mapId = assertId(id)
    await removeMap(mapId)
    await clearMapReferences(mapId)
  })

  ipcMain.handle(IPC.realmsList, () => listRealms())

  ipcMain.handle(IPC.realmCreate, (_event, input: unknown) =>
    addRealm(realmInputSchema.parse(input))
  )

  ipcMain.handle(IPC.realmUpdate, (_event, input: unknown) =>
    updateRealm(realmSchema.parse(input))
  )

  ipcMain.handle(IPC.realmActivate, (_event, id: unknown) =>
    activateRealm(assertId(id))
  )

  ipcMain.handle(IPC.realmRemove, async (_event, id: unknown): Promise<void> => {
    const realmId = assertId(id)
    const realms = await listRealms()

    if (!realms.some((realm) => realm.id === realmId)) return
    if (realms.length <= 1) {
      throw new Error('Нельзя удалить последний сеттинг')
    }

    const [games, characters, monsters, maps, savedMonsters] = await Promise.all([
      listGames(),
      listCharacters(),
      listMonsters(),
      listMaps(),
      listGameMonsters()
    ])

    const hasData =
      games.some((game) => game.realmId === realmId) ||
      characters.some((character) => character.realmId === realmId) ||
      monsters.some((monster) => monster.realmId === realmId) ||
      maps.some((map) => map.realmId === realmId) ||
      savedMonsters.some((monster) => monster.realmId === realmId)

    if (hasData) {
      throw new Error('В сеттинге есть игры, персонажи, монстры или карты — сначала удалите их')
    }

    await removeRealm(realmId)
  })

  ipcMain.handle(IPC.settingsGet, () => getSettings())

  ipcMain.handle(IPC.settingsUpdate, (_event, patch: unknown) =>
    updateSettings(parseSettingsPatch(patch))
  )
}
