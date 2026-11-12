import type { AppInfo, GameMasterApi, SaveCampaignResult } from '@shared/api'
import type { Campaign, CampaignSummary } from '@shared/campaign'
import { createEmptyCampaign, summarizeCampaign } from '@shared/domain'

/**
 * Веб-адаптер того же контракта, что и мост preload.
 *
 * Нужен только для быстрого просмотра интерфейса в обычном браузере
 * (`npm run dev:web`): данные лежат в localStorage, файловой системы нет.
 * В Electron этот модуль не используется — window.gameMaster всегда есть.
 */

const STORAGE_KEY = 'game-master.preview.campaigns'

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
  window.location.reload()
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
    }
  }
}
