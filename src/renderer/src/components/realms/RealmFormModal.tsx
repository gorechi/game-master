import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { Realm, RealmInput } from '@shared/realm'
import { errorMessage } from '@renderer/lib/api'
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
      setError('Укажите название сеттинга')
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
      title={realm ? 'Редактировать сеттинг' : 'Новый сеттинг'}
      description="Мир, к которому будут относиться игры, персонажи, монстры и карты."
      size="md"
      onClose={onClose}
      initialFocusRef={nameRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button type="submit" form={formId} className="button button--primary" disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить сеттинг'}
          </button>
        </>
      }
    >
      <form id={formId} className="realm-form" onSubmit={(event) => void submit(event)} noValidate>
        <label className="field">
          <span className="field__label">Название</span>
          <input
            ref={nameRef}
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
      </form>
    </Modal>
  )
}
