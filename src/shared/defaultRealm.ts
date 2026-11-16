import { getActiveLocale, getMessages, locales } from './i18n'
import { DEFAULT_REALM_ID, type Realm } from './realm'

/**
 * Описание стандартного сеттинга — часть приложения, а не пользовательские
 * данные. Если пользователь его не менял, при смене языка описание
 * обновляется вместе с интерфейсом. Изменённое вручную описание не трогаем.
 */
export function localizeDefaultRealm(realm: Realm): Realm {
  if (realm.id !== DEFAULT_REALM_ID) return realm

  const current = (realm.description ?? '').trim()
  const target = getMessages(getActiveLocale()).main.realms.seedDescription
  if (!current || current === target.trim()) return realm

  const isBuiltIn = Object.values(locales).some(
    (locale) => locale.main.realms.seedDescription.trim() === current
  )

  return isBuiltIn ? { ...realm, description: target } : realm
}
