import { z } from 'zod'
import { GAME_STATUSES } from './gameStatus'
import { monsterAbilitySchema } from './monster'
import { DEFAULT_REALM_ID } from './realm'

/** Версия формата файла игр. */
export const GAMES_FILE_SCHEMA_VERSION = 1

const abilityScore = z.number().int().min(-10).max(10)

/**
 * Монстр в конкретной игре — независимая копия записи из бестиария.
 * Правки такой копии не меняют базового монстра.
 */
export const gameMonsterSchema = z.object({
  id: z.string().min(1),
  /** Откуда скопирован; null — добавлен вручную (в будущем). */
  sourceMonsterId: z.string().min(1).nullable(),
  name: z.string().min(1).max(100),
  strength: abilityScore,
  dexterity: abilityScore,
  intelligence: abilityScore,
  wisdom: abilityScore,
  constitution: abilityScore,
  charisma: abilityScore,
  challengeRating: z.number().min(0).max(30),
  armorClass: z.number().int().min(0).max(99),
  hitPoints: z.number().int().min(1).max(100_000),
  abilities: z.array(monsterAbilitySchema).max(50)
})

export type GameMonster = z.infer<typeof gameMonsterSchema>

const gameFields = {
  name: z.string().min(1).max(120),
  /** Карта, на которой проходит игра; null — карта не выбрана. */
  mapId: z.string().min(1).nullable().default(null),
  /** Заметки мастера по ходу игры. */
  notes: z.string().max(20000).default(''),
  characterIds: z.array(z.string().min(1)).max(200).default([]),
  monsters: z.array(gameMonsterSchema).max(200).default([])
}

export const gameInputSchema = z.object(gameFields)

export const gameSchema = z.object({
  id: z.string().min(1),
  realmId: z.string().min(1).default(DEFAULT_REALM_ID),
  ...gameFields,
  status: z.enum(GAME_STATUSES).default('new'),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
})

export type Game = z.infer<typeof gameSchema>

export interface GameInput {
  name: string
  mapId: string | null
  notes?: string
  characterIds: string[]
  monsters: GameMonster[]
}

export const gamesFileSchema = z.object({
  schemaVersion: z.number().int().min(1),
  games: z.array(gameSchema).max(2000)
})

export type GamesFile = z.infer<typeof gamesFileSchema>
