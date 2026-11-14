import { z } from 'zod'

/** Версия формата файла сеттингов. */
export const REALMS_FILE_SCHEMA_VERSION = 1

/** Сеттинг, к которому относятся старые данные без явной привязки. */
export const DEFAULT_REALM_ID = 'default'

export const realmInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).default('')
})

export const realmSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(2000).default(''),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
})

export type RealmInput = z.input<typeof realmInputSchema>
export type Realm = z.infer<typeof realmSchema>

export const realmsFileSchema = z.object({
  schemaVersion: z.number().int().min(1),
  realms: z.array(realmSchema).max(200)
})

export type RealmsFile = z.infer<typeof realmsFileSchema>
