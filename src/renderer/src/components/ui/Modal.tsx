import { useEffect, useRef } from 'react'
import type { JSX, ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './icons'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  children?: ReactNode
  footer: ReactNode
  tone?: 'default' | 'danger'
  size?: 'md' | 'lg'
  /** Дополнительный класс панели — для форм с фиксированными размерами. */
  panelClassName?: string
  onClose: () => void
  /** Куда поставить фокус при открытии. По умолчанию — первый интерактивный элемент. */
  initialFocusRef?: RefObject<HTMLElement | null>
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])'
].join(', ')

/** Стек открытых модалок: Escape и Tab обрабатывает только верхняя. */
const modalStack: symbol[] = []

/**
 * Кастомное модальное окно: свой оверлей, панель и поведение.
 * Системные диалоги (window.confirm/alert) в приложении не используются.
 */
export function Modal({
  open,
  title,
  description,
  children,
  footer,
  tone = 'default',
  size = 'md',
  panelClassName,
  onClose,
  initialFocusRef
}: ModalProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const modalIdRef = useRef(Symbol('modal'))

  useEffect(() => {
    if (!open) return

    const modalId = modalIdRef.current
    modalStack.push(modalId)

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current

    const focusable = (): HTMLElement[] =>
      panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
            (element) => element.offsetParent !== null
          )
        : []

    const target = initialFocusRef?.current ?? focusable()[0]
    target?.focus()

    const onKeyDown = (event: KeyboardEvent): void => {
      if (modalStack[modalStack.length - 1] !== modalId) return

      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const items = focusable()
      if (items.length === 0) return

      const first = items[0]!
      const last = items[items.length - 1]!
      const active = document.activeElement

      if (event.shiftKey && (active === first || !panel?.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !panel?.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      const index = modalStack.indexOf(modalId)
      if (index !== -1) modalStack.splice(index, 1)

      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [open, initialFocusRef])

  if (!open) return null

  return createPortal(
    <div
      className="modal-overlay"
      // Закрытие по клику на подложку — только если клик пришёлся именно по ней.
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={`modal${tone === 'danger' ? ' modal--danger' : ''}${
          size === 'lg' ? ' modal--wide' : ''
        }${panelClassName ? ` ${panelClassName}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="modal__head">
          <h2 className="modal__title">{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть">
            <IconClose />
          </button>
        </header>

        {description ? <p className="modal__description">{description}</p> : null}

        {children ? <div className="modal__body">{children}</div> : null}

        <footer className="modal__footer">{footer}</footer>
      </div>
    </div>,
    document.body
  )
}
