import { app, ipcMain, shell } from 'electron'
import { playerSchema, type PlayerInput } from '@shared/player'
import { characterProfileInputSchema, characterProfileSchema } from '@shared/characterProfile'
import { monsterInputSchema, monsterSchema } from '@shared/monster'
import { gameSchema, type GameInput } from '@shared/game'
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
import { addGame, listGames, removeGame, updateGame } from './storage/gameStore'
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

function parseGameInput(value: unknown): GameInput {
  if (!value || typeof value !== 'object') {
    throw new Error('Некорректные данные игры')
  }

  const { name } = value as Record<string, unknown>
  if (typeof name !== 'string' || name.length > 200) {
    throw new Error('Некорректное название игры')
  }

  return { name }
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

  ipcMain.handle(IPC.gameCreate, (_event, input: unknown) => addGame(parseGameInput(input)))

  ipcMain.handle(IPC.gameUpdate, (_event, input: unknown) => updateGame(gameSchema.parse(input)))

  ipcMain.handle(IPC.gameRemove, (_event, id: unknown): Promise<void> =>
    removeGame(assertId(id))
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

  ipcMain.handle(IPC.settingsGet, () => getSettings())

  ipcMain.handle(IPC.settingsUpdate, (_event, patch: unknown) =>
    updateSettings(parseSettingsPatch(patch))
  )
}
