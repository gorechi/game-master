import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent, JSX } from 'react'
import { repairPlaceIcon, validatePlaceIcon } from '@shared/placeIcon'
import type { PlaceType, PlaceTypeInput } from '@shared/placeType'
import { errorMessage } from '@renderer/lib/api'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { Modal } from '../ui/Modal'
import { IconCheck } from '../ui/icons'
import { PlaceTypeIcon } from '../placeTypes/PlaceTypeIcon'

interface RealmIconFormModalProps {
  open: boolean
  icon: PlaceType | null
  onClose: () => void
  onSubmit: (input: PlaceTypeInput) => Promise<void>
}

type IconStatus =
  | { kind: 'idle' }
  | { kind: 'ok' }
  | { kind: 'fixed'; fixes: string[] }
  | { kind: 'error'; reason: 'empty' | 'tooLarge' | 'invalid'; problems: string[] }

const MAX_FILE_SIZE = 64 * 1024

/** Загрузка и замена SVG-иконки в наборе сеттинга. */
export function RealmIconFormModal({
  open,
  icon,
  onClose,
  onSubmit
}: RealmIconFormModalProps): JSX.Element {
  const { messages: m, fill } = useI18n()
  const [iconSvg, setIconSvg] = useState('')
  const [source, setSource] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [status, setStatus] = useState<IconStatus>({ kind: 'idle' })
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const dropRef = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const formId = useId()

  useEffect(() => {
    if (!open) return

    setIconSvg(icon?.iconSvg ?? '')
    setSource('')
    setFileName(null)
    setStatus({ kind: 'idle' })
    setError(null)
    setSaving(false)
    setDragActive(false)
    window.setTimeout(() => dropRef.current?.focus(), 0)
  }, [open, icon])

  function applySource(raw: string): void {
    const text = raw.trim()

    if (!text) {
      setStatus({ kind: 'error', reason: 'empty', problems: [] })
      return
    }

    const check = validatePlaceIcon(text)
    if (check.ok) {
      setIconSvg(text)
      setSource('')
      setStatus({ kind: 'ok' })
      return
    }

    const repair = repairPlaceIcon(text)

    if (repair.ok && repair.svg) {
      setIconSvg(repair.svg)
      setSource('')
      setStatus({ kind: 'fixed', fixes: repair.fixes })
      return
    }

    setStatus({
      kind: 'error',
      reason: 'invalid',
      problems: repair.problems.length > 0 ? repair.problems : check.problems
    })
  }

  async function readFile(file: File): Promise<void> {
    if (file.size > MAX_FILE_SIZE) {
      setStatus({ kind: 'error', reason: 'tooLarge', problems: [] })
      return
    }

    try {
      const text = await file.text()
      setFileName(file.name)
      applySource(text)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void readFile(file)
  }

  function onDrop(event: DragEvent<HTMLButtonElement>): void {
    event.preventDefault()
    setDragActive(false)

    const file = event.dataTransfer.files?.[0]
    if (file) void readFile(file)
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()

    if (!iconSvg) {
      setError(m.realms.iconForm.loadRequired)
      return
    }

    const check = validatePlaceIcon(iconSvg)
    if (!check.ok) {
      setError(
        fill(m.realms.iconForm.invalid, { problems: check.problems.join(' ') })
      )
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSubmit({ iconSvg })
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  function describeStatus(): { title: string; text: string } {
    switch (status.kind) {
      case 'ok':
        return { title: m.realms.iconForm.okTitle, text: m.realms.iconForm.okText }
      case 'fixed':
        return { title: m.realms.iconForm.fixedTitle, text: m.realms.iconForm.fixedText }
      case 'error': {
        if (status.reason === 'empty') {
          return { title: m.realms.iconForm.emptyTitle, text: m.realms.iconForm.emptyText }
        }
        if (status.reason === 'tooLarge') {
          return {
            title: m.realms.iconForm.tooLargeTitle,
            text: m.realms.iconForm.tooLargeText
          }
        }
        return {
          title: m.realms.iconForm.errorTitle,
          text: m.realms.placeIcon.requirements
        }
      }
      default:
        return { title: '', text: '' }
    }
  }

  const report = describeStatus()

  return (
    <Modal
      open={open}
      title={icon ? m.realms.iconForm.editTitle : m.realms.iconForm.createTitle}
      description={m.realms.iconForm.description}
      size="lg"
      panelClassName="modal--place-type"
      onClose={onClose}
      initialFocusRef={dropRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose} disabled={saving}>
            {m.realms.iconForm.cancel}
          </button>
          <button
            type="submit"
            form={formId}
            className="button button--primary"
            disabled={saving}
          >
            {saving
              ? m.realms.iconForm.saving
              : icon
                ? m.realms.iconForm.save
                : m.realms.iconForm.add}
          </button>
        </>
      }
    >
      <form id={formId} className="place-type-form" onSubmit={(event) => void submit(event)} noValidate>
        <div className="place-icon-preview">
          <span className="place-icon-preview__token">
            {iconSvg ? (
              <PlaceTypeIcon svg={iconSvg} size={38} />
            ) : (
              <span className="place-icon-preview__empty" aria-hidden="true">
                ?
              </span>
            )}
          </span>
          <span className="place-icon-preview__meta">
            <strong>
              {iconSvg ? m.realms.iconForm.ready : m.realms.iconForm.notChosen}
            </strong>
            <span>{fileName ?? 'SVG 24×24 · currentColor'}</span>
          </span>
        </div>

        <section className="place-icon-source-block" aria-labelledby="realm-icon-upload">
          <h3 id="realm-icon-upload" className="editor-subtitle">
            {m.realms.iconForm.uploadTitle}
          </h3>

          <button
            ref={dropRef}
            type="button"
            className={`place-icon-drop${dragActive ? ' place-icon-drop--active' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
          >
            <span className="place-icon-drop__title">{m.realms.iconForm.dropTitle}</span>
            <span className="place-icon-drop__hint">{m.realms.iconForm.dropHint}</span>
          </button>

          <input
            ref={fileRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="visually-hidden"
            tabIndex={-1}
            onChange={onFileChange}
          />

          <div className="place-icon-paste">
            <label className="field">
              <span className="field__label">{m.realms.iconForm.pasteLabel}</span>
              <textarea
                className="input place-icon-source"
                value={source}
                maxLength={20_000}
                spellCheck={false}
                placeholder={'<svg viewBox="0 0 24 24" …>…</svg>'}
                onChange={(event) => setSource(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="button button--tiny"
              disabled={!source.trim()}
              onClick={() => applySource(source)}
            >
              <IconCheck width={14} height={14} />
              {m.realms.iconForm.checkSvg}
            </button>
          </div>
        </section>

        {status.kind === 'ok' ? (
          <div className="notice notice--success place-icon-report">
            <strong>{report.title}</strong>
            <span>{report.text}</span>
          </div>
        ) : null}

        {status.kind === 'fixed' ? (
          <div className="notice notice--success place-icon-report">
            <strong>{report.title}</strong>
            <span>{report.text}</span>
            {status.fixes.length > 0 ? (
              <ul className="place-icon-report__list">
                {status.fixes.map((fix) => (
                  <li key={fix}>{fix}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {status.kind === 'error' ? (
          <div className="notice notice--error place-icon-report">
            <strong>{report.title}</strong>
            <span>{report.text}</span>
            {status.problems.length > 0 ? (
              <ul className="place-icon-report__list">
                {status.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="notice notice--error">{error}</p> : null}
      </form>
    </Modal>
  )
}
