import type { AppInfo, GameMasterApi, SaveCampaignResult } from '@shared/api'
import type { Campaign, CampaignSummary } from '@shared/campaign'
import type { Player, PlayerInput } from '@shared/player'
import type { CharacterProfile, CharacterProfileInput } from '@shared/characterProfile'
import {
  createCharacterProfile,
  normalizeCharacterProfileInput
} from '@shared/domain'
import {
  DEFAULT_SETTINGS,
  SETTINGS_SCHEMA_VERSION,
  isThemeName,
  type AppSettings,
  type SettingsPatch
} from '@shared/settings'
import {
  createEmptyCampaign,
  createPlayer,
  normalizePlayerInput,
  summarizeCampaign
} from '@shared/domain'

/**
 * Веб-адаптер того же контракта, что и мост preload.
 *
 * Нужен только для быстрого просмотра интерфейса в обычном браузере
 * (`npm run dev:web`): данные лежат в localStorage, файловой системы нет.
 * В Electron этот модуль не используется — window.gameMaster всегда есть.
 */

const STORAGE_KEY = 'game-master.preview.campaigns'
const PLAYERS_KEY = 'game-master.preview.players'
const CHARACTERS_KEY = 'game-master.preview.characters'
const SETTINGS_KEY = 'game-master.preview.settings'

function readAll(): Record<string, Campaign> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}

    return parsed as Record<string, Campaign>
  } catch {
    return {}
  }
}

function writeAll(campaigns: Record<string, Campaign>): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns))
}

/** Полный сброс предпросмотра (кнопка на главном экране). */
export function resetWebPreview(): void {
  window.localStorage.removeItem(STORAGE_KEY)
  window.localStorage.removeItem(PLAYERS_KEY)
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

const beforeCloseListeners = new Set<() => void>()
let unloadBound = false

export function createWebBridge(): GameMasterApi {
  return {
    app: {
      info: async (): Promise<AppInfo> => ({
        name: 'Game Master',
        version: 'web-preview',
        electron: '—',
        chrome: navigator.userAgent,
        platform: 'other',
        dataDir: STORAGE_KEY
      }),
      openDataFolder: async (): Promise<void> => undefined,
      onBeforeClose: (listener) => {
        beforeCloseListeners.add(listener)

        if (!unloadBound) {
          unloadBound = true
          window.addEventListener('beforeunload', () => {
            for (const callback of beforeCloseListeners) callback()
          })
        }

        return () => {
          beforeCloseListeners.delete(listener)
        }
      },
      closeReady: () => undefined
    },

    campaigns: {
      list: async (): Promise<CampaignSummary[]> => {
        return Object.values(readAll())
          .map(summarizeCampaign)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      },

      create: async ({ name }): Promise<Campaign> => {
        const campaign = createEmptyCampaign(name.trim() || 'Без названия')
        const all = readAll()
        all[campaign.id] = campaign
        writeAll(all)
        return campaign
      },

      load: async (id): Promise<Campaign> => {
        const campaign = readAll()[id]
        if (!campaign) throw new Error('Кампания не найдена в локальном хранилище браузера')
        return campaign
      },

      save: async (campaign): Promise<SaveCampaignResult> => {
        const saved: Campaign = {
          ...campaign,
          name: campaign.name.trim() || 'Без названия',
          updatedAt: new Date().toISOString()
        }

        const all = readAll()
        all[saved.id] = saved
        writeAll(all)

        return { summary: summarizeCampaign(saved), savedAt: saved.updatedAt }
      },

      remove: async (id): Promise<void> => {
        const all = readAll()
        delete all[id]
        writeAll(all)
      },

      reveal: async (): Promise<void> => undefined
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
