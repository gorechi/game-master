import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { Modal } from '../ui/Modal'

interface PlaceDescriptionModalProps {
  open: boolean
  placeName: string
  value: string
  onClose: () => void
  onSave: (value: string) => void
}

/** Большой редактор заметок и описания места. */
export function PlaceDescriptionModal({
  open,
  placeName,
  value,
  onClose,
  onSave
}: PlaceDescriptionModalProps): JSX.Element {
  const [draft, setDraft] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    setDraft(value)
  }, [open, value])

  return (
    <Modal
      open={open}
      title="Описание места"
      description={placeName}
      size="lg"
      onClose={onClose}
      initialFocusRef={textareaRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => onSave(draft)}
          >
            Сохранить описание
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field__label">Заметки мастера</span>
        <textarea
          ref={textareaRef}
          className="input place-description-input"
          value={draft}
          rows={12}
          maxLength={20000}
          placeholder="Что важно помнить об этом месте? Кто здесь живёт, что случилось, какие тайны и подсказки нужно не забыть…"
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
    </Modal>
  )
}
