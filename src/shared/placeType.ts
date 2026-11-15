import { z } from 'zod'

/**
 * Версия формата файла иконок мест.
 *
 * Исторически сущность называлась «тип места» и хранила название. Название
 * оказалось лишним: у места есть собственное имя, а из набора нужна только
 * картинка. Для совместимости старые записи с полем `name` читаются как есть
 * (zod отбрасывает лишние поля), а при следующей записи имя исчезает.
 */
export const PLACE_TYPES_FILE_SCHEMA_VERSION = 2

export const placeTypeInputSchema = z.object({
  /** Готовая проверенная inline-SVG иконка. */
  iconSvg: z.string().min(1).max(20_000)
})

export const placeTypeSchema = placeTypeInputSchema.extend({
  id: z.string().min(1),
  realmId: z.string().min(1),
  /** Стандартная иконка из встроенного набора: постоянный ключ. */
  presetKey: z.string().min(1).max(80).optional(),
  /** Версия картинки из набора на момент выдачи или обновления. */
  presetRevision: z.number().int().min(1).optional(),
  /** Отпечаток выданного SVG. Если картинку изменили, отпечаток не совпадёт. */
  presetHash: z.string().min(1).max(64).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
})

export type PlaceTypeInput = z.input<typeof placeTypeInputSchema>
export type PlaceType = z.infer<typeof placeTypeSchema>

export const placeTypesFileSchema = z.object({
  schemaVersion: z.number().int().min(1),
  placeTypes: z.array(placeTypeSchema).max(500),
  /** Версия встроенного набора, которая уже применена к D&D. */
  presetCatalogVersion: z.number().int().min(0).default(0),
  /** Ключи, которые когда-либо выдавались. Удалённые иконки не возвращаются. */
  seededPresetKeys: z.array(z.string().min(1).max(80)).max(500).default([])
})

export type PlaceTypesFile = z.infer<typeof placeTypesFileSchema>
