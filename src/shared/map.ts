import { z } from 'zod'
import { DEFAULT_REALM_ID } from './realm'

/** Версия формата файла карт. */
export const MAPS_FILE_SCHEMA_VERSION = 1

/**
 * Место — атомарная точка на карте. Пока у неё есть только имя,
 * признак выхода и ссылка на другую карту для выхода.
 */
const mapPlaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  /** Заметки мастера об этом месте. */
  description: z.string().max(20000).default(''),
  isExit: z.boolean(),
  /** Карта, на которую ведёт выход. Заполняется только при isExit. */
  linkedMapId: z.string().min(1).nullable().default(null),
  /** Иконка места из того же сеттинга; null — место без иконки. */
  placeTypeId: z.string().min(1).nullable().default(null),
  /** Ручная позиция на карте; null — автоматическая раскладка. */
  x: z.number().min(0).max(100000).nullable().default(null),
  y: z.number().min(0).max(100000).nullable().default(null)
})

/**
 * Путь — неориентированная связь двух мест. Хранится канонически:
 * a всегда меньше b, поэтому одна и та же связь не дублируется.
 */
const mapPathSchema = z.object({
  a: z.string().min(1),
  b: z.string().min(1)
})

const mapFields = {
  name: z.string().min(1).max(120),
  places: z.array(mapPlaceSchema).max(500),
  paths: z.array(mapPathSchema).max(20000)
}

export const gameMapInputSchema = z.object({
  ...mapFields,
  /** Карта всегда создаётся внутри выбранного сеттинга. */
  realmId: z.string().min(1)
})

export const gameMapSchema = z.object({
  id: z.string().min(1),
  realmId: z.string().min(1).default(DEFAULT_REALM_ID),
  ...mapFields,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
})

export type MapPlace = z.infer<typeof mapPlaceSchema>
export type MapPath = z.infer<typeof mapPathSchema>
export type GameMap = z.infer<typeof gameMapSchema>
export type GameMapInput = z.input<typeof gameMapInputSchema>

export const mapsFileSchema = z.object({
  schemaVersion: z.number().int().min(1),
  maps: z.array(gameMapSchema).max(500)
})

export type MapsFile = z.infer<typeof mapsFileSchema>
