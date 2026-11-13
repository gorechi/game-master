import path from 'node:path'
import { app } from 'electron'
import { createWorld, normalizeWorldInput } from '@shared/domain'
import {
  WORLDS_FILE_SCHEMA_VERSION,
  worldsFileSchema,
  type World,
  type WorldInput,
  type WorldsFile
} from '@shared/world'
import { JsonFileError, readJsonFile, withFileLock, writeJsonAtomic } from './jsonFile'

const LOCK_KEY = 'worlds.json'

/** Все сеттинги хранятся одним файлом: их единицы, а не тысячи. */
export function worldsFile(): string {
  return path.join(app.getPath('userData'), 'worlds.json')
}

function emptyFile(): WorldsFile {
  return { schemaVersion: WORLDS_FILE_SCHEMA_VERSION, worlds: [] }
}

async function readWorldsFile(): Promise<WorldsFile> {
  let raw: unknown

  try {
    raw = await readJsonFile(worldsFile())
  } catch (error) {
    if (error instanceof JsonFileError && error.code === 'ENOENT') {
      return emptyFile()
    }
    throw new Error(`Не удалось прочитать сеттинги: ${(error as Error).message}`)
  }

  const parsed = worldsFileSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error('Файл сеттингов повреждён и не может быть прочитан')
  }

  return parsed.data
}

function assertWorldInput(input: WorldInput): WorldInput {
  const normalized = normalizeWorldInput(input)
  if (!normalized.name) {
    throw new Error('Название сеттинга не может быть пустым')
  }
  return normalized
}

export async function listWorlds(): Promise<World[]> {
  return (await readWorldsFile()).worlds
}

export async function addWorld(input: WorldInput): Promise<World> {
  const normalized = assertWorldInput(input)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readWorldsFile()
    const world = createWorld(normalized)

    await writeJsonAtomic(worldsFile(), {
      ...file,
      worlds: [...file.worlds, world]
    })

    return world
  })
}

export async function updateWorld(world: World): Promise<World> {
  const normalized = assertWorldInput(world)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readWorldsFile()
    const index = file.worlds.findIndex((item) => item.id === world.id)

    if (index === -1) {
      throw new Error('Сеттинг не найден — возможно, запись уже удалена')
    }

    const updated: World = {
      ...file.worlds[index]!,
      name: normalized.name,
      places: normalized.places,
      paths: normalized.paths,
      updatedAt: new Date().toISOString()
    }

    const worlds = [...file.worlds]
    worlds[index] = updated

    await writeJsonAtomic(worldsFile(), { ...file, worlds })
    return updated
  })
}

export async function removeWorld(id: string): Promise<void> {
  await withFileLock(LOCK_KEY, async () => {
    const file = await readWorldsFile()
    const worlds = file.worlds.filter((item) => item.id !== id)

    if (worlds.length === file.worlds.length) return

    await writeJsonAtomic(worldsFile(), { ...file, worlds })
  })
}
