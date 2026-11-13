import { app, ipcMain, shell } from 'electron'
import { playerSchema, type PlayerInput } from '@shared/player'
import { characterProfileInputSchema, characterProfileSchema } from '@shared/characterProfile'
import { monsterInputSchema, monsterSchema } from '@shared/monster'
import { gameInputSchema, gameSchema } from '@shared/game'
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
  finishGame,
  listGames,
  removeGame,
  setGameStatus,
  updateGame
} from './storage/gameStore'
import { listGameMonsters } from './storage/gameMonsterStore'
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

  ipcMain.handle(IPC.gamesList, () => listGames())

  ipcMain.handle(IPC.gameCreate, (_event, input: unknown) => addGame(gameInputSchema.parse(input)))

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

  ipcMain.handle(IPC.gameMonstersList, () => listGameMonsters())

  ipcMain.handle(IPC.playersList, () => listPlayers())

  ipcMain.handle(IPC.playerCreate, (_event, input: unknown) => addPlayer(parsePlayerInput(input)))

  ipcMain.handle(IPC.playerUpdate, (_event, input: unknown) => {
    const player = playerSchema.parse(input)
    return updatePlayer(player)
  })

  ipcMain.handle(IPC.playerRemove, (_event, id: unknown): Promise<void> =>
    removePlayer(assertId(id))
  )

  ipcMain.handle(IPC.charactersList, () => listCharacters())

  ipcMain.handle(IPC.characterCreate, (_event, input: unknown) =>
    addCharacter(characterProfileInputSchema.parse(input))
  )

  ipcMain.handle(IPC.characterUpdate, (_event, input: unknown) =>
    updateCharacter(characterProfileSchema.parse(input))
  )

  ipcMain.handle(IPC.characterRemove, (_event, id: unknown): Promise<void> =>
    removeCharacter(assertId(id))
  )

  ipcMain.handle(IPC.monstersList, () => listMonsters())

  ipcMain.handle(IPC.monsterCreate, (_event, input: unknown) =>
    addMonster(monsterInputSchema.parse(input))
  )

  ipcMain.handle(IPC.monsterUpdate, (_event, input: unknown) =>
    updateMonster(monsterSchema.parse(input))
  )

  ipcMain.handle(IPC.monsterRemove, (_event, id: unknown): Promise<void> =>
    removeMonster(assertId(id))
  )

  ipcMain.handle(IPC.mapsList, () => listMaps())

  ipcMain.handle(IPC.mapCreate, (_event, input: unknown) =>
    addMap(gameMapInputSchema.parse(input))
  )

  ipcMain.handle(IPC.mapUpdate, (_event, input: unknown) =>
    updateMap(gameMapSchema.parse(input))
  )

  ipcMain.handle(IPC.mapRemove, (_event, id: unknown): Promise<void> =>
    removeMap(assertId(id))
  )

  ipcMain.handle(IPC.settingsGet, () => getSettings())

  ipcMain.handle(IPC.settingsUpdate, (_event, patch: unknown) =>
    updateSettings(parseSettingsPatch(patch))
  )
}
