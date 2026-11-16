import type { JSX } from 'react'
import type { AppSettings, ThemeName } from '@shared/settings'
import type { UpdateState } from '@shared/update'
import { SettingsSection } from './SettingsSection'

interface SettingsPageProps {
  settings: AppSettings
  update: UpdateState | null
  checkingUpdates: boolean
  onThemeChange: (theme: ThemeName) => void
  onCheckUpdates: () => void
}

export function SettingsPage({
  settings,
  update,
  checkingUpdates,
  onThemeChange,
  onCheckUpdates
}: SettingsPageProps): JSX.Element {
  return (
    <main className="page">
      <div className="page__inner settings-page">
        <header className="page-head">
          <div>
            <h1>Настройки</h1>
            <p className="muted">Оформление приложения и проверка обновлений.</p>
          </div>
        </header>

        <SettingsSection
          settings={settings}
          update={update}
          checkingUpdates={checkingUpdates}
          onThemeChange={onThemeChange}
          onCheckUpdates={onCheckUpdates}
        />
      </div>
    </main>
  )
}
