import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { AppInfo } from '@shared/api'
import { themeLabels, type AppSettings, type ThemeName } from '@shared/settings'
import { api, errorMessage, isWebPreview } from '@renderer/lib/api'
import { IconCheck } from './ui/icons'

interface SettingsSectionProps {
  settings: AppSettings
  onThemeChange: (theme: ThemeName) => void
}

const PLATFORM_LABELS: Record<AppInfo['platform'], string> = {
  win32: 'Windows',
  darwin: 'macOS',
  linux: 'Linux',
  other: 'Веб-предпросмотр'
}

/** Содержимое страницы настроек. */
export function SettingsSection({
  settings,
  onThemeChange
}: SettingsSectionProps): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void api.app
      .info()
      .then((value) => {
        if (!cancelled) setInfo(value)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught))
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="settings">
      <section className="settings-block" aria-labelledby="settings-theme">
        <div className="settings-block__head">
          <h2 id="settings-theme">Оформление</h2>
          <p className="muted">Тема применяется сразу и запоминается между запусками.</p>
        </div>

        <div className="theme-grid">
          {(['dark', 'light'] as const).map((theme) => (
            <ThemeCard
              key={theme}
              theme={theme}
              active={settings.theme === theme}
              onSelect={() => onThemeChange(theme)}
            />
          ))}
        </div>
      </section>

      <section className="settings-block" aria-labelledby="settings-about">
        <div className="settings-block__head">
          <h2 id="settings-about">Приложение</h2>
          <p className="muted">
            Игры, игроки, персонажи и монстры хранятся обычными JSON-файлами — их можно
            скопировать или положить в систему контроля версий.
          </p>
        </div>

        {error ? <p className="notice notice--error">{error}</p> : null}

        <dl className="info-list">
          <div className="info-list__row">
            <dt>Версия</dt>
            <dd>{info?.version ?? '…'}</dd>
          </div>
          <div className="info-list__row">
            <dt>Платформа</dt>
            <dd>{info ? PLATFORM_LABELS[info.platform] : isWebPreview ? 'Веб-предпросмотр' : '…'}</dd>
          </div>
          <div className="info-list__row">
            <dt>Electron</dt>
            <dd>{info?.electron ?? '…'}</dd>
          </div>
          <div className="info-list__row">
            <dt>Данные</dt>
            <dd className="info-list__path">
              {isWebPreview ? 'localStorage браузера' : (info?.dataDir ?? '…')}
            </dd>
          </div>
        </dl>

        {!isWebPreview ? (
          <div className="settings-block__actions">
            <button className="button" onClick={() => void api.app.openDataFolder()}>
              Открыть папку с данными
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}

interface ThemeCardProps {
  theme: ThemeName
  active: boolean
  onSelect: () => void
}

function ThemeCard({ theme, active, onSelect }: ThemeCardProps): JSX.Element {
  return (
    <button
      type="button"
      className={`theme-card${active ? ' theme-card--active' : ''}`}
      aria-pressed={active}
      onClick={onSelect}
    >
      <span className={`theme-preview theme-preview--${theme}`} aria-hidden="true">
        <span className="theme-preview__topbar" />
        <span className="theme-preview__title" />
        <span className="theme-preview__line" />
        <span className="theme-preview__line theme-preview__line--short" />
        <span className="theme-preview__chip" />
      </span>

      <span className="theme-card__row">
        <span className="theme-card__name">{themeLabels[theme]}</span>
        <span className="theme-card__kind">{theme === 'dark' ? 'тёмная' : 'светлая'}</span>
        {active ? (
          <span className="theme-card__mark">
            <IconCheck width={14} height={14} />
            выбрана
          </span>
        ) : null}
      </span>
    </button>
  )
}
