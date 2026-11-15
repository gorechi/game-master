import path from 'node:path'
import { app } from 'electron'
import {
  BACKUP_SCHEMA_VERSION,
  backupSettingsSchema,
  type BackupFrequency,
  type BackupSettings,
  type BackupSettingsPatch
} from '@shared/backup'
import { JsonFileError, readJsonFile, withFileLock, writeJsonAtomic } from './jsonFile'

const LOCK_KEY = 'backupSettings.json'

function backupSettingsFile(): string {
  return path.join(app.getPath('userData'), 'backupSettings.json')
}

function defaults(): BackupSettings {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    folderPath: app.getPath('userData'),
    frequency: 'off',
    lastBackupAt: null,
    lastError: null
  }
}

export async function getBackupSettings(): Promise<BackupSettings> {
  let raw: unknown

  try {
    raw = await readJsonFile(backupSettingsFile())
  } catch (error) {
    if (error instanceof JsonFileError) return defaults()
    throw error
  }

  const base = defaults()
  const parsed = backupSettingsSchema.safeParse({
    ...base,
    ...(raw && typeof raw === 'object' ? raw : {})
  })

  return parsed.success ? parsed.data : base
}

export async function updateBackupSettings(
  patch: BackupSettingsPatch
): Promise<BackupSettings> {
  return withFileLock(LOCK_KEY, async () => {
    const current = await getBackupSettings()
    const next: BackupSettings = {
      ...current,
      ...(patch.folderPath !== undefined ? { folderPath: patch.folderPath } : {}),
      ...(patch.frequency !== undefined ? { frequency: patch.frequency } : {}),
      ...(patch.folderPath !== undefined || patch.frequency !== undefined
        ? { lastError: null }
        : {})
    }

    const parsed = backupSettingsSchema.parse(next)
    await writeJsonAtomic(backupSettingsFile(), parsed)
    return parsed
  })
}

export async function recordBackupResult(
  lastBackupAt: string | null,
  lastError: string | null
): Promise<BackupSettings> {
  return withFileLock(LOCK_KEY, async () => {
    const current = await getBackupSettings()
    const next: BackupSettings = {
      ...current,
      lastBackupAt,
      lastError
    }

    const parsed = backupSettingsSchema.parse(next)
    await writeJsonAtomic(backupSettingsFile(), parsed)
    return parsed
  })
}

export function isBackupFrequency(value: unknown): value is BackupFrequency {
  return (
    value === 'off' ||
    value === 'onClose' ||
    value === 'daily' ||
    value === 'every2Days' ||
    value === 'every3Days'
  )
}
