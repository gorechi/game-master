import { useRef } from 'react'
import type { JSX } from 'react'
import { useMessages } from '@renderer/i18n/LocaleProvider'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/** Кастомное подтверждение действия — замена window.confirm. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}: ConfirmDialogProps): JSX.Element {
  const m = useMessages()
  const cancelText = cancelLabel ?? m.ui.confirm.cancel
  const confirmText = confirmLabel ?? m.ui.confirm.confirm
  const cancelRef = useRef<HTMLButtonElement>(null)

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      tone="danger"
      onClose={onCancel}
      // Фокус на «Отмене»: разрушительное действие не должно сработать по Enter.
      initialFocusRef={cancelRef}
      footer={
        <>
          <button ref={cancelRef} type="button" className="button" onClick={onCancel}>
            {cancelText}
          </button>
          <button type="button" className="button button--danger-solid" onClick={onConfirm}>
            {confirmText}
          </button>
        </>
      }
    />
  )
}
