import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import { validatePlaceIcon } from '@shared/placeIcon'
import type { PlaceType, PlaceTypeInput } from '@shared/placeType'
import { api, errorMessage } from '@renderer/lib/api'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { IconPencil, IconPlus, IconTrash } from '../ui/icons'
import { PlaceTypeIcon } from '../placeTypes/PlaceTypeIcon'
import { RealmIconFormModal } from './RealmIconFormModal'

interface RealmIconsSectionProps {
  realmId: string
  realmName: string
}

type FormState = { mode: 'create' } | { mode: 'edit'; icon: PlaceType }

/** Набор SVG-иконок сеттинга: из него места выбирают картинку. */
export function RealmIconsSection({
  realmId,
  realmName
}: RealmIconsSectionProps): JSX.Element {
  const [icons, setIcons] = useState<PlaceType[]>([])
  const [form, setForm] = useState<FormState | null>(null)
  const [deleting, setDeleting] = useState<PlaceType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)

    try {
      const loaded = await api.placeTypes.list(realmId)
      setIcons(loaded)
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setLoading(false)
    }
  }, [realmId])

  useEffect(() => {
    void load()
  }, [load])

  async function save(input: PlaceTypeInput): Promise<void> {
    if (form?.mode === 'edit') {
      await api.placeTypes.update({ ...form.icon, ...input })
    } else {
      await api.placeTypes.create(input, realmId)
    }

    setForm(null)
    await load()
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return

    try {
      await api.placeTypes.remove(deleting.id)
      setDeleting(null)
      setError(null)
      await load()
    } catch (caught) {
      setError(errorMessage(caught))
      setDeleting(null)
    }
  }

  return (
    <section className="settings-block realm-icons-block" aria-labelledby="realm-icons-title">
      <div className="place-types-head">
        <div className="settings-block__head">
          <h2 id="realm-icons-title">Набор иконок</h2>
          <p className="muted">
            Набор иконок сеттинга «{realmName || '—'}». Место на карте выбирает любую
            иконку из этого набора.
          </p>
        </div>

        <button
          type="button"
          className="button button--primary"
          disabled={!realmId}
          onClick={() => setForm({ mode: 'create' })}
        >
          <IconPlus width={16} height={16} />
          Добавить иконку
        </button>
      </div>

      {error ? <p className="notice notice--error">{error}</p> : null}

      {loading && icons.length === 0 ? (
        <p className="muted">Загружаем иконки…</p>
      ) : icons.length === 0 ? (
        <div className="place-types-empty">
          <p>Иконок пока нет.</p>
          <span>Добавьте первую SVG-иконку — потом её можно будет выбрать для места.</span>
        </div>
      ) : (
        <ul className="realm-icon-grid">
          {icons.map((icon, index) => {
            const valid = validatePlaceIcon(icon.iconSvg).ok
            const label = `Иконка ${index + 1}`

            return (
              <li className="realm-icon-card" key={icon.id}>
                <span
                  className={`realm-icon-card__token${
                    valid ? '' : ' realm-icon-card__token--broken'
                  }`}
                  title={valid ? label : `${label}: повреждена`}
                >
                  <PlaceTypeIcon svg={icon.iconSvg} size={30} />
                </span>

                <div className="realm-icon-card__actions">
                  <button
                    type="button"
                    className="icon-button icon-button--tiny"
                    title="Заменить иконку"
                    aria-label={`Заменить ${label.toLowerCase()}`}
                    onClick={() => setForm({ mode: 'edit', icon })}
                  >
                    <IconPencil width={14} height={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button--tiny icon-button--danger"
                    title="Удалить иконку"
                    aria-label={`Удалить ${label.toLowerCase()}`}
                    onClick={() => {
                      setError(null)
                      setDeleting(icon)
                    }}
                  >
                    <IconTrash width={14} height={14} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <RealmIconFormModal
        open={form !== null}
        icon={form?.mode === 'edit' ? form.icon : null}
        onClose={() => setForm(null)}
        onSubmit={save}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Удалить иконку?"
        description="Иконка исчезнет из набора сеттинга. Места, где она выбрана, останутся без иконки."
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  )
}
