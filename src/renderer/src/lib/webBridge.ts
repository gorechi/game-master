import type { AppInfo, GameMasterApi } from '@shared/api'
import type { Player, PlayerInput } from '@shared/player'
import type { CharacterProfile, CharacterProfileInput } from '@shared/characterProfile'
import type { Monster, MonsterInput } from '@shared/monster'
import type { Game, GameInput } from '@shared/game'
import {
  canTransitionGame,
  isGameDeletable,
  isGameEditable,
  isGameStatus,
  type GameStatus
} from '@shared/gameStatus'
import type { GameMonsterEntry } from '@shared/gameMonster'
import {
  clampMonsterScore,
  createCharacterProfile,
  createGame,
  createMonster,
  createPlayer,
  normalizeCharacterProfileInput,
  normalizeMonsterInput,
  normalizePlayerInput
} from '@shared/domain'
import {
  DEFAULT_SETTINGS,
  SETTINGS_SCHEMA_VERSION,
  isThemeName,
  type AppSettings,
  type SettingsPatch
} from '@shared/settings'

/**
 * Веб-адаптер того же контракта, что и мост preload.
 *
 * Нужен только для быстрого просмотра интерфейса в обычном браузере
 * (`npm run dev:web`): данные лежат в localStorage, файловой системы нет.
 * В Electron этот модуль не используется — window.gameMaster всегда есть.
 */

const GAMES_KEY = 'game-master.preview.games'
const GAME_MONSTERS_KEY = 'game-master.preview.gameMonsters'
const PLAYERS_KEY = 'game-master.preview.players'
const CHARACTERS_KEY = 'game-master.preview.characters'
const MONSTERS_KEY = 'game-master.preview.monsters'
const SETTINGS_KEY = 'game-master.preview.settings'

/** Полный сброс предпросмотра (кнопка на главном экране). */
export function resetWebPreview(): void {
  window.localStorage.removeItem(GAMES_KEY)
  window.localStorage.removeItem(GAME_MONSTERS_KEY)
  window.localStorage.removeItem(PLAYERS_KEY)
  window.localStorage.removeItem(CHARACTERS_KEY)
  window.localStorage.removeItem(MONSTERS_KEY)
  window.location.reload()
}

function readPlayers(): Player[] {
  try {
    const raw = window.localStorage.getItem(PLAYERS_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Player[]) : []
  } catch {
    return []
  }
}

function writePlayers(players: Player[]): void {
  window.localStorage.setItem(PLAYERS_KEY, JSON.stringify(players))
}

function readCharacters(): CharacterProfile[] {
  try {
    const raw = window.localStorage.getItem(CHARACTERS_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return (parsed as CharacterProfile[]).map((item) => ({
      ...item,
      level: typeof item.level === 'number' ? item.level : 1
    }))
  } catch {
    return []
  }
}

function writeCharacters(characters: CharacterProfile[]): void {
  window.localStorage.setItem(CHARACTERS_KEY, JSON.stringify(characters))
}

function readMonsters(): Monster[] {
  try {
    const raw = window.localStorage.getItem(MONSTERS_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return (parsed as Monster[]).map((monster) => ({
      ...monster,
      strength: clampMonsterScore(monster.strength),
      dexterity: clampMonsterScore(monster.dexterity),
      intelligence: clampMonsterScore(monster.intelligence),
      wisdom: clampMonsterScore(monster.wisdom),
      constitution: clampMonsterScore(monster.constitution),
      charisma: clampMonsterScore(monster.charisma)
    }))
  } catch {
    return []
  }
}

function writeMonsters(monsters: Monster[]): void {
  window.localStorage.setItem(MONSTERS_KEY, JSON.stringify(monsters))
}

function readGames(): Game[] {
  try {
    const raw = window.localStorage.getItem(GAMES_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return (parsed as Game[]).map((game) => ({
      ...game,
      characterIds: Array.isArray(game.characterIds) ? game.characterIds : [],
      monsters: Array.isArray(game.monsters) ? game.monsters : [],
      status: isGameStatus(game.status) ? game.status : 'new'
    }))
  } catch {
    return []
  }
}

function writeGames(games: Game[]): void {
  window.localStorage.setItem(GAMES_KEY, JSON.stringify(games))
}

function readGameMonsters(): GameMonsterEntry[] {
  try {
    const raw = window.localStorage.getItem(GAME_MONSTERS_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as GameMonsterEntry[]) : []
  } catch {
    return []
  }
}

function writeGameMonsters(monsters: GameMonsterEntry[]): void {
  window.localStorage.setItem(GAME_MONSTERS_KEY, JSON.stringify(monsters))
}

function readSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      if (isThemeName(parsed.theme)) {
        return { schemaVersion: SETTINGS_SCHEMA_VERSION, theme: parsed.theme }
      }
    }
  } catch {
    // повреждённые настройки предпросмотра не должны ломать приложение
  }

  return { ...DEFAULT_SETTINGS }
}

function writeSettings(settings: AppSettings): void {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function createWebBridge(): GameMasterApi {
  return {
    app: {
      info: async (): Promise<AppInfo> => ({
        name: 'Game Master',
        version: 'web-preview',
        electron: '—',
        chrome: navigator.userAgent,
        platform: 'other',
        dataDir: 'localStorage браузера'
      }),
      openDataFolder: async (): Promise<void> => undefined
    },

    games: {
      list: async (): Promise<Game[]> => readGames(),

      create: async (input: GameInput): Promise<Game> => {
        const game = createGame(input)
        writeGames([...readGames(), game])
        return game
      },

      update: async (game: Game): Promise<Game> => {
        const games = readGames()
        const existing = games.find((item) => item.id === game.id)

        if (!existing) {
          throw new Error('Игра не найдена — возможно, запись уже удалена')
        }
        if (!isGameEditable(existing.status)) {
          throw new Error('Завершённую игру нельзя редактировать')
        }

        const updated: Game = {
          ...existing,
          name: game.name.trim().slice(0, 120),
          characterIds: game.characterIds,
          monsters: game.monsters,
          updatedAt: new Date().toISOString()
        }

        writeGames(games.map((item) => (item.id === game.id ? updated : item)))
        return updated
      },

      setStatus: async (id: string, status: GameStatus): Promise<Game> => {
        const games = readGames()
        const game = games.find((item) => item.id === id)

        if (!game) {
          throw new Error('Игра не найдена — возможно, запись уже удалена')
        }
        if (game.status === status) return game
        if (status === 'finished') {
          throw new Error('Завершайте игру через экран завершения')
        }
        if (!canTransitionGame(game.status, status)) {
          throw new Error('Такой переход статуса недопустим')
        }

        const updated: Game = {
          ...game,
          status,
          updatedAt: new Date().toISOString()
        }

        writeGames(games.map((item) => (item.id === id ? updated : item)))
        return updated
      },

      finish: async (id: string, keepMonsterIds: string[] = []): Promise<Game> => {
        const games = readGames()
        const game = games.find((item) => item.id === id)

        if (!game) {
          throw new Error('Игра не найдена — возможно, запись уже удалена')
        }
        if (!canTransitionGame(game.status, 'finished')) {
          throw new Error('Завершить можно только идущую или приостановленную игру')
        }

        const existing = readGameMonsters()
        const existingIds = new Set(existing.map((monster) => monster.id))
        const keep = new Set(keepMonsterIds)

        for (const monster of game.monsters) {
          if (existingIds.has(monster.id)) keep.add(monster.id)
        }

        const savedAt = new Date().toISOString()
        const additions: GameMonsterEntry[] = game.monsters
          .filter((monster) => keep.has(monster.id) && !existingIds.has(monster.id))
          .map((monster) => ({
            ...monster,
            savedFromGameId: game.id,
            savedAt
          }))

        if (additions.length > 0) {
          writeGameMonsters([...existing, ...additions])
        }

        const updated: Game = {
          ...game,
          status: 'finished',
          updatedAt: new Date().toISOString()
        }

        writeGames(games.map((item) => (item.id === id ? updated : item)))
        return updated
      },

      remove: async (id: string): Promise<void> => {
        const games = readGames()
        const game = games.find((item) => item.id === id)
        if (!game) return

        if (!isGameDeletable(game.status)) {
          throw new Error('Идущую игру нельзя удалить — сначала завершите её')
        }

        writeGames(games.filter((item) => item.id !== id))
      }
    },

    gameMonsters: {
      list: async (): Promise<GameMonsterEntry[]> => readGameMonsters()
    },

    players: {
      list: async (): Promise<Player[]> => readPlayers(),

      create: async (input: PlayerInput): Promise<Player> => {
        const player = createPlayer(input)
        writePlayers([...readPlayers(), player])
        return player
      },

      update: async (player: Player): Promise<Player> => {
        const updated: Player = {
          ...player,
          ...normalizePlayerInput(player),
          updatedAt: new Date().toISOString()
        }

        writePlayers(readPlayers().map((item) => (item.id === player.id ? updated : item)))
        return updated
      },

      remove: async (id: string): Promise<void> => {
        writePlayers(readPlayers().filter((item) => item.id !== id))
      }
    },

    characters: {
      list: async (): Promise<CharacterProfile[]> => readCharacters(),

      create: async (input: CharacterProfileInput): Promise<CharacterProfile> => {
        const character = createCharacterProfile(input)
        writeCharacters([...readCharacters(), character])
        return character
      },

      update: async (profile: CharacterProfile): Promise<CharacterProfile> => {
        const updated: CharacterProfile = {
          ...profile,
          ...normalizeCharacterProfileInput(profile),
          updatedAt: new Date().toISOString()
        }

        writeCharacters(readCharacters().map((item) => (item.id === profile.id ? updated : item)))
        return updated
      },

      remove: async (id: string): Promise<void> => {
        writeCharacters(readCharacters().filter((item) => item.id !== id))
      }
    },

    monsters: {
      list: async (): Promise<Monster[]> => readMonsters(),

      create: async (input: MonsterInput): Promise<Monster> => {
        const monster = createMonster(input)
        writeMonsters([...readMonsters(), monster])
        return monster
      },

      update: async (monster: Monster): Promise<Monster> => {
        const updated: Monster = {
          ...monster,
          ...normalizeMonsterInput(monster),
          updatedAt: new Date().toISOString()
        }

        writeMonsters(readMonsters().map((item) => (item.id === monster.id ? updated : item)))
        return updated
      },

      remove: async (id: string): Promise<void> => {
        writeMonsters(readMonsters().filter((item) => item.id !== id))
      }
    },

    settings: {
      get: async (): Promise<AppSettings> => readSettings(),

      update: async (patch: SettingsPatch): Promise<AppSettings> => {
        const next: AppSettings = {
          ...readSettings(),
          ...(patch.theme ? { theme: patch.theme } : {})
        }

        writeSettings(next)
        return next
      }
    }
  }
}
