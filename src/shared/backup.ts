import { z } from 'zod'
import { characterProfileSchema } from './characterProfile'
import { gameMonsterEntrySchema } from './gameMonster'
import { gameSchema } from './game'
import { gameMapSchema } from './map'
import { monsterSchema } from './monster'
import { placeTypeSchema } from './placeType'
import { playerSchema } from './player'
import { realmSchema } from './realm'
import { THEMES, type ThemeName } from './settings'

/** Полный резервный файл приложения. */
export const BACKUP_FORMAT = 'game-master-backup'
export const BACKUP_SCHEMA_VERSION = 1
export const BACKUP_EXTENSION = 'gmbackup'

export const BACKUP_FREQUENCIES = [
  'off',
  'onClose',
  'daily',
  'every2Days',
  'every3Days'
] as const

export type BackupFrequency = (typeof BACKUP_FREQUENCIES)[number]

export const BACKUP_FREQUENCY_LABELS: Record<BackupFrequency, string> = {
  off: 'Не делать автоматический бэкап',
  onClose: 'При каждом закрытии приложения',
  daily: 'Один раз в день',
  every2Days: 'Один раз в два дня',
  every3Days: 'Один раз в три дня'
}

export const AUTO_BACKUP_FILENAME_PREFIX = 'game-master-backup-auto-'
export const AUTO_BACKUP_KEEP_COUNT = 10

export const backupDataSchema = z
  .object({
    games: z.array(gameSchema).max(2000).default([]),
    gameMonsters: z.array(gameMonsterEntrySchema).max(2000).default([]),
    players: z.array(playerSchema).max(5000).default([]),
    characters: z.array(characterProfileSchema).max(2000).default([]),
    monsters: z.array(monsterSchema).max(2000).default([]),
    maps: z.array(gameMapSchema).max(500).default([]),
    realms: z.array(realmSchema).max(200).default([]),
    placeTypes: z.array(placeTypeSchema).max(500).default([]),
    presetCatalogVersion: z.number().int().min(0).default(0),
    seededPresetKeys: z.array(z.string().min(1).max(80)).max(500).default([]),
    settings: z.object({
      theme: z.enum(THEMES)
    })
  })
  .strict()

export type BackupData = z.infer<typeof backupDataSchema>

function uniqueIds(items: readonly { id: string }[]): boolean {
  return new Set(items.map((item) => item.id)).size === items.length
}

export const backupFileSchema = z
  .object({
    format: z.literal(BACKUP_FORMAT),
    schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
    createdAt: z.string().min(1),
    appVersion: z.string().min(1).max(80).optional(),
    data: backupDataSchema
  })
  .strict()
  .superRefine((backup, context) => {
    const issue = (message: string, path: (string | number)[]): void => {
      context.addIssue({ code: 'custom', message, path })
    }

    const { data } = backup
    const realmIds = new Set(data.realms.map((realm) => realm.id))
    const iconRealmById = new Map(
      data.placeTypes.map((icon) => [icon.id, icon.realmId])
    )
    const mapsById = new Map(data.maps.map((map) => [map.id, map]))

    if (data.realms.length === 0) {
      issue('В бэкапе должен быть хотя бы один сеттинг', ['data', 'realms'])
    }
    if (!uniqueIds(data.realms)) issue('В бэкапе повторяются id сеттингов', ['data', 'realms'])
    if (!uniqueIds(data.placeTypes)) issue('В бэкапе повторяются id иконок', ['data', 'placeTypes'])
    if (!uniqueIds(data.monsters)) issue('В бэкапе повторяются id монстров', ['data', 'monsters'])
    if (!uniqueIds(data.gameMonsters)) {
      issue('В бэкапе повторяются id уникальных существ', ['data', 'gameMonsters'])
    }
    if (!uniqueIds(data.maps)) issue('В бэкапе повторяются id карт', ['data', 'maps'])
    if (!uniqueIds(data.games)) issue('В бэкапе повторяются id игр', ['data', 'games'])
    if (!uniqueIds(data.players)) issue('В бэкапе повторяются id игроков', ['data', 'players'])
    if (!uniqueIds(data.characters)) {
      issue('В бэкапе повторяются id персонажей', ['data', 'characters'])
    }

    const checkRealm = (
      realmId: string,
      path: (string | number)[]
    ): void => {
      if (!realmIds.has(realmId)) {
        issue('Запись ссылается на сеттинг, которого нет в бэкапе', path)
      }
    }

    data.games.forEach((game, index) => {
      checkRealm(game.realmId, ['data', 'games', index, 'realmId'])
      if (game.mapId) {
        const map = mapsById.get(game.mapId)
        if (!map || map.realmId !== game.realmId) {
          issue('Игра ссылается на карту, которой нет в этом сеттинге', [
            'data',
            'games',
            index,
            'mapId'
          ])
        }
      }

      const gameMonsterIds = new Set(game.monsters.map((monster) => monster.id))
      const placedMonsterIds = new Set<string>()

      game.monsterPlacements.forEach((placement, placementIndex) => {
        if (!gameMonsterIds.has(placement.monsterId)) {
          issue('Размещение ссылается на монстра, которого нет в игре', [
            'data',
            'games',
            index,
            'monsterPlacements',
            placementIndex,
            'monsterId'
          ])
        }
        if (placedMonsterIds.has(placement.monsterId)) {
          issue('У монстра несколько размещений в одной игре', [
            'data',
            'games',
            index,
            'monsterPlacements',
            placementIndex,
            'monsterId'
          ])
        }
        placedMonsterIds.add(placement.monsterId)

        const map = mapsById.get(placement.mapId)
        if (!map || map.realmId !== game.realmId) {
          issue('Размещение ссылается на недоступную карту', [
            'data',
            'games',
            index,
            'monsterPlacements',
            placementIndex,
            'mapId'
          ])
        } else if (!map.places.some((place) => place.id === placement.placeId)) {
          issue('Размещение ссылается на место, которого нет на карте', [
            'data',
            'games',
            index,
            'monsterPlacements',
            placementIndex,
            'placeId'
          ])
        }
      })
    })

    data.characters.forEach((character, index) => {
      checkRealm(character.realmId, ['data', 'characters', index, 'realmId'])
    })
    data.monsters.forEach((monster, index) => {
      checkRealm(monster.realmId, ['data', 'monsters', index, 'realmId'])
    })
    data.gameMonsters.forEach((monster, index) => {
      checkRealm(monster.realmId, ['data', 'gameMonsters', index, 'realmId'])
    })
    data.placeTypes.forEach((placeType, index) => {
      checkRealm(placeType.realmId, ['data', 'placeTypes', index, 'realmId'])
    })

    data.maps.forEach((map, mapIndex) => {
      checkRealm(map.realmId, ['data', 'maps', mapIndex, 'realmId'])
      if (!uniqueIds(map.places)) {
        issue('На карте есть места с одинаковыми id', [
          'data',
          'maps',
          mapIndex,
          'places'
        ])
      }

      const placeIds = new Set(map.places.map((place) => place.id))

      map.places.forEach((place, placeIndex) => {
        if (
          place.placeTypeId &&
          iconRealmById.get(place.placeTypeId) !== map.realmId
        ) {
          issue('Место ссылается на иконку, которой нет в этом сеттинге', [
            'data',
            'maps',
            mapIndex,
            'places',
            placeIndex,
            'placeTypeId'
          ])
        }
        if (place.linkedMapId) {
          const linkedMap = mapsById.get(place.linkedMapId)
          if (
            !linkedMap ||
            linkedMap.realmId !== map.realmId ||
            place.linkedMapId === map.id
          ) {
            issue('Место ссылается на недоступную карту', [
              'data',
              'maps',
              mapIndex,
              'places',
              placeIndex,
              'linkedMapId'
            ])
          }
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
  })

export type BackupFile = z.infer<typeof backupFileSchema>
export type BackupDataInput = z.input<typeof backupDataSchema>

export interface BackupCounts {
  games: number
  gameMonsters: number
  players: number
  characters: number
  monsters: number
  maps: number
  realms: number
  placeTypes: number
}

export interface BackupPreview {
  fileName: string
  createdAt: string
  appVersion?: string
  theme: ThemeName
  counts: BackupCounts
}

export interface BackupFileSelection extends BackupPreview {
  backup: BackupFile
}

export interface BackupManualResult {
  fileName: string
  createdAt: string
  counts: BackupCounts
}

export interface BackupRestoreRequest {
  backup: unknown
}

export interface BackupRestoreResult {
  restoredAt: string
  safetyBackupFileName: string
  counts: BackupCounts
}

export interface BackupSettings {
  schemaVersion: number
  folderPath: string
  frequency: BackupFrequency
  lastBackupAt: string | null
  lastError: string | null
}

export interface BackupSettingsPatch {
  folderPath?: string
  frequency?: BackupFrequency
}

export const backupSettingsSchema = z.object({
  schemaVersion: z.number().int().min(1),
  folderPath: z.string().min(1),
  frequency: z.enum(BACKUP_FREQUENCIES).default('off'),
  lastBackupAt: z.string().min(1).nullable().default(null),
  lastError: z.string().max(2000).nullable().default(null)
})

export function countBackup(backup: Pick<BackupFile, 'data'>): BackupCounts {
  return {
    games: backup.data.games.length,
    gameMonsters: backup.data.gameMonsters.length,
    players: backup.data.players.length,
    characters: backup.data.characters.length,
    monsters: backup.data.monsters.length,
    maps: backup.data.maps.length,
    realms: backup.data.realms.length,
    placeTypes: backup.data.placeTypes.length
  }
}
