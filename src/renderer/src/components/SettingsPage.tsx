import type { JSX } from 'react'
import type { AppSettings, ThemeName } from '@shared/settings'
import { SettingsSection } from './SettingsSection'

interface SettingsPageProps {
  settings: AppSettings
  onThemeChange: (theme: ThemeName) => void
}

export function SettingsPage({ settings, onThemeChange }: SettingsPageProps): JSX.Element {
  return (
    <main className="page">
      <div className="page__inner settings-page">
        <header className="page-head">
          <div>
            <h1>Настройки</h1>
            <p className="muted">Оформление приложения и сведения о данных.</p>
          </div>
        </header>

        <SettingsSection settings={settings} onThemeChange={onThemeChange} />
      </div>
    </main>
  )
}
