import { z } from 'zod'

/** Версия формата файла базы игроков. */
export const PLAYERS_FILE_SCHEMA_VERSION = 1

/**
 * Игрок — это человек за столом, а не персонаж.
 * Живёт в общей базе приложения.
 */
export const playerSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
})

export type Player = z.infer<typeof playerSchema>

/** Минимум, который приходит из формы добавления/редактирования. */
export interface PlayerInput {
  firstName: string
  lastName: string
}

export const playersFileSchema = z.object({
  schemaVersion: z.number().int().min(1),
  players: z.array(playerSchema).max(5000)
})

export type PlayersFile = z.infer<typeof playersFileSchema>
