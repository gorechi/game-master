import type { JSX } from 'react'
import type { LocaleCode } from '@shared/i18n'
import type { AppSettings, ThemeName } from '@shared/settings'
import type { UpdateState } from '@shared/update'
import { useMessages } from '@renderer/i18n/LocaleProvider'
import { SettingsSection } from './SettingsSection'

interface SettingsPageProps {
  settings: AppSettings
  update: UpdateState | null
  checkingUpdates: boolean
  onThemeChange: (theme: ThemeName) => void
  onLocaleChange: (locale: LocaleCode) => void
  onCheckUpdates: () => void
}

export function SettingsPage({
  settings,
  update,
  checkingUpdates,
  onThemeChange,
  onLocaleChange,
  onCheckUpdates
}: SettingsPageProps): JSX.Element {
  const m = useMessages()

  return (
    <main className="page">
      <div className="page__inner settings-page">
        <header className="page-head">
          <div>
            <h1>{m.settings.title}</h1>
            <p className="muted">{m.settings.description}</p>
          </div>
        </header>

        <SettingsSection
          settings={settings}
          update={update}
          checkingUpdates={checkingUpdates}
          onThemeChange={onThemeChange}
          onLocaleChange={onLocaleChange}
          onCheckUpdates={onCheckUpdates}
        />
      </div>
    </main>
  )
}
