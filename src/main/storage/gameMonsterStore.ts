import path from 'node:path'
import { app } from 'electron'
import {
  GAME_MONSTERS_FILE_SCHEMA_VERSION,
  gameMonstersFileSchema,
  type GameMonsterEntry,
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

export async function listGameMonsters(): Promise<GameMonsterEntry[]> {
  return (await readGameMonstersFile()).monsters
}
