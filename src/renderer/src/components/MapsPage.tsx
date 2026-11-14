import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { GameMap } from '@shared/map'
import type { Realm } from '@shared/realm'
import { api, errorMessage } from '@renderer/lib/api'
import { pluralize } from '@renderer/lib/format'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Select } from './ui/Select'
import { IconMap, IconPencil, IconPlus, IconTrash } from './ui/icons'
import { MapFormModal } from './maps/MapFormModal'

interface MapsPageProps {
  realms: readonly Realm[]
  onOpenMap: (mapId: string) => void
}

type MapFormState = { mode: 'create' } | { mode: 'edit'; map: GameMap }

/** Карты: пространства, в которых проходят игры. */
export function MapsPage({ realms, onOpenMap }: MapsPageProps): JSX.Element {
  const [maps, setMaps] = useState<GameMap[] | null>(null)
  const [filter, setFilter] = useState('all')
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

  useEffect(() => {
    if (filter !== 'all' && !realms.some((realm) => realm.id === filter)) {
      setFilter('all')
    }
  }, [filter, realms])

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

  const realmNames = new Map(realms.map((realm) => [realm.id, realm.name]))
  const filteredMaps =
    maps === null ? [] : filter === 'all' ? maps : maps.filter((map) => map.realmId === filter)
  const defaultRealmId = filter !== 'all' ? filter : ''
  const canCreate = realms.length > 0

  function openCreate(): void {
    setForm({ mode: 'create' })
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
            disabled={!canCreate}
            onClick={openCreate}
          >
            <IconPlus width={16} height={16} />
            Создать карту
          </button>
        </header>

        <div className="map-filter-bar">
          <span className="map-filter-bar__label">Сеттинг</span>
          <div className="map-filter-bar__select">
            <Select
              ariaLabel="Фильтр карт по сеттингу"
              value={filter}
              options={[
                { value: 'all', label: 'Все сеттинги' },
                ...realms.map((realm) => ({ value: realm.id, label: realm.name }))
              ]}
              onChange={setFilter}
            />
          </div>
        </div>

        {error ? <p className="notice notice--error">{error}</p> : null}

        {maps === null ? (
          <p className="muted">Загружаем карты…</p>
        ) : maps.length === 0 ? (
          <div className="empty empty--action">
            <p>Пока ни одной карты. Создайте первую — добавьте места и соедините их путями.</p>
            <button className="button" disabled={!canCreate} onClick={openCreate}>
              Создать карту
            </button>
          </div>
        ) : filteredMaps.length === 0 ? (
          <div className="empty empty--action">
            <p>В выбранном сеттинге пока нет карт.</p>
            <div className="map-filter-empty-actions">
              <button type="button" className="button" onClick={() => setFilter('all')}>
                Показать все карты
              </button>
              <button
                type="button"
                className="button button--primary"
                disabled={!canCreate}
                onClick={openCreate}
              >
                Создать карту
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="list-caption">
              {filteredMaps.length}{' '}
              {pluralize(filteredMaps.length, 'карта', 'карты', 'карт')}
              {filter !== 'all' ? ` · всего ${maps.length}` : ''}
            </p>

            <ul className="map-list">
              {filteredMaps.map((map) => (
                <li className="map-card" key={map.id}>
                  <span className="map-card__sigil" aria-hidden="true">
                    <IconMap width={22} height={22} />
                  </span>

                  <div className="map-card__identity">
                    <h3 className="map-card__name">{map.name}</h3>
                    <span className="map-card__meta">
                      <span className="map-card__realm">
                        {realmNames.get(map.realmId) ?? 'Без сеттинга'}
                      </span>
                      {' · '}
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
        realms={realms}
        defaultRealmId={defaultRealmId}
        onClose={() => setForm(null)}
        onSaved={(saved) => {
          setForm(null)
          if (filter !== 'all' && saved.realmId !== filter) setFilter(saved.realmId)
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
