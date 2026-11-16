import { useState } from 'react'
import type { JSX, KeyboardEvent } from 'react'
import { useI18n } from '@renderer/i18n/LocaleProvider'

const STATUS_SUGGESTIONS = [
  'wounded',
  'poisoned',
  'cursed',
  'wanted',
  'hiding',
  'blessed',
  'exhausted',
  'dead'
] as const

const MAX_STATUSES = 12

interface StatusFieldProps {
  value: string[]
  onChange: (statuses: string[]) => void
}

/** Редактор статусов: чипы, подсказки и ввод по Enter/запятой. */
export function StatusField({ value, onChange }: StatusFieldProps): JSX.Element {
  const { messages: m, fill } = useI18n()
  const [draft, setDraft] = useState('')
  const suggestions = STATUS_SUGGESTIONS.map((status) => m.people.statusField.suggestions[status])

  function addStatus(raw: string): void {
    const status = raw.trim().replace(/,$/, '')
    if (!status) return

    if (value.includes(status)) {
      setDraft('')
      return
    }

    onChange(
      value.length >= MAX_STATUSES ? value : [...value, status.slice(0, 40)]
    )
    setDraft('')
  }

  function removeStatus(status: string): void {
    onChange(value.filter((item) => item !== status))
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addStatus(draft)
      return
    }
    if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="field">
      <span className="field__label">{m.people.statusField.label}</span>

      <div className="tags-field">
        {value.length > 0 ? (
          <div className="tags-field__chips">
            {value.map((status) => (
              <span key={status} className="tags-field__chip">
                {status}
                <button
                  type="button"
                  onClick={() => removeStatus(status)}
                  aria-label={fill(m.people.statusField.removeAria, { status })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <input
          className="input"
          value={draft}
          maxLength={40}
          placeholder={
            value.length >= MAX_STATUSES
              ? fill(m.people.statusField.limitReached, { count: MAX_STATUSES })
              : m.people.statusField.placeholder
          }
          disabled={value.length >= MAX_STATUSES}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) addStatus(draft)
          }}
        />
      </div>

      <div className="tags-field__suggestions">
        {suggestions
          .filter((status) => !value.includes(status))
          .map((status) => (
            <button
              key={status}
              type="button"
              className="tags-field__suggestion"
              onClick={() => addStatus(status)}
            >
              + {status}
            </button>
          ))}
      </div>
    </div>
  )
}
