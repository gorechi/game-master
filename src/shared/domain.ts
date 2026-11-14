import type { Player, PlayerInput } from './player'
import type { CharacterProfile, CharacterProfileInput } from './characterProfile'
import type { Monster, MonsterAbility, MonsterInput } from './monster'
import type { Game, GameInput, GameMonster } from './game'
import type { GameMonsterEntry, GameMonsterInput } from './gameMonster'
import type { GameMap, GameMapInput, MapPlace, MapPath } from './map'

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
  id: string = crypto.randomUUID()
): CharacterProfile {
  const now = new Date().toISOString()

  return {
    id,
    ...normalizeCharacterProfileInput(input),
    createdAt: now,
    updatedAt: now
  }
}

/* ------------------------------------------------------------------ */
/* Монстры (бестиарий)                                                */
/* ------------------------------------------------------------------ */

const ABILITY_MIN = -10
const ABILITY_MAX = 10

export const MONSTER_SCORE_KEYS = [
  'strength',
  'dexterity',
  'intelligence',
  'wisdom',
  'constitution',
  'charisma'
] as const

/** Характеристики монстра — от -10 до 10. */
export function clampMonsterScore(value: number | undefined): number {
  return clampInt(value, ABILITY_MIN, ABILITY_MAX, 0)
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

export function normalizeMonsterAbilities(abilities: MonsterInput['abilities']): MonsterAbility[] {
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
  id: string = crypto.randomUUID()
): Monster {
  const now = new Date().toISOString()

  return {
    id,
    ...normalizeMonsterInput(input),
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
}

export function normalizeMapInput(input: GameMapInput): NormalizedMapInput {
  const places = input.places.map((place) => ({
    id: place.id,
    name: place.name.trim().slice(0, 100),
    isExit: place.isExit,
    linkedMapId: place.isExit ? (place.linkedMapId ?? null) : null,
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
    paths
  }
}

export function createMap(input: GameMapInput, id: string = crypto.randomUUID()): GameMap {
  const now = new Date().toISOString()

  return {
    id,
    ...normalizeMapInput(input),
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

export function createGame(input: GameInput, id: string = crypto.randomUUID()): Game {
  const now = new Date().toISOString()

  return {
    id,
    name: input.name.trim().slice(0, 120),
    mapId: input.mapId ?? null,
    notes: input.notes ?? '',
    characterIds: [...new Set(input.characterIds)],
    monsters: input.monsters,
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
    abilities: source.abilities.map((ability) => ({ ...ability }))
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
    abilities: entry.abilities
  }
}

/** Новый уникальный монстр для отдельной библиотеки, созданный вручную. */
export function createGameMonsterEntry(
  input: GameMonsterInput,
  savedFromGameId: string | null = null
): GameMonsterEntry {
  return {
    id: crypto.randomUUID(),
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
    savedFromGameId,
    savedAt: new Date().toISOString()
  }
}
