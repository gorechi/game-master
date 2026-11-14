import path from 'node:path'
import { app } from 'electron'
import { createMap, normalizeMapInput, type NormalizedMapInput } from '@shared/domain'
import {
  MAPS_FILE_SCHEMA_VERSION,
  mapsFileSchema,
  type GameMap,
  type GameMapInput,
  type MapsFile
} from '@shared/map'
import { JsonFileError, readJsonFile, withFileLock, writeJsonAtomic } from './jsonFile'
import { listPlaceTypes } from './placeTypeStore'

const LOCK_KEY = 'maps.json'

/** Все карты хранятся одним файлом: их единицы, а не тысячи. */
export function mapsFile(): string {
  return path.join(app.getPath('userData'), 'maps.json')
}

function legacyWorldsFile(): string {
  return path.join(app.getPath('userData'), 'worlds.json')
}

function emptyFile(): MapsFile {
  return { schemaVersion: MAPS_FILE_SCHEMA_VERSION, maps: [] }
}

/**
 * Карты раньше назывались сеттингами и лежали в worlds.json.
 * При первом чтении переносим старый файл в новый формат.
 */
async function migrateLegacyFile(): Promise<MapsFile | null> {
  let raw: unknown

  try {
    raw = await readJsonFile(legacyWorldsFile())
  } catch (error) {
    if (error instanceof JsonFileError && error.code === 'ENOENT') return null
    return null
  }

  if (!raw || typeof raw !== 'object') return null

  const legacy = raw as { schemaVersion?: unknown; worlds?: unknown }
  const parsed = mapsFileSchema.safeParse({
    schemaVersion: MAPS_FILE_SCHEMA_VERSION,
    maps: Array.isArray(legacy.worlds) ? legacy.worlds : []
  })

  if (!parsed.success) return null

  await writeJsonAtomic(mapsFile(), parsed.data)
  return parsed.data
}

async function readMapsFile(): Promise<MapsFile> {
  let raw: unknown

  try {
    raw = await readJsonFile(mapsFile())
  } catch (error) {
    if (error instanceof JsonFileError && error.code === 'ENOENT') {
      return (await migrateLegacyFile()) ?? emptyFile()
    }
    throw new Error(`Не удалось прочитать карты: ${(error as Error).message}`)
  }

  const parsed = mapsFileSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error('Файл карт повреждён и не может быть прочитан')
  }

  return parsed.data
}

function assertMapInput(input: GameMapInput): NormalizedMapInput {
  const normalized = normalizeMapInput(input)
  if (!normalized.name) {
    throw new Error('Название карты не может быть пустым')
  }
  return normalized
}

/** Ссылки допустимы только на существующую карту; тип места — только из своего сеттинга. */
function sanitizeMap(
  map: GameMap,
  knownMapIds: ReadonlySet<string>,
  validPlaceTypeIds: ReadonlySet<string>
): GameMap {
  return {
    ...map,
    places: map.places.map((place) => ({
      ...place,
      placeTypeId:
        place.placeTypeId && validPlaceTypeIds.has(place.placeTypeId)
          ? place.placeTypeId
          : null,
      linkedMapId:
        place.isExit &&
        place.linkedMapId &&
        place.linkedMapId !== map.id &&
        knownMapIds.has(place.linkedMapId)
          ? place.linkedMapId
          : null
    }))
  }
}

async function placeTypeIdsOf(realmId: string): Promise<Set<string>> {
  return new Set((await listPlaceTypes(realmId)).map((placeType) => placeType.id))
}

export async function listMaps(realmId?: string): Promise<GameMap[]> {
  const maps = (await readMapsFile()).maps
  return realmId ? maps.filter((map) => map.realmId === realmId) : maps
}

export async function addMap(input: GameMapInput): Promise<GameMap> {
  const normalized = assertMapInput(input)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readMapsFile()
    const created = createMap(normalized)
    const realmMapIds = new Set(
      file.maps
        .filter((item) => item.realmId === normalized.realmId)
        .map((item) => item.id)
    )
    const map = sanitizeMap(
      created,
      realmMapIds,
      await placeTypeIdsOf(normalized.realmId)
    )

    await writeJsonAtomic(mapsFile(), {
      ...file,
      maps: [...file.maps, map]
    })

    return map
  })
}

export async function updateMap(map: GameMap): Promise<GameMap> {
  const normalized = assertMapInput(map)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readMapsFile()
    const index = file.maps.findIndex((item) => item.id === map.id)

    if (index === -1) {
      throw new Error('Карта не найдена — возможно, запись уже удалена')
    }

    const updated = sanitizeMap(
      {
        ...file.maps[index]!,
        realmId: normalized.realmId,
        name: normalized.name,
        places: normalized.places,
        paths: normalized.paths,
        updatedAt: new Date().toISOString()
      },
      new Set(
        file.maps
          .filter((item) => item.realmId === normalized.realmId)
          .map((item) => item.id)
      ),
      await placeTypeIdsOf(normalized.realmId)
    )

    const maps = [...file.maps]
    maps[index] = updated

    await writeJsonAtomic(mapsFile(), { ...file, maps })
    return updated
  })
}

export async function removeMap(id: string): Promise<void> {
  await withFileLock(LOCK_KEY, async () => {
    const file = await readMapsFile()
    if (!file.maps.some((item) => item.id === id)) return

    const now = new Date().toISOString()
    const maps = file.maps
      .filter((item) => item.id !== id)
      .map((item) => {
        if (!item.places.some((place) => place.linkedMapId === id)) return item

        return {
          ...item,
          places: item.places.map((place) =>
            place.linkedMapId === id ? { ...place, linkedMapId: null } : place
          ),
          updatedAt: now
        }
      })

    await writeJsonAtomic(mapsFile(), { ...file, maps })
  })
}
