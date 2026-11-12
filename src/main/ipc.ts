import { app, ipcMain, shell } from 'electron'
import {
  campaignSchema,
  type Campaign,
  type CampaignSummary
} from '@shared/campaign'
import { playerSchema, type PlayerInput } from '@shared/player'
import { isThemeName, type SettingsPatch } from '@shared/settings'
import {
  IPC,
  type AppInfo,
  type CreateCampaignInput,
  type SaveCampaignResult
} from '@shared/api'
import {
  campaignsDir,
  createCampaign,
  ensureCampaignStorage,
  listCampaigns,
  loadCampaign,
  removeCampaign,
  revealCampaign,
  saveCampaign
} from './storage/campaignStore'
import { addPlayer, listPlayers, removePlayer, updatePlayer } from './storage/playerStore'
import { getSettings, updateSettings } from './storage/settingsStore'
import { finishClose } from './window'

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
      dataDir: campaignsDir()
    }
  })

  ipcMain.handle(IPC.appOpenDataFolder, async (): Promise<void> => {
    await ensureCampaignStorage()
    const error = await shell.openPath(campaignsDir())
    if (error) throw new Error(`Не удалось открыть папку: ${error}`)
  })

  ipcMain.on(IPC.appCloseReady, () => finishClose())

  ipcMain.handle(IPC.campaignsList, (): Promise<CampaignSummary[]> => listCampaigns())

  ipcMain.handle(IPC.campaignLoad, (_event, id: unknown): Promise<Campaign> =>
    loadCampaign(assertId(id))
  )

  ipcMain.handle(IPC.campaignCreate, (_event, input: unknown): Promise<Campaign> => {
    const parsed = input as CreateCampaignInput | null
    if (!parsed || typeof parsed.name !== 'string' || parsed.name.length > 200) {
      throw new Error('Некорректное название кампании')
    }
    return createCampaign(parsed.name)
  })

  ipcMain.handle(IPC.campaignSave, async (_event, input: unknown): Promise<SaveCampaignResult> => {
    // Renderer не является доверенным источником: схема проверяется в main.
    const campaign = campaignSchema.parse(input)
    const summary = await saveCampaign(campaign)
    return { summary, savedAt: new Date().toISOString() }
  })

  ipcMain.handle(IPC.campaignRemove, (_event, id: unknown): Promise<void> =>
    removeCampaign(assertId(id))
  )

  ipcMain.handle(IPC.campaignReveal, (_event, id: unknown): Promise<void> => {
    revealCampaign(assertId(id))
    return Promise.resolve()
  })

  ipcMain.handle(IPC.playersList, () => listPlayers())

  ipcMain.handle(IPC.playerCreate, (_event, input: unknown) => addPlayer(parsePlayerInput(input)))

  ipcMain.handle(IPC.playerUpdate, (_event, input: unknown) => {
    const player = playerSchema.parse(input)
    return updatePlayer(player)
  })

  ipcMain.handle(IPC.playerRemove, (_event, id: unknown): Promise<void> =>
    removePlayer(assertId(id))
  )

  ipcMain.handle(IPC.settingsGet, () => getSettings())

  ipcMain.handle(IPC.settingsUpdate, (_event, patch: unknown) =>
    updateSettings(parseSettingsPatch(patch))
  )
}
