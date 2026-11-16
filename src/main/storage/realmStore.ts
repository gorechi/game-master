import path from 'node:path'
import { app } from 'electron'
import { createRealm, normalizeRealmInput } from '@shared/domain'
import { localizeDefaultRealm } from '@shared/defaultRealm'
import {
  DEFAULT_REALM_ID,
  REALMS_FILE_SCHEMA_VERSION,
  realmsFileSchema,
  type Realm,
  type RealmInput,
  type RealmsFile
} from '@shared/realm'
import { JsonFileError, readJsonFile, withFileLock, writeJsonAtomic } from './jsonFile'
import { fill, m } from '@shared/i18n'

const LOCK_KEY = 'realms.json'

function realmsFile(): string {
  return path.join(app.getPath('userData'), 'realms.json')
}

function seedRealm(): Realm {
  const now = new Date().toISOString()
  return {
    id: DEFAULT_REALM_ID,
    name: 'D&D',
    description: m().main.realms.seedDescription,
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
    throw new Error(fill(m().main.realms.readFailed, { error: (error as Error).message }))
  }

  const parsed = realmsFileSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(m().main.realms.corrupted)
  }

  if (parsed.data.realms.length === 0) {
    const seeded = { ...parsed.data, realms: [seedRealm()] }
    await writeRealms(seeded)
    return seeded
  }

  const localized = parsed.data.realms.map(localizeDefaultRealm)
  const changed = localized.some((realm, index) => realm !== parsed.data.realms[index])

  if (changed) {
    const file = { ...parsed.data, realms: localized }
    await writeRealms(file)
    return file
  }

  return parsed.data
}

function assertRealmInput(input: RealmInput): RealmInput {
  const normalized = normalizeRealmInput(input)
  if (!normalized.name) {
    throw new Error(m().main.realms.nameRequired)
  }
  return normalized
}

export async function listRealms(): Promise<Realm[]> {
  return (await readRealmsFile()).realms
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
      throw new Error(m().main.realms.recordNotFound)
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
      throw new Error(m().main.realms.lastRemovalForbidden)
    }

    const realms = file.realms.filter((realm) => realm.id !== id)
    if (realms.length === file.realms.length) return

    await writeRealms({ ...file, realms })
  })
}
