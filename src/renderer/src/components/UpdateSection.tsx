import type { JSX } from 'react'
import { GITHUB_RELEASES_URL, type UpdateState, type UpdateStatus } from '@shared/update'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { IconCheck, IconClose, IconDownload } from './ui/icons'

interface UpdateSectionProps {
  update: UpdateState | null
  checking: boolean
  onCheck: () => void
}

/** Блок настроек с состоянием проверки обновлений и ссылкой на релизы. */
export function UpdateSection({ update, checking, onCheck }: UpdateSectionProps): JSX.Element {
  const { messages: m, fill, formatDate } = useI18n()
  const status: UpdateStatus = checking ? 'checking' : (update?.status ?? 'idle')
  const releaseUrl = update?.releaseUrl ?? GITHUB_RELEASES_URL

  return (
    <section className="settings-block" aria-labelledby="settings-updates">
      <div className="settings-block__head">
        <h2 id="settings-updates">{m.updates.section.title}</h2>
        <p className="muted">{m.updates.section.description}</p>
      </div>

      <div className={`update-status update-status--${status}`}>
        <span className="update-status__icon" aria-hidden="true">
          {status === 'available' ? (
            <IconDownload width={19} height={19} />
          ) : status === 'latest' ? (
            <IconCheck width={19} height={19} />
          ) : status === 'error' ? (
            <IconClose width={17} height={17} />
          ) : (
            <IconDownload width={19} height={19} />
          )}
        </span>

        <div className="update-status__text">
          {status === 'checking' ? (
            <>
              <strong>{m.updates.section.checkingTitle}</strong>
              <span>{m.updates.section.checkingHint}</span>
            </>
          ) : status === 'available' ? (
            <>
              <strong>
                {fill(m.updates.section.availableTitle, {
                  version: update?.latestVersion ?? ''
                })}
              </strong>
              <span>
                {fill(m.updates.section.availableHint, {
                  current: update?.currentVersion ?? ''
                })}
              </span>
            </>
          ) : status === 'latest' ? (
            <>
              <strong>{m.updates.section.latestTitle}</strong>
              <span>
                {fill(m.updates.section.latestHint, { version: update?.currentVersion ?? '' })}
              </span>
            </>
          ) : status === 'error' ? (
            <>
              <strong>{m.updates.section.errorTitle}</strong>
              <span>{update?.error ?? m.updates.section.errorHint}</span>
            </>
          ) : (
            <>
              <strong>{m.updates.section.idleTitle}</strong>
              <span>
                {fill(m.updates.section.idleHint, { version: update?.currentVersion ?? '—' })}
              </span>
            </>
          )}
        </div>

        {status === 'available' ? (
          <a className="button button--primary" href={releaseUrl} target="_blank" rel="noreferrer">
            {m.updates.section.releases}
          </a>
        ) : null}

        {status === 'error' ? (
          <a className="button" href={releaseUrl} target="_blank" rel="noreferrer">
            {m.updates.section.checkYourself}
          </a>
        ) : null}
      </div>

      <div className="update-status__foot">
        <span className="muted">
          {update?.checkedAt
            ? fill(m.updates.section.checkedAt, { date: formatDate(update.checkedAt) })
            : m.updates.section.notChecked}
        </span>

        <button type="button" className="button" onClick={onCheck} disabled={checking}>
          {checking ? m.updates.section.checking : m.updates.section.checkAgain}
        </button>
      </div>
    </section>
  )
}
