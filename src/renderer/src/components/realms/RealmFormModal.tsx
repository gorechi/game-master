import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { Realm, RealmInput } from '@shared/realm'
import { errorMessage } from '@renderer/lib/api'
import { useMessages } from '@renderer/i18n/LocaleProvider'
import { Modal } from '../ui/Modal'

interface RealmFormModalProps {
  open: boolean
  realm: Realm | null
  onClose: () => void
  onSubmit: (input: RealmInput) => Promise<void>
}

/** Создание и редактирование сеттинга. */
export function RealmFormModal({
  open,
  realm,
  onClose,
  onSubmit
}: RealmFormModalProps): JSX.Element {
  const m = useMessages()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const formId = useId()

  useEffect(() => {
    if (!open) return

    setName(realm?.name ?? '')
    setDescription(realm?.description ?? '')
    setError(null)
    setSaving(false)
    window.setTimeout(() => nameRef.current?.focus(), 0)
  }, [open, realm])

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (saving) return

    const trimmed = name.trim()
    if (!trimmed) {
      setError(m.realms.form.nameRequired)
      nameRef.current?.focus()
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSubmit({ name: trimmed, description })
      setSaving(false)
    } catch (caught) {
      setError(errorMessage(caught))
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={realm ? m.realms.form.editTitle : m.realms.form.createTitle}
      description={m.realms.form.description}
      size="md"
      onClose={onClose}
      initialFocusRef={nameRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose} disabled={saving}>
            {m.realms.form.cancel}
          </button>
          <button type="submit" form={formId} className="button button--primary" disabled={saving}>
            {saving ? m.realms.form.saving : m.realms.form.save}
          </button>
        </>
      }
    >
      <form id={formId} className="realm-form" onSubmit={(event) => void submit(event)} noValidate>
        <label className="field">
          <span className="field__label">{m.realms.form.nameLabel}</span>
          <input
            ref={nameRef}
            className="input"
            value={name}
            maxLength={100}
            placeholder={m.realms.form.namePlaceholder}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">{m.realms.form.descriptionLabel}</span>
          <textarea
            className="input realm-form__description"
            value={description}
            maxLength={2000}
            rows={4}
            placeholder={m.realms.form.descriptionPlaceholder}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        {error ? <p className="notice notice--error">{error}</p> : null}
      </form>
    </Modal>
  )
}
