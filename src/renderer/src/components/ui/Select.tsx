import { useEffect, useRef, useState } from 'react'
import type { JSX, KeyboardEvent } from 'react'
import { IconChevronDown } from './icons'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectProps<T extends string> {
  value: T | ''
  options: readonly SelectOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  placeholder?: string
  variant?: 'field' | 'chip'
  disabled?: boolean
}

/**
 * Кастомный выпадающий список. Системный <select> не используется:
 * его меню рисует ОС, а в приложении все элементы интерфейса свои.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = 'Выбрать',
  variant = 'field',
  disabled = false
}: SelectProps<T>): JSX.Element {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [placement, setPlacement] = useState<'down' | 'up'>('down')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const selected = options.find((option) => option.value === value)

  function openMenu(): void {
    if (disabled || options.length === 0) return

    const rect = rootRef.current?.getBoundingClientRect()
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom
      setPlacement(spaceBelow < 280 && rect.top > spaceBelow ? 'up' : 'down')
    }

    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)))
    setOpen(true)
  }

  function choose(option: SelectOption<T>): void {
    onChange(option.value)
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (!open) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault()
        openMenu()
      }
      return
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        break
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => (index + 1) % options.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => (index - 1 + options.length) % options.length)
        break
      case 'Enter':
      case ' ': {
        event.preventDefault()
        const option = options[activeIndex]
        if (option) choose(option)
        break
      }
      case 'Tab':
        setOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div
      ref={rootRef}
      className={`picker picker--${variant}${open ? ' picker--open' : ''}`}
    >
      <button
        type="button"
        className="picker__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className={selected ? 'picker__value' : 'picker__placeholder'}>
          {selected?.label ?? placeholder}
        </span>
        <IconChevronDown className="picker__chevron" width={14} height={14} />
      </button>

      {open ? (
        <ul
          className={`picker__menu picker__menu--${placement}`}
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option, index) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={[
                  'picker__option',
                  index === activeIndex ? 'picker__option--active' : '',
                  option.value === value ? 'picker__option--selected' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                onPointerEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
