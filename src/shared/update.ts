/**
 * Проверка новых версий через GitHub Releases.
 *
 * Приложение только сообщает о доступном релизе и даёт ссылку:
 * скачивание и установку пользователь делает сам.
 */

export const GITHUB_RELEASES_URL = 'https://github.com/gorechi/game-master/releases'
export const GITHUB_LATEST_RELEASE_API =
  'https://api.github.com/repos/gorechi/game-master/releases/latest'

export type UpdateStatus = 'idle' | 'checking' | 'latest' | 'available' | 'error'

export interface UpdateState {
  status: UpdateStatus
  /** Версия запущенного приложения. */
  currentVersion: string
  /** Версия последнего релиза на GitHub. */
  latestVersion: string | null
  /** Страница релиза для скачивания установщика. */
  releaseUrl: string | null
  /** Момент последней проверки в ISO-формате. */
  checkedAt: string | null
  /** Человекочитаемая причина ошибки, если проверка не удалась. */
  error: string | null
}

/** Отбрасывает префикс `v` и суффикс предварительной версии: `v1.2.0-beta.1` → `1.2.0`. */
export function normalizeVersion(value: string): string {
  return value.trim().replace(/^v/i, '').split(/[-+]/)[0] ?? ''
}

/** Разбирает версию на числовые части. Возвращает null, если формат неожиданный. */
export function parseVersion(value: string): number[] | null {
  const core = normalizeVersion(value)
  if (!core) return null

  const parts = core.split('.')
  if (parts.some((part) => !/^\d+$/.test(part))) return null

  return parts.map((part) => Number(part))
}

/** true, если `latest` новее `current`. Нечисловые версии новее не считаются. */
export function isVersionNewer(latest: string, current: string): boolean {
  const next = parseVersion(latest)
  const running = parseVersion(current)
  if (!next || !running) return false

  const length = Math.max(next.length, running.length)
  for (let index = 0; index < length; index += 1) {
    const a = next[index] ?? 0
    const b = running[index] ?? 0
    if (a > b) return true
    if (a < b) return false
  }

  return false
}

/** Приводит ссылку из ответа GitHub к безопасному виду. */
export function releaseUrlOrFallback(value: unknown): string {
  return typeof value === 'string' && value.startsWith('https://github.com/')
    ? value
    : GITHUB_RELEASES_URL
}
