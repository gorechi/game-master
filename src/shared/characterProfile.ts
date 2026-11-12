import { z } from 'zod'

/** Версия формата файла базы персонажей. */
export const CHARACTERS_FILE_SCHEMA_VERSION = 1

/**
 * Персонаж на уровне приложения — не путать с участником группы внутри кампании
 * (`Character` из campaign.ts). Здесь это «карточка героя»: портрет, класс, раса,
 * игрок и статусы. Один игрок может играть несколькими персонажами.
 */

const imageDataUrl = z
  .string()
  .max(4_000_000)
  .refine(
    (value) =>
      value.startsWith('data:image/png;base64,') ||
      value.startsWith('data:image/jpeg;base64,') ||
      value.startsWith('data:image/webp;base64,'),
    'Ожидается изображение в формате data URL (png, jpeg или webp)'
  )
  .nullable()

const profileFields = {
  playerId: z.string().min(1).nullable(),
  name: z.string().min(1).max(80),
  className: z.string().max(60),
  race: z.string().max(60),
  statuses: z.array(z.string().min(1).max(40)).max(16),
  image: imageDataUrl
}

export const characterProfileInputSchema = z.object(profileFields)

export const characterProfileSchema = z.object({
  id: z.string().min(1),
  ...profileFields,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
})

export type CharacterProfile = z.infer<typeof characterProfileSchema>
export type CharacterProfileInput = z.infer<typeof characterProfileInputSchema>

export const charactersFileSchema = z.object({
  schemaVersion: z.number().int().min(1),
  characters: z.array(characterProfileSchema).max(2000)
})

export type CharactersFile = z.infer<typeof charactersFileSchema>
