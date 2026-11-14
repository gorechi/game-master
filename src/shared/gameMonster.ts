import { z } from 'zod'
import { gameMonsterSchema } from './game'
import { DEFAULT_REALM_ID } from './realm'

/** Версия формата файла игровых монстров. */
export const GAME_MONSTERS_FILE_SCHEMA_VERSION = 1

/**
 * «Игровой монстр» — уникальный экземпляр для будущих партий:
 * сохранённый из игры или созданный вручную на основе бестиария.
 * В бестиарий такие записи не попадают, это отдельная библиотека.
 */
export const gameMonsterEntrySchema = gameMonsterSchema.extend({
  realmId: z.string().min(1).default(DEFAULT_REALM_ID),
  savedFromGameId: z.string().min(1).nullable(),
  savedAt: z.string().min(1)
})

export type GameMonsterEntry = z.infer<typeof gameMonsterEntrySchema>

/** Поля, которые задаёт мастер при создании уникального монстра. */
export const gameMonsterInputSchema = gameMonsterSchema.omit({ id: true })
export type GameMonsterInput = z.input<typeof gameMonsterInputSchema>

export const gameMonstersFileSchema = z.object({
  schemaVersion: z.number().int().min(1),
  monsters: z.array(gameMonsterEntrySchema).max(2000)
})

export type GameMonstersFile = z.infer<typeof gameMonstersFileSchema>
