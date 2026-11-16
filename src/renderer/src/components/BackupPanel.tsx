import { useEffect, useState } from 'react'
import type { DragEvent, JSX } from 'react'
import {
  AUTO_BACKUP_KEEP_COUNT,
  BACKUP_EXTENSION,
  BACKUP_FREQUENCIES,
  backupFileSchema,
  countBackup,
  getBackupFrequencyLabels,
  type BackupFileSelection,
  type BackupFrequency,
  type BackupRestoreResult,
  type BackupSettings
} from '@shared/backup'
import { type Messages, type PluralForms, type LocaleCode } from '@shared/i18n'
import { api, errorMessage, isWebPreview } from '@renderer/lib/api'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Select } from './ui/Select'

interface BackupPanelProps {
  onRestored: () => Promise<void> | void
}

function describeBackupCounts(
  counts: BackupFileSelection['counts'],
  messages: Messages['backup'],
  pluralize: (count: number, forms: PluralForms) => string
): string {
  const parts: string[] = []

  if (counts.games > 0) parts.push(pluralize(counts.games, messages.panel.plural.games))
  if (counts.maps > 0) parts.push(pluralize(counts.maps, messages.panel.plural.maps))
  if (counts.monsters > 0) {
    parts.push(pluralize(counts.monsters, messages.panel.plural.monsters))
  }
  if (counts.gameMonsters > 0) {
    parts.push(pluralize(counts.gameMonsters, messages.panel.plural.uniqueMonsters))
  }
  if (counts.characters > 0) {
    parts.push(pluralize(counts.characters, messages.panel.plural.characters))
  }
  if (counts.players > 0) {
    parts.push(pluralize(counts.players, messages.panel.plural.players))
  }
  if (counts.realms > 0) parts.push(pluralize(counts.realms, messages.panel.plural.realms))
  if (counts.placeTypes > 0) {
    parts.push(pluralize(counts.placeTypes, messages.panel.plural.placeTypes))
  }

  return parts.length > 0 ? parts.join(' · ') : messages.panel.noUserData
}

function formatDateTime(value: string, locale: LocaleCode): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date)
}

export function BackupPanel({ onRestored }: BackupPanelProps): JSX.Element {
  const { messages: m, fill, plural, locale } = useI18n()
  const [settings, setSettings] = useState<BackupSettings | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)

  const [savingManual, setSavingManual] = useState(false)
  const [manualNotice, setManualNotice] = useState<string | null>(null)
  const [backupDraft, setBackupDraft] = useState<BackupFileSelection | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [restoreResult, setRestoreResult] = useState<BackupRestoreResult | null>(null)

  useEffect(() => {
    let cancelled = false

    void api.backup
      .getSettings()
      .then((value) => {
        if (!cancelled) setSettings(value)
      })
      .catch((error: unknown) => {
        if (!cancelled) setSettingsError(errorMessage(error))
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function saveManual(): Promise<void> {
    setSavingManual(true)
    setManualNotice(null)
    setImportError(null)

    try {
      const result = await api.backup.saveManual()
      if (result) {
        setManualNotice(
          fill(m.backup.panel.savedNotice, {
            fileName: result.fileName,
            counts: describeBackupCounts(result.counts, m.backup, plural)
          })
        )
      }
    } catch (error) {
      setImportError(errorMessage(error))
    } finally {
      setSavingManual(false)
    }
  }

  function acceptBackup(draft: BackupFileSelection): void {
    setBackupDraft(draft)
    setImportError(null)
    setRestoreResult(null)
    setManualNotice(null)
  }

  async function chooseFile(): Promise<void> {
    setImportError(null)

    try {
      const file = await api.backup.chooseFile()
      if (file) acceptBackup(file)
    } catch (error) {
      setImportError(errorMessage(error))
    }
  }

  async function readDroppedFile(file: File): Promise<void> {
    if (file.size > 512 * 1024 * 1024) {
      throw new Error(m.backup.panel.errors.tooLarge)
    }

    const text = await file.text()
    let json: unknown

    try {
      json = JSON.parse(text) as unknown
    } catch {
      throw new Error(m.backup.panel.errors.notJson)
    }

    const parsed = backupFileSchema.safeParse(json)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      const where = first?.path.length ? ` (${first.path.join('.')})` : ''
      throw new Error(
        fill(m.backup.panel.errors.invalidBackup, {
          where,
          reason: first?.message ?? m.backup.panel.errors.unknown
        })
      )
    }

    const backup = parsed.data
    acceptBackup({
      fileName: file.name,
      backup,
      createdAt: backup.createdAt,
      ...(backup.appVersion ? { appVersion: backup.appVersion } : {}),
      theme: backup.data.settings.theme,
      counts: countBackup(backup)
    })
  }

  async function handleDrop(event: DragEvent<HTMLButtonElement>): Promise<void> {
    event.preventDefault()
    setDragging(false)

    const file = event.dataTransfer.files[0]
    if (!file) return

    setImportError(null)

    try {
      await readDroppedFile(file)
    } catch (error) {
      setImportError(errorMessage(error))
    }
  }

  async function restoreBackup(): Promise<void> {
    if (!backupDraft) return

    setRestoring(true)
    setImportError(null)
    setRestoreResult(null)

    try {
      const result = await api.backup.restore({ backup: backupDraft.backup })
      setRestoreResult(result)
      setBackupDraft(null)

      try {
        await onRestored()
      } catch (error) {
        setImportError(
          fill(m.backup.panel.refreshFailed, { error: errorMessage(error) })
        )
      }
    } catch (error) {
      setImportError(errorMessage(error))
    } finally {
      setRestoring(false)
    }
  }

  async function chooseFolder(): Promise<void> {
    if (isWebPreview) return

    setSavingSettings(true)
    setSettingsError(null)

    try {
      const folder = await api.backup.chooseFolder()
      if (folder) {
        setSettings(await api.backup.updateSettings({ folderPath: folder }))
      }
    } catch (error) {
      setSettingsError(errorMessage(error))
    } finally {
      setSavingSettings(false)
    }
  }

  async function changeFrequency(frequency: BackupFrequency): Promise<void> {
    setSavingSettings(true)
    setSettingsError(null)

    try {
      setSettings(await api.backup.updateSettings({ frequency }))
    } catch (error) {
      setSettingsError(errorMessage(error))
    } finally {
      setSavingSettings(false)
    }
  }

  const frequencyOptions = BACKUP_FREQUENCIES.map((value) => ({
    value,
    label: getBackupFrequencyLabels()[value]
  }))

  return (
    <>
      <div className="data-layout">
        <section className="data-panel" aria-labelledby="backup-manual-title">
          <div className="data-panel__head">
            <div>
              <h2 id="backup-manual-title">{m.backup.panel.manualTitle}</h2>
              <p className="muted">{m.backup.panel.manualDescription}</p>
            </div>
          </div>

          <div className="data-panel__actions data-panel__actions--start">
            <button
              type="button"
              className="button button--primary"
              onClick={() => void saveManual()}
              disabled={savingManual}
            >
              {savingManual ? m.backup.panel.creating : m.backup.panel.create}
            </button>
          </div>

          {manualNotice ? <p className="notice notice--success">{manualNotice}</p> : null}

          <div className="data-panel__divider" />

          <div className="data-panel__head">
            <div>
              <h3 className="data-panel__subtitle">{m.backup.panel.restoreTitle}</h3>
              <p className="muted">{m.backup.panel.restoreDescription}</p>
            </div>
          </div>

          {importError ? <p className="notice notice--error">{importError}</p> : null}
          {restoreResult ? (
            <p className="notice notice--success">
              {fill(m.backup.panel.restoredNotice, {
                fileName: restoreResult.safetyBackupFileName
              })}
            </p>
          ) : null}

          {!backupDraft ? (
            <button
              type="button"
              className={`data-drop${dragging ? ' data-drop--active' : ''}`}
              onClick={() => void chooseFile()}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => void handleDrop(event)}
            >
              <strong className="data-drop__title">
                {fill(m.backup.panel.dropTitle, { extension: BACKUP_EXTENSION })}
              </strong>
              <span className="data-drop__hint">{m.backup.panel.dropHint}</span>
            </button>
          ) : (
            <div className="data-import">
              <div className="data-import__file">
                <div>
                  <strong>{backupDraft.fileName}</strong>
                  <p className="muted">
                    {backupDraft.appVersion
                      ? fill(m.backup.panel.backupFromWithVersion, {
                          date: formatDateTime(backupDraft.createdAt, locale),
                          version: backupDraft.appVersion
                        })
                      : fill(m.backup.panel.backupFrom, {
                          date: formatDateTime(backupDraft.createdAt, locale)
                        })}
                  </p>
                  <p className="muted">
                    {describeBackupCounts(backupDraft.counts, m.backup, plural)}
                  </p>
                </div>
                <button
                  type="button"
                  className="button button--tiny button--ghost"
                  onClick={() => {
                    setBackupDraft(null)
                    setImportError(null)
                  }}
                  disabled={restoring}
                >
                  {m.backup.panel.remove}
                </button>
              </div>

              <div className="data-panel__actions">
                <button
                  type="button"
                  className="button button--danger-solid"
                  onClick={() => setConfirmOpen(true)}
                  disabled={restoring}
                >
                  {restoring ? m.backup.panel.restoring : m.backup.panel.restore}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="data-panel" aria-labelledby="backup-auto-title">
          <div className="data-panel__head">
            <div>
              <h2 id="backup-auto-title">{m.backup.panel.autoTitle}</h2>
              <p className="muted">
                {fill(m.backup.panel.autoDescription, { count: AUTO_BACKUP_KEEP_COUNT })}
              </p>
            </div>
          </div>

          {settingsError ? <p className="notice notice--error">{settingsError}</p> : null}

          <label className="field">
            <span className="field__label">{m.backup.panel.folderLabel}</span>
            <div className="data-folder">
              <input
                className="input input--readonly"
                value={settings?.folderPath ?? '…'}
                readOnly
              />
              <button
                type="button"
                className="button"
                onClick={() => void chooseFolder()}
                disabled={savingSettings || isWebPreview}
              >
                {m.backup.panel.chooseFolder}
              </button>
            </div>
          </label>

          <label className="field">
            <span className="field__label">{m.backup.panel.frequencyLabel}</span>
            <Select<BackupFrequency>
              value={settings?.frequency ?? 'off'}
              options={frequencyOptions}
              onChange={(value) => void changeFrequency(value)}
              ariaLabel={m.backup.panel.frequencyAriaLabel}
              disabled={savingSettings || isWebPreview}
            />
          </label>

          {isWebPreview ? (
            <p className="muted">{m.backup.panel.webPreviewNote}</p>
          ) : null}

          <dl className="backup-status">
            <div>
              <dt>{m.backup.panel.lastBackupLabel}</dt>
              <dd>
                {settings?.lastBackupAt
                  ? formatDateTime(settings.lastBackupAt, locale)
                  : m.backup.panel.neverRun}
              </dd>
            </div>
            {settings?.lastError ? (
              <div>
                <dt>{m.backup.panel.errorLabel}</dt>
                <dd className="backup-status__error">{settings.lastError}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={m.backup.panel.confirmTitle}
        description={m.backup.panel.confirmDescription}
        confirmLabel={m.backup.panel.confirmRestore}
        cancelLabel={m.backup.panel.confirmCancel}
        onConfirm={() => {
          setConfirmOpen(false)
          void restoreBackup()
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
