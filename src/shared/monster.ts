import { z } from 'zod'
import { DEFAULT_REALM_ID } from './realm'

/** Версия формата файла бестиария. */
export const MONSTERS_FILE_SCHEMA_VERSION = 1

export const monsterAbilitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().max(2000)
})

export type MonsterAbility = z.infer<typeof monsterAbilitySchema>

const abilityScore = z.number().int().min(1).max(30)

const monsterFields = {
  name: z.string().min(1).max(100),
  strength: abilityScore,
  dexterity: abilityScore,
  intelligence: abilityScore,
  wisdom: abilityScore,
  constitution: abilityScore,
  charisma: abilityScore,
  /** Класс опасности: дробный (0.125, 0.5, 3…). */
  challengeRating: z.number().min(0).max(30),
  armorClass: z.number().int().min(0).max(99),
  hitPoints: z.number().int().min(1).max(100_000),
  abilities: z.array(monsterAbilitySchema).max(50)
}

export const monsterInputSchema = z.object(monsterFields)

export const monsterSchema = z.object({
  id: z.string().min(1),
  realmId: z.string().min(1).default(DEFAULT_REALM_ID),
  ...monsterFields,
  /** 1 — старые модификаторы, 2 — значения 1–30. */
  statsVersion: z.number().int().min(1).max(2).default(2),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
})

export type Monster = z.infer<typeof monsterSchema>
export type MonsterInput = z.input<typeof monsterInputSchema>

export const monstersFileSchema = z.object({
  schemaVersion: z.number().int().min(1),
  monsters: z.array(monsterSchema).max(2000)
})

export type MonstersFile = z.infer<typeof monstersFileSchema>
