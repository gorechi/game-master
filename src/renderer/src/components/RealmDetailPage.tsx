import { useEffect, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { Realm } from '@shared/realm'
import { api, errorMessage } from '@renderer/lib/api'
import { RealmIconsSection } from './realms/RealmIconsSection'

interface RealmDetailPageProps {
  realm: Realm | null
  onBack: () => void
  onChanged: () => void
}

type RealmTab = 'icons' | 'about'

/** Экран одного сеттинга: вкладки с набором иконок и основными сведениями. */
export function RealmDetailPage({
  realm,
  onBack,
  onChanged
}: RealmDetailPageProps): JSX.Element {
  const [tab, setTab] = useState<RealmTab>('about')
  const [name, setName] = useState(realm?.name ?? '')
  const [description, setDescription] = useState(realm?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(realm?.name ?? '')
    setDescription(realm?.description ?? '')
    setError(null)
  }, [realm?.id, realm?.name, realm?.description])

  async function saveRealm(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!realm || saving) return

    const trimmed = name.trim()
    if (!trimmed) {
      setError('Укажите название сеттинга')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await api.realms.update({ ...realm, name: trimmed, description })
      onChanged()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

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
            <>
              <header className="page-head">
                <div>
                  <p className="page-kicker">Сеттинг</p>
                  <h1>{realm.name}</h1>
                  <p className="muted">{realm.description || 'Без описания'}</p>
                </div>
              </header>

              <div className="realm-tabs" role="tablist" aria-label="Разделы сеттинга">
                <button
                  type="button"
                  role="tab"
                  id="realm-tab-about"
                  aria-selected={tab === 'about'}
                  aria-controls="realm-panel-about"
                  className={`realm-tab${tab === 'about' ? ' realm-tab--active' : ''}`}
                  onClick={() => setTab('about')}
                >
                  Основное
                </button>
                <button
                  type="button"
                  role="tab"
                  id="realm-tab-icons"
                  aria-selected={tab === 'icons'}
                  aria-controls="realm-panel-icons"
                  className={`realm-tab${tab === 'icons' ? ' realm-tab--active' : ''}`}
                  onClick={() => setTab('icons')}
                >
                  Иконки
                </button>
              </div>

              {tab === 'icons' ? (
                <div
                  id="realm-panel-icons"
                  role="tabpanel"
                  aria-labelledby="realm-tab-icons"
                >
                  <RealmIconsSection realmId={realm.id} realmName={realm.name} />
                </div>
              ) : (
                <section
                  id="realm-panel-about"
                  role="tabpanel"
                  aria-labelledby="realm-tab-about"
                  className="settings-block"
                >
                  <div className="settings-block__head">
                    <h2>Основное</h2>
                    <p className="muted">Название и описание сеттинга.</p>
                  </div>

                  <form
                    className="realm-form"
                    onSubmit={(event) => void saveRealm(event)}
                    noValidate
                  >
                    <label className="field">
                      <span className="field__label">Название</span>
                      <input
                        className="input"
                        value={name}
                        maxLength={100}
                        placeholder="D&D, Киберпанк, Дальний космос…"
                        autoComplete="off"
                        onChange={(event) => setName(event.target.value)}
                      />
                    </label>

                    <label className="field">
                      <span className="field__label">Описание</span>
                      <textarea
                        className="input realm-form__description"
                        value={description}
                        maxLength={2000}
                        rows={4}
                        placeholder="Жанр, атмосфера, особенности мира…"
                        onChange={(event) => setDescription(event.target.value)}
                      />
                    </label>

                    {error ? <p className="notice notice--error">{error}</p> : null}

                    <div className="realm-form__actions">
                      <button
                        type="submit"
                        className="button button--primary"
                        disabled={saving}
                      >
                        {saving ? 'Сохраняем…' : 'Сохранить сеттинг'}
                      </button>
                    </div>
                  </form>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
