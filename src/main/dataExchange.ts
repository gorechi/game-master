import { promises as fs } from 'node:fs'
import path from 'node:path'
import { app, dialog } from 'electron'
import {
  DATA_EXPORT_KINDS,
  DATA_PACK_EXTENSION,
  countDataPack,
  createDataPack,
  dataPackSchema,
  remapDataPack,
  type DataExportKind,
  type DataExportRequest,
  type DataExportResult,
  type DataImportFile,
  type DataImportRequest,
  type DataImportResult,
  type DataPack
} from '@shared/dataPack'
import { validatePlaceIcon } from '@shared/placeIcon'
import { fill, m } from '@shared/i18n'
import { addImportedGames, listGames } from './storage/gameStore'
import { listGameMonsters, saveGameMonsters } from './storage/gameMonsterStore'
import { addImportedMaps, listMaps } from './storage/mapStore'
import { addImportedMonsters, listMonsters } from './storage/monsterStore'
import { addImportedPlaceTypes, listPlaceTypes } from './storage/placeTypeStore'
import { addRealm, listRealms } from './storage/realmStore'

const MAX_PACK_BYTES = 25 * 1024 * 1024

function parseExportRequest(value: unknown): DataExportRequest {
  if (!value || typeof value !== 'object') {
    throw new Error(m().dataPack.errors.invalidExportRequest)
  }

  const { kind, ids, mapLinks } = value as Record<string, unknown>
  const knownKind = DATA_EXPORT_KINDS.find((item) => item === kind)
  if (!knownKind) throw new Error(m().dataPack.errors.unknownExportKind)
  if (!Array.isArray(ids)) throw new Error(m().dataPack.errors.invalidExportIds)

  if (
    mapLinks !== undefined &&
    mapLinks !== 'includeLinked' &&
    mapLinks !== 'selectedOnly'
  ) {
    throw new Error(m().dataPack.errors.invalidMapLinkMode)
  }

  return {
    kind: knownKind,
    ids: ids.filter(
      (id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 64
    ),
    mapLinks
  }
}

function parseImportRequest(value: unknown): DataImportRequest {
  if (!value || typeof value !== 'object') {
    throw new Error(m().dataPack.errors.invalidImportRequest)
  }

  const request = value as Record<string, unknown>
  const targetRealmId =
    typeof request.targetRealmId === 'string' && request.targetRealmId.length > 0
      ? request.targetRealmId
      : null

  return {
    fileName: typeof request.fileName === 'string' ? request.fileName : undefined,
    pack: request.pack,
    targetRealmId,
    realmName:
      typeof request.realmName === 'string' ? request.realmName.slice(0, 100) : undefined,
    realmDescription:
      typeof request.realmDescription === 'string'
        ? request.realmDescription.slice(0, 2000)
        : undefined
  }
}

function packFileName(kind: DataExportKind): string {
  const date = new Date().toISOString().slice(0, 10)
  return `game-master-${kind}-${date}.${DATA_PACK_EXTENSION}`
}

function parsePack(value: unknown): DataPack {
  const parsed = dataPackSchema.safeParse(value)
  if (parsed.success) return parsed.data

  const first = parsed.error.issues[0]
  const where = first?.path.length ? ` (${first.path.join('.')})` : ''
  throw new Error(
    fill(m().dataPack.errors.invalidPack, {
      where,
      reason: first?.message ?? m().dataPack.errors.unknown
    })
  )
}

export async function exportDataPack(requestValue: unknown): Promise<DataExportResult | null> {
  const request = parseExportRequest(requestValue)

  const [games, maps, monsters, uniqueMonsters, placeTypes, realms] = await Promise.all([
    listGames(),
    listMaps(),
    listMonsters(),
    listGameMonsters(),
    listPlaceTypes(),
    listRealms()
  ])

  const pack = createDataPack(
    request,
    { games, maps, monsters, uniqueMonsters, placeTypes, realms },
    app.getVersion()
  )

  const choice = await dialog.showSaveDialog({
    title: m().dataPack.dialogs.exportTitle,
    defaultPath: path.join(app.getPath('documents'), packFileName(request.kind)),
    filters: [{ name: m().dataPack.dialogs.filterName, extensions: [DATA_PACK_EXTENSION] }]
  })

  if (choice.canceled || !choice.filePath) return null

  const target = path.extname(choice.filePath)
    ? choice.filePath
    : `${choice.filePath}.${DATA_PACK_EXTENSION}`

  await fs.writeFile(target, `${JSON.stringify(pack, null, 2)}\n`, 'utf8')

  return {
    fileName: path.basename(target),
    counts: countDataPack(pack)
  }
}

export async function chooseDataImportFile(): Promise<DataImportFile | null> {
  const choice = await dialog.showOpenDialog({
    title: m().dataPack.dialogs.importTitle,
    properties: ['openFile'],
    filters: [{ name: m().dataPack.dialogs.filterName, extensions: [DATA_PACK_EXTENSION, 'json'] }]
  })

  const filePath = choice.filePaths[0]
  if (choice.canceled || !filePath) return null

  const stat = await fs.stat(filePath)
  if (stat.size > MAX_PACK_BYTES) {
    throw new Error(m().dataPack.errors.tooLarge)
  }

  const raw = await fs.readFile(filePath, 'utf8')
  let json: unknown

  try {
    json = JSON.parse(raw) as unknown
  } catch {
    throw new Error(m().dataPack.errors.notJson)
  }

  const pack = parsePack(json)

  return {
    fileName: path.basename(filePath),
    pack,
    counts: countDataPack(pack)
  }
}

export async function importDataPack(requestValue: unknown): Promise<DataImportResult> {
  const request = parseImportRequest(requestValue)
  const pack = parsePack(request.pack)

  for (const placeType of pack.data.placeTypes) {
    const check = validatePlaceIcon(placeType.iconSvg)
    if (!check.ok) {
      throw new Error(
        fill(m().main.placeTypes.iconInvalid, { problems: check.problems.join(' ') })
      )
    }
  }

  let realmId: string

  if (pack.kind === 'realm') {
    const name = (request.realmName ?? pack.data.realm?.name ?? '').trim()
    if (!name) throw new Error(m().dataPack.errors.realmNameRequired)

    const realm = await addRealm({
      name,
      description: request.realmDescription ?? pack.data.realm?.description ?? ''
    })
    realmId = realm.id
  } else {
    const targetRealmId = request.targetRealmId
    if (!targetRealmId) {
      throw new Error(m().dataPack.errors.targetRealmRequired)
    }

    const realms = await listRealms()
    if (!realms.some((realm) => realm.id === targetRealmId)) {
      throw new Error(m().dataPack.errors.realmNotFound)
    }
    realmId = targetRealmId
  }

  const remapped = remapDataPack(pack, realmId)

  await addImportedPlaceTypes(remapped.placeTypes)
  await addImportedMonsters(remapped.monsters)
  await saveGameMonsters(remapped.uniqueMonsters)
  await addImportedMaps(remapped.maps)
  await addImportedGames(remapped.games)

  return {
    realmId,
    counts: countDataPack(pack)
  }
}
