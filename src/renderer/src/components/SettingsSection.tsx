import type { JSX } from 'react'
import { themeLabels, type AppSettings, type ThemeName } from '@shared/settings'
import { IconCheck } from './ui/icons'

interface SettingsSectionProps {
  settings: AppSettings
  onThemeChange: (theme: ThemeName) => void
}

/** Содержимое страницы настроек. */
export function SettingsSection({
  settings,
  onThemeChange
}: SettingsSectionProps): JSX.Element {
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
