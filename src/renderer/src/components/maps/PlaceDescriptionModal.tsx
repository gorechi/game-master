import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { errorMessage } from '@renderer/lib/api'
import { useMessages } from '@renderer/i18n/LocaleProvider'
import { Modal } from '../ui/Modal'

interface PlaceDescriptionModalProps {
  open: boolean
  placeName: string
  value: string
  onClose: () => void
  onSave: (value: string) => void | Promise<void>
}

/** Большой редактор заметок и описания места. */
export function PlaceDescriptionModal({
  open,
  placeName,
  value,
  onClose,
  onSave
}: PlaceDescriptionModalProps): JSX.Element {
  const m = useMessages()
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    setDraft(value)
    setSaving(false)
    setError(null)
  }, [open, value])

  async function save(): Promise<void> {
    if (saving) return

    setSaving(true)
    setError(null)

    try {
      await onSave(draft)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={m.maps.description.title}
      description={placeName}
      size="lg"
      onClose={onClose}
      initialFocusRef={textareaRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose} disabled={saving}>
            {m.maps.description.cancel}
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? m.maps.description.saving : m.maps.description.save}
          </button>
        </>
      }
    >
      {error ? <p className="notice notice--error">{error}</p> : null}

      <label className="field">
        <span className="field__label">{m.maps.description.notesLabel}</span>
        <textarea
          ref={textareaRef}
          className="input place-description-input"
          value={draft}
          rows={12}
          maxLength={20000}
          placeholder={m.maps.description.notesPlaceholder}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
    </Modal>
  )
}
