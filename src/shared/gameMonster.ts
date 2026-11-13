import { z } from 'zod'
import { gameMonsterSchema } from './game'

/** Версия формата файла игровых монстров. */
export const GAME_MONSTERS_FILE_SCHEMA_VERSION = 1

/**
 * «Игровой монстр» — экземпляр, сохранённый из удалённой игры для будущих партий.
 * В бестиарий такие записи не попадают, это отдельная библиотека.
 */
export const gameMonsterEntrySchema = gameMonsterSchema.extend({
  savedFromGameId: z.string().min(1).nullable(),
  savedAt: z.string().min(1)
})

export type GameMonsterEntry = z.infer<typeof gameMonsterEntrySchema>

export const gameMonstersFileSchema = z.object({
  schemaVersion: z.number().int().min(1),
  monsters: z.array(gameMonsterEntrySchema).max(2000)
})

export type GameMonstersFile = z.infer<typeof gameMonstersFileSchema>
