import path from 'node:path'
import { app } from 'electron'
import { z } from 'zod'
import {
  DEFAULT_SETTINGS,
  SETTINGS_SCHEMA_VERSION,
  THEMES,
  type AppSettings,
  type SettingsPatch
} from '@shared/settings'
import { JsonFileError, readJsonFile, withFileLock, writeJsonAtomic } from './jsonFile'

const LOCK_KEY = 'settings.json'

const settingsFileSchema = z.object({
  schemaVersion: z.number().int().min(1),
  theme: z.enum(THEMES)
})

export function settingsFile(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

function defaults(): AppSettings {
  return { ...DEFAULT_SETTINGS, schemaVersion: SETTINGS_SCHEMA_VERSION }
}

/**
 * Повреждённый или отсутствующий файл настроек не должен мешать запуску:
 * в этом случае возвращаем значения по умолчанию.
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    const parsed = settingsFileSchema.safeParse(await readJsonFile(settingsFile()))
    return parsed.success ? parsed.data : defaults()
  } catch (error) {
    if (error instanceof JsonFileError) return defaults()
    throw error
  }
}

export async function updateSettings(patch: SettingsPatch): Promise<AppSettings> {
  return withFileLock(LOCK_KEY, async () => {
    const current = await getSettings()
    const next: AppSettings = {
      ...current,
      ...(patch.theme ? { theme: patch.theme } : {})
    }

    await writeJsonAtomic(settingsFile(), next)
    return next
  })
}
