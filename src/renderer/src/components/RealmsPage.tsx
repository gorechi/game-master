import { useState } from 'react'
import type { JSX } from 'react'
import type { Realm, RealmInput } from '@shared/realm'
import { api, errorMessage } from '@renderer/lib/api'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { IconGlobe, IconPencil, IconPlus, IconTrash } from './ui/icons'
import { RealmFormModal } from './realms/RealmFormModal'

interface RealmsPageProps {
  realms: readonly Realm[]
  onOpenRealm: (realmId: string) => void
  onChanged: () => void
}

type RealmFormState = { mode: 'create' } | { mode: 'edit'; realm: Realm }

/** Сеттинги: верхнеуровневые миры, между которыми разделены данные приложения. */
export function RealmsPage({
  realms,
  onOpenRealm,
  onChanged
}: RealmsPageProps): JSX.Element {
  const { messages: m, fill } = useI18n()
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
            <h1>{m.realms.page.title}</h1>
            <p className="muted">{m.realms.page.description}</p>
          </div>
          <button className="button button--primary" onClick={() => setForm({ mode: 'create' })}>
            <IconPlus width={16} height={16} />
            {m.realms.page.create}
          </button>
        </header>

        {error ? <p className="notice notice--error">{error}</p> : null}

        <ul className="realm-list">
          {realms.map((realm) => {
            const canDelete = realms.length > 1

            return (
              <li className="realm-card" key={realm.id}>
                <span className="realm-card__sigil" aria-hidden="true">
                  <IconGlobe width={22} height={22} />
                </span>

                <div className="realm-card__identity">
                  <div className="realm-card__title-row">
                    <h3 className="realm-card__name">{realm.name}</h3>
                  </div>
                  <p className="realm-card__description">
                    {realm.description || m.realms.noDescription}
                  </p>
                </div>

                <div className="realm-card__actions">
                  <button
                    type="button"
                    className="button button--tiny"
                    onClick={() => onOpenRealm(realm.id)}
                  >
                    {m.realms.page.open}
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title={m.realms.page.edit}
                    aria-label={fill(m.realms.page.editAria, { name: realm.name })}
                    onClick={() => setForm({ mode: 'edit', realm })}
                  >
                    <IconPencil />
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button--danger"
                    title={
                      canDelete
                        ? m.realms.page.delete
                        : m.realms.page.deleteBlocked
                    }
                    aria-label={fill(m.realms.page.deleteAria, { name: realm.name })}
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
        title={m.realms.page.deleteTitle}
        description={
          deleting
            ? fill(m.realms.page.deleteDescription, { name: deleting.name })
            : undefined
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}
