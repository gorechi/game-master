import { app, net } from 'electron'
import { fill, m } from '@shared/i18n'
import {
  GITHUB_LATEST_RELEASE_API,
  isVersionNewer,
  normalizeVersion,
  parseVersion,
  releaseUrlOrFallback,
  type UpdateState
} from '@shared/update'

const CHECK_TIMEOUT_MS = 10_000

let state: UpdateState = {
  status: 'idle',
  currentVersion: app.getVersion(),
  latestVersion: null,
  releaseUrl: null,
  checkedAt: null,
  error: null
}

let pending: Promise<UpdateState> | null = null

export function getUpdateState(): UpdateState {
  return state
}

/**
 * Запрашивает у GitHub последний релиз и сравнивает его с текущей версией.
 * Повторные вызовы во время проверки переиспользуют один запрос.
 */
export function checkForUpdates(): Promise<UpdateState> {
  if (pending) return pending

  state = { ...state, status: 'checking', error: null }
  pending = runCheck().finally(() => {
    pending = null
  })

  return pending
}

async function runCheck(): Promise<UpdateState> {
  const currentVersion = app.getVersion()

  try {
    const response = await net.fetch(GITHUB_LATEST_RELEASE_API, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Game-Master-Update-Check',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS)
    })

    if (!response.ok) {
      throw new Error(fill(m().updates.errors.http, { status: response.status }))
    }

    const payload = (await response.json()) as { tag_name?: unknown; html_url?: unknown }
    const latestVersion =
      typeof payload.tag_name === 'string' ? normalizeVersion(payload.tag_name) : ''

    if (!latestVersion || !parseVersion(latestVersion)) {
      throw new Error(m().updates.errors.badVersion)
    }

    state = {
      status: isVersionNewer(latestVersion, currentVersion) ? 'available' : 'latest',
      currentVersion,
      latestVersion,
      releaseUrl: releaseUrlOrFallback(payload.html_url),
      checkedAt: new Date().toISOString(),
      error: null
    }
  } catch (error) {
    state = {
      status: 'error',
      currentVersion,
      latestVersion: null,
      releaseUrl: null,
      checkedAt: new Date().toISOString(),
      error: describeError(error)
    }
  }

  return state
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return m().updates.errors.timeout
    }
    if (/fetch|net::|ENOTFOUND|ECONN|EAI_AGAIN/i.test(error.message)) {
      return m().updates.errors.network
    }
    return error.message
  }

  return String(error)
}
