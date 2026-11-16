import type { JSX } from 'react'
import { GITHUB_RELEASES_URL, type UpdateState } from '@shared/update'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { IconClose, IconDownload } from './ui/icons'

interface UpdateNoticeProps {
  update: UpdateState
  onDismiss: () => void
}

/** Всплывающее уведомление о новом релизе при запуске приложения. */
export function UpdateNotice({ update, onDismiss }: UpdateNoticeProps): JSX.Element {
  const { messages: m, fill } = useI18n()

  return (
    <aside className="update-notice" role="status" aria-live="polite">
      <span className="update-notice__icon" aria-hidden="true">
        <IconDownload width={20} height={20} />
      </span>

      <div className="update-notice__text">
        <strong>
          {fill(m.updates.notice.available, { version: update.latestVersion ?? '' })}
        </strong>
        <span>{fill(m.updates.notice.hint, { current: update.currentVersion })}</span>
      </div>

      <a
        className="button button--primary update-notice__link"
        href={update.releaseUrl ?? GITHUB_RELEASES_URL}
        target="_blank"
        rel="noreferrer"
      >
        {m.updates.notice.releases}
      </a>

      <button
        type="button"
        className="icon-button update-notice__close"
        title={m.updates.notice.dismiss}
        aria-label={m.updates.notice.dismissLabel}
        onClick={onDismiss}
      >
        <IconClose width={15} height={15} />
      </button>
    </aside>
  )
}
