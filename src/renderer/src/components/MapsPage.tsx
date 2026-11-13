import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { GameMap } from '@shared/map'
import { api, errorMessage } from '@renderer/lib/api'
import { pluralize } from '@renderer/lib/format'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { IconMap, IconPencil, IconPlus, IconTrash } from './ui/icons'
import { MapFormModal } from './maps/MapFormModal'

interface MapsPageProps {
  onOpenMap: (mapId: string) => void
}

type MapFormState = { mode: 'create' } | { mode: 'edit'; map: GameMap }

/** Карты: пространства, в которых проходят игры. */
export function MapsPage({ onOpenMap }: MapsPageProps): JSX.Element {
  const [maps, setMaps] = useState<GameMap[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<MapFormState | null>(null)
  const [deleting, setDeleting] = useState<GameMap | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setMaps(await api.maps.list())
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function confirmDelete(): Promise<void> {
    if (!deleting) return

    try {
      await api.maps.remove(deleting.id)
      setDeleting(null)
      await refresh()
    } catch (caught) {
      setError(errorMessage(caught))
      setDeleting(null)
    }
  }

  return (
    <main className="page">
      <div className="page__inner">
        <header className="page-head">
          <div>
            <h1>Карты</h1>
            <p className="muted">
              Пространства, в которых проходят игры: места и пути между ними.
            </p>
          </div>
          <button
            className="button button--primary"
            onClick={() => setForm({ mode: 'create' })}
          >
            <IconPlus width={16} height={16} />
            Создать карту
          </button>
        </header>

        {error ? <p className="notice notice--error">{error}</p> : null}

        {maps === null ? (
          <p className="muted">Загружаем карты…</p>
        ) : maps.length === 0 ? (
          <div className="empty empty--action">
            <p>Пока ни одной карты. Создайте первую — добавьте места и соедините их путями.</p>
            <button className="button" onClick={() => setForm({ mode: 'create' })}>
              Создать карту
            </button>
          </div>
        ) : (
          <>
            <p className="list-caption">
              {maps.length} {pluralize(maps.length, 'карта', 'карты', 'карт')}
            </p>

            <ul className="map-list">
              {maps.map((map) => (
                <li className="map-card" key={map.id}>
                  <span className="map-card__sigil" aria-hidden="true">
                    <IconMap width={22} height={22} />
                  </span>

                  <div className="map-card__identity">
                    <h3 className="map-card__name">{map.name}</h3>
                    <span className="map-card__meta">
                      {map.places.length}{' '}
                      {pluralize(map.places.length, 'место', 'места', 'мест')} ·{' '}
                      {map.paths.length} {pluralize(map.paths.length, 'путь', 'пути', 'путей')}
                    </span>
                  </div>

                  <div className="map-card__actions">
                    <button
                      type="button"
                      className="button button--tiny button--primary"
                      onClick={() => onOpenMap(map.id)}
                    >
                      Просмотр
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      title="Редактировать"
                      aria-label={`Редактировать карту ${map.name}`}
                      onClick={() => setForm({ mode: 'edit', map })}
                    >
                      <IconPencil />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--danger"
                      title="Удалить"
                      aria-label={`Удалить карту ${map.name}`}
                      onClick={() => setDeleting(map)}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <MapFormModal
        open={form !== null}
        map={form?.mode === 'edit' ? form.map : null}
        onClose={() => setForm(null)}
        onSaved={() => {
          setForm(null)
          void refresh()
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Удалить карту?"
        description={
          deleting
            ? `«${deleting.name}» и все её места и пути будут удалены. Ссылки выходов на эту карту в других картах будут очищены. Это действие нельзя отменить.`
            : undefined
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}
