import { z } from 'zod'

/** Версия формата файла игр. */
export const GAMES_FILE_SCHEMA_VERSION = 1

/**
 * Игра — основная сущность приложения: конкретная партия, которую мастер
 * готовит или проводит. Поля будут расширяться вместе с формами.
 */
export const gameSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
})

export type Game = z.infer<typeof gameSchema>

export interface GameInput {
  name: string
}

export const gamesFileSchema = z.object({
  schemaVersion: z.number().int().min(1),
  games: z.array(gameSchema).max(2000)
})

export type GamesFile = z.infer<typeof gamesFileSchema>
