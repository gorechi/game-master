import type { AppInfo, GameMasterApi } from '@shared/api'
import type { Player, PlayerInput } from '@shared/player'
import type { CharacterProfile, CharacterProfileInput } from '@shared/characterProfile'
import type { Monster, MonsterInput } from '@shared/monster'
import type { Game, GameInput } from '@shared/game'
import type { GameMap, GameMapInput } from '@shared/map'
import type { Realm, RealmInput } from '@shared/realm'
import { DEFAULT_REALM_ID } from '@shared/realm'
import { PLACE_TYPES_FILE_SCHEMA_VERSION, type PlaceType, type PlaceTypeInput } from '@shared/placeType'
import { validatePlaceIcon } from '@shared/placeIcon'
import { PRESET_ICON_CATALOG_VERSION, PRESET_PLACE_ICONS } from '@shared/presetPlaceIcons'
import { applyPresetIconCatalog } from '@shared/presetIcons'
import {
  canTransitionGame,
  isGameDeletable,
  isGameEditable,
  isGameStatus,
  type GameStatus
} from '@shared/gameStatus'
import type { GameMonsterEntry, GameMonsterInput } from '@shared/gameMonster'
import {
  clampMonsterScore,
  createCharacterProfile,
  createGame,
  createGameMonsterEntry,
  createMap,
  createMonster,
  createPlayer,
  createPlaceType,
  createRealm,
  migrateMonsterStats,
  normalizeCharacterProfileInput,
  normalizeMapInput,
  normalizeMonsterInput,
  normalizePlayerInput
} from '@shared/domain'
import {
  DEFAULT_SETTINGS,
  SETTINGS_SCHEMA_VERSION,
  isThemeName,
  type AppSettings,
  type SettingsPatch
} from '@shared/settings'

/**
 * Веб-адаптер того же контракта, что и мост preload.
 *
 * Нужен только для быстрого просмотра интерфейса в обычном браузере
 * (`npm run dev:web`): данные лежат в localStorage, файловой системы нет.
 * В Electron этот модуль не используется — window.gameMaster всегда есть.
 */

const GAMES_KEY = 'game-master.preview.games'
const GAME_MONSTERS_KEY = 'game-master.preview.gameMonsters'
const PLAYERS_KEY = 'game-master.preview.players'
const CHARACTERS_KEY = 'game-master.preview.characters'
const MONSTERS_KEY = 'game-master.preview.monsters'
const MAPS_KEY = 'game-master.preview.maps'
const REALMS_KEY = 'game-master.preview.realms'
const PLACE_TYPES_KEY = 'game-master.preview.placeTypes'
const PRESET_STATE_KEY = 'game-master.preview.presetIcons'
const LEGACY_WORLDS_KEY = 'game-master.preview.worlds'
const SETTINGS_KEY = 'game-master.preview.settings'

function readPlayers(): Player[] {
  try {
    const raw = window.localStorage.getItem(PLAYERS_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Player[]) : []
  } catch {
    return []
  }
}

function writePlayers(players: Player[]): void {
  window.localStorage.setItem(PLAYERS_KEY, JSON.stringify(players))
}

function readCharacters(): CharacterProfile[] {
  try {
    const raw = window.localStorage.getItem(CHARACTERS_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return (parsed as CharacterProfile[]).map((item) => ({
      ...item,
      realmId: typeof item.realmId === 'string' ? item.realmId : DEFAULT_REALM_ID,
      level: typeof item.level === 'number' ? item.level : 1
    }))
  } catch {
    return []
  }
}

function writeCharacters(characters: CharacterProfile[]): void {
  window.localStorage.setItem(CHARACTERS_KEY, JSON.stringify(characters))
}

/** Старые записи хранили модификаторы; переводим на значения 1–30. */
function normalizeStoredMonster<T>(monster: T): T {
  const migrated = migrateMonsterStats(
    monster as unknown as Record<string, unknown>
  )

  return {
    ...migrated,
    strength: clampMonsterScore(migrated.strength as number),
    dexterity: clampMonsterScore(migrated.dexterity as number),
    intelligence: clampMonsterScore(migrated.intelligence as number),
    wisdom: clampMonsterScore(migrated.wisdom as number),
    constitution: clampMonsterScore(migrated.constitution as number),
    charisma: clampMonsterScore(migrated.charisma as number)
  } as unknown as T
}

function readMonsters(): Monster[] {
  try {
    const raw = window.localStorage.getItem(MONSTERS_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return (parsed as Monster[]).map((monster) => {
      const migrated = normalizeStoredMonster(monster)

      return {
        ...migrated,
        realmId:
          typeof migrated.realmId === 'string' ? migrated.realmId : DEFAULT_REALM_ID
      }
    })
  } catch {
    return []
  }
}

function writeMonsters(monsters: Monster[]): void {
  window.localStorage.setItem(MONSTERS_KEY, JSON.stringify(monsters))
}

function readMaps(): GameMap[] {
  try {
    const raw =
      window.localStorage.getItem(MAPS_KEY) ?? window.localStorage.getItem(LEGACY_WORLDS_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const maps = (parsed as GameMap[]).map((map) => ({
      ...map,
      realmId: typeof map.realmId === 'string' ? map.realmId : DEFAULT_REALM_ID,
      places: Array.isArray(map.places)
        ? map.places.map((place) => ({
            ...place,
            linkedMapId: typeof place.linkedMapId === 'string' ? place.linkedMapId : null,
            placeTypeId: typeof place.placeTypeId === 'string' ? place.placeTypeId : null,
            x: typeof place.x === 'number' ? place.x : null,
            y: typeof place.y === 'number' ? place.y : null
          }))
        : [],
      paths: Array.isArray(map.paths) ? map.paths : []
    }))

    window.localStorage.setItem(MAPS_KEY, JSON.stringify(maps))
    return maps
  } catch {
    return []
  }
}

function writeMaps(maps: GameMap[]): void {
  window.localStorage.setItem(MAPS_KEY, JSON.stringify(maps))
}

function readGames(): Game[] {
  try {
    const raw = window.localStorage.getItem(GAMES_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return (parsed as Game[]).map((game) => ({
      ...game,
      realmId: typeof game.realmId === 'string' ? game.realmId : DEFAULT_REALM_ID,
      mapId: typeof game.mapId === 'string' ? game.mapId : null,
      notes: typeof game.notes === 'string' ? game.notes : '',
      characterIds: Array.isArray(game.characterIds) ? game.characterIds : [],
      monsters: Array.isArray(game.monsters)
        ? game.monsters.map((monster) => {
            const migrated = normalizeStoredMonster(monster)
            return {
              ...migrated,
              statuses: Array.isArray(migrated.statuses) ? migrated.statuses : []
            }
          })
        : [],
      status: isGameStatus(game.status) ? game.status : 'new'
    }))
  } catch {
    return []
  }
}

function writeGames(games: Game[]): void {
  window.localStorage.setItem(GAMES_KEY, JSON.stringify(games))
}

function readGameMonsters(): GameMonsterEntry[] {
  try {
    const raw = window.localStorage.getItem(GAME_MONSTERS_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return (parsed as GameMonsterEntry[]).map((monster) => {
      const migrated = normalizeStoredMonster(monster)

      return {
        ...migrated,
        realmId:
          typeof migrated.realmId === 'string' ? migrated.realmId : DEFAULT_REALM_ID,
        statuses: Array.isArray(migrated.statuses) ? migrated.statuses : []
      }
    })
  } catch {
    return []
  }
}

function writeGameMonsters(monsters: GameMonsterEntry[]): void {
  window.localStorage.setItem(GAME_MONSTERS_KEY, JSON.stringify(monsters))
}

function seedRealm(): Realm {
  const now = new Date().toISOString()
  return {
    id: DEFAULT_REALM_ID,
    name: 'D&D',
    description: 'Базовый фэнтези-сеттинг. Сюда попадают данные, созданные до появления сеттингов.',
    createdAt: now,
    updatedAt: now
  }
}

function readRealms(): Realm[] {
  try {
    const raw = window.localStorage.getItem(REALMS_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (parsed as Realm[]).map((realm) => ({
          ...realm,
          description: typeof realm.description === 'string' ? realm.description : ''
        }))
      }
    }
  } catch {
    // повреждённые данные не должны ломать предпросмотр
  }

  const realms = [seedRealm()]
  writeRealms(realms)
  return realms
}

function writeRealms(realms: Realm[]): void {
  window.localStorage.setItem(REALMS_KEY, JSON.stringify(realms))
}

function readPlaceTypes(): PlaceType[] {
  try {
    const raw = window.localStorage.getItem(PLACE_TYPES_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return (parsed as PlaceType[]).map((placeType) => ({
      ...placeType,
      realmId: typeof placeType.realmId === 'string' ? placeType.realmId : DEFAULT_REALM_ID
    }))
  } catch {
    return []
  }
}

function writePlaceTypes(placeTypes: PlaceType[]): void {
  window.localStorage.setItem(PLACE_TYPES_KEY, JSON.stringify(placeTypes))
}

interface PreviewPresetState {
  catalogVersion: number
  seededKeys: string[]
}

function readPreviewPresetState(): PreviewPresetState {
  try {
    const raw = window.localStorage.getItem(PRESET_STATE_KEY)
    if (!raw) return { catalogVersion: 0, seededKeys: [] }

    const parsed = JSON.parse(raw) as Partial<PreviewPresetState>
    return {
      catalogVersion:
        typeof parsed.catalogVersion === 'number' ? parsed.catalogVersion : 0,
      seededKeys: Array.isArray(parsed.seededKeys)
        ? parsed.seededKeys.filter((key): key is string => typeof key === 'string')
        : []
    }
  } catch {
    return { catalogVersion: 0, seededKeys: [] }
  }
}

function writePreviewPresetState(state: PreviewPresetState): void {
  window.localStorage.setItem(PRESET_STATE_KEY, JSON.stringify(state))
}

/** Наполняет D&D встроенными иконками так же, как это делает main. */
function ensurePreviewPresetIcons(): void {
  const realms = readRealms()
  if (!realms.some((realm) => realm.id === DEFAULT_REALM_ID)) return

  const state = readPreviewPresetState()
  const result = applyPresetIconCatalog(
    {
      schemaVersion: PLACE_TYPES_FILE_SCHEMA_VERSION,
      placeTypes: readPlaceTypes(),
      presetCatalogVersion: state.catalogVersion,
      seededPresetKeys: state.seededKeys
    },
    PRESET_PLACE_ICONS,
    PRESET_ICON_CATALOG_VERSION,
    DEFAULT_REALM_ID
  )

  if (!result.changed) return

  writePlaceTypes(result.file.placeTypes)
  writePreviewPresetState({
    catalogVersion: result.file.presetCatalogVersion,
    seededKeys: result.file.seededPresetKeys
  })
}

function assertPlaceTypeIcon(svg: string): void {
  const check = validatePlaceIcon(svg)
  if (!check.ok) {
    throw new Error(`Иконка не соответствует требованиям: ${check.problems.join(' ')}`)
  }
}

function assertRealm(realmId: string): void {
  if (!readRealms().some((realm) => realm.id === realmId)) {
    throw new Error('Сеттинг не найден — возможно, он был удалён')
  }
}

function placeTypeIdsForRealm(realmId: string): Set<string> {
  return new Set(
    readPlaceTypes()
      .filter((placeType) => placeType.realmId === realmId)
      .map((placeType) => placeType.id)
  )
}

function readSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      if (isThemeName(parsed.theme)) {
        return {
          schemaVersion: SETTINGS_SCHEMA_VERSION,
          theme: parsed.theme
        }
      }
    }
  } catch {
    // повреждённые настройки предпросмотра не должны ломать приложение
  }

  return { ...DEFAULT_SETTINGS }
}

function writeSettings(settings: AppSettings): void {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function createWebBridge(): GameMasterApi {
  ensurePreviewPresetIcons()

  return {
    app: {
      info: async (): Promise<AppInfo> => ({
        name: 'Game Master',
        version: 'web-preview',
        electron: '—',
        chrome: navigator.userAgent,
        platform: 'other',
        dataDir: 'localStorage браузера'
      }),
      openDataFolder: async (): Promise<void> => undefined
    },

    games: {
      list: async (): Promise<Game[]> => readGames(),

      create: async (input: GameInput, realmId: string): Promise<Game> => {
        assertRealm(realmId)
        const game = createGame(input, realmId)
        writeGames([...readGames(), game])
        return game
      },

      update: async (game: Game): Promise<Game> => {
        const games = readGames()
        const existing = games.find((item) => item.id === game.id)

        if (!existing) {
          throw new Error('Игра не найдена — возможно, запись уже удалена')
        }
        if (!isGameEditable(existing.status)) {
          throw new Error('Завершённую игру нельзя редактировать')
        }

        const updated: Game = {
          ...existing,
          name: game.name.trim().slice(0, 120),
          mapId: game.mapId ?? null,
          notes: game.notes ?? existing.notes ?? '',
          characterIds: game.characterIds,
          monsters: game.monsters,
          updatedAt: new Date().toISOString()
        }

        writeGames(games.map((item) => (item.id === game.id ? updated : item)))
        return updated
      },

      setStatus: async (id: string, status: GameStatus): Promise<Game> => {
        const games = readGames()
        const game = games.find((item) => item.id === id)

        if (!game) {
          throw new Error('Игра не найдена — возможно, запись уже удалена')
        }
        if (game.status === status) return game
        if (status === 'finished') {
          throw new Error('Завершайте игру через экран завершения')
        }
        if (!canTransitionGame(game.status, status)) {
          throw new Error('Такой переход статуса недопустим')
        }

        const updated: Game = {
          ...game,
          status,
          updatedAt: new Date().toISOString()
        }

        writeGames(games.map((item) => (item.id === id ? updated : item)))
        return updated
      },

      finish: async (id: string, keepMonsterIds: string[] = []): Promise<Game> => {
        const games = readGames()
        const game = games.find((item) => item.id === id)

        if (!game) {
          throw new Error('Игра не найдена — возможно, запись уже удалена')
        }
        if (!canTransitionGame(game.status, 'finished')) {
          throw new Error('Завершить можно только идущую или приостановленную игру')
        }

        const existing = readGameMonsters()
        const existingIds = new Set(existing.map((monster) => monster.id))
        const keep = new Set(keepMonsterIds)

        for (const monster of game.monsters) {
          if (existingIds.has(monster.id)) keep.add(monster.id)
        }

        const savedAt = new Date().toISOString()
        const additions: GameMonsterEntry[] = game.monsters
          .filter((monster) => keep.has(monster.id) && !existingIds.has(monster.id))
          .map((monster) => ({
            ...monster,
            realmId: game.realmId,
            savedFromGameId: game.id,
            savedAt
          }))

        if (additions.length > 0) {
          writeGameMonsters([...existing, ...additions])
        }

        const updated: Game = {
          ...game,
          status: 'finished',
          updatedAt: new Date().toISOString()
        }

        writeGames(games.map((item) => (item.id === id ? updated : item)))
        return updated
      },

      remove: async (id: string): Promise<void> => {
        const games = readGames()
        const game = games.find((item) => item.id === id)
        if (!game) return

        if (!isGameDeletable(game.status)) {
          throw new Error('Идущую игру нельзя удалить — сначала завершите её')
        }

        writeGames(games.filter((item) => item.id !== id))
      }
    },

    gameMonsters: {
      list: async (): Promise<GameMonsterEntry[]> => readGameMonsters(),

      create: async (input: GameMonsterInput, realmId: string): Promise<GameMonsterEntry> => {
        assertRealm(realmId)
        const entry = createGameMonsterEntry(input, realmId)
        writeGameMonsters([...readGameMonsters(), entry])
        return entry
      },

      update: async (entry: GameMonsterEntry): Promise<GameMonsterEntry> => {
        const existing = readGameMonsters().find((monster) => monster.id === entry.id)
        if (!existing) {
          throw new Error('Сохранённый монстр не найден — возможно, запись уже удалена')
        }

        const updated: GameMonsterEntry = {
          ...entry,
          realmId: existing.realmId,
          savedFromGameId: existing.savedFromGameId,
          savedAt: existing.savedAt
        }

        writeGameMonsters(
          readGameMonsters().map((monster) => (monster.id === entry.id ? updated : monster))
        )
        return updated
      },

      remove: async (id: string): Promise<void> => {
        writeGameMonsters(readGameMonsters().filter((monster) => monster.id !== id))
      }
    },

    players: {
      list: async (): Promise<Player[]> => readPlayers(),

      create: async (input: PlayerInput): Promise<Player> => {
        const player = createPlayer(input)
        writePlayers([...readPlayers(), player])
        return player
      },

      update: async (player: Player): Promise<Player> => {
        const updated: Player = {
          ...player,
          ...normalizePlayerInput(player),
          updatedAt: new Date().toISOString()
        }

        writePlayers(readPlayers().map((item) => (item.id === player.id ? updated : item)))
        return updated
      },

      remove: async (id: string): Promise<void> => {
        writePlayers(readPlayers().filter((item) => item.id !== id))
      }
    },

    characters: {
      list: async (): Promise<CharacterProfile[]> => readCharacters(),

      create: async (
        input: CharacterProfileInput,
        realmId: string
      ): Promise<CharacterProfile> => {
        assertRealm(realmId)
        const character = createCharacterProfile(input, realmId)
        writeCharacters([...readCharacters(), character])
        return character
      },

      update: async (profile: CharacterProfile): Promise<CharacterProfile> => {
        const existing = readCharacters().find((item) => item.id === profile.id)
        const updated: CharacterProfile = {
          ...profile,
          realmId: existing?.realmId ?? DEFAULT_REALM_ID,
          ...normalizeCharacterProfileInput(profile),
          updatedAt: new Date().toISOString()
        }

        writeCharacters(readCharacters().map((item) => (item.id === profile.id ? updated : item)))
        return updated
      },

      remove: async (id: string): Promise<void> => {
        writeCharacters(readCharacters().filter((item) => item.id !== id))
      }
    },

    monsters: {
      list: async (): Promise<Monster[]> => readMonsters(),

      create: async (input: MonsterInput, realmId: string): Promise<Monster> => {
        assertRealm(realmId)
        const monster = createMonster(input, realmId)
        writeMonsters([...readMonsters(), monster])
        return monster
      },

      update: async (monster: Monster): Promise<Monster> => {
        const existing = readMonsters().find((item) => item.id === monster.id)
        const updated: Monster = {
          ...monster,
          realmId: existing?.realmId ?? DEFAULT_REALM_ID,
          ...normalizeMonsterInput(monster),
          updatedAt: new Date().toISOString()
        }

        writeMonsters(readMonsters().map((item) => (item.id === monster.id ? updated : item)))
        return updated
      },

      remove: async (id: string): Promise<void> => {
        writeMonsters(readMonsters().filter((item) => item.id !== id))
      }
    },

    maps: {
      list: async (realmId?: string): Promise<GameMap[]> => {
        const maps = readMaps()
        return realmId ? maps.filter((map) => map.realmId === realmId) : maps
      },

      create: async (input: GameMapInput): Promise<GameMap> => {
        assertRealm(input.realmId)
        const map = createMap(input)
        const validTypeIds = placeTypeIdsForRealm(input.realmId)
        const created: GameMap = {
          ...map,
          places: map.places.map((place) => ({
            ...place,
            placeTypeId:
              place.placeTypeId && validTypeIds.has(place.placeTypeId)
                ? place.placeTypeId
                : null
          }))
        }

        writeMaps([...readMaps(), created])
        return created
      },

      update: async (map: GameMap): Promise<GameMap> => {
        const existing = readMaps().find((item) => item.id === map.id)
        if (!existing) {
          throw new Error('Карта не найдена — возможно, запись уже удалена')
        }

        assertRealm(map.realmId)
        const normalized = normalizeMapInput(map)
        const validTypeIds = placeTypeIdsForRealm(map.realmId)
        const knownMapIds = new Set(
          readMaps()
            .filter((item) => item.realmId === map.realmId)
            .map((item) => item.id)
        )

        const updated: GameMap = {
          ...existing,
          ...normalized,
          places: normalized.places.map((place) => ({
            ...place,
            placeTypeId:
              place.placeTypeId && validTypeIds.has(place.placeTypeId)
                ? place.placeTypeId
                : null,
            linkedMapId:
              place.isExit &&
              place.linkedMapId &&
              place.linkedMapId !== map.id &&
              knownMapIds.has(place.linkedMapId)
                ? place.linkedMapId
                : null
          })),
          updatedAt: new Date().toISOString()
        }

        writeMaps(readMaps().map((item) => (item.id === map.id ? updated : item)))
        return updated
      },

      remove: async (id: string): Promise<void> => {
        const maps = readMaps()
          .filter((item) => item.id !== id)
          .map((item) =>
            item.places.some((place) => place.linkedMapId === id)
              ? {
                  ...item,
                  places: item.places.map((place) =>
                    place.linkedMapId === id ? { ...place, linkedMapId: null } : place
                  ),
                  updatedAt: new Date().toISOString()
                }
              : item
          )

        writeMaps(maps)

        const games = readGames()
        if (games.some((game) => game.mapId === id)) {
          writeGames(
            games.map((game) =>
              game.mapId === id
                ? { ...game, mapId: null, updatedAt: new Date().toISOString() }
                : game
            )
          )
        }
      }
    },

    realms: {
      list: async (): Promise<Realm[]> => readRealms(),
      create: async (input: RealmInput): Promise<Realm> => {
        const realm = createRealm(input)
        writeRealms([...readRealms(), realm])
        return realm
      },

      update: async (realm: Realm): Promise<Realm> => {
        const realms = readRealms()
        const existing = realms.find((item) => item.id === realm.id)
        if (!existing) {
          throw new Error('Сеттинг не найден — возможно, запись уже удалена')
        }

        const updated: Realm = {
          ...existing,
          name: realm.name.trim().slice(0, 100),
          description: (realm.description ?? '').trim().slice(0, 2000),
          updatedAt: new Date().toISOString()
        }

        writeRealms(realms.map((item) => (item.id === realm.id ? updated : item)))
        return updated
      },

      remove: async (id: string): Promise<void> => {
        const realms = readRealms()
        if (realms.length <= 1) {
          throw new Error('Нельзя удалить последний сеттинг')
        }

        const hasData =
          readGames().some((game) => game.realmId === id) ||
          readCharacters().some((character) => character.realmId === id) ||
          readMonsters().some((monster) => monster.realmId === id) ||
          readMaps().some((map) => map.realmId === id) ||
          readGameMonsters().some((monster) => monster.realmId === id) ||
          readPlaceTypes().some((placeType) => placeType.realmId === id)

        if (hasData) {
          throw new Error(
            'В сеттинге есть игры, персонажи, монстры, карты или иконки мест — сначала удалите их'
          )
        }

        writeRealms(realms.filter((realm) => realm.id !== id))
      }
    },

    placeTypes: {
      list: async (realmId: string): Promise<PlaceType[]> =>
        readPlaceTypes().filter((placeType) => placeType.realmId === realmId),

      create: async (input: PlaceTypeInput, realmId: string): Promise<PlaceType> => {
        assertRealm(realmId)
        assertPlaceTypeIcon(input.iconSvg)
        const placeType = createPlaceType(input, realmId)
        writePlaceTypes([...readPlaceTypes(), placeType])
        return placeType
      },

      update: async (placeType: PlaceType): Promise<PlaceType> => {
        const existing = readPlaceTypes().find((item) => item.id === placeType.id)
        if (!existing) {
          throw new Error('Иконка не найдена — возможно, запись уже удалена')
        }

        assertPlaceTypeIcon(placeType.iconSvg)

        const updated: PlaceType = {
          ...existing,
          iconSvg: placeType.iconSvg.trim(),
          updatedAt: new Date().toISOString()
        }

        writePlaceTypes(
          readPlaceTypes().map((item) => (item.id === placeType.id ? updated : item))
        )
        return updated
      },

      remove: async (id: string): Promise<void> => {
        writePlaceTypes(readPlaceTypes().filter((placeType) => placeType.id !== id))
      }
    },

    settings: {
      get: async (): Promise<AppSettings> => readSettings(),

      update: async (patch: SettingsPatch): Promise<AppSettings> => {
        const next: AppSettings = {
          ...readSettings(),
          ...(patch.theme ? { theme: patch.theme } : {})
        }

        writeSettings(next)
        return next
      }
    }
  }
}
