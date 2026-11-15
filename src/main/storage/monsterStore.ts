import path from 'node:path'
import { app } from 'electron'
import { createMonster, migrateMonsterStats, normalizeMonsterInput } from '@shared/domain'
import { DEFAULT_REALM_ID } from '@shared/realm'
import {
  MONSTERS_FILE_SCHEMA_VERSION,
  monstersFileSchema,
  type Monster,
  type MonsterInput,
  type MonstersFile
} from '@shared/monster'
import { JsonFileError, readJsonFile, withFileLock, writeJsonAtomic } from './jsonFile'

const LOCK_KEY = 'monsters.json'

export function monstersFile(): string {
  return path.join(app.getPath('userData'), 'monsters.json')
}

function emptyFile(): MonstersFile {
  return { schemaVersion: MONSTERS_FILE_SCHEMA_VERSION, monsters: [] }
}

/**
 * Старые файлы хранили модификаторы −10…10. Переводим их в значения 1–30
 * по формуле 10 + 2·y, чтобы записи не считались повреждёнными.
 */
function migrateStoredMonster(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  return migrateMonsterStats(raw as Record<string, unknown>)
}

async function readMonstersFile(): Promise<MonstersFile> {
  let raw: unknown

  try {
    raw = await readJsonFile(monstersFile())
  } catch (error) {
    if (error instanceof JsonFileError && error.code === 'ENOENT') {
      return emptyFile()
    }
    throw new Error(`Не удалось прочитать бестиарий: ${(error as Error).message}`)
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('Файл бестиария повреждён и не может быть прочитан')
  }

  const file = raw as Record<string, unknown>
  const monsters = Array.isArray(file.monsters)
    ? file.monsters.map(migrateStoredMonster)
    : file.monsters

  const parsed = monstersFileSchema.safeParse({ ...file, monsters })
  if (!parsed.success) {
    throw new Error('Файл бестиария повреждён и не может быть прочитан')
  }

  return parsed.data
}

function assertName(input: MonsterInput): ReturnType<typeof normalizeMonsterInput> {
  const normalized = normalizeMonsterInput(input)
  if (!normalized.name) {
    throw new Error('Название монстра не может быть пустым')
  }
  return normalized
}

export async function listMonsters(realmId?: string): Promise<Monster[]> {
  const monsters = (await readMonstersFile()).monsters
  return realmId ? monsters.filter((monster) => monster.realmId === realmId) : monsters
}

export async function addMonster(
  input: MonsterInput,
  realmId: string = DEFAULT_REALM_ID
): Promise<Monster> {
  const normalized = assertName(input)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readMonstersFile()
    const monster = createMonster(normalized, realmId)

    await writeJsonAtomic(monstersFile(), {
      ...file,
      monsters: [...file.monsters, monster]
    })

    return monster
  })
}

export async function updateMonster(monster: Monster): Promise<Monster> {
  const normalized = assertName(monster)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readMonstersFile()
    const index = file.monsters.findIndex((item) => item.id === monster.id)

    if (index === -1) {
      throw new Error('Монстр не найден — возможно, запись уже удалена')
    }

    const updated: Monster = {
      ...file.monsters[index]!,
      ...normalized,
      updatedAt: new Date().toISOString()
    }

    const monsters = [...file.monsters]
    monsters[index] = updated

    await writeJsonAtomic(monstersFile(), { ...file, monsters })
    return updated
  })
}

export async function removeMonster(id: string): Promise<void> {
  await withFileLock(LOCK_KEY, async () => {
    const file = await readMonstersFile()
    const monsters = file.monsters.filter((item) => item.id !== id)

    if (monsters.length === file.monsters.length) return

    await writeJsonAtomic(monstersFile(), { ...file, monsters })
  })
}
