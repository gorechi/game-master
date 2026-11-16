import type { JSX } from 'react'
import { GITHUB_RELEASES_URL, type UpdateState } from '@shared/update'
import { IconClose, IconDownload } from './ui/icons'

interface UpdateNoticeProps {
  update: UpdateState
  onDismiss: () => void
}

/** Всплывающее уведомление о новом релизе при запуске приложения. */
export function UpdateNotice({ update, onDismiss }: UpdateNoticeProps): JSX.Element {
  return (
    <aside className="update-notice" role="status" aria-live="polite">
      <span className="update-notice__icon" aria-hidden="true">
        <IconDownload width={20} height={20} />
      </span>

      <div className="update-notice__text">
        <strong>Доступна новая версия {update.latestVersion}</strong>
        <span>У вас {update.currentVersion}. Установщик можно скачать на странице релизов.</span>
      </div>

      <a
        className="button button--primary update-notice__link"
        href={update.releaseUrl ?? GITHUB_RELEASES_URL}
        target="_blank"
        rel="noreferrer"
      >
        Страница релизов
      </a>

      <button
        type="button"
        className="icon-button update-notice__close"
        title="Скрыть уведомление"
        aria-label="Скрыть уведомление о новой версии"
        onClick={onDismiss}
      >
        <IconClose width={15} height={15} />
      </button>
    </aside>
  )
}
