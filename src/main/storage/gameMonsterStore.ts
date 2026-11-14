import path from 'node:path'
import { app } from 'electron'
import { createGameMonsterEntry } from '@shared/domain'
import { DEFAULT_REALM_ID } from '@shared/realm'
import {
  GAME_MONSTERS_FILE_SCHEMA_VERSION,
  gameMonstersFileSchema,
  type GameMonsterEntry,
  type GameMonsterInput,
  type GameMonstersFile
} from '@shared/gameMonster'
import { JsonFileError, readJsonFile, withFileLock, writeJsonAtomic } from './jsonFile'

const LOCK_KEY = 'gameMonsters.json'

export function gameMonstersFile(): string {
  return path.join(app.getPath('userData'), 'gameMonsters.json')
}

function emptyFile(): GameMonstersFile {
  return { schemaVersion: GAME_MONSTERS_FILE_SCHEMA_VERSION, monsters: [] }
}

async function readGameMonstersFile(): Promise<GameMonstersFile> {
  let raw: unknown

  try {
    raw = await readJsonFile(gameMonstersFile())
  } catch (error) {
    if (error instanceof JsonFileError && error.code === 'ENOENT') {
      return emptyFile()
    }
    throw new Error(`Не удалось прочитать список игровых монстров: ${(error as Error).message}`)
  }

  const parsed = gameMonstersFileSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error('Файл игровых монстров повреждён и не может быть прочитан')
  }

  return parsed.data
}

/**
 * Добавляет сохранённых монстров. Идемпотентно: повторное сохранение того же
 * экземпляра (по его id) не создаёт дубликат.
 */
export async function saveGameMonsters(entries: readonly GameMonsterEntry[]): Promise<void> {
  if (entries.length === 0) return

  await withFileLock(LOCK_KEY, async () => {
    const file = await readGameMonstersFile()
    const existingIds = new Set(file.monsters.map((monster) => monster.id))
    const additions = entries.filter((monster) => !existingIds.has(monster.id))

    if (additions.length === 0) return

    await writeJsonAtomic(gameMonstersFile(), {
      ...file,
      monsters: [...file.monsters, ...additions]
    })
  })
}

export async function listGameMonsters(realmId?: string): Promise<GameMonsterEntry[]> {
  const monsters = (await readGameMonstersFile()).monsters
  return realmId ? monsters.filter((monster) => monster.realmId === realmId) : monsters
}

/** Создаёт уникального монстра вручную (не из завершённой игры). */
export async function addGameMonster(
  input: GameMonsterInput,
  realmId: string = DEFAULT_REALM_ID
): Promise<GameMonsterEntry> {
  const entry = createGameMonsterEntry(input, realmId)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readGameMonstersFile()
    await writeJsonAtomic(gameMonstersFile(), {
      ...file,
      monsters: [...file.monsters, entry]
    })
    return entry
  })
}

export async function updateGameMonster(entry: GameMonsterEntry): Promise<GameMonsterEntry> {
  return withFileLock(LOCK_KEY, async () => {
    const file = await readGameMonstersFile()
    const index = file.monsters.findIndex((monster) => monster.id === entry.id)

    if (index === -1) {
      throw new Error('Сохранённый монстр не найден — возможно, запись уже удалена')
    }

    const updated: GameMonsterEntry = {
      ...entry,
      realmId: file.monsters[index]!.realmId,
      savedFromGameId: file.monsters[index]!.savedFromGameId,
      savedAt: file.monsters[index]!.savedAt
    }

    const monsters = [...file.monsters]
    monsters[index] = updated

    await writeJsonAtomic(gameMonstersFile(), { ...file, monsters })
    return updated
  })
}

export async function removeGameMonster(id: string): Promise<void> {
  await withFileLock(LOCK_KEY, async () => {
    const file = await readGameMonstersFile()
    const monsters = file.monsters.filter((monster) => monster.id !== id)

    if (monsters.length === file.monsters.length) return

    await writeJsonAtomic(gameMonstersFile(), { ...file, monsters })
  })
}
