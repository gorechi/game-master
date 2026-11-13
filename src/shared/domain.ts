import type { Player, PlayerInput } from './player'
import type { CharacterProfile, CharacterProfileInput } from './characterProfile'
import type { Monster, MonsterAbility, MonsterInput } from './monster'
import type { Game, GameInput, GameMonster } from './game'

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
/* Игры                                                               */
/* ------------------------------------------------------------------ */

export function createGame(input: GameInput, id: string = crypto.randomUUID()): Game {
  const now = new Date().toISOString()

  return {
    id,
    name: input.name.trim().slice(0, 120),
    characterIds: [...new Set(input.characterIds)],
    monsters: input.monsters,
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
): GameMonster {
  const base = source.name.trim().slice(0, 94) || 'Монстр'
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
