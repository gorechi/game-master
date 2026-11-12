import { useCallback, useEffect, useRef, useState } from 'react'
import type { Campaign } from '@shared/campaign'
import { api, errorMessage } from '@renderer/lib/api'

export type SaveState =
  | { kind: 'loading' }
  | { kind: 'saved'; savedAt: string }
  | { kind: 'pending' }
  | { kind: 'saving' }
  | { kind: 'error'; message: string }

interface CampaignSession {
  campaign: Campaign | null
  saveState: SaveState
  loadError: string | null
  /** Изменяет кампанию и планирует автосохранение. */
  update: (mutator: (draft: Campaign) => Campaign) => void
  /** Немедленно записывает несохранённое на диск. */
  flush: () => Promise<void>
}

const AUTOSAVE_DELAY_MS = 500

/**
 * Сессия одной кампании: загрузка из главного процесса, локальное состояние,
 * отложенная запись (дебаунс) и гарантированная дозапись при закрытии окна.
 */
export function useCampaignSession(campaignId: string): CampaignSession {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'loading' })
  const [loadError, setLoadError] = useState<string | null>(null)

  /** Последнее состояние — обновляется синхронно, без ожидания перерисовки. */
  const latest = useRef<Campaign | null>(null)
  const pending = useRef<Campaign | null>(null)
  const timer = useRef<number | null>(null)
  const inFlight = useRef<Promise<void> | null>(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    setCampaign(null)
    latest.current = null
    pending.current = null
    setSaveState({ kind: 'loading' })
    setLoadError(null)

    void api.campaigns
      .load(campaignId)
      .then((loaded) => {
        if (cancelled) return
        latest.current = loaded
        setCampaign(loaded)
        setSaveState({ kind: 'saved', savedAt: loaded.updatedAt })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(errorMessage(error))
      })

    return () => {
      cancelled = true
    }
  }, [campaignId])

  const flush = useCallback(async (): Promise<void> => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }

    // Предыдущая запись ещё идёт — дожидаемся её, чтобы файл не перетёрся.
    if (inFlight.current) {
      await inFlight.current
    }

    const document = pending.current
    if (!document) return

    pending.current = null
    if (alive.current) setSaveState({ kind: 'saving' })

    const task = api.campaigns
      .save(document)
      .then(() => {
        if (alive.current) setSaveState({ kind: 'saved', savedAt: new Date().toISOString() })
      })
      .catch((error: unknown) => {
        // Возвращаем документ в очередь: следующее изменение (или закрытие) повторит запись.
        pending.current = document
        if (alive.current) setSaveState({ kind: 'error', message: errorMessage(error) })
      })

    inFlight.current = task
    try {
      await task
    } finally {
      if (inFlight.current === task) inFlight.current = null
    }
  }, [])

  const schedule = useCallback((): void => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      timer.current = null
      void flush()
    }, AUTOSAVE_DELAY_MS)
  }, [flush])

  const update = useCallback(
    (mutator: (draft: Campaign) => Campaign): void => {
      const current = latest.current
      if (!current) return

      const next = mutator(current)
      if (next === current) return

      latest.current = next
      pending.current = next
      setCampaign(next)
      if (alive.current) setSaveState({ kind: 'pending' })
      schedule()
    },
    [schedule]
  )

  // Окно закрывается: дописываем данные, затем отпускаем main процесс.
  useEffect(() => {
    return api.app.onBeforeClose(() => {
      void flush().finally(() => api.app.closeReady())
    })
  }, [flush])

  // Уход с экрана кампании (например, «назад») тоже не должен терять изменения.
  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
      void flush()
    }
  }, [flush])

  return { campaign, saveState, loadError, update, flush }
}
