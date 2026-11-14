import { z } from 'zod'

/** Версия формата файла типов мест. */
export const PLACE_TYPES_FILE_SCHEMA_VERSION = 1

export const placeTypeInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  /** Готовая проверенная inline-SVG иконка. */
  iconSvg: z.string().min(1).max(20_000)
})

export const placeTypeSchema = placeTypeInputSchema.extend({
  id: z.string().min(1),
  realmId: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
})

export type PlaceTypeInput = z.input<typeof placeTypeInputSchema>
export type PlaceType = z.infer<typeof placeTypeSchema>

export const placeTypesFileSchema = z.object({
  schemaVersion: z.number().int().min(1),
  placeTypes: z.array(placeTypeSchema).max(500)
})

export type PlaceTypesFile = z.infer<typeof placeTypesFileSchema>
