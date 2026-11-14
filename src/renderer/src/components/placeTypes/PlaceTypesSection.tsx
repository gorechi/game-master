import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import { validatePlaceIcon } from '@shared/placeIcon'
import type { PlaceType, PlaceTypeInput } from '@shared/placeType'
import { api, errorMessage } from '@renderer/lib/api'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { IconPencil, IconPlus, IconTrash } from '../ui/icons'
import { PlaceTypeFormModal } from './PlaceTypeFormModal'
import { PlaceTypeIcon } from './PlaceTypeIcon'

interface PlaceTypesSectionProps {
  realmId: string
  realmName: string
}

type FormState = { mode: 'create' } | { mode: 'edit'; placeType: PlaceType }

/** Раздел «Типы мест» внутри сеттинга: название + проверенная SVG-иконка. */
export function PlaceTypesSection({
  realmId,
  realmName
}: PlaceTypesSectionProps): JSX.Element {
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([])
  const [form, setForm] = useState<FormState | null>(null)
  const [deleting, setDeleting] = useState<PlaceType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)

    try {
      const loaded = await api.placeTypes.list(realmId)
      setPlaceTypes(loaded)
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
      await api.placeTypes.update({ ...form.placeType, ...input })
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
    <section className="settings-block place-types-block" aria-labelledby="place-types-title">
      <div className="place-types-head">
        <div className="settings-block__head">
          <h2 id="place-types-title">Типы мест</h2>
          <p className="muted">
            Названия и иконки для мест сеттинга «{realmName || '—'}». Иконка может быть
            общей у нескольких типов.
          </p>
        </div>

        <button
          type="button"
          className="button button--primary"
          disabled={!realmId}
          onClick={() => setForm({ mode: 'create' })}
        >
          <IconPlus width={16} height={16} />
          Создать тип
        </button>
      </div>

      {error ? <p className="notice notice--error">{error}</p> : null}

      {loading && placeTypes.length === 0 ? (
        <p className="muted">Загружаем типы мест…</p>
      ) : placeTypes.length === 0 ? (
        <div className="place-types-empty">
          <p>Типов мест пока нет.</p>
          <span>Создайте первый тип и загрузите для него SVG-иконку.</span>
        </div>
      ) : (
        <ul className="place-type-grid">
          {placeTypes.map((placeType) => {
            const valid = validatePlaceIcon(placeType.iconSvg).ok

            return (
              <li className="place-type-card" key={placeType.id}>
                <span
                  className={`place-type-card__icon${
                    valid ? '' : ' place-type-card__icon--broken'
                  }`}
                >
                  <PlaceTypeIcon svg={placeType.iconSvg} size={30} />
                </span>

                <div className="place-type-card__body">
                  <h3 className="place-type-card__name">{placeType.name}</h3>
                  {!valid ? (
                    <span className="place-type-card__warning">Иконка повреждена</span>
                  ) : null}
                </div>

                <div className="place-type-card__actions">
                  <button
                    type="button"
                    className="icon-button"
                    title="Редактировать"
                    aria-label={`Редактировать тип ${placeType.name}`}
                    onClick={() => setForm({ mode: 'edit', placeType })}
                  >
                    <IconPencil />
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button--danger"
                    title="Удалить"
                    aria-label={`Удалить тип ${placeType.name}`}
                    onClick={() => {
                      setError(null)
                      setDeleting(placeType)
                    }}
                  >
                    <IconTrash />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <PlaceTypeFormModal
        open={form !== null}
        placeType={form?.mode === 'edit' ? form.placeType : null}
        existingTypes={placeTypes}
        onClose={() => setForm(null)}
        onSubmit={save}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Удалить тип места?"
        description={
          deleting
            ? `Тип «${deleting.name}» будет удалён. Иконка останется у других типов, если они её используют.`
            : undefined
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  )
}
