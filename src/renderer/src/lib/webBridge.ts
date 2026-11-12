import type { AppInfo, GameMasterApi } from '@shared/api'
import type { Player, PlayerInput } from '@shared/player'
import type { CharacterProfile, CharacterProfileInput } from '@shared/characterProfile'
import type { Monster, MonsterInput } from '@shared/monster'
import {
  createCharacterProfile,
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

const PLAYERS_KEY = 'game-master.preview.players'
const CHARACTERS_KEY = 'game-master.preview.characters'
const MONSTERS_KEY = 'game-master.preview.monsters'
const SETTINGS_KEY = 'game-master.preview.settings'

/** Полный сброс предпросмотра (кнопка на главном экране). */
export function resetWebPreview(): void {
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
    return Array.isArray(parsed) ? (parsed as Monster[]) : []
  } catch {
    return []
  }
}

function writeMonsters(monsters: Monster[]): void {
  window.localStorage.setItem(MONSTERS_KEY, JSON.stringify(monsters))
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
