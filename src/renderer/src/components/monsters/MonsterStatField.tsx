import type { JSX } from 'react'
import { clampMonsterScore, formatModifier, modifierFromScore } from '@shared/domain'

interface MonsterStatFieldProps {
  label: string
  short: string
  value: string
  onChange: (value: string) => void
  onCommit: () => void
}

/**
 * Характеристика монстра: значение 1–30 вводится вручную, модификатор
 * floor((x − 10) / 2) пересчитывается автоматически и не редактируется.
 */
export function MonsterStatField({
  label,
  short,
  value,
  onChange,
  onCommit
}: MonsterStatFieldProps): JSX.Element {
  const parsed = Number.parseInt(value, 10)
  const score = Number.isFinite(parsed) ? clampMonsterScore(parsed) : 10
  const modifier = modifierFromScore(score)

  return (
    <label className="monster-stat-field" title={label}>
      <span className="monster-stat-field__label">{short}</span>
      <span className="monster-stat-field__frame">
        <span className="monster-stat-field__modifier" aria-live="polite">
          {formatModifier(modifier)}
        </span>
        <input
          className="monster-stat-field__input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={2}
          aria-label={`${label}: значение от 1 до 30`}
          value={value}
          onChange={(event) =>
            onChange(event.target.value.replace(/\D/g, '').slice(0, 2))
          }
          onBlur={onCommit}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            onCommit()
          }}
        />
      </span>
    </label>
  )
}
