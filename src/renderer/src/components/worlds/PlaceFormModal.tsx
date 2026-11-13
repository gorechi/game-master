import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { WorldPlace } from '@shared/world'
import { Modal } from '../ui/Modal'

interface PlaceFormModalProps {
  open: boolean
  place: WorldPlace | null
  /** Все остальные места сеттинга — с ними можно соединить путь. */
  otherPlaces: readonly WorldPlace[]
  /** Места, уже связанные с этим (пути симметричны). */
  connectedIds: readonly string[]
  onClose: () => void
  onSave: (input: { name: string; isExit: boolean; connectedIds: string[] }) => void
}

/** Редактирование места: имя, признак выхода и пути к другим местам. */
export function PlaceFormModal({
  open,
  place,
  otherPlaces,
  connectedIds,
  onClose,
  onSave
}: PlaceFormModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [isExit, setIsExit] = useState(false)
  const [connections, setConnections] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const formId = useId()

  useEffect(() => {
    if (!open || !place) return

    setName(place.name)
    setIsExit(place.isExit)
    setConnections([...connectedIds])
    setError(null)
    window.setTimeout(() => nameRef.current?.focus(), 0)
  }, [open, place])

  function toggleConnection(id: string): void {
    setConnections((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  function submit(event: FormEvent): void {
    event.preventDefault()
    const trimmed = name.trim()

    if (!trimmed) {
      setError('Укажите название места')
      nameRef.current?.focus()
      return
    }

    onSave({ name: trimmed, isExit, connectedIds: connections })
  }

  return (
    <Modal
      open={open}
      title={place ? 'Место' : 'Новое место'}
      description="Название, выход из сеттинга и пути к другим местам. Путь всегда двусторонний."
      size="md"
      onClose={onClose}
      initialFocusRef={nameRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" form={formId} className="button button--primary">
            Сохранить место
          </button>
        </>
      }
    >
      <form id={formId} className="world-place-editor" onSubmit={submit} noValidate>
        <label className="field">
          <span className="field__label">Название места</span>
          <input
            ref={nameRef}
            className="input"
            value={name}
            maxLength={100}
            placeholder="Таверна «Пьяный гоблин»"
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="world-exit-toggle">
          <input
            type="checkbox"
            className="checkbox"
            checked={isExit}
            onChange={(event) => setIsExit(event.target.checked)}
          />
          <span>
            <strong>Выход из сеттинга</strong>
            <small>Место, через которое можно покинуть это пространство.</small>
          </span>
        </label>

        <section className="world-connection-section">
          <header className="editor-section__head">
            <h3>Пути</h3>
            <span className="editor-section__count">выбрано {connections.length}</span>
          </header>

          {otherPlaces.length === 0 ? (
            <p className="notice">
              В сеттинге пока нет других мест. Добавьте их, чтобы проложить пути.
            </p>
          ) : (
            <div className="world-connection-list">
              {otherPlaces.map((other) => {
                const checked = connections.includes(other.id)

                return (
                  <label
                    key={other.id}
                    className={`world-connection-row${checked ? ' world-connection-row--on' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={checked}
                      onChange={() => toggleConnection(other.id)}
                    />
                    <span className="world-connection-row__name">{other.name}</span>
                    {other.isExit ? <span className="world-badge">Выход</span> : null}
                  </label>
                )
              })}
            </div>
          )}
        </section>

        {error ? <p className="notice notice--error">{error}</p> : null}
      </form>
    </Modal>
  )
}
