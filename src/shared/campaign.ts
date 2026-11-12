import { z } from 'zod'
import { CAMPAIGN_SCHEMA_VERSION } from './domain'

export const CHARACTER_KINDS = ['pc', 'npc', 'monster'] as const

export const characterKindSchema = z.enum(CHARACTER_KINDS)
export type CharacterKind = z.infer<typeof characterKindSchema>

const nullableInt = (min: number, max = 100_000) =>
  z.number().int().min(min).max(max).nullable()

/* ------------------------------------------------------------------ */
/* Персонаж (состав группы, «ростер» кампании)                        */
/* ------------------------------------------------------------------ */

export const characterSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(200),
  kind: characterKindSchema,
  subtitle: z.string().max(200),
  initiativeBonus: z.number().int().min(-99).max(99),
  armorClass: nullableInt(-99, 999),
  maxHp: nullableInt(0),
  notes: z.string().max(20_000)
})

export type Character = z.infer<typeof characterSchema>

/* ------------------------------------------------------------------ */
/* Участник боя и энкаунтер                                           */
/* ------------------------------------------------------------------ */

export const combatantSchema = z.object({
  id: z.string().min(1),
  characterId: z.string().nullable(),
  name: z.string().max(200),
  /** Результат броска инициативы. null — ещё не брошено. */
  initiative: z.number().int().min(-99).max(999).nullable(),
  initiativeBonus: z.number().int().min(-99).max(99),
  armorClass: nullableInt(-99, 999),
  hpCurrent: nullableInt(-999),
  hpMax: nullableInt(0),
  conditions: z.array(z.string().max(60)).max(40),
  notes: z.string().max(20_000),
  isPlayer: z.boolean()
})

export type Combatant = z.infer<typeof combatantSchema>

export const encounterStatusSchema = z.enum(['idle', 'running'])

export const encounterSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  status: encounterStatusSchema,
  round: z.number().int().min(0).max(9999),
  activeId: z.string().nullable(),
  combatants: z.array(combatantSchema)
})

export type Encounter = z.infer<typeof encounterSchema>
export type EncounterStatus = z.infer<typeof encounterStatusSchema>

/* ------------------------------------------------------------------ */
/* Кампания — единица хранения (один JSON-файл)                       */
/* ------------------------------------------------------------------ */

export const campaignSchema = z.object({
  schemaVersion: z.number().int().min(1),
  id: z.string().min(1),
  name: z.string().max(200),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  notes: z.string().max(1_000_000),
  characters: z.array(characterSchema).max(2000),
  encounter: encounterSchema
})

export type Campaign = z.infer<typeof campaignSchema>

/** Короткая карточка для списка кампаний — не требует чтения всего файла в UI. */
export interface CampaignSummary {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  playerCount: number
  combatantCount: number
  /** Заполнено, если файл не удалось прочитать или он повреждён. */
  problem: string | null
}

/* ------------------------------------------------------------------ */
/* Разбор и миграции                                                  */
/* ------------------------------------------------------------------ */

export class CampaignDataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CampaignDataError'
  }
}

/**
 * Приводит произвольные данные из файла к актуальной схеме.
 * Пока версия одна, но точка расширения уже есть: сюда добавляются
 * шаги migrate0to1, migrate1to2 и т.д. при развитии формата.
 */
export function migrateCampaign(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) {
    throw new CampaignDataError('файл не содержит JSON-объект кампании')
  }

  const version = (raw as { schemaVersion?: unknown }).schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    throw new CampaignDataError('в файле отсутствует корректный schemaVersion')
  }
  if (version > CAMPAIGN_SCHEMA_VERSION) {
    throw new CampaignDataError(
      `файл создан в более новой версии приложения (схема ${version}, поддерживается ${CAMPAIGN_SCHEMA_VERSION})`
    )
  }

  return raw
}

export function parseCampaign(raw: unknown): Campaign {
  const migrated = migrateCampaign(raw)
  const result = campaignSchema.safeParse(migrated)

  if (!result.success) {
    const first = result.error.issues[0]
    const path = first?.path.join('.') || 'кампания'
    throw new CampaignDataError(`${path}: ${first?.message ?? 'неверный формат данных'}`)
  }

  return result.data
}
