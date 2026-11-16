import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, JSX, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useMessages } from '@renderer/i18n/LocaleProvider'
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
  /** Разрешает вводить текст в поле и фильтрует варианты по подстроке. */
  searchable?: boolean
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
  placeholder,
  variant = 'field',
  disabled = false,
  searchable = false
}: SelectProps<T>): JSX.Element {
  const m = useMessages()
  const placeholderText = placeholder ?? m.ui.select.placeholder
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [query, setQuery] = useState('')
  const [placement, setPlacement] = useState<'down' | 'up'>('down')
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const selected = options.find((option) => option.value === value)
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleOptions = normalizedQuery
    ? options.filter((option) => option.label.toLocaleLowerCase().includes(normalizedQuery))
    : options

  function updatePlacement(): void {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return

    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth

    // Меню не должно вылезать за прокручиваемую область модалки или другой контейнер.
    let boundary: DOMRect | null = null
    let node = rootRef.current?.parentElement ?? null

    while (node && node !== document.body) {
      const style = window.getComputedStyle(node)
      if (
        node.classList.contains('modal__body') ||
        /(auto|scroll)/.test(style.overflowY)
      ) {
        boundary = node.getBoundingClientRect()
        break
      }
      node = node.parentElement
    }

    const boundsTop = boundary?.top ?? 0
    const boundsBottom = boundary?.bottom ?? viewportHeight
    const boundsLeft = boundary?.left ?? 0
    const boundsRight = boundary?.right ?? viewportWidth
    const spaceBelow = boundsBottom - rect.bottom
    const spaceAbove = rect.top - boundsTop
    const next = spaceBelow < 280 && spaceAbove > spaceBelow ? 'up' : 'down'
    const available = next === 'down' ? spaceBelow : spaceAbove

    setPlacement(next)
    setMenuStyle({
      left: Math.max(boundsLeft + 8, Math.min(rect.left, boundsRight - rect.width - 8)),
      minWidth: rect.width,
      maxWidth: Math.max(
        220,
        Math.min(440, boundsRight - rect.left - 8, viewportWidth - rect.left - 8)
      ),
      maxHeight: Math.max(120, Math.min(260, available - 8)),
      ...(next === 'down'
        ? { top: rect.bottom + 6 }
        : { bottom: viewportHeight - rect.top + 6 })
    })
  }

  useEffect(() => {
    if (!open) return

    const reposition = (): void => updatePlacement()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)

    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open])

  function closeMenu(): void {
    setOpen(false)
    setQuery('')
  }

  function openMenu(): void {
    if (disabled || options.length === 0) return

    updatePlacement()
    setQuery('')
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)))
    setOpen(true)
  }

  function choose(option: SelectOption<T>): void {
    onChange(option.value)
    closeMenu()
  }

  function filter(raw: string): void {
    setQuery(raw)
    setActiveIndex(0)

    if (!open) {
      updatePlacement()
      setOpen(true)
    }
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
        closeMenu()
        break
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => (index + 1) % visibleOptions.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => (index - 1 + visibleOptions.length) % visibleOptions.length)
        break
      case 'Enter':
      case ' ': {
        event.preventDefault()
        const option = visibleOptions[activeIndex]
        if (option) choose(option)
        break
      }
      case 'Tab':
        closeMenu()
        break
      default:
        break
    }
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        closeMenu()
        break
      case 'ArrowDown':
        event.preventDefault()
        if (!open) {
          openMenu()
        } else if (visibleOptions.length > 0) {
          setActiveIndex((index) => (index + 1) % visibleOptions.length)
        }
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!open) {
          openMenu()
        } else if (visibleOptions.length > 0) {
          setActiveIndex((index) => (index - 1 + visibleOptions.length) % visibleOptions.length)
        }
        break
      case 'Enter': {
        event.preventDefault()
        const option = visibleOptions[activeIndex]
        if (option) choose(option)
        break
      }
      case 'Tab':
        closeMenu()
        break
      default:
        break
    }
  }

  return (
    <div
      ref={rootRef}
      className={`picker picker--${variant}${open ? ' picker--open' : ''}${
        searchable ? ' picker--searchable' : ''
      }`}
    >
      {searchable ? (
        <>
          <input
            ref={inputRef}
            type="text"
            className="picker__trigger picker__input"
            role="combobox"
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && visibleOptions[activeIndex]
                ? `${listId}-${activeIndex}`
                : undefined
            }
            autoComplete="off"
            disabled={disabled}
            placeholder={placeholderText}
            value={open ? query : (selected?.label ?? '')}
            onChange={(event) => filter(event.target.value)}
            onFocus={() => {
              if (!open) openMenu()
            }}
            onClick={() => {
              if (!open) openMenu()
            }}
            onKeyDown={onInputKeyDown}
          />
          <IconChevronDown
            className="picker__chevron picker__chevron--floating"
            width={14}
            height={14}
          />
        </>
      ) : (
        <button
          type="button"
          className="picker__trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={() => (open ? closeMenu() : openMenu())}
          onKeyDown={onKeyDown}
        >
          <span className={selected ? 'picker__value' : 'picker__placeholder'}>
            {selected?.label ?? placeholderText}
          </span>
          <IconChevronDown className="picker__chevron" width={14} height={14} />
        </button>
      )}

      {open
        ? createPortal(
            <ul
              ref={menuRef}
              id={listId}
              className={`picker__menu picker__menu--${placement} picker__menu--portal`}
              style={menuStyle}
              role="listbox"
              aria-label={ariaLabel}
            >
              {visibleOptions.length === 0 ? (
                <li className="picker__empty">{m.ui.select.empty}</li>
              ) : (
                visibleOptions.map((option, index) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      id={`${listId}-${index}`}
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
                ))
              )}
            </ul>,
            document.body
          )
        : null}
    </div>
  )
}
