import { z } from 'zod'
import type { Game, GameMonster } from './game'
import { gameSchema } from './game'
import type { GameMonsterEntry } from './gameMonster'
import { gameMonsterEntrySchema } from './gameMonster'
import type { GameMap } from './map'
import { gameMapSchema } from './map'
import type { Monster } from './monster'
import { monsterSchema } from './monster'
import type { PlaceType } from './placeType'
import { placeTypeSchema } from './placeType'
import type { Realm } from './realm'
import { realmInputSchema } from './realm'

/**
 * Переносимый пакет данных Game Master.
 *
 * Это обычный JSON-файл с расширением `.gmpack`. В пакет не попадают игроки
 * и персонажи. Сущности, привязанные к сеттингу, сохраняются без `realmId`:
 * при импорте пользователь сам выбирает, куда их положить.
 */
export const DATA_PACK_FORMAT = 'game-master-pack'
export const DATA_PACK_SCHEMA_VERSION = 1
export const DATA_PACK_EXTENSION = 'gmpack'

export const DATA_EXPORT_KINDS = [
  'games',
  'maps',
  'monsters',
  'uniqueMonsters',
  'realm'
] as const

export type DataExportKind = (typeof DATA_EXPORT_KINDS)[number]

/** Что делать со связями карт при экспорте. */
export const DATA_MAP_LINK_MODES = ['includeLinked', 'selectedOnly'] as const
export type DataMapLinkMode = (typeof DATA_MAP_LINK_MODES)[number]

export const DATA_EXPORT_KIND_LABELS: Record<DataExportKind, string> = {
  games: 'Игры',
  maps: 'Карты',
  monsters: 'Монстры',
  uniqueMonsters: 'Уникальные существа',
  realm: 'Сеттинг'
}

/** Внутренние id нужны только для связей внутри пакета. */
export const packPlaceTypeSchema = placeTypeSchema
  .pick({ id: true, iconSvg: true })
  .strict()

export const packMonsterSchema = monsterSchema
  .omit({ realmId: true, createdAt: true, updatedAt: true })
  .strict()

export const packUniqueMonsterSchema = gameMonsterEntrySchema
  .omit({ realmId: true, savedAt: true })
  .strict()

export const packMapSchema = gameMapSchema
  .omit({ realmId: true, createdAt: true, updatedAt: true })
  .strict()

export const packGameSchema = gameSchema
  .omit({
    realmId: true,
    characterIds: true,
    status: true,
    createdAt: true,
    updatedAt: true
  })
  .strict()

export const packRealmSchema = realmInputSchema.strict()

export const dataPackDataSchema = z
  .object({
    realm: packRealmSchema.optional(),
    placeTypes: z.array(packPlaceTypeSchema).max(500).default([]),
    monsters: z.array(packMonsterSchema).max(2000).default([]),
    uniqueMonsters: z.array(packUniqueMonsterSchema).max(2000).default([]),
    maps: z.array(packMapSchema).max(500).default([]),
    games: z.array(packGameSchema).max(2000).default([])
  })
  .strict()

function idsAreUnique(items: readonly { id: string }[]): boolean {
  return new Set(items.map((item) => item.id)).size === items.length
}

export const dataPackSchema = z
  .object({
    format: z.literal(DATA_PACK_FORMAT),
    schemaVersion: z.literal(DATA_PACK_SCHEMA_VERSION),
    kind: z.enum(DATA_EXPORT_KINDS),
    exportedAt: z.string().min(1),
    appVersion: z.string().min(1).max(80).optional(),
    data: dataPackDataSchema
  })
  .strict()
  .superRefine((pack, context) => {
    const issue = (message: string, path: (string | number)[]): void => {
      context.addIssue({ code: 'custom', message, path })
    }

    if (pack.kind === 'realm' && !pack.data.realm) {
      issue('В пакете сеттинга нет сведений о сеттинге', ['data', 'realm'])
    }
    if (pack.kind !== 'realm' && pack.data.realm) {
      issue('Сведения о сеттинге допустимы только в пакете сеттинга', ['data', 'realm'])
    }

    const requiredList: Partial<Record<DataExportKind, keyof typeof pack.data>> = {
      games: 'games',
      maps: 'maps',
      monsters: 'monsters',
      uniqueMonsters: 'uniqueMonsters'
    }
    const listKey = requiredList[pack.kind]

    if (listKey) {
      const items = pack.data[listKey]
      if (!Array.isArray(items) || items.length === 0) {
        issue('В пакете нет ни одной записи выбранного типа', ['data', listKey])
      }
    }

    if (!idsAreUnique(pack.data.placeTypes)) {
      issue('Иконки в пакете имеют повторяющиеся идентификаторы', ['data', 'placeTypes'])
    }
    if (!idsAreUnique(pack.data.monsters)) {
      issue('Монстры в пакете имеют повторяющиеся идентификаторы', ['data', 'monsters'])
    }
    if (!idsAreUnique(pack.data.uniqueMonsters)) {
      issue('Уникальные существа имеют повторяющиеся идентификаторы', ['data', 'uniqueMonsters'])
    }
    if (!idsAreUnique(pack.data.maps)) {
      issue('Карты в пакете имеют повторяющиеся идентификаторы', ['data', 'maps'])
    }
    if (!idsAreUnique(pack.data.games)) {
      issue('Игры в пакете имеют повторяющиеся идентификаторы', ['data', 'games'])
    }

    const iconIds = new Set(pack.data.placeTypes.map((item) => item.id))
    const monsterIds = new Set(pack.data.monsters.map((item) => item.id))
    const gameIds = new Set(pack.data.games.map((item) => item.id))
    const mapIds = new Set(pack.data.maps.map((item) => item.id))

    pack.data.maps.forEach((map, mapIndex) => {
      if (!idsAreUnique(map.places)) {
        issue('На карте есть места с одинаковыми идентификаторами', [
          'data',
          'maps',
          mapIndex,
          'places'
        ])
      }

      const placeIds = new Set(map.places.map((place) => place.id))

      map.places.forEach((place, placeIndex) => {
        if (place.placeTypeId && !iconIds.has(place.placeTypeId)) {
          issue('Место ссылается на иконку, которой нет в пакете', [
            'data',
            'maps',
            mapIndex,
            'places',
            placeIndex,
            'placeTypeId'
          ])
        }
        if (place.linkedMapId && !mapIds.has(place.linkedMapId)) {
          issue('Место ссылается на карту, которой нет в пакете', [
            'data',
            'maps',
            mapIndex,
            'places',
            placeIndex,
            'linkedMapId'
          ])
        }
      })

      map.paths.forEach((path, pathIndex) => {
        if (!placeIds.has(path.a) || !placeIds.has(path.b) || path.a === path.b) {
          issue('Путь карты ссылается на несуществующее место', [
            'data',
            'maps',
            mapIndex,
            'paths',
            pathIndex
          ])
        }
      })
    })

    pack.data.games.forEach((game, gameIndex) => {
      if (game.mapId && !mapIds.has(game.mapId)) {
        issue('Игра ссылается на карту, которой нет в пакете', [
          'data',
          'games',
          gameIndex,
          'mapId'
        ])
      }

      game.monsters.forEach((monster, monsterIndex) => {
        if (monster.sourceMonsterId && !monsterIds.has(monster.sourceMonsterId)) {
          issue('Игровой монстр ссылается на монстра, которого нет в пакете', [
            'data',
            'games',
            gameIndex,
            'monsters',
            monsterIndex,
            'sourceMonsterId'
          ])
        }
      })
    })

    pack.data.uniqueMonsters.forEach((monster, monsterIndex) => {
      if (monster.sourceMonsterId && !monsterIds.has(monster.sourceMonsterId)) {
        issue('Уникальное существо ссылается на монстра, которого нет в пакете', [
          'data',
          'uniqueMonsters',
          monsterIndex,
          'sourceMonsterId'
        ])
      }
      if (monster.savedFromGameId && !gameIds.has(monster.savedFromGameId)) {
        issue('Уникальное существо ссылается на игру, которой нет в пакете', [
          'data',
          'uniqueMonsters',
          monsterIndex,
          'savedFromGameId'
        ])
      }
    })
  })

export type PackPlaceType = z.infer<typeof packPlaceTypeSchema>
export type PackMonster = z.infer<typeof packMonsterSchema>
export type PackUniqueMonster = z.infer<typeof packUniqueMonsterSchema>
export type PackMap = z.infer<typeof packMapSchema>
export type PackGame = z.infer<typeof packGameSchema>
export type PackRealm = z.infer<typeof packRealmSchema>
export type DataPackData = z.infer<typeof dataPackDataSchema>
export type DataPack = z.infer<typeof dataPackSchema>

export interface DataPackSources {
  games: readonly Game[]
  maps: readonly GameMap[]
  monsters: readonly Monster[]
  uniqueMonsters: readonly GameMonsterEntry[]
  placeTypes: readonly PlaceType[]
  realms: readonly Realm[]
}

export interface DataExportRequest {
  kind: DataExportKind
  ids: string[]
  /** Только для карт: тянуть связанные карты или оставить только выбранные. */
  mapLinks?: DataMapLinkMode
}

export interface DataPackCounts {
  placeTypes: number
  monsters: number
  uniqueMonsters: number
  maps: number
  games: number
}

export interface DataExportResult {
  fileName: string
  counts: DataPackCounts
}

export interface DataImportFile {
  fileName: string
  pack: DataPack
  counts: DataPackCounts
}

export interface DataImportRequest {
  fileName?: string
  /** Приходит из renderer как unknown: main обязан проверить ещё раз. */
  pack: unknown
  targetRealmId?: string | null
  realmName?: string
  realmDescription?: string
}

export interface DataImportResult {
  realmId: string
  counts: DataPackCounts
}

export interface RemappedDataPack {
  placeTypes: PlaceType[]
  monsters: Monster[]
  uniqueMonsters: GameMonsterEntry[]
  maps: GameMap[]
  games: Game[]
}

export function countDataPack(pack: Pick<DataPack, 'data'>): DataPackCounts {
  return {
    placeTypes: pack.data.placeTypes.length,
    monsters: pack.data.monsters.length,
    uniqueMonsters: pack.data.uniqueMonsters.length,
    maps: pack.data.maps.length,
    games: pack.data.games.length
  }
}

function findSelected<T extends { id: string }>(
  items: readonly T[],
  ids: readonly string[],
  title: string
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  return ids.map((id) => {
    const item = byId.get(id)
    if (!item) throw new Error(`${title} не найден — возможно, запись уже удалена`)
    return item
  })
}

function expandLinkedMaps(
  initialMapIds: Iterable<string>,
  maps: readonly GameMap[]
): GameMap[] {
  const byId = new Map(maps.map((map) => [map.id, map]))
  const included = new Set<string>()
  const queue = [...initialMapIds]

  while (queue.length > 0) {
    const id = queue.pop()!
    if (included.has(id)) continue

    const map = byId.get(id)
    if (!map) continue

    included.add(id)
    for (const place of map.places) {
      if (place.linkedMapId && !included.has(place.linkedMapId)) {
        queue.push(place.linkedMapId)
      }
    }
  }

  return maps.filter((map) => included.has(map.id))
}

function packPlaceTypes(placeTypes: readonly PlaceType[]): PackPlaceType[] {
  return placeTypes.map((placeType) => ({
    id: placeType.id,
    iconSvg: placeType.iconSvg
  }))
}

function packMaps(
  maps: readonly GameMap[],
  iconIds: ReadonlySet<string>,
  stripLinkedMaps = false
): PackMap[] {
  const mapIds = new Set(maps.map((map) => map.id))

  return maps.map((map) => {
    const placeIds = new Set(map.places.map((place) => place.id))

    return {
      id: map.id,
      name: map.name,
      places: map.places.map((place) => ({
        ...place,
        linkedMapId:
          !stripLinkedMaps &&
          place.isExit &&
          place.linkedMapId &&
          place.linkedMapId !== map.id &&
          mapIds.has(place.linkedMapId)
            ? place.linkedMapId
            : null,
        placeTypeId:
          place.placeTypeId && iconIds.has(place.placeTypeId) ? place.placeTypeId : null
      })),
      paths: map.paths.filter(
        (path) => placeIds.has(path.a) && placeIds.has(path.b) && path.a !== path.b
      )
    }
  })
}

function packGamesForMaps(
  games: readonly Game[],
  maps: readonly GameMap[],
  monsters: readonly PackMonster[]
): PackGame[] {
  const mapIds = new Set(maps.map((map) => map.id))
  const monsterIds = new Set(monsters.map((monster) => monster.id))

  return games.map((game) => ({
    id: game.id,
    name: game.name,
    mapId: game.mapId && mapIds.has(game.mapId) ? game.mapId : null,
    notes: game.notes,
    monsters: game.monsters.map((monster) => ({
      ...monster,
      sourceMonsterId:
        monster.sourceMonsterId && monsterIds.has(monster.sourceMonsterId)
          ? monster.sourceMonsterId
          : null,
      abilities: monster.abilities.map((ability) => ({ ...ability }))
    }))
  }))
}

function packMonsters(monsters: readonly Monster[]): PackMonster[] {
  return monsters.map((monster) => ({
    id: monster.id,
    name: monster.name,
    strength: monster.strength,
    dexterity: monster.dexterity,
    intelligence: monster.intelligence,
    wisdom: monster.wisdom,
    constitution: monster.constitution,
    charisma: monster.charisma,
    challengeRating: monster.challengeRating,
    armorClass: monster.armorClass,
    hitPoints: monster.hitPoints,
    abilities: monster.abilities.map((ability) => ({ ...ability })),
    statsVersion: monster.statsVersion
  }))
}

function packUniqueMonsters(
  monsters: readonly GameMonsterEntry[],
  includedMonsterIds: ReadonlySet<string>,
  includedGameIds: ReadonlySet<string>
): PackUniqueMonster[] {
  return monsters.map((monster) => ({
    id: monster.id,
    sourceMonsterId:
      monster.sourceMonsterId && includedMonsterIds.has(monster.sourceMonsterId)
        ? monster.sourceMonsterId
        : null,
    name: monster.name,
    strength: monster.strength,
    dexterity: monster.dexterity,
    intelligence: monster.intelligence,
    wisdom: monster.wisdom,
    constitution: monster.constitution,
    charisma: monster.charisma,
    challengeRating: monster.challengeRating,
    armorClass: monster.armorClass,
    hitPoints: monster.hitPoints,
    abilities: monster.abilities.map((ability) => ({ ...ability })),
    statsVersion: monster.statsVersion,
    statuses: [...monster.statuses],
    savedFromGameId:
      monster.savedFromGameId && includedGameIds.has(monster.savedFromGameId)
        ? monster.savedFromGameId
        : null
  }))
}

function finalizePack(
  kind: DataExportKind,
  data: Omit<DataPackData, 'realm'> & { realm?: PackRealm },
  appVersion: string | undefined,
  exportedAt: string
): DataPack {
  return dataPackSchema.parse({
    format: DATA_PACK_FORMAT,
    schemaVersion: DATA_PACK_SCHEMA_VERSION,
    kind,
    exportedAt,
    ...(appVersion ? { appVersion } : {}),
    data
  })
}

/**
 * Собирает самодостаточный пакет. Зависимости подтягиваются автоматически:
 * игры — карты и их выходы, карты — связанные карты, карты — используемые иконки.
 */
export function createDataPack(
  request: DataExportRequest,
  sources: DataPackSources,
  appVersion?: string,
  exportedAt: string = new Date().toISOString()
): DataPack {
  const ids = [...new Set(request.ids.filter((id) => typeof id === 'string' && id.length > 0))]
  if (ids.length === 0) {
    throw new Error('Ничего не выбрано для экспорта')
  }

  if (request.kind === 'realm') {
    if (ids.length !== 1) throw new Error('Для экспорта выберите один сеттинг')
    const realm = sources.realms.find((item) => item.id === ids[0])
    if (!realm) throw new Error('Сеттинг не найден — возможно, он был удалён')

    const realmMaps = sources.maps.filter((map) => map.realmId === realm.id)
    const realmPlaceTypes = sources.placeTypes.filter(
      (placeType) => placeType.realmId === realm.id
    )
    const realmMonsters = sources.monsters.filter(
      (monster) => monster.realmId === realm.id
    )
    const realmUnique = sources.uniqueMonsters.filter(
      (monster) => monster.realmId === realm.id
    )
    const realmGames = sources.games.filter((game) => game.realmId === realm.id)

    const packedMonsters = packMonsters(realmMonsters)
    const packedUnique = packUniqueMonsters(
      realmUnique,
      new Set(realmMonsters.map((monster) => monster.id)),
      new Set(realmGames.map((game) => game.id))
    )

    return finalizePack(
      'realm',
      {
        realm: { name: realm.name, description: realm.description },
        placeTypes: packPlaceTypes(realmPlaceTypes),
        monsters: packedMonsters,
        uniqueMonsters: packedUnique,
        maps: packMaps(
          realmMaps,
          new Set(realmPlaceTypes.map((placeType) => placeType.id))
        ),
        games: packGamesForMaps(realmGames, realmMaps, packedMonsters)
      },
      appVersion,
      exportedAt
    )
  }

  if (request.kind === 'games') {
    const games = findSelected(sources.games, ids, 'Игра')
    const maps = expandLinkedMaps(
      games
        .map((game) => game.mapId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
      sources.maps
    )
    const usedIconIds = new Set(
      maps.flatMap((map) =>
        map.places
          .map((place) => place.placeTypeId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    )
    const placeTypes = sources.placeTypes.filter((placeType) =>
      usedIconIds.has(placeType.id)
    )

    return finalizePack(
      'games',
      {
        placeTypes: packPlaceTypes(placeTypes),
        monsters: [],
        uniqueMonsters: [],
        maps: packMaps(maps, new Set(placeTypes.map((placeType) => placeType.id))),
        games: packGamesForMaps(games, maps, [])
      },
      appVersion,
      exportedAt
    )
  }

  if (request.kind === 'maps') {
    const selected = findSelected(sources.maps, ids, 'Карта')
    const selectedOnly = request.mapLinks === 'selectedOnly'
    const maps = selectedOnly
      ? selected
      : expandLinkedMaps(
          selected.map((map) => map.id),
          sources.maps
        )
    const usedIconIds = new Set(
      maps.flatMap((map) =>
        map.places
          .map((place) => place.placeTypeId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    )
    const placeTypes = sources.placeTypes.filter((placeType) =>
      usedIconIds.has(placeType.id)
    )

    return finalizePack(
      'maps',
      {
        placeTypes: packPlaceTypes(placeTypes),
        monsters: [],
        uniqueMonsters: [],
        maps: packMaps(
          maps,
          new Set(placeTypes.map((placeType) => placeType.id)),
          selectedOnly
        ),
        games: []
      },
      appVersion,
      exportedAt
    )
  }

  if (request.kind === 'monsters') {
    const monsters = findSelected(sources.monsters, ids, 'Монстр')
    return finalizePack(
      'monsters',
      {
        placeTypes: [],
        monsters: packMonsters(monsters),
        uniqueMonsters: [],
        maps: [],
        games: []
      },
      appVersion,
      exportedAt
    )
  }

  const uniqueMonsters = findSelected(sources.uniqueMonsters, ids, 'Уникальное существо')
  return finalizePack(
    'uniqueMonsters',
    {
      placeTypes: [],
      monsters: [],
      uniqueMonsters: packUniqueMonsters(uniqueMonsters, new Set(), new Set()),
      maps: [],
      games: []
    },
    appVersion,
    exportedAt
  )
}

function createIdMap(items: readonly { id: string }[]): Map<string, string> {
  return new Map(items.map((item) => [item.id, crypto.randomUUID()]))
}

function remapAbilities<T extends { id: string }>(abilities: readonly T[]): T[] {
  return abilities.map((ability) => ({ ...ability, id: crypto.randomUUID() }))
}

/**
 * Готовит сущности к записи в выбранный сеттинг: все id новые, связи внутри
 * пакета сохранены. Внешние ссылки, которых нет в пакете, обнуляются.
 */
export function remapDataPack(
  pack: DataPack,
  realmId: string,
  now: string = new Date().toISOString()
): RemappedDataPack {
  const iconIdMap = createIdMap(pack.data.placeTypes)
  const monsterIdMap = createIdMap(pack.data.monsters)
  const gameIdMap = createIdMap(pack.data.games)
  const mapIdMap = createIdMap(pack.data.maps)

  const placeTypes: PlaceType[] = pack.data.placeTypes.map((placeType) => ({
    id: iconIdMap.get(placeType.id)!,
    realmId,
    iconSvg: placeType.iconSvg,
    createdAt: now,
    updatedAt: now
  }))

  const monsters: Monster[] = pack.data.monsters.map((monster) => ({
    ...monster,
    id: monsterIdMap.get(monster.id)!,
    realmId,
    abilities: remapAbilities(monster.abilities),
    createdAt: now,
    updatedAt: now
  }))

  const maps: GameMap[] = pack.data.maps.map((map) => {
    const placeIdMap = new Map(map.places.map((place) => [place.id, crypto.randomUUID()]))

    return {
      id: mapIdMap.get(map.id)!,
      realmId,
      name: map.name,
      places: map.places.map((place) => ({
        ...place,
        id: placeIdMap.get(place.id)!,
        linkedMapId:
          place.isExit && place.linkedMapId
            ? (mapIdMap.get(place.linkedMapId) ?? null)
            : null,
        placeTypeId: place.placeTypeId ? (iconIdMap.get(place.placeTypeId) ?? null) : null
      })),
      paths: map.paths.map((path) => {
        const a = placeIdMap.get(path.a)!
        const b = placeIdMap.get(path.b)!
        return a < b ? { a, b } : { a: b, b: a }
      }),
      createdAt: now,
      updatedAt: now
    }
  })

  const remapGameMonster = (monster: GameMonster): GameMonster => ({
    ...monster,
    id: crypto.randomUUID(),
    sourceMonsterId: monster.sourceMonsterId
      ? (monsterIdMap.get(monster.sourceMonsterId) ?? null)
      : null,
    abilities: remapAbilities(monster.abilities)
  })

  const games: Game[] = pack.data.games.map((game) => ({
    ...game,
    id: gameIdMap.get(game.id)!,
    realmId,
    mapId: game.mapId ? (mapIdMap.get(game.mapId) ?? null) : null,
    characterIds: [],
    monsters: game.monsters.map(remapGameMonster),
    status: 'new',
    createdAt: now,
    updatedAt: now
  }))

  const uniqueMonsters: GameMonsterEntry[] = pack.data.uniqueMonsters.map((monster) => ({
    ...monster,
    id: crypto.randomUUID(),
    realmId,
    sourceMonsterId: monster.sourceMonsterId
      ? (monsterIdMap.get(monster.sourceMonsterId) ?? null)
      : null,
    abilities: remapAbilities(monster.abilities),
    savedFromGameId: monster.savedFromGameId
      ? (gameIdMap.get(monster.savedFromGameId) ?? null)
      : null,
    savedAt: now
  }))

  return { placeTypes, monsters, uniqueMonsters, maps, games }
}
