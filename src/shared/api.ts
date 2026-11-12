import type { Campaign, CampaignSummary } from './campaign'

/**
 * Контракт между renderer и main. Единственный источник правды для
 * имён IPC-каналов и типов запросов/ответов.
 */
export const IPC = {
  appInfo: 'app:info',
  appOpenDataFolder: 'app:open-data-folder',
  appBeforeClose: 'app:before-close',
  appCloseReady: 'app:close-ready',
  campaignsList: 'campaigns:list',
  campaignLoad: 'campaign:load',
  campaignCreate: 'campaign:create',
  campaignSave: 'campaign:save',
  campaignRemove: 'campaign:remove',
  campaignReveal: 'campaign:reveal'
} as const

export interface AppInfo {
  name: string
  version: string
  electron: string
  chrome: string
  platform: 'win32' | 'darwin' | 'linux' | 'other'
  dataDir: string
}

export interface CreateCampaignInput {
  name: string
}

export interface SaveCampaignResult {
  summary: CampaignSummary
  savedAt: string
}

export interface GameMasterApi {
  app: {
    info(): Promise<AppInfo>
    openDataFolder(): Promise<void>
    /** main просит renderer дописать несохранённое перед закрытием окна. */
    onBeforeClose(listener: () => void): () => void
    /** renderer подтверждает, что запись закончена и окно можно закрывать. */
    closeReady(): void
  }
  campaigns: {
    list(): Promise<CampaignSummary[]>
    create(input: CreateCampaignInput): Promise<Campaign>
    load(id: string): Promise<Campaign>
    save(campaign: Campaign): Promise<SaveCampaignResult>
    remove(id: string): Promise<void>
    reveal(id: string): Promise<void>
  }
}
