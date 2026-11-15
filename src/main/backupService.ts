import { promises as fs } from 'node:fs'
import path from 'node:path'
import { app, dialog } from 'electron'
import {
  AUTO_BACKUP_FILENAME_PREFIX,
  AUTO_BACKUP_KEEP_COUNT,
  BACKUP_EXTENSION,
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  backupFileSchema,
  countBackup,
  type BackupFile,
  type BackupFileSelection,
  type BackupManualResult,
  type BackupRestoreRequest,
  type BackupRestoreResult,
  type BackupSettings,
  type BackupSettingsPatch,
  type BackupFrequency
} from '@shared/backup'
import { SETTINGS_SCHEMA_VERSION } from '@shared/settings'
import { GAMES_FILE_SCHEMA_VERSION } from '@shared/game'
import { GAME_MONSTERS_FILE_SCHEMA_VERSION } from '@shared/gameMonster'
import { PLAYERS_FILE_SCHEMA_VERSION } from '@shared/player'
import { CHARACTERS_FILE_SCHEMA_VERSION } from '@shared/characterProfile'
import { MONSTERS_FILE_SCHEMA_VERSION } from '@shared/monster'
import { MAPS_FILE_SCHEMA_VERSION } from '@shared/map'
import { REALMS_FILE_SCHEMA_VERSION } from '@shared/realm'
import { PLACE_TYPES_FILE_SCHEMA_VERSION } from '@shared/placeType'
import { listGames } from './storage/gameStore'
import { listGameMonsters } from './storage/gameMonsterStore'
import { listPlayers } from './storage/playerStore'
import { listCharacters } from './storage/characterStore'
import { listMonsters } from './storage/monsterStore'
import { listMaps } from './storage/mapStore'
import { listRealms } from './storage/realmStore'
import { getPlaceTypesState } from './storage/placeTypeStore'
import { getSettings } from './storage/settingsStore'
import {
  getBackupSettings,
  isBackupFrequency,
  recordBackupResult,
  updateBackupSettings
} from './storage/backupSettingsStore'
import { withFileLock, writeJsonAtomic } from './storage/jsonFile'

const MAX_BACKUP_BYTES = 512 * 1024 * 1024

function userFile(name: string): string {
  return path.join(app.getPath('userData'), name)
}

function timestampForFile(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

function manualBackupName(): string {
  return `game-master-backup-${timestampForFile()}.${BACKUP_EXTENSION}`
}

function autoBackupName(): string {
  return `${AUTO_BACKUP_FILENAME_PREFIX}${timestampForFile()}.${BACKUP_EXTENSION}`
}

function parseBackup(value: unknown): BackupFile {
  const parsed = backupFileSchema.safeParse(value)
  if (parsed.success) return parsed.data

  const first = parsed.error.issues[0]
  const where = first?.path.length ? ` (${first.path.join('.')})` : ''
  throw new Error(
    `Файл не является корректным бэкапом Game Master${where}: ${first?.message ?? 'неизвестная ошибка'}`
  )
}

async function writeBackupFile(filePath: string, backup: BackupFile): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8')
}

export async function createBackupFile(): Promise<BackupFile> {
  const [
    games,
    gameMonsters,
    players,
    characters,
    monsters,
    maps,
    realms,
    placeTypesState,
    settings
  ] = await Promise.all([
    listGames(),
    listGameMonsters(),
    listPlayers(),
    listCharacters(),
    listMonsters(),
    listMaps(),
    listRealms(),
    getPlaceTypesState(),
    getSettings()
  ])

  return backupFileSchema.parse({
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: app.getVersion(),
    data: {
      games,
      gameMonsters,
      players,
      characters,
      monsters,
      maps,
      realms,
      placeTypes: placeTypesState.placeTypes,
      presetCatalogVersion: placeTypesState.presetCatalogVersion,
      seededPresetKeys: placeTypesState.seededPresetKeys,
      settings: { theme: settings.theme }
    }
  })
}

export async function saveManualBackup(): Promise<BackupManualResult | null> {
  const backup = await createBackupFile()
  const choice = await dialog.showSaveDialog({
    title: 'Сохранение бэкапа Game Master',
    defaultPath: path.join(app.getPath('documents'), manualBackupName()),
    filters: [{ name: 'Бэкап Game Master', extensions: [BACKUP_EXTENSION] }]
  })

  if (choice.canceled || !choice.filePath) return null

  const target = path.extname(choice.filePath)
    ? choice.filePath
    : `${choice.filePath}.${BACKUP_EXTENSION}`

  await writeBackupFile(target, backup)

  return {
    fileName: path.basename(target),
    createdAt: backup.createdAt,
    counts: countBackup(backup)
  }
}

export async function chooseBackupFile(): Promise<BackupFileSelection | null> {
  const choice = await dialog.showOpenDialog({
    title: 'Загрузка бэкапа Game Master',
    properties: ['openFile'],
    filters: [{ name: 'Бэкап Game Master', extensions: [BACKUP_EXTENSION, 'json'] }]
  })

  const filePath = choice.filePaths[0]
  if (choice.canceled || !filePath) return null

  const stat = await fs.stat(filePath)
  if (stat.size > MAX_BACKUP_BYTES) {
    throw new Error('Файл бэкапа слишком большой')
  }

  const raw = await fs.readFile(filePath, 'utf8')
  let json: unknown

  try {
    json = JSON.parse(raw) as unknown
  } catch {
    throw new Error('Файл повреждён: внутри не JSON')
  }

  const backup = parseBackup(json)

  return {
    fileName: path.basename(filePath),
    backup,
    createdAt: backup.createdAt,
    ...(backup.appVersion ? { appVersion: backup.appVersion } : {}),
    theme: backup.data.settings.theme,
    counts: countBackup(backup)
  }
}

async function replaceDataFile(name: string, data: unknown): Promise<void> {
  await withFileLock(name, async () => {
    await writeJsonAtomic(userFile(name), data)
  })
}

export async function restoreBackup(requestValue: unknown): Promise<BackupRestoreResult> {
  if (!requestValue || typeof requestValue !== 'object') {
    throw new Error('Некорректный запрос восстановления')
  }

  const request = requestValue as Partial<BackupRestoreRequest>
  const backup = parseBackup(request.backup)

  // Перед заменой сохраняем текущее состояние отдельным файлом.
  const safety = await createBackupFile()
  const safetyBackupFileName = `game-master-backup-before-restore-${timestampForFile()}.${BACKUP_EXTENSION}`
  await writeBackupFile(userFile(safetyBackupFileName), safety)

  await replaceDataFile('games.json', {
    schemaVersion: GAMES_FILE_SCHEMA_VERSION,
    games: backup.data.games
  })
  await replaceDataFile('gameMonsters.json', {
    schemaVersion: GAME_MONSTERS_FILE_SCHEMA_VERSION,
    monsters: backup.data.gameMonsters
  })
  await replaceDataFile('players.json', {
    schemaVersion: PLAYERS_FILE_SCHEMA_VERSION,
    players: backup.data.players
  })
  await replaceDataFile('characters.json', {
    schemaVersion: CHARACTERS_FILE_SCHEMA_VERSION,
    characters: backup.data.characters
  })
  await replaceDataFile('monsters.json', {
    schemaVersion: MONSTERS_FILE_SCHEMA_VERSION,
    monsters: backup.data.monsters
  })
  await replaceDataFile('maps.json', {
    schemaVersion: MAPS_FILE_SCHEMA_VERSION,
    maps: backup.data.maps
  })
  await replaceDataFile('realms.json', {
    schemaVersion: REALMS_FILE_SCHEMA_VERSION,
    realms: backup.data.realms
  })
  await replaceDataFile('placeTypes.json', {
    schemaVersion: PLACE_TYPES_FILE_SCHEMA_VERSION,
    placeTypes: backup.data.placeTypes,
    presetCatalogVersion: backup.data.presetCatalogVersion,
    seededPresetKeys: backup.data.seededPresetKeys
  })
  await replaceDataFile('settings.json', {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    theme: backup.data.settings.theme
  })

  return {
    restoredAt: new Date().toISOString(),
    safetyBackupFileName,
    counts: countBackup(backup)
  }
}

export async function chooseBackupFolder(): Promise<string | null> {
  const choice = await dialog.showOpenDialog({
    title: 'Папка для автоматических бэкапов',
    properties: ['openDirectory', 'createDirectory']
  })

  const folder = choice.filePaths[0]
  if (choice.canceled || !folder) return null

  await fs.mkdir(folder, { recursive: true })
  const stat = await fs.stat(folder)
  if (!stat.isDirectory()) throw new Error('Выбранный путь не является папкой')
  return folder
}

export async function getBackupConfig(): Promise<BackupSettings> {
  return getBackupSettings()
}

export async function updateBackupConfig(value: unknown): Promise<BackupSettings> {
  if (!value || typeof value !== 'object') {
    throw new Error('Некорректные настройки бэкапа')
  }

  const request = value as Record<string, unknown>
  const patch: BackupSettingsPatch = {}

  if (request.folderPath !== undefined) {
    const folderPath = String(request.folderPath).trim()
    if (!folderPath) throw new Error('Укажите папку для бэкапов')
    const stat = await fs.stat(folderPath)
    if (!stat.isDirectory()) throw new Error('Выбранный путь не является папкой')
    patch.folderPath = folderPath
  }

  if (request.frequency !== undefined) {
    if (!isBackupFrequency(request.frequency)) {
      throw new Error('Некорректная частота автоматического бэкапа')
    }
    patch.frequency = request.frequency
  }

  return updateBackupSettings(patch)
}

function intervalMs(frequency: BackupFrequency): number | null {
  if (frequency === 'daily') return 24 * 60 * 60 * 1000
  if (frequency === 'every2Days') return 2 * 24 * 60 * 60 * 1000
  if (frequency === 'every3Days') return 3 * 24 * 60 * 60 * 1000
  return null
}

function isAutoBackupDue(
  settings: BackupSettings,
  trigger: 'startup' | 'quit'
): boolean {
  if (settings.frequency === 'off') return false
  if (settings.frequency === 'onClose') return trigger === 'quit'

  const interval = intervalMs(settings.frequency)
  if (!interval) return false
  if (!settings.lastBackupAt) return true

  const last = Date.parse(settings.lastBackupAt)
  return !Number.isFinite(last) || Date.now() - last >= interval
}

async function pruneAutoBackups(folderPath: string): Promise<void> {
  const entries = await fs.readdir(folderPath, { withFileTypes: true })
  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.startsWith(AUTO_BACKUP_FILENAME_PREFIX) &&
        entry.name.endsWith(`.${BACKUP_EXTENSION}`)
    )
    .map((entry) => entry.name)
    .sort()
    .reverse()

  for (const name of files.slice(AUTO_BACKUP_KEEP_COUNT)) {
    await fs.unlink(path.join(folderPath, name)).catch(() => undefined)
  }
}

async function performAutoBackupIfDue(
  trigger: 'startup' | 'quit'
): Promise<string | null> {
  const settings = await getBackupSettings()
  if (!isAutoBackupDue(settings, trigger)) return null

  try {
    await fs.mkdir(settings.folderPath, { recursive: true })
    const backup = await createBackupFile()
    const fileName = autoBackupName()
    await writeBackupFile(path.join(settings.folderPath, fileName), backup)
    await pruneAutoBackups(settings.folderPath)
    await recordBackupResult(backup.createdAt, null)
    return fileName
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 2000)
    await recordBackupResult(settings.lastBackupAt, message).catch(() => undefined)
    console.error('Не удалось создать автоматический бэкап:', message)
    return null
  }
}

let autoBackupInFlight: Promise<string | null> | null = null

/** Один автобэкап за раз: запуск и выход не должны создать две копии. */
export function runAutoBackupIfDue(
  trigger: 'startup' | 'quit'
): Promise<string | null> {
  if (autoBackupInFlight) return autoBackupInFlight

  autoBackupInFlight = performAutoBackupIfDue(trigger).finally(() => {
    autoBackupInFlight = null
  })

  return autoBackupInFlight
}

let quitBackupStarted = false

/** Перед выходом даёт шанс записать бэкап, затем завершает приложение. */
export function registerAutoBackupOnQuit(): void {
  app.on('before-quit', (event) => {
    if (quitBackupStarted) return

    quitBackupStarted = true
    event.preventDefault()
    void runAutoBackupIfDue('quit')
      .catch(() => undefined)
      .finally(() => app.quit())
  })
}
