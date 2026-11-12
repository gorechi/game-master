import { app, ipcMain, shell } from 'electron'
import {
  campaignSchema,
  type Campaign,
  type CampaignSummary
} from '@shared/campaign'
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
import { finishClose } from './window'

function assertId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) {
    throw new Error('Некорректный идентификатор кампании')
  }
  return value
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
}
