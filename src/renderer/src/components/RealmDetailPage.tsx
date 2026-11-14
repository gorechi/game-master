import type { JSX } from 'react'
import type { Realm } from '@shared/realm'
import { PlaceTypesSection } from './placeTypes/PlaceTypesSection'

interface RealmDetailPageProps {
  realm: Realm | null
  active: boolean
  onActivate: () => void
  onBack: () => void
}

/** Экран одного сеттинга: его описание и собственный набор типов мест. */
export function RealmDetailPage({
  realm,
  active,
  onActivate,
  onBack
}: RealmDetailPageProps): JSX.Element {
  return (
    <main className="page">
      <div className="page__inner">
        <div className="page-block">
          <button
            type="button"
            className="button button--ghost button--tiny page-back"
            onClick={onBack}
          >
            ← Сеттинги
          </button>

          {!realm ? (
            <p className="notice">Сеттинг не найден — возможно, он был удалён.</p>
          ) : (
            <header className="page-head">
              <div>
                <p className="page-kicker">Сеттинг</p>
                <h1>{realm.name}</h1>
                <p className="muted">{realm.description || 'Без описания'}</p>
              </div>

              {!active ? (
                <button className="button" onClick={onActivate}>
                  Выбрать сеттинг
                </button>
              ) : null}
            </header>
          )}
        </div>

        {realm ? <PlaceTypesSection realmId={realm.id} realmName={realm.name} /> : null}
      </div>
    </main>
  )
}
