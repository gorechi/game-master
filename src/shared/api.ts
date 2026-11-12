import type { Campaign, CampaignSummary } from './campaign'
import type { Player, PlayerInput } from './player'
import type { CharacterProfile, CharacterProfileInput } from './characterProfile'
import type { AppSettings, SettingsPatch } from './settings'

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
  campaignReveal: 'campaign:reveal',
  playersList: 'players:list',
  playerCreate: 'player:create',
  playerUpdate: 'player:update',
  playerRemove: 'player:remove',
  charactersList: 'characters:list',
  characterCreate: 'character:create',
  characterUpdate: 'character:update',
  characterRemove: 'character:remove',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update'
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
  /** Общая база игроков-людей, не привязанная к кампании. */
  players: {
    list(): Promise<Player[]>
    create(input: PlayerInput): Promise<Player>
    update(player: Player): Promise<Player>
    remove(id: string): Promise<void>
  }
  /** Персонажи: у игрока их может быть несколько. */
  characters: {
    list(): Promise<CharacterProfile[]>
    create(input: CharacterProfileInput): Promise<CharacterProfile>
    update(profile: CharacterProfile): Promise<CharacterProfile>
    remove(id: string): Promise<void>
  }
  /** Настройки приложения (тема и прочее). */
  settings: {
    get(): Promise<AppSettings>
    update(patch: SettingsPatch): Promise<AppSettings>
  }
}
