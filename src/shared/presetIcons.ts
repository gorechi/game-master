import { DEFAULT_REALM_ID } from './realm'
import type { PlaceTypesFile } from './placeType'

/** Одна иконка из встроенного набора. */
export interface PresetPlaceIcon {
  key: string
  title: string
  revision: number
  svg: string
}

export interface PresetIconApplyResult {
  file: PlaceTypesFile
  changed: boolean
}

/**
 * Небольшой стабильный отпечаток SVG. Он не защищает от подделки, а нужен
 * только для того, чтобы отличить нетронутую стандартную иконку от правки
 * пользователя.
 */
export function hashPlaceIconSvg(svg: string): string {
  let hash = 0x811c9dc5

  for (let index = 0; index < svg.length; index += 1) {
    hash ^= svg.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

function nextPresetId(key: string, usedIds: ReadonlySet<string>): string {
  const base = `preset-${key}`
  if (!usedIds.has(base)) return base

  let suffix = 2
  while (usedIds.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

/**
 * Применяет встроенный каталог к файлу иконок.
 *
 * Правила:
 * - новая иконка добавляется один раз;
 * - существующая обновляется, только если пользователь её не менял;
 * - удалённая пользователем иконка не возвращается;
 * - иконки других сеттингов не затрагиваются.
 */
export function applyPresetIconCatalog(
  file: PlaceTypesFile,
  catalog: readonly PresetPlaceIcon[],
  catalogVersion: number,
  realmId: string = DEFAULT_REALM_ID,
  now: string = new Date().toISOString()
): PresetIconApplyResult {
  const icons = [...file.placeTypes]
  const seeded = new Set(file.seededPresetKeys)
  const usedIds = new Set(icons.map((icon) => icon.id))
  let changed = false

  for (const preset of catalog) {
    seeded.add(preset.key)

    const index = icons.findIndex(
      (icon) => icon.realmId === realmId && icon.presetKey === preset.key
    )

    if (index === -1) {
      // Ключ уже выдавался раньше — значит, пользователь удалил иконку.
      if (file.seededPresetKeys.includes(preset.key)) continue

      const id = nextPresetId(preset.key, usedIds)
      usedIds.add(id)
      icons.push({
        id,
        realmId,
        iconSvg: preset.svg,
        presetKey: preset.key,
        presetRevision: preset.revision,
        presetHash: hashPlaceIconSvg(preset.svg),
        createdAt: now,
        updatedAt: now
      })
      changed = true
      continue
    }

    const existing = icons[index]!
    const currentHash = hashPlaceIconSvg(existing.iconSvg)
    const catalogHash = hashPlaceIconSvg(preset.svg)

    // Пользователь изменил картинку — не трогаем.
    if (existing.presetHash && currentHash !== existing.presetHash) continue

    // Версия встроенной иконки не выше установленной — обновлять нечего.
    if ((existing.presetRevision ?? 0) >= preset.revision) continue

    if (catalogHash === existing.presetHash) {
      icons[index] = {
        ...existing,
        presetRevision: preset.revision,
        updatedAt: now
      }
      changed = true
      continue
    }

    icons[index] = {
      ...existing,
      iconSvg: preset.svg,
      presetRevision: preset.revision,
      presetHash: catalogHash,
      updatedAt: now
    }
    changed = true
  }

  const seededPresetKeys = [...seeded]
  const seededChanged =
    seededPresetKeys.length !== file.seededPresetKeys.length ||
    seededPresetKeys.some((key, index) => key !== file.seededPresetKeys[index])

  if (!changed && !seededChanged && file.presetCatalogVersion >= catalogVersion) {
    return { file, changed: false }
  }

  return {
    file: {
      ...file,
      placeTypes: icons,
      presetCatalogVersion: Math.max(file.presetCatalogVersion, catalogVersion),
      seededPresetKeys
    },
    changed: true
  }
}
