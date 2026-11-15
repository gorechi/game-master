import { useEffect, useState } from 'react'
import type { DragEvent, JSX } from 'react'
import {
  AUTO_BACKUP_KEEP_COUNT,
  BACKUP_EXTENSION,
  BACKUP_FREQUENCIES,
  BACKUP_FREQUENCY_LABELS,
  backupFileSchema,
  countBackup,
  type BackupFileSelection,
  type BackupFrequency,
  type BackupRestoreResult,
  type BackupSettings
} from '@shared/backup'
import { api, errorMessage, isWebPreview } from '@renderer/lib/api'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Select } from './ui/Select'

interface BackupPanelProps {
  onRestored: () => Promise<void> | void
}

function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} ${one}`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} ${few}`
  }
  return `${count} ${many}`
}

function describeBackupCounts(counts: BackupFileSelection['counts']): string {
  const parts: string[] = []

  if (counts.games > 0) parts.push(plural(counts.games, 'игра', 'игры', 'игр'))
  if (counts.maps > 0) parts.push(plural(counts.maps, 'карта', 'карты', 'карт'))
  if (counts.monsters > 0) parts.push(plural(counts.monsters, 'монстр', 'монстра', 'монстров'))
  if (counts.gameMonsters > 0) {
    parts.push(plural(counts.gameMonsters, 'существо', 'существа', 'существ'))
  }
  if (counts.characters > 0) {
    parts.push(plural(counts.characters, 'персонаж', 'персонажа', 'персонажей'))
  }
  if (counts.players > 0) parts.push(plural(counts.players, 'игрок', 'игрока', 'игроков'))
  if (counts.realms > 0) parts.push(plural(counts.realms, 'сеттинг', 'сеттинга', 'сеттингов'))
  if (counts.placeTypes > 0) {
    parts.push(plural(counts.placeTypes, 'иконка', 'иконки', 'иконок'))
  }

  return parts.length > 0 ? parts.join(' · ') : 'Нет пользовательских данных'
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Ещё не выполнялся'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date)
}

export function BackupPanel({ onRestored }: BackupPanelProps): JSX.Element {
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
          `Файл сохранён: ${result.fileName}. В бэкапе: ${describeBackupCounts(
            result.counts
          )}.`
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
      throw new Error('Файл бэкапа слишком большой')
    }

    const text = await file.text()
    let json: unknown

    try {
      json = JSON.parse(text) as unknown
    } catch {
      throw new Error('Файл повреждён: внутри не JSON')
    }

    const parsed = backupFileSchema.safeParse(json)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      const where = first?.path.length ? ` (${first.path.join('.')})` : ''
      throw new Error(
        `Файл не является корректным бэкапом Game Master${where}: ${
          first?.message ?? 'неизвестная ошибка'
        }`
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
          `Данные восстановлены, но не удалось обновить интерфейс: ${errorMessage(error)}`
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
    label: BACKUP_FREQUENCY_LABELS[value]
  }))

  return (
    <>
      <div className="data-layout">
        <section className="data-panel" aria-labelledby="backup-manual-title">
          <div className="data-panel__head">
            <div>
              <h2 id="backup-manual-title">Ручной бэкап</h2>
              <p className="muted">
                Полная копия пользовательских данных: игры, игроки, персонажи,
                монстры, карты, сеттинги, иконки и тема.
              </p>
            </div>
          </div>

          <div className="data-panel__actions data-panel__actions--start">
            <button
              type="button"
              className="button button--primary"
              onClick={() => void saveManual()}
              disabled={savingManual}
            >
              {savingManual ? 'Создание бэкапа…' : 'Создать и скачать бэкап'}
            </button>
          </div>

          {manualNotice ? <p className="notice notice--success">{manualNotice}</p> : null}

          <div className="data-panel__divider" />

          <div className="data-panel__head">
            <div>
              <h3 className="data-panel__subtitle">Загрузить бэкап</h3>
              <p className="muted">
                Перед заменой текущие данные будут сохранены отдельным файлом.
              </p>
            </div>
          </div>

          {importError ? <p className="notice notice--error">{importError}</p> : null}
          {restoreResult ? (
            <p className="notice notice--success">
              Данные восстановлены. Резервная копия текущего состояния:{' '}
              {restoreResult.safetyBackupFileName}
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
              <strong className="data-drop__title">Выберите файл .{BACKUP_EXTENSION}</strong>
              <span className="data-drop__hint">или перетащите его сюда</span>
            </button>
          ) : (
            <div className="data-import">
              <div className="data-import__file">
                <div>
                  <strong>{backupDraft.fileName}</strong>
                  <p className="muted">
                    Бэкап от {formatDateTime(backupDraft.createdAt)}
                    {backupDraft.appVersion ? ` · версия ${backupDraft.appVersion}` : ''}
                  </p>
                  <p className="muted">{describeBackupCounts(backupDraft.counts)}</p>
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
                  Убрать
                </button>
              </div>

              <div className="data-panel__actions">
                <button
                  type="button"
                  className="button button--danger-solid"
                  onClick={() => setConfirmOpen(true)}
                  disabled={restoring}
                >
                  {restoring ? 'Восстановление…' : 'Восстановить бэкап'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="data-panel" aria-labelledby="backup-auto-title">
          <div className="data-panel__head">
            <div>
              <h2 id="backup-auto-title">Автоматический бэкап</h2>
              <p className="muted">
                Приложение сохраняет копии в выбранную папку и хранит последние{' '}
                {AUTO_BACKUP_KEEP_COUNT} автоматических бэкапов.
              </p>
            </div>
          </div>

          {settingsError ? <p className="notice notice--error">{settingsError}</p> : null}

          <label className="field">
            <span className="field__label">Папка для бэкапов</span>
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
                Выбрать папку
              </button>
            </div>
          </label>

          <label className="field">
            <span className="field__label">Когда делать бэкап</span>
            <Select<BackupFrequency>
              value={settings?.frequency ?? 'off'}
              options={frequencyOptions}
              onChange={(value) => void changeFrequency(value)}
              ariaLabel="Частота автоматического бэкапа"
              disabled={savingSettings || isWebPreview}
            />
          </label>

          {isWebPreview ? (
            <p className="muted">
              В веб-предпросмотре автоматический бэкап не записывает файлы на диск.
            </p>
          ) : null}

          <dl className="backup-status">
            <div>
              <dt>Последний автоматический бэкап</dt>
              <dd>{formatDateTime(settings?.lastBackupAt ?? null)}</dd>
            </div>
            {settings?.lastError ? (
              <div>
                <dt>Ошибка</dt>
                <dd className="backup-status__error">{settings.lastError}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Заменить все данные?"
        description="Текущие игры, игроков, персонажей, монстров, карты, сеттинги, иконки и тему заменят содержимым бэкапа. Перед заменой приложение сохранит текущее состояние отдельным файлом."
        confirmLabel="Восстановить"
        cancelLabel="Отмена"
        onConfirm={() => {
          setConfirmOpen(false)
          void restoreBackup()
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
