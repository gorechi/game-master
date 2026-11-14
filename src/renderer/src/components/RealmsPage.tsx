import { useState } from 'react'
import type { JSX } from 'react'
import type { Realm, RealmInput } from '@shared/realm'
import { api, errorMessage } from '@renderer/lib/api'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { IconCheck, IconGlobe, IconPencil, IconPlus, IconTrash } from './ui/icons'
import { RealmFormModal } from './realms/RealmFormModal'

interface RealmsPageProps {
  realms: readonly Realm[]
  activeRealmId: string | null
  onActivate: (realmId: string) => void
  onChanged: () => void
}

type RealmFormState = { mode: 'create' } | { mode: 'edit'; realm: Realm }

/** Сеттинги: верхнеуровневые миры, между которыми разделены данные приложения. */
export function RealmsPage({
  realms,
  activeRealmId,
  onActivate,
  onChanged
}: RealmsPageProps): JSX.Element {
  const [form, setForm] = useState<RealmFormState | null>(null)
  const [deleting, setDeleting] = useState<Realm | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function saveRealm(input: RealmInput): Promise<void> {
    if (form?.mode === 'edit') {
      await api.realms.update({ ...form.realm, ...input })
    } else {
      await api.realms.create(input)
    }

    setForm(null)
    onChanged()
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return

    try {
      await api.realms.remove(deleting.id)
      setDeleting(null)
      setError(null)
      onChanged()
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
            <h1>Сеттинги</h1>
            <p className="muted">
              Миры, между которыми разделены игры, персонажи, монстры и карты. Выберите
              активный сеттинг в меню слева.
            </p>
          </div>
          <button className="button button--primary" onClick={() => setForm({ mode: 'create' })}>
            <IconPlus width={16} height={16} />
            Создать сеттинг
          </button>
        </header>

        {error ? <p className="notice notice--error">{error}</p> : null}

        <ul className="realm-list">
          {realms.map((realm) => {
            const active = realm.id === activeRealmId
            const canDelete = realms.length > 1

            return (
              <li className={`realm-card${active ? ' realm-card--active' : ''}`} key={realm.id}>
                <span className="realm-card__sigil" aria-hidden="true">
                  <IconGlobe width={22} height={22} />
                </span>

                <div className="realm-card__identity">
                  <div className="realm-card__title-row">
                    <h3 className="realm-card__name">{realm.name}</h3>
                    {active ? (
                      <span className="realm-badge">
                        <IconCheck width={11} height={11} />
                        Активный
                      </span>
                    ) : null}
                  </div>
                  <p className="realm-card__description">
                    {realm.description || 'Без описания'}
                  </p>
                </div>

                <div className="realm-card__actions">
                  {!active ? (
                    <button
                      type="button"
                      className="button button--tiny"
                      onClick={() => onActivate(realm.id)}
                    >
                      Выбрать
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="icon-button"
                    title="Редактировать"
                    aria-label={`Редактировать сеттинг ${realm.name}`}
                    onClick={() => setForm({ mode: 'edit', realm })}
                  >
                    <IconPencil />
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button--danger"
                    title={
                      canDelete
                        ? 'Удалить'
                        : 'Нельзя удалить последний сеттинг'
                    }
                    aria-label={`Удалить сеттинг ${realm.name}`}
                    disabled={!canDelete}
                    onClick={() => {
                      setError(null)
                      setDeleting(realm)
                    }}
                  >
                    <IconTrash />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <RealmFormModal
        open={form !== null}
        realm={form?.mode === 'edit' ? form.realm : null}
        onClose={() => setForm(null)}
        onSubmit={saveRealm}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Удалить сеттинг?"
        description={
          deleting
            ? `«${deleting.name}» будет удалён. Удалить можно только пустой сеттинг — сначала удалите из него игры, персонажей, монстров и карты.`
            : undefined
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}
