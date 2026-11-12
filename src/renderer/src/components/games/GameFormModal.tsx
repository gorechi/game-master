import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { Game } from '@shared/game'
import { api, errorMessage } from '@renderer/lib/api'
import { Modal } from '../ui/Modal'

interface GameFormModalProps {
  open: boolean
  game: Game | null
  onClose: () => void
  onSaved: (game: Game) => void
}

/** Пока только название: остальные поля появятся вместе с формами игры. */
export function GameFormModal({ open, game, onClose, onSaved }: GameFormModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const formId = useId()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    setName(game?.name ?? '')
    setError(null)
    setSaving(false)
  }, [open, game])

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (saving) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Укажите название игры')
      nameRef.current?.focus()
      return
    }

    setSaving(true)
    setError(null)

    try {
      const saved = game
        ? await api.games.update({ ...game, name: trimmedName })
        : await api.games.create({ name: trimmedName })
      onSaved(saved)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={game ? 'Редактировать игру' : 'Новая игра'}
      description="Название партии. Остальные поля и режим проведения появятся в следующих шагах."
      onClose={onClose}
      initialFocusRef={nameRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button
            type="submit"
            form={formId}
            className="button button--primary"
            disabled={saving || !name.trim()}
          >
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </>
      }
    >
      <form id={formId} className="game-form" noValidate onSubmit={(event) => void submit(event)}>
        <label className="field">
          <span className="field__label">Название игры</span>
          <input
            ref={nameRef}
            className="input"
            value={name}
            maxLength={120}
            placeholder="Проклятие Страда"
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        {error ? <p className="notice notice--error">{error}</p> : null}
      </form>
    </Modal>
  )
}
