import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { PlaceType } from '@shared/placeType'
import { Modal } from '../ui/Modal'
import { PlaceTypeIcon } from '../placeTypes/PlaceTypeIcon'

interface PlaceIconPickerModalProps {
  open: boolean
  placeName: string
  /** Текущая иконка места. */
  value: string | null
  /** Все иконки сеттинга. */
  placeTypes: readonly PlaceType[]
  onClose: () => void
  onSelect: (placeTypeId: string | null) => void
}

/**
 * Отдельное окно выбора иконки места.
 *
 * Набор иконок растёт вместе с сеттингом, поэтому в форме места его держать
 * нельзя: форма становится выше экрана. Здесь крупная сетка живёт в окне,
 * а при переполнении прокручивается сама модалка.
 */
export function PlaceIconPickerModal({
  open,
  placeName,
  value,
  placeTypes,
  onClose,
  onSelect
}: PlaceIconPickerModalProps): JSX.Element {
  const [draft, setDraft] = useState<string | null>(value)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setDraft(value)
  }, [open, value])

  useEffect(() => {
    if (!open) return
    gridRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus()
  }, [open])

  function confirm(): void {
    onSelect(draft)
  }

  return (
    <Modal
      open={open}
      title="Иконка места"
      description={placeName}
      size="lg"
      panelClassName="modal--place-icon"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="button button--primary" onClick={confirm}>
            {draft ? 'Выбрать иконку' : 'Оставить без иконки'}
          </button>
        </>
      }
    >
      <div className="place-icon-picker">
        <div ref={gridRef} className="place-icon-library" role="group" aria-label="Иконка места">
          <button
            type="button"
            className={`place-icon-library__item place-icon-library__item--none${
              draft ? '' : ' place-icon-library__item--active'
            }`}
            title="Без иконки"
            aria-label="Без иконки"
            aria-pressed={!draft}
            onClick={() => setDraft(null)}
          >
            —
          </button>

          {placeTypes.map((icon, index) => {
            const selected = draft === icon.id

            return (
              <button
                key={icon.id}
                type="button"
                className={`place-icon-library__item${
                  selected ? ' place-icon-library__item--active' : ''
                }`}
                title={`Иконка ${index + 1}`}
                aria-label={`Иконка ${index + 1}`}
                aria-pressed={selected}
                onClick={() => setDraft(icon.id)}
              >
                <PlaceTypeIcon svg={icon.iconSvg} size={34} />
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
