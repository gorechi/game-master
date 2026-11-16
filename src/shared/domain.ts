import type { Player, PlayerInput } from './player'
import type { CharacterProfile, CharacterProfileInput } from './characterProfile'
import type { Monster, MonsterAbility, MonsterInput } from './monster'
import type { Game, GameInput, GameMonster } from './game'
import type { GameMonsterEntry, GameMonsterInput } from './gameMonster'
import type { Realm, RealmInput } from './realm'
import { DEFAULT_REALM_ID } from './realm'
import type { GameMap, GameMapInput, MapPlace, MapPath } from './map'
import type { PlaceType, PlaceTypeInput } from './placeType'

/**
 * Доменный слой без зависимостей: фабрики, подписи и сводки.
 * Импортируется и renderer'ом, и main — поэтому здесь не должно быть zod
 * (схемы валидации живут в player.ts и characterProfile.ts и грузятся только в main).
 */

/* ------------------------------------------------------------------ */
/* Игроки (люди за столом)                                            */
/* ------------------------------------------------------------------ */

export function normalizePlayerInput(input: PlayerInput): PlayerInput {
  return {
    firstName: input.firstName.trim().slice(0, 100),
    lastName: input.lastName.trim().slice(0, 100)
  }
}

export function createPlayer(input: PlayerInput, id: string = crypto.randomUUID()): Player {
  const normalized = normalizePlayerInput(input)
  const now = new Date().toISOString()

  return {
    id,
    firstName: normalized.firstName,
    lastName: normalized.lastName,
    createdAt: now,
    updatedAt: now
  }
}

export function playerFullName(player: Pick<Player, 'firstName' | 'lastName'>): string {
  return [player.firstName, player.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
}

export function playerInitials(player: Pick<Player, 'firstName' | 'lastName'>): string {
  const first = player.firstName.trim().charAt(0)
  const last = player.lastName.trim().charAt(0)
  return `${first}${last}`.toUpperCase() || '?'
}

/* ------------------------------------------------------------------ */
/* Сеттинги                                                            */
/* ------------------------------------------------------------------ */

export function normalizeRealmInput(input: RealmInput): { name: string; description: string } {
  return {
    name: input.name.trim().slice(0, 100),
    description: (input.description ?? '').trim().slice(0, 2000)
  }
}

export function createRealm(input: RealmInput, id: string = crypto.randomUUID()): Realm {
  const now = new Date().toISOString()
  const normalized = normalizeRealmInput(input)

  return {
    id,
    ...normalized,
    createdAt: now,
    updatedAt: now
  }
}

/* ------------------------------------------------------------------ */
/* Иконки мест                                                        */
/* ------------------------------------------------------------------ */

export function normalizePlaceTypeInput(input: PlaceTypeInput): {
  iconSvg: string
} {
  return {
    iconSvg: input.iconSvg.trim()
  }
}

export function createPlaceType(
  input: PlaceTypeInput,
  realmId: string = DEFAULT_REALM_ID,
  id: string = crypto.randomUUID()
): PlaceType {
  const now = new Date().toISOString()

  return {
    id,
    realmId,
    ...normalizePlaceTypeInput(input),
    createdAt: now,
    updatedAt: now
  }
}

/* ------------------------------------------------------------------ */
/* Персонажи-карточки (герои игроков)                                 */
/* ------------------------------------------------------------------ */

export type NormalizedCharacterProfileInput = Omit<CharacterProfileInput, 'level'> & {
  level: number
}

/** Уровень героя 1–20; пустое или некорректное значение становится 1. */
export function clampCharacterLevel(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 1
  return Math.min(20, Math.max(1, Math.round(value)))
}

export function normalizeCharacterProfileInput(
  input: CharacterProfileInput
): NormalizedCharacterProfileInput {
  return {
    playerId: input.playerId || null,
    name: input.name.trim().slice(0, 80),
    className: input.className.trim().slice(0, 60),
    race: input.race.trim().slice(0, 60),
    statuses: [...new Set(input.statuses.map((status) => status.trim()).filter(Boolean))].slice(
      0,
      16
    ),
    image: input.image ?? null,
    level: clampCharacterLevel(input.level)
  }
}

export function createCharacterProfile(
  input: CharacterProfileInput,
  realmId: string = DEFAULT_REALM_ID,
  id: string = crypto.randomUUID()
): CharacterProfile {
  const now = new Date().toISOString()

  return {
    id,
    realmId,
    ...normalizeCharacterProfileInput(input),
    createdAt: now,
    updatedAt: now
  }
}

/* ------------------------------------------------------------------ */
/* Монстры (бестиарий)                                                */
/* ------------------------------------------------------------------ */

const ABILITY_MIN = 1
const ABILITY_MAX = 30

const MONSTER_SCORE_KEYS = [
  'strength',
  'dexterity',
  'intelligence',
  'wisdom',
  'constitution',
  'charisma'
] as const

/** Версия формата характеристик: 2 — хранятся значения 1–30, а не модификаторы. */
const MONSTER_STATS_VERSION = 2

/** Характеристики монстра — значения от 1 до 30. */
export function clampMonsterScore(value: number | undefined): number {
  return clampInt(value, ABILITY_MIN, ABILITY_MAX, 10)
}

/** Модификатор характеристики: floor((x − 10) / 2). */
export function modifierFromScore(score: number): number {
  return Math.floor((clampMonsterScore(score) - 10) / 2)
}

/** Старые данные хранили модификатор; переводим его в значение 10 + 2y. */
function scoreFromLegacyModifier(modifier: number): number {
  return clampInt(10 + modifier * 2, ABILITY_MIN, ABILITY_MAX, 10)
}

/** «+1», «0» → «+0», «−1». */
export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : String(modifier)
}

/**
 * Переводит старую запись монстра с модификаторами на значения 1–30.
 * Записи с актуальной statsVersion возвращаются как есть.
 */
export function migrateMonsterStats<T extends Record<string, unknown>>(monster: T): T {
  if (monster.statsVersion === MONSTER_STATS_VERSION) return monster

  const next: Record<string, unknown> = {
    ...monster,
    statsVersion: MONSTER_STATS_VERSION
  }

  for (const key of MONSTER_SCORE_KEYS) {
    const value = monster[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      next[key] = scoreFromLegacyModifier(value)
    }
  }

  return next as T
}

function clampInt(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function createMonsterAbility(name = '', description = ''): MonsterAbility {
  return {
    id: crypto.randomUUID().slice(0, 8),
    name,
    description
  }
}

function normalizeMonsterAbilities(abilities: MonsterInput['abilities']): MonsterAbility[] {
  return abilities
    .map((ability) => ({
      id: ability.id || crypto.randomUUID().slice(0, 8),
      name: ability.name.trim().slice(0, 80),
      description: ability.description.trim().slice(0, 2000)
    }))
    .filter((ability) => ability.name || ability.description)
}

export type NormalizedMonsterInput = Omit<MonsterInput, 'abilities'> & {
  abilities: MonsterAbility[]
}

export function normalizeMonsterInput(input: MonsterInput): NormalizedMonsterInput {
  const abilities = normalizeMonsterAbilities(input.abilities)

  if (abilities.some((ability) => !ability.name)) {
    throw new Error('Укажите название для каждой способности')
  }

  return {
    name: input.name.trim().slice(0, 100),
    strength: clampMonsterScore(input.strength),
    dexterity: clampMonsterScore(input.dexterity),
    intelligence: clampMonsterScore(input.intelligence),
    wisdom: clampMonsterScore(input.wisdom),
    constitution: clampMonsterScore(input.constitution),
    charisma: clampMonsterScore(input.charisma),
    challengeRating: Math.min(30, Math.max(0, input.challengeRating ?? 1)),
    armorClass: clampInt(input.armorClass, 0, 99, 10),
    hitPoints: clampInt(input.hitPoints, 1, 100_000, 10),
    abilities
  }
}

export function createMonster(
  input: MonsterInput,
  realmId: string = DEFAULT_REALM_ID,
  id: string = crypto.randomUUID()
): Monster {
  const now = new Date().toISOString()

  return {
    id,
    realmId,
    ...normalizeMonsterInput(input),
    statsVersion: MONSTER_STATS_VERSION,
    createdAt: now,
    updatedAt: now
  }
}

const challengeRatingFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 })

/** «КО 0,125» и «КО 3» без лишних нулей. */
export function formatChallengeRating(value: number): string {
  return challengeRatingFormatter.format(value)
}

/* ------------------------------------------------------------------ */
/* Карты (пространства с местами и путями)                            */
/* ------------------------------------------------------------------ */

export function createMapPlace(
  name: string,
  isExit = false,
  linkedMapId: string | null = null
): MapPlace {
  return {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 100),
    isExit,
    linkedMapId: isExit ? linkedMapId : null,
    placeTypeId: null,
    x: null,
    y: null
  }
}

/** Координата карты: неотрицательное число или null для авто-раскладки. */
function normalizeCoordinate(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.max(0, Math.min(100000, Math.round(value)))
}

/** Одна и та же связь всегда хранится с меньшим id первым. */
export function canonicalMapPath(a: string, b: string): MapPath {
  return a < b ? { a, b } : { a: b, b: a }
}

export function mapPathKey(path: MapPath): string {
  return `${path.a}|${path.b}`
}

export type NormalizedMapInput = {
  name: string
  places: MapPlace[]
  paths: MapPath[]
  realmId: string
}

export function normalizeMapInput(input: GameMapInput): NormalizedMapInput {
  const places = input.places.map((place) => ({
    id: place.id,
    name: place.name.trim().slice(0, 100),
    isExit: place.isExit,
    linkedMapId: place.isExit ? (place.linkedMapId ?? null) : null,
    placeTypeId: place.placeTypeId ?? null,
    x: normalizeCoordinate(place.x),
    y: normalizeCoordinate(place.y)
  }))

  if (places.some((place) => !place.name)) {
    throw new Error('У каждого места должно быть название')
  }

  const ids = new Set(places.map((place) => place.id))
  if (ids.size !== places.length) {
    throw new Error('Места должны иметь уникальные идентификаторы')
  }

  const seen = new Set<string>()
  const paths: MapPath[] = []

  for (const path of input.paths) {
    if (!ids.has(path.a) || !ids.has(path.b) || path.a === path.b) continue

    const canonical = canonicalMapPath(path.a, path.b)
    const key = mapPathKey(canonical)
    if (seen.has(key)) continue

    seen.add(key)
    paths.push(canonical)
  }

  return {
    name: input.name.trim().slice(0, 120),
    places,
    paths,
    realmId: input.realmId
  }
}

export function createMap(
  input: GameMapInput,
  realmId: string = input.realmId,
  id: string = crypto.randomUUID()
): GameMap {
  const now = new Date().toISOString()

  return {
    id,
    ...normalizeMapInput(input),
    realmId,
    createdAt: now,
    updatedAt: now
  }
}

/** Возвращает пути, в которых участвует место. */
export function placePaths(paths: readonly MapPath[], placeId: string): MapPath[] {
  return paths.filter((path) => path.a === placeId || path.b === placeId)
}

/** Список id мест, с которыми связано указанное место. */
export function connectedPlaceIds(paths: readonly MapPath[], placeId: string): string[] {
  return placePaths(paths, placeId).map((path) => (path.a === placeId ? path.b : path.a))
}

/**
 * Заменяет все пути выбранного места. Связь неориентированная, поэтому
 * у второго места она появится автоматически.
 */
export function setPlaceConnections(
  paths: readonly MapPath[],
  placeId: string,
  connectedIds: readonly string[]
): MapPath[] {
  const next = paths.filter((path) => path.a !== placeId && path.b !== placeId)
  const seen = new Set(next.map(mapPathKey))

  for (const connectedId of new Set(connectedIds)) {
    if (connectedId === placeId) continue

    const path = canonicalMapPath(placeId, connectedId)
    const key = mapPathKey(path)
    if (seen.has(key)) continue

    seen.add(key)
    next.push(path)
  }

  return next
}

/* ------------------------------------------------------------------ */
/* Игры                                                               */
/* ------------------------------------------------------------------ */

export function createGame(
  input: GameInput,
  realmId: string = DEFAULT_REALM_ID,
  id: string = crypto.randomUUID()
): Game {
  const now = new Date().toISOString()

  return {
    id,
    realmId,
    name: input.name.trim().slice(0, 120),
    mapId: input.mapId ?? null,
    notes: input.notes ?? '',
    characterIds: [...new Set(input.characterIds)],
    monsters: input.monsters,
    monsterPlacements: input.monsterPlacements ?? [],
    defeatedCharacterIds: [...new Set(input.defeatedCharacterIds ?? [])],
    defeatedMonsterIds: [...new Set(input.defeatedMonsterIds ?? [])],
    status: 'new',
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Копирует монстра из бестиария в независимый экземпляр игры.
 * Повторяющиеся имена получают номер: «Гоблин», «Гоблин 2», «Гоблин 3».
 */
export function createGameMonster(
  source: Omit<Monster, 'createdAt' | 'updatedAt'>,
  existingNames: readonly string[] = []
): GameMonster {  const base = source.name.trim().slice(0, 94) || 'Монстр'
  let counter = 1
  let name = `${base} ${counter}`

  while (existingNames.includes(name)) {
    counter += 1
    name = `${base} ${counter}`
  }

  return {
    id: crypto.randomUUID(),
    sourceMonsterId: source.id,
    name,
    strength: source.strength,
    dexterity: source.dexterity,
    intelligence: source.intelligence,
    wisdom: source.wisdom,
    constitution: source.constitution,
    charisma: source.charisma,
    challengeRating: source.challengeRating,
    armorClass: source.armorClass,
    hitPoints: source.hitPoints,
    abilities: source.abilities.map((ability) => ({ ...ability })),
    statuses: [],
    statsVersion: MONSTER_STATS_VERSION
  }
}

/** Готовый игровой монстр как экземпляр игры: без служебных полей библиотеки. */
export function gameMonsterFromEntry(entry: GameMonsterEntry): GameMonster {
  return {
    id: entry.id,
    sourceMonsterId: entry.sourceMonsterId,
    name: entry.name,
    strength: entry.strength,
    dexterity: entry.dexterity,
    intelligence: entry.intelligence,
    wisdom: entry.wisdom,
    constitution: entry.constitution,
    charisma: entry.charisma,
    challengeRating: entry.challengeRating,
    armorClass: entry.armorClass,
    hitPoints: entry.hitPoints,
    abilities: entry.abilities,
    statuses: [...entry.statuses],
    statsVersion: MONSTER_STATS_VERSION
  }
}

/** Новый уникальный монстр для отдельной библиотеки, созданный вручную. */
export function createGameMonsterEntry(
  input: GameMonsterInput,
  realmId: string = DEFAULT_REALM_ID,
  savedFromGameId: string | null = null
): GameMonsterEntry {
  return {
    id: crypto.randomUUID(),
    realmId,
    sourceMonsterId: input.sourceMonsterId,
    name: input.name.trim().slice(0, 100),
    strength: input.strength,
    dexterity: input.dexterity,
    intelligence: input.intelligence,
    wisdom: input.wisdom,
    constitution: input.constitution,
    charisma: input.charisma,
    challengeRating: input.challengeRating,
    armorClass: input.armorClass,
    hitPoints: input.hitPoints,
    abilities: input.abilities.map((ability) => ({ ...ability })),
    statuses: [
      ...new Set(
        (input.statuses ?? []).map((status) => status.trim()).filter(Boolean)
      )
    ].slice(0, 16),
    statsVersion: MONSTER_STATS_VERSION,
    savedFromGameId,
    savedAt: new Date().toISOString()
  }
}
