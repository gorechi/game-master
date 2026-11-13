import { z } from 'zod'

/** Версия формата файла сеттингов. */
export const WORLDS_FILE_SCHEMA_VERSION = 1

/**
 * Место — атомарная точка на карте сеттинга. Пока у неё есть только имя
 * и признак выхода; новые атрибуты можно будет добавить сюда позже.
 */
export const worldPlaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  isExit: z.boolean()
})

/**
 * Путь — неориентированная связь двух мест. Хранится канонически:
 * a всегда меньше b, поэтому одна и та же связь не дублируется.
 */
export const worldPathSchema = z.object({
  a: z.string().min(1),
  b: z.string().min(1)
})

const worldFields = {
  name: z.string().min(1).max(120),
  places: z.array(worldPlaceSchema).max(500),
  paths: z.array(worldPathSchema).max(20000)
}

export const worldInputSchema = z.object(worldFields)

export const worldSchema = z.object({
  id: z.string().min(1),
  ...worldFields,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
})

export type WorldPlace = z.infer<typeof worldPlaceSchema>
export type WorldPath = z.infer<typeof worldPathSchema>
export type World = z.infer<typeof worldSchema>
export type WorldInput = z.input<typeof worldInputSchema>

export const worldsFileSchema = z.object({
  schemaVersion: z.number().int().min(1),
  worlds: z.array(worldSchema).max(500)
})

export type WorldsFile = z.infer<typeof worldsFileSchema>
