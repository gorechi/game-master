import type { JSX } from 'react'
import type { Realm } from '@shared/realm'
import { IconCheck } from './ui/icons'
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
                <div className="realm-detail__title-row">
                  <h1>{realm.name}</h1>
                  {active ? (
                    <span className="realm-badge">
                      <IconCheck width={11} height={11} />
                      Активный
                    </span>
                  ) : null}
                </div>
                <p className="muted">{realm.description || 'Без описания'}</p>
              </div>

              {!active ? (
                <button className="button" onClick={onActivate}>
                  Сделать активным
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
