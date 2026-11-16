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
import { DEFAULT_LOCALE, LOCALE_CODES, m, type LocaleCode } from './i18n'

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

/** Подписи частот на языке текущей локали. */
export function getBackupFrequencyLabels(): Record<BackupFrequency, string> {
  return m().backup.frequencies
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
      theme: z.enum(THEMES),
      locale: z
        .enum([...LOCALE_CODES] as [LocaleCode, ...LocaleCode[]])
        .default(DEFAULT_LOCALE)
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
      issue(m().backup.validation.realmRequired, ['data', 'realms'])
    }
    if (!uniqueIds(data.realms)) {
      issue(m().backup.validation.duplicateRealmIds, ['data', 'realms'])
    }
    if (!uniqueIds(data.placeTypes)) {
      issue(m().backup.validation.duplicatePlaceTypeIds, ['data', 'placeTypes'])
    }
    if (!uniqueIds(data.monsters)) {
      issue(m().backup.validation.duplicateMonsterIds, ['data', 'monsters'])
    }
    if (!uniqueIds(data.gameMonsters)) {
      issue(m().backup.validation.duplicateUniqueMonsterIds, ['data', 'gameMonsters'])
    }
    if (!uniqueIds(data.maps)) {
      issue(m().backup.validation.duplicateMapIds, ['data', 'maps'])
    }
    if (!uniqueIds(data.games)) {
      issue(m().backup.validation.duplicateGameIds, ['data', 'games'])
    }
    if (!uniqueIds(data.players)) {
      issue(m().backup.validation.duplicatePlayerIds, ['data', 'players'])
    }
    if (!uniqueIds(data.characters)) {
      issue(m().backup.validation.duplicateCharacterIds, ['data', 'characters'])
    }

    const checkRealm = (
      realmId: string,
      path: (string | number)[]
    ): void => {
      if (!realmIds.has(realmId)) {
        issue(m().backup.validation.missingRealm, path)
      }
    }

    data.games.forEach((game, index) => {
      checkRealm(game.realmId, ['data', 'games', index, 'realmId'])
      if (game.mapId) {
        const map = mapsById.get(game.mapId)
        if (!map || map.realmId !== game.realmId) {
          issue(m().backup.validation.gameMapMissing, [
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
          issue(m().backup.validation.placementMissingMonster, [
            'data',
            'games',
            index,
            'monsterPlacements',
            placementIndex,
            'monsterId'
          ])
        }
        if (placedMonsterIds.has(placement.monsterId)) {
          issue(m().backup.validation.duplicatePlacement, [
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
          issue(m().backup.validation.placementMissingMap, [
            'data',
            'games',
            index,
            'monsterPlacements',
            placementIndex,
            'mapId'
          ])
        } else if (!map.places.some((place) => place.id === placement.placeId)) {
          issue(m().backup.validation.placementMissingPlace, [
            'data',
            'games',
            index,
            'monsterPlacements',
            placementIndex,
            'placeId'
          ])
        }
      })

      const defeatedMonsterIds = new Set<string>()
      game.defeatedMonsterIds.forEach((monsterId, monsterIndex) => {
        if (!gameMonsterIds.has(monsterId)) {
          issue(m().backup.validation.defeatedMissingMonster, [
            'data',
            'games',
            index,
            'defeatedMonsterIds',
            monsterIndex
          ])
        }
        if (defeatedMonsterIds.has(monsterId)) {
          issue(m().backup.validation.duplicateDefeatedMonster, [
            'data',
            'games',
            index,
            'defeatedMonsterIds',
            monsterIndex
          ])
        }
        defeatedMonsterIds.add(monsterId)
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
        issue(m().backup.validation.duplicatePlaceIds, [
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
          issue(m().backup.validation.placeMissingIcon, [
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
            issue(m().backup.validation.placeMissingMap, [
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
          issue(m().backup.validation.pathMissingPlace, [
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
