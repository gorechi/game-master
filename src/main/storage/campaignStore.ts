import { app, shell } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  CAMPAIGN_SCHEMA_VERSION,
  createEmptyCampaign,
  summarizeBrokenCampaign,
  summarizeCampaign
} from '@shared/domain'
import { parseCampaign, type Campaign, type CampaignSummary } from '@shared/campaign'
import { JsonFileError, readJsonFile, withFileLock, writeJsonAtomic } from './jsonFile'

const ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/
const FILE_EXTENSION = '.json'

/** Папка с кампаниями внутри userData: одна кампания = один JSON-файл. */
export function campaignsDir(): string {
  return path.join(app.getPath('userData'), 'campaigns')
}

export async function ensureCampaignStorage(): Promise<void> {
  await fs.mkdir(campaignsDir(), { recursive: true })
}

function campaignFile(id: string): string {
  if (!ID_PATTERN.test(id)) {
    throw new Error('Некорректный идентификатор кампании')
  }
  return path.join(campaignsDir(), `${id}${FILE_EXTENSION}`)
}

/* ------------------------------------------------------------------ */
/* Публичное API хранилища                                            */
/* ------------------------------------------------------------------ */

export async function listCampaigns(): Promise<CampaignSummary[]> {
  await ensureCampaignStorage()

  const entries = await fs.readdir(campaignsDir(), { withFileTypes: true })
  const files = entries.filter((e) => e.isFile() && e.name.endsWith(FILE_EXTENSION))

  const summaries = await Promise.all(
    files.map(async (file): Promise<CampaignSummary> => {
      const id = file.name.slice(0, -FILE_EXTENSION.length)

      if (!ID_PATTERN.test(id)) {
        return summarizeBrokenCampaign(id, 'имя файла не соответствует формату кампании')
      }

      try {
        const raw = await readJsonFile(path.join(campaignsDir(), file.name))
        return summarizeCampaign(parseCampaign(raw))
      } catch (error) {
        return summarizeBrokenCampaign(id, error instanceof Error ? error.message : String(error))
      }
    })
  )

  return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function loadCampaign(id: string): Promise<Campaign> {
  const file = campaignFile(id)

  let raw: unknown
  try {
    raw = await readJsonFile(file)
  } catch (error) {
    if (error instanceof JsonFileError && error.code === 'ENOENT') {
      throw new Error('Кампания не найдена — возможно, файл был перемещён или удалён')
    }
    throw new Error(`Не удалось прочитать файл кампании: ${(error as Error).message}`)
  }

  const campaign = parseCampaign(raw)
  if (campaign.id !== id) {
    throw new Error('Содержимое файла не совпадает с его именем')
  }

  return campaign
}

export async function createCampaign(name: string): Promise<Campaign> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Название кампании не может быть пустым')

  const campaign = createEmptyCampaign(trimmed)
  await withFileLock(campaign.id, () => writeJsonAtomic(campaignFile(campaign.id), campaign))
  return campaign
}

export async function saveCampaign(campaign: Campaign): Promise<CampaignSummary> {
  const normalized: Campaign = {
    ...campaign,
    schemaVersion: CAMPAIGN_SCHEMA_VERSION,
    name: campaign.name.trim() || 'Без названия',
    updatedAt: new Date().toISOString()
  }

  await withFileLock(normalized.id, () =>
    writeJsonAtomic(campaignFile(normalized.id), normalized)
  )

  return summarizeCampaign(normalized)
}

export async function removeCampaign(id: string): Promise<void> {
  const file = campaignFile(id)

  try {
    await fs.access(file)
  } catch {
    return
  }

  try {
    // В корзину, а не безвозвратно: случайно удалённую кампанию можно вернуть.
    await shell.trashItem(file)
  } catch {
    await fs.rm(file, { force: true })
  }
}

export function revealCampaign(id: string): void {
  shell.showItemInFolder(campaignFile(id))
}
