import path from 'node:path'
import { app } from 'electron'
import { createRealm, normalizeRealmInput } from '@shared/domain'
import {
  DEFAULT_REALM_ID,
  REALMS_FILE_SCHEMA_VERSION,
  realmsFileSchema,
  type Realm,
  type RealmInput,
  type RealmsFile
} from '@shared/realm'
import { JsonFileError, readJsonFile, withFileLock, writeJsonAtomic } from './jsonFile'
import { getSettings, updateSettings } from './settingsStore'

const LOCK_KEY = 'realms.json'

export function realmsFile(): string {
  return path.join(app.getPath('userData'), 'realms.json')
}

function seedRealm(): Realm {
  const now = new Date().toISOString()
  return {
    id: DEFAULT_REALM_ID,
    name: 'D&D',
    description: 'Базовый фэнтези-сеттинг. Сюда попадают данные, созданные до появления сеттингов.',
    createdAt: now,
    updatedAt: now
  }
}

function emptyFile(): RealmsFile {
  return { schemaVersion: REALMS_FILE_SCHEMA_VERSION, realms: [] }
}

async function writeRealms(file: RealmsFile): Promise<void> {
  await writeJsonAtomic(realmsFile(), file)
}

async function readRealmsFile(): Promise<RealmsFile> {
  let raw: unknown

  try {
    raw = await readJsonFile(realmsFile())
  } catch (error) {
    if (error instanceof JsonFileError && error.code === 'ENOENT') {
      const seeded = { ...emptyFile(), realms: [seedRealm()] }
      await writeRealms(seeded)
      return seeded
    }
    throw new Error(`Не удалось прочитать сеттинги: ${(error as Error).message}`)
  }

  const parsed = realmsFileSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error('Файл сеттингов повреждён и не может быть прочитан')
  }

  if (parsed.data.realms.length === 0) {
    const seeded = { ...parsed.data, realms: [seedRealm()] }
    await writeRealms(seeded)
    return seeded
  }

  return parsed.data
}

function assertRealmInput(input: RealmInput): RealmInput {
  const normalized = normalizeRealmInput(input)
  if (!normalized.name) {
    throw new Error('Название сеттинга не может быть пустым')
  }
  return normalized
}

export async function listRealms(): Promise<Realm[]> {
  return (await readRealmsFile()).realms
}

/** Возвращает активный сеттинг, выбирая первый, если сохранённый недоступен. */
export async function getActiveRealmId(): Promise<string> {
  const realms = await listRealms()
  const settings = await getSettings()
  const active = realms.find((realm) => realm.id === settings.activeRealmId)

  if (active) return active.id

  const fallback = realms[0]!
  await updateSettings({ activeRealmId: fallback.id })
  return fallback.id
}

export async function addRealm(input: RealmInput): Promise<Realm> {
  const normalized = assertRealmInput(input)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readRealmsFile()
    const realm = createRealm(normalized)

    await writeRealms({ ...file, realms: [...file.realms, realm] })
    return realm
  })
}

export async function updateRealm(realm: Realm): Promise<Realm> {
  const normalized = assertRealmInput(realm)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readRealmsFile()
    const index = file.realms.findIndex((item) => item.id === realm.id)

    if (index === -1) {
      throw new Error('Сеттинг не найден — возможно, запись уже удалена')
    }

    const updated: Realm = {
      ...file.realms[index]!,
      name: normalized.name,
      description: normalized.description ?? '',
      updatedAt: new Date().toISOString()
    }

    const realms = [...file.realms]
    realms[index] = updated

    await writeRealms({ ...file, realms })
    return updated
  })
}

export async function removeRealm(id: string): Promise<void> {
  await withFileLock(LOCK_KEY, async () => {
    const file = await readRealmsFile()

    if (file.realms.length <= 1) {
      throw new Error('Нельзя удалить последний сеттинг')
    }

    const realms = file.realms.filter((realm) => realm.id !== id)
    if (realms.length === file.realms.length) return

    await writeRealms({ ...file, realms })
  })

  const settings = await getSettings()
  if (settings.activeRealmId === id) {
    const realms = await listRealms()
    await updateSettings({ activeRealmId: realms[0]!.id })
  }
}

export async function activateRealm(id: string): Promise<Realm> {
  const realms = await listRealms()
  const realm = realms.find((item) => item.id === id)

  if (!realm) {
    throw new Error('Сеттинг не найден — возможно, запись уже удалена')
  }

  await updateSettings({ activeRealmId: realm.id })
  return realm
}
