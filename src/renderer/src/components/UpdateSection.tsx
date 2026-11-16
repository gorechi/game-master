import type { JSX } from 'react'
import { GITHUB_RELEASES_URL, type UpdateState, type UpdateStatus } from '@shared/update'
import { formatDate } from '../lib/format'
import { IconCheck, IconClose, IconDownload } from './ui/icons'

interface UpdateSectionProps {
  update: UpdateState | null
  checking: boolean
  onCheck: () => void
}

/** Блок настроек с состоянием проверки обновлений и ссылкой на релизы. */
export function UpdateSection({ update, checking, onCheck }: UpdateSectionProps): JSX.Element {
  const status: UpdateStatus = checking ? 'checking' : (update?.status ?? 'idle')
  const releaseUrl = update?.releaseUrl ?? GITHUB_RELEASES_URL

  return (
    <section className="settings-block" aria-labelledby="settings-updates">
      <div className="settings-block__head">
        <h2 id="settings-updates">Обновления</h2>
        <p className="muted">
          Приложение проверяет последний релиз на GitHub. Автоматической установки нет: установщик
          нужно скачать и запустить вручную.
        </p>
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
              <strong>Проверяем обновления…</strong>
              <span>Запрашиваем последний релиз на GitHub.</span>
            </>
          ) : status === 'available' ? (
            <>
              <strong>Доступна новая версия {update?.latestVersion}</strong>
              <span>
                У вас {update?.currentVersion}. Скачайте установщик на странице релизов и запустите
                его — данные и настройки сохранятся.
              </span>
            </>
          ) : status === 'latest' ? (
            <>
              <strong>У вас последняя версия</strong>
              <span>Версия {update?.currentVersion} — самая свежая.</span>
            </>
          ) : status === 'error' ? (
            <>
              <strong>Не удалось проверить обновления</strong>
              <span>{update?.error ?? 'Проверьте подключение к интернету и попробуйте снова.'}</span>
            </>
          ) : (
            <>
              <strong>Проверка ещё не выполнялась</strong>
              <span>Текущая версия {update?.currentVersion ?? '—'}.</span>
            </>
          )}
        </div>

        {status === 'available' ? (
          <a className="button button--primary" href={releaseUrl} target="_blank" rel="noreferrer">
            Страница релизов
          </a>
        ) : null}

        {status === 'error' ? (
          <a className="button" href={releaseUrl} target="_blank" rel="noreferrer">
            Проверить самому
          </a>
        ) : null}
      </div>

      <div className="update-status__foot">
        <span className="muted">
          {update?.checkedAt ? `Проверено ${formatDate(update.checkedAt)}` : 'Проверка не выполнялась'}
        </span>

        <button type="button" className="button" onClick={onCheck} disabled={checking}>
          {checking ? 'Проверяем…' : 'Проверить снова'}
        </button>
      </div>
    </section>
  )
}
