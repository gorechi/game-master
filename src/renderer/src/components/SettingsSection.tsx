import type { JSX } from 'react'
import { LOCALE_CODES, LOCALE_LABELS, type LocaleCode } from '@shared/i18n'
import type { AppSettings, ThemeName } from '@shared/settings'
import type { UpdateState } from '@shared/update'
import { useI18n, useMessages } from '@renderer/i18n/LocaleProvider'
import { UpdateSection } from './UpdateSection'
import { IconCheck } from './ui/icons'

/** Английская подсказка, по которой настройку языка можно найти при любом интерфейсе. */
const LANGUAGE_HINT = 'Language'

interface SettingsSectionProps {
  settings: AppSettings
  update: UpdateState | null
  checkingUpdates: boolean
  onThemeChange: (theme: ThemeName) => void
  onLocaleChange: (locale: LocaleCode) => void
  onCheckUpdates: () => void
}

/** Содержимое страницы настроек. */
export function SettingsSection({
  settings,
  update,
  checkingUpdates,
  onThemeChange,
  onLocaleChange,
  onCheckUpdates
}: SettingsSectionProps): JSX.Element {
  const { messages: m, locale } = useI18n()

  return (
    <div className="settings">
      <section className="settings-block" aria-labelledby="settings-theme">
        <div className="settings-block__head">
          <h2 id="settings-theme">{m.settings.appearance.title}</h2>
          <p className="muted">{m.settings.appearance.description}</p>
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

      <section className="settings-block" aria-labelledby="settings-language">
        <div className="settings-block__head">
          <h2 id="settings-language">
            {m.settings.language.title}
            {locale === 'en' ? null : ` (${LANGUAGE_HINT})`}
          </h2>
          <p className="muted">{m.settings.language.description}</p>
        </div>

        <div className="language-grid" role="group" aria-label={m.settings.language.label}>
          {LOCALE_CODES.map((locale) => {
            const active = settings.locale === locale

            return (
              <button
                key={locale}
                type="button"
                className={`language-card${active ? ' language-card--active' : ''}`}
                aria-pressed={active}
                onClick={() => onLocaleChange(locale)}
              >
                <span className="language-card__name">{LOCALE_LABELS[locale]}</span>
                {active ? (
                  <span className="language-card__mark">
                    <IconCheck width={14} height={14} />
                    {m.settings.language.selected}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </section>

      <UpdateSection update={update} checking={checkingUpdates} onCheck={onCheckUpdates} />
    </div>
  )
}

interface ThemeCardProps {
  theme: ThemeName
  active: boolean
  onSelect: () => void
}

function ThemeCard({ theme, active, onSelect }: ThemeCardProps): JSX.Element {
  const m = useMessages()

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
        <span className="theme-card__name">{m.settings.themes[theme]}</span>
        <span className="theme-card__kind">
          {theme === 'dark' ? m.settings.appearance.dark : m.settings.appearance.light}
        </span>
        {active ? (
          <span className="theme-card__mark">
            <IconCheck width={14} height={14} />
            {m.settings.appearance.selected}
          </span>
        ) : null}
      </span>
    </button>
  )
}
