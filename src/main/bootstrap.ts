import { PRESET_ICON_CATALOG_VERSION, PRESET_PLACE_ICONS } from '@shared/presetPlaceIcons'
import { DEFAULT_REALM_ID } from '@shared/realm'
import { applyPresetIcons } from './storage/placeTypeStore'
import { listRealms } from './storage/realmStore'

/**
 * Первичное наполнение пользовательских данных.
 * Сейчас это встроенные иконки сеттинга D&D; позже сюда можно добавить
 * другой стартовый контент.
 */
export async function bootstrapUserData(): Promise<void> {
  const realms = await listRealms()

  if (!realms.some((realm) => realm.id === DEFAULT_REALM_ID)) return

  await applyPresetIcons(PRESET_PLACE_ICONS, PRESET_ICON_CATALOG_VERSION)
}
