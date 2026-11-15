import path from 'node:path'
import { app } from 'electron'
import { createPlaceType, normalizePlaceTypeInput } from '@shared/domain'
import {
  PLACE_TYPES_FILE_SCHEMA_VERSION,
  placeTypesFileSchema,
  type PlaceType,
  type PlaceTypeInput,
  type PlaceTypesFile
} from '@shared/placeType'
import { DEFAULT_REALM_ID } from '@shared/realm'
import { validatePlaceIcon } from '@shared/placeIcon'
import { applyPresetIconCatalog, type PresetPlaceIcon } from '@shared/presetIcons'
import { JsonFileError, readJsonFile, withFileLock, writeJsonAtomic } from './jsonFile'

const LOCK_KEY = 'placeTypes.json'

function placeTypesFile(): string {
  return path.join(app.getPath('userData'), 'placeTypes.json')
}

function emptyFile(): PlaceTypesFile {
  return {
    schemaVersion: PLACE_TYPES_FILE_SCHEMA_VERSION,
    placeTypes: [],
    presetCatalogVersion: 0,
    seededPresetKeys: []
  }
}

async function readPlaceTypesFile(): Promise<PlaceTypesFile> {
  let raw: unknown

  try {
    raw = await readJsonFile(placeTypesFile())
  } catch (error) {
    if (error instanceof JsonFileError && error.code === 'ENOENT') {
      return emptyFile()
    }
    throw new Error(`Не удалось прочитать иконки мест: ${(error as Error).message}`)
  }

  const parsed = placeTypesFileSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error('Файл иконок мест повреждён и не может быть прочитан')
  }

  return parsed.data
}

function assertPlaceTypeInput(input: PlaceTypeInput): { iconSvg: string } {
  const normalized = normalizePlaceTypeInput(input)

  const check = validatePlaceIcon(normalized.iconSvg)
  if (!check.ok) {
    throw new Error(`Иконка не соответствует требованиям: ${check.problems.join(' ')}`)
  }

  return normalized
}

export async function listPlaceTypes(realmId?: string): Promise<PlaceType[]> {
  const placeTypes = (await readPlaceTypesFile()).placeTypes
  return realmId ? placeTypes.filter((placeType) => placeType.realmId === realmId) : placeTypes
}

/** Полное состояние файла иконок: нужно для бэкапа вместе с ключами пресетов. */
export async function getPlaceTypesState(): Promise<PlaceTypesFile> {
  return readPlaceTypesFile()
}

/** Добавляет/обновляет встроенные иконки в сеттинге, не трогая пользовательские правки. */
export async function applyPresetIcons(
  catalog: readonly PresetPlaceIcon[],
  catalogVersion: number,
  realmId: string = DEFAULT_REALM_ID
): Promise<void> {
  if (catalog.length === 0) return

  await withFileLock(LOCK_KEY, async () => {
    const file = await readPlaceTypesFile()
    const result = applyPresetIconCatalog(file, catalog, catalogVersion, realmId)

    if (!result.changed) return

    await writeJsonAtomic(placeTypesFile(), {
      ...result.file,
      schemaVersion: PLACE_TYPES_FILE_SCHEMA_VERSION
    })
  })
}

export async function addPlaceType(
  input: PlaceTypeInput,
  realmId: string
): Promise<PlaceType> {
  const normalized = assertPlaceTypeInput(input)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readPlaceTypesFile()
    const placeType = createPlaceType(normalized, realmId)

    await writeJsonAtomic(placeTypesFile(), {
      ...file,
      placeTypes: [...file.placeTypes, placeType]
    })

    return placeType
  })
}

/** Добавляет иконки из пакета, не перезаписывая существующие записи. */
export async function addImportedPlaceTypes(placeTypes: readonly PlaceType[]): Promise<void> {
  if (placeTypes.length === 0) return

  const checked = placeTypes.map((placeType) => {
    assertPlaceTypeInput(placeType)
    return placeType
  })

  await withFileLock(LOCK_KEY, async () => {
    const file = await readPlaceTypesFile()
    const existingIds = new Set(file.placeTypes.map((placeType) => placeType.id))
    const additions = checked.filter((placeType) => !existingIds.has(placeType.id))

    if (additions.length === 0) return

    await writeJsonAtomic(placeTypesFile(), {
      ...file,
      placeTypes: [...file.placeTypes, ...additions]
    })
  })
}

export async function updatePlaceType(placeType: PlaceType): Promise<PlaceType> {
  const normalized = assertPlaceTypeInput(placeType)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readPlaceTypesFile()
    const index = file.placeTypes.findIndex((item) => item.id === placeType.id)

    if (index === -1) {
      throw new Error('Иконка не найдена — возможно, запись уже удалена')
    }

    const updated: PlaceType = {
      ...file.placeTypes[index]!,
      ...normalized,
      updatedAt: new Date().toISOString()
    }

    const placeTypes = [...file.placeTypes]
    placeTypes[index] = updated

    await writeJsonAtomic(placeTypesFile(), { ...file, placeTypes })
    return updated
  })
}

export async function removePlaceType(id: string): Promise<void> {
  await withFileLock(LOCK_KEY, async () => {
    const file = await readPlaceTypesFile()
    const placeTypes = file.placeTypes.filter((placeType) => placeType.id !== id)

    if (placeTypes.length === file.placeTypes.length) return
    await writeJsonAtomic(placeTypesFile(), { ...file, placeTypes })
  })
}
