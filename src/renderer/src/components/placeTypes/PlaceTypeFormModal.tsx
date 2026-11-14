import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent, JSX } from 'react'
import { PLACE_ICON_REQUIREMENTS, repairPlaceIcon, validatePlaceIcon } from '@shared/placeIcon'
import type { PlaceType, PlaceTypeInput } from '@shared/placeType'
import { errorMessage } from '@renderer/lib/api'
import { Modal } from '../ui/Modal'
import { IconCheck } from '../ui/icons'
import { PlaceTypeIcon } from './PlaceTypeIcon'

interface PlaceTypeFormModalProps {
  open: boolean
  placeType: PlaceType | null
  /** Типы активного сеттинга: их иконки можно выбрать повторно. */
  existingTypes: readonly PlaceType[]
  onClose: () => void
  onSubmit: (input: PlaceTypeInput) => Promise<void>
}

type IconStatus =
  | { kind: 'idle' }
  | { kind: 'ok'; title: string; text: string }
  | { kind: 'fixed'; title: string; text: string; fixes: string[] }
  | { kind: 'error'; title: string; text: string; problems: string[] }

const MAX_FILE_SIZE = 64 * 1024

/** Создание и редактирование типа места: название, иконка из SVG. */
export function PlaceTypeFormModal({
  open,
  placeType,
  existingTypes,
  onClose,
  onSubmit
}: PlaceTypeFormModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [iconSvg, setIconSvg] = useState('')
  const [source, setSource] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [status, setStatus] = useState<IconStatus>({ kind: 'idle' })
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const formId = useId()

  useEffect(() => {
    if (!open) return

    setName(placeType?.name ?? '')
    setIconSvg(placeType?.iconSvg ?? '')
    setSource('')
    setFileName(null)
    setStatus({ kind: 'idle' })
    setError(null)
    setSaving(false)
    setDragActive(false)
    window.setTimeout(() => nameRef.current?.focus(), 0)
  }, [open, placeType])

  /** Иконки, которые уже используются в сеттинге; одинаковые схлопываются. */
  const library = useMemo(() => {
    const seen = new Set<string>()
    const result: PlaceType[] = []

    for (const entry of existingTypes) {
      if (!entry.iconSvg || seen.has(entry.iconSvg)) continue
      if (!validatePlaceIcon(entry.iconSvg).ok) continue
      seen.add(entry.iconSvg)
      result.push(entry)
    }

    return result
  }, [existingTypes])

  function applySource(raw: string): void {
    const text = raw.trim()

    if (!text) {
      setStatus({
        kind: 'error',
        title: 'Пустой SVG',
        text: 'Вставьте код SVG или перетащите файл.',
        problems: []
      })
      return
    }

    const check = validatePlaceIcon(text)
    if (check.ok) {
      setIconSvg(text)
      setSource('')
      setStatus({
        kind: 'ok',
        title: 'Иконка подходит',
        text: 'Проверка пройдена без замечаний.'
      })
      return
    }

    const repair = repairPlaceIcon(text)

    if (repair.ok && repair.svg) {
      setIconSvg(repair.svg)
      setSource('')
      setStatus({
        kind: 'fixed',
        title: 'Иконка исправлена автоматически',
        text: 'Мы привели её к требованиям, не меняя рисунок. Проверьте превью.',
        fixes: repair.fixes
      })
      return
    }

    setStatus({
      kind: 'error',
      title: 'Иконка не подходит',
      text: PLACE_ICON_REQUIREMENTS,
      problems: repair.problems.length > 0 ? repair.problems : check.problems
    })
  }

  async function readFile(file: File): Promise<void> {
    if (file.size > MAX_FILE_SIZE) {
      setStatus({
        kind: 'error',
        title: 'Файл слишком большой',
        text: 'Иконка должна быть не больше 64 КБ.',
        problems: []
      })
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

  function chooseExisting(option: PlaceType): void {
    setIconSvg(option.iconSvg)
    setFileName(null)
    setSource('')
    setStatus({
      kind: 'ok',
      title: 'Иконка выбрана',
      text: `Используется иконка типа «${option.name}».`
    })
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Укажите название типа места')
      nameRef.current?.focus()
      return
    }

    if (!iconSvg) {
      setError('Загрузите или выберите иконку')
      return
    }

    const check = validatePlaceIcon(iconSvg)
    if (!check.ok) {
      setError(`Иконка не соответствует требованиям: ${check.problems.join(' ')}`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSubmit({ name: trimmedName, iconSvg })
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={placeType ? 'Тип места' : 'Новый тип места'}
      description="Название и иконка. Иконка проверяется перед сохранением: SVG 24×24, только контур currentColor, без заливок, текста и внешних ссылок."
      size="lg"
      panelClassName="modal--place-type"
      onClose={onClose}
      initialFocusRef={nameRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button
            type="submit"
            form={formId}
            className="button button--primary"
            disabled={saving}
          >
            {saving ? 'Сохраняем…' : placeType ? 'Сохранить' : 'Создать тип'}
          </button>
        </>
      }
    >
      <form id={formId} className="place-type-form" onSubmit={(event) => void submit(event)} noValidate>
        <label className="field">
          <span className="field__label">Название</span>
          <input
            ref={nameRef}
            className="input"
            value={name}
            maxLength={100}
            placeholder="Лес, таверна, руины…"
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

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
            <strong>{iconSvg ? 'Иконка готова' : 'Иконка не выбрана'}</strong>
            <span>{fileName ?? 'SVG 24×24 · currentColor'}</span>
          </span>
        </div>

        <section className="place-icon-source-block" aria-labelledby="place-icon-upload">
          <h3 id="place-icon-upload" className="editor-subtitle">
            Загрузить иконку
          </h3>

          <button
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
            <span className="place-icon-drop__title">Перетащите SVG сюда</span>
            <span className="place-icon-drop__hint">
              или нажмите, чтобы выбрать файл на компьютере
            </span>
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
              <span className="field__label">Или вставьте SVG-код</span>
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
              Проверить SVG
            </button>
          </div>
        </section>

        {library.length > 0 ? (
          <section className="place-icon-library-block" aria-labelledby="place-icon-library">
            <h3 id="place-icon-library" className="editor-subtitle">
              Или возьмите иконку другого типа
            </h3>
            <div className="place-icon-library">
              {library.map((option) => {
                const selected = option.iconSvg === iconSvg

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`place-icon-library__item${
                      selected ? ' place-icon-library__item--active' : ''
                    }`}
                    title={`Иконка типа «${option.name}»`}
                    aria-label={`Использовать иконку типа ${option.name}`}
                    aria-pressed={selected}
                    onClick={() => chooseExisting(option)}
                  >
                    <PlaceTypeIcon svg={option.iconSvg} size={26} />
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}

        {status.kind === 'ok' ? (
          <div className="notice notice--success place-icon-report">
            <strong>{status.title}</strong>
            <span>{status.text}</span>
          </div>
        ) : null}

        {status.kind === 'fixed' ? (
          <div className="notice notice--success place-icon-report">
            <strong>{status.title}</strong>
            <span>{status.text}</span>
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
            <strong>{status.title}</strong>
            <span>{status.text}</span>
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
