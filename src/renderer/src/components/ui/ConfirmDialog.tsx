import { useRef } from 'react'
import type { JSX } from 'react'
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
  confirmLabel = 'Удалить',
  cancelLabel = 'Отмена',
  onConfirm,
  onCancel
}: ConfirmDialogProps): JSX.Element {
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
            {cancelLabel}
          </button>
          <button type="button" className="button button--danger-solid" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    />
  )
}
