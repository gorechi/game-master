import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DragEvent, JSX } from 'react'
import type { Game } from '@shared/game'
import type { GameMonsterEntry } from '@shared/gameMonster'
import type { GameMap } from '@shared/map'
import type { Monster } from '@shared/monster'
import type { PlaceType } from '@shared/placeType'
import type { Realm } from '@shared/realm'
import { gameStatusLabels } from '@shared/gameStatus'
import { formatChallengeRating } from '@shared/domain'
import {
  DATA_EXPORT_KIND_LABELS,
  countDataPack,
  createDataPack,
  dataPackSchema,
  type DataExportKind,
  type DataImportFile,
  type DataImportResult,
  type DataMapLinkMode,
  type DataPack,
  type DataPackCounts
} from '@shared/dataPack'
import { api, errorMessage } from '@renderer/lib/api'
import { Modal } from './ui/Modal'
import { Select } from './ui/Select'

type DataTab = 'games' | 'maps' | 'monsters' | 'uniqueMonsters' | 'realms'
type ExchangeTab = DataTab

interface DataPageProps {
  realms: Realm[]
  onRealmsChanged: () => Promise<void> | void
}

interface DataSources {
  games: Game[]
  maps: GameMap[]
  monsters: Monster[]
  uniqueMonsters: GameMonsterEntry[]
  placeTypes: PlaceType[]
}

interface ExportItem {
  id: string
  realmId: string
  title: string
  meta: string
  detail?: string
}

interface ExportPreview {
  counts?: DataPackCounts
  error?: string
}

interface ImportDraft {
  fileName: string
  pack: DataPack
  counts: DataPackCounts
}

interface ImportSuccess {
  result: DataImportResult
  realmName: string
}

const EMPTY_SOURCES: DataSources = {
  games: [],
  maps: [],
  monsters: [],
  uniqueMonsters: [],
  placeTypes: []
}

const TAB_LABELS: Record<DataTab, string> = {
  games: 'Игры',
  maps: 'Карты',
  monsters: 'Монстры',
  uniqueMonsters: 'Уникальные существа',
  realms: 'Сеттинги'
}

const TAB_DESCRIPTIONS: Record<ExchangeTab, string> = {
  games: 'Выберите игры. В пакет войдут их карты, связанные карты, иконки и монстры внутри игр.',
  maps: 'Выберите карты. При экспорте можно добавить связанные карты или оставить только выбранные.',
  monsters: 'Выберите монстров из бестиария. Игроки и персонажи в пакет не попадают.',
  uniqueMonsters: 'Выберите уникальных существ. Их можно перенести отдельно от игр.',
  realms: 'Выберите один сеттинг. В пакет войдут только его игры, карты, монстры, существа и иконки.'
}

const TAB_EXPORT_HINTS: Record<ExchangeTab, string> = {
  games: 'Пакет игр',
  maps: 'Пакет карт',
  monsters: 'Пакет бестиария',
  uniqueMonsters: 'Пакет уникальных существ',
  realms: 'Пакет сеттинга'
}

const KIND_TAB: Record<DataExportKind, ExchangeTab> = {
  games: 'games',
  maps: 'maps',
  monsters: 'monsters',
  uniqueMonsters: 'uniqueMonsters',
  realm: 'realms'
}

const TABS: DataTab[] = [
  'games',
  'maps',
  'monsters',
  'uniqueMonsters',
  'realms'
]

function kindForTab(tab: DataTab): DataExportKind {
  return tab === 'realms' ? 'realm' : tab
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

function describeCounts(counts: DataPackCounts): string {
  const parts: string[] = []

  if (counts.games > 0) parts.push(plural(counts.games, 'игра', 'игры', 'игр'))
  if (counts.maps > 0) parts.push(plural(counts.maps, 'карта', 'карты', 'карт'))
  if (counts.monsters > 0) parts.push(plural(counts.monsters, 'монстр', 'монстра', 'монстров'))
  if (counts.uniqueMonsters > 0) {
    parts.push(plural(counts.uniqueMonsters, 'существо', 'существа', 'существ'))
  }
  if (counts.placeTypes > 0) {
    parts.push(plural(counts.placeTypes, 'иконка', 'иконки', 'иконок'))
  }

  return parts.length > 0 ? parts.join(' · ') : 'пустой пакет'
}

function parsePackText(text: string): DataPack {
  let json: unknown

  try {
    json = JSON.parse(text) as unknown
  } catch {
    throw new Error('Файл повреждён: внутри не JSON')
  }

  const parsed = dataPackSchema.safeParse(json)
  if (parsed.success) return parsed.data

  const first = parsed.error.issues[0]
  const where = first?.path.length ? ` (${first.path.join('.')})` : ''
  throw new Error(
    `Файл не является корректным пакетом Game Master${where}: ${first?.message ?? 'неизвестная ошибка'}`
  )
}

export function DataPage({ realms, onRealmsChanged }: DataPageProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<DataTab>('games')
  const [sources, setSources] = useState<DataSources>(EMPTY_SOURCES)
  const [selection, setSelection] = useState<Partial<Record<ExchangeTab, Set<string>>>>({})
  const [realmFilters, setRealmFilters] = useState<Partial<Record<ExchangeTab, string>>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const [exporting, setExporting] = useState(false)
  const [exportNotice, setExportNotice] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [mapExportPromptOpen, setMapExportPromptOpen] = useState(false)

  const [importDraft, setImportDraft] = useState<ImportDraft | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<ImportSuccess | null>(null)
  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [targetRealmId, setTargetRealmId] = useState('')
  const [realmName, setRealmName] = useState('')
  const [realmDescription, setRealmDescription] = useState('')

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setLoadError(null)

    void (async () => {
      try {
        const [games, maps, monsters, uniqueMonsters] = await Promise.all([
          api.games.list(),
          api.maps.list(),
          api.monsters.list(),
          api.gameMonsters.list()
        ])
        const iconLists = await Promise.all(
          realms.map((realm) => api.placeTypes.list(realm.id))
        )
        const placeTypes = iconLists.flat()

        if (!cancelled) {
          setSources({ games, maps, monsters, uniqueMonsters, placeTypes })
        }
      } catch (error) {
        if (!cancelled) setLoadError(errorMessage(error))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [realms, reloadToken])

  useEffect(() => {
    setImportDraft(null)
    setImportError(null)
    setImportSuccess(null)
    setExportNotice(null)
    setExportError(null)
    setMapExportPromptOpen(false)
  }, [activeTab])

  const realmNames = useMemo(
    () => new Map(realms.map((realm) => [realm.id, realm.name])),
    [realms]
  )

  const reload = useCallback((): void => {
    setReloadToken((value) => value + 1)
  }, [])

  const exportItems = useMemo((): ExportItem[] => {
    if (activeTab === 'games') {
      return sources.games.map((game) => ({
        id: game.id,
        realmId: game.realmId,
        title: game.name,
        meta: `${realmNames.get(game.realmId) ?? 'Без сеттинга'} · ${gameStatusLabels[game.status]}`,
        detail: `${plural(game.monsters.length, 'монстр', 'монстра', 'монстров')} в игре`
      }))
    }

    if (activeTab === 'maps') {
      return sources.maps.map((map) => ({
        id: map.id,
        realmId: map.realmId,
        title: map.name,
        meta: realmNames.get(map.realmId) ?? 'Без сеттинга',
        detail: `${plural(map.places.length, 'место', 'места', 'мест')} · ${plural(
          map.paths.length,
          'связь',
          'связи',
          'связей'
        )}`
      }))
    }

    if (activeTab === 'monsters') {
      return sources.monsters.map((monster) => ({
        id: monster.id,
        realmId: monster.realmId,
        title: monster.name,
        meta: realmNames.get(monster.realmId) ?? 'Без сеттинга',
        detail: `КО ${formatChallengeRating(monster.challengeRating)} · КЗ ${monster.armorClass} · ${monster.hitPoints} ХП`
      }))
    }

    if (activeTab === 'uniqueMonsters') {
      return sources.uniqueMonsters.map((monster) => ({
        id: monster.id,
        realmId: monster.realmId,
        title: monster.name,
        meta: realmNames.get(monster.realmId) ?? 'Без сеттинга',
        detail: `КО ${formatChallengeRating(monster.challengeRating)} · КЗ ${monster.armorClass} · ${monster.hitPoints} ХП`
      }))
    }

    return realms.map((realm) => {
      const games = sources.games.filter((game) => game.realmId === realm.id)
      const maps = sources.maps.filter((map) => map.realmId === realm.id)
      const monsters = sources.monsters.filter((monster) => monster.realmId === realm.id)
      const unique = sources.uniqueMonsters.filter(
        (monster) => monster.realmId === realm.id
      )
      const icons = sources.placeTypes.filter(
        (placeType) => placeType.realmId === realm.id
      )

      return {
        id: realm.id,
        realmId: realm.id,
        title: realm.name,
        meta: describeCounts({
          games: games.length,
          maps: maps.length,
          monsters: monsters.length,
          uniqueMonsters: unique.length,
          placeTypes: icons.length
        }),
        detail: realm.description || 'Без описания'
      }
    })
  }, [activeTab, realmNames, realms, sources])

  const realmFilter = realmFilters[activeTab] ?? 'all'
  const filteredExportItems = useMemo(() => {
    if (activeTab === 'realms' || realmFilter === 'all') return exportItems
    return exportItems.filter((item) => item.realmId === realmFilter)
  }, [activeTab, exportItems, realmFilter])

  const selectedSet = selection[activeTab] ?? new Set<string>()
  const selectedItems = filteredExportItems.filter((item) => selectedSet.has(item.id))
  const selectedIds = selectedItems.map((item) => item.id)
  const exportKind = kindForTab(activeTab)
  const selectedIdSet = new Set(selectedIds)
  const mapExportHasLinks =
    activeTab === 'maps' &&
    sources.maps.some(
      (map) =>
        selectedIdSet.has(map.id) &&
        map.places.some((place) => Boolean(place.linkedMapId))
    )

  const exportPreview = useMemo((): ExportPreview | null => {
    if (selectedIds.length === 0) return null

    try {
      const pack = createDataPack(
        { kind: exportKind, ids: selectedIds },
        { ...sources, realms },
        'preview'
      )
      return { counts: countDataPack(pack) }
    } catch (error) {
      return { error: errorMessage(error) }
    }
  }, [exportKind, realms, selectedIds, sources])

  const selectedOnlyPreview = useMemo((): DataPackCounts | null => {
    if (activeTab !== 'maps' || !mapExportHasLinks || selectedIds.length === 0) {
      return null
    }

    try {
      return countDataPack(
        createDataPack(
          { kind: 'maps', ids: selectedIds, mapLinks: 'selectedOnly' },
          { ...sources, realms },
          'preview'
        )
      )
    } catch {
      return null
    }
  }, [activeTab, mapExportHasLinks, realms, selectedIds, sources])

  function toggleItem(id: string): void {
    const tab = activeTab

    setSelection((previous) => {
      const next = new Set(previous[tab] ?? [])

      if (tab === 'realms') {
        if (next.has(id)) {
          next.clear()
        } else {
          next.clear()
          next.add(id)
        }
      } else if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return { ...previous, [tab]: next }
    })
  }

  function selectAll(): void {
    if (activeTab === 'realms') return
    setSelection((previous) => ({
      ...previous,
      [activeTab]: new Set(filteredExportItems.map((item) => item.id))
    }))
  }

  function clearSelection(): void {
    setSelection((previous) => ({ ...previous, [activeTab]: new Set() }))
  }

  function changeRealmFilter(value: string): void {
    if (activeTab === 'realms') return

    setRealmFilters((previous) => ({ ...previous, [activeTab]: value }))
  }

  async function handleExport(mapLinks?: DataMapLinkMode): Promise<void> {
    if (selectedIds.length === 0) return

    setExporting(true)
    setExportNotice(null)
    setExportError(null)

    try {
      const result = await api.data.exportPackage({
        kind: exportKind,
        ids: selectedIds,
        ...(exportKind === 'maps' && mapLinks ? { mapLinks } : {})
      })
      if (result) {
        const linkNote =
          mapLinks === 'selectedOnly'
            ? ' Связи с другими картами в файле удалены.'
            : ''
        setExportNotice(
          `Файл сохранён: ${result.fileName}. В пакете: ${describeCounts(
            result.counts
          )}.${linkNote}`
        )
      }
    } catch (error) {
      setExportError(errorMessage(error))
    } finally {
      setExporting(false)
    }
  }

  function requestExport(): void {
    if (mapExportHasLinks) {
      setMapExportPromptOpen(true)
      return
    }
    void handleExport()
  }

  function acceptImport(draft: DataImportFile): void {
    const expectedKind = kindForTab(activeTab)

    if (expectedKind !== draft.pack.kind) {
      const targetTab = KIND_TAB[draft.pack.kind]
      setImportDraft(null)
      setImportSuccess(null)
      setImportError(
        `Это пакет «${DATA_EXPORT_KIND_LABELS[draft.pack.kind]}». Откройте вкладку «${TAB_LABELS[targetTab]}».`
      )
      return
    }

    setImportDraft(draft)
    setImportError(null)
    setImportSuccess(null)
    setTargetRealmId('')

    if (draft.pack.kind === 'realm') {
      setRealmName(draft.pack.data.realm?.name ?? '')
      setRealmDescription(draft.pack.data.realm?.description ?? '')
    } else {
      setRealmName('')
      setRealmDescription('')
    }
  }

  async function chooseFile(): Promise<void> {
    setImportError(null)

    try {
      const file = await api.data.chooseImportFile()
      if (file) acceptImport(file)
    } catch (error) {
      setImportError(errorMessage(error))
    }
  }

  async function readDroppedFile(file: File): Promise<void> {
    if (file.size > 25 * 1024 * 1024) {
      throw new Error('Файл слишком большой для пакета Game Master')
    }

    const pack = parsePackText(await file.text())
    acceptImport({ fileName: file.name, pack, counts: countDataPack(pack) })
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

  async function handleImport(): Promise<void> {
    if (!importDraft) return

    if (importDraft.pack.kind === 'realm' && !realmName.trim()) {
      setImportError('Укажите название нового сеттинга')
      return
    }
    if (importDraft.pack.kind !== 'realm' && !targetRealmId) {
      setImportError('Выберите сеттинг, в который нужно импортировать данные')
      return
    }

    setImporting(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      const result = await api.data.importPackage({
        fileName: importDraft.fileName,
        pack: importDraft.pack,
        targetRealmId: importDraft.pack.kind === 'realm' ? null : targetRealmId,
        realmName: importDraft.pack.kind === 'realm' ? realmName : undefined,
        realmDescription: importDraft.pack.kind === 'realm' ? realmDescription : undefined
      })

      const targetName =
        importDraft.pack.kind === 'realm'
          ? realmName.trim()
          : (realmNames.get(targetRealmId) ?? 'выбранный сеттинг')

      setImportSuccess({ result, realmName: targetName })
      setImportDraft(null)
      setSelection((previous) => ({ ...previous, [activeTab]: new Set() }))
      await onRealmsChanged()
      reload()
    } catch (error) {
      setImportError(errorMessage(error))
    } finally {
      setImporting(false)
    }
  }

  const realmOptions = realms.map((realm) => ({ value: realm.id, label: realm.name }))
  const realmFilterOptions = [
    { value: 'all', label: 'Все сеттинги' },
    ...realmOptions
  ]
  const isRealmPackage = importDraft?.pack.kind === 'realm'
  const importDisabled =
    importing || (isRealmPackage ? !realmName.trim() : !targetRealmId)

  return (
    <main className="page">
      <div className="page__inner data-page">
        <header className="page-head">
          <div>
            <h1>Данные</h1>
            <p className="muted">
              Перенос игр, карт, монстров, уникальных существ и сеттингов между
              установками. Игроки и персонажи не экспортируются.
            </p>
          </div>
        </header>

        <div className="data-tabs" role="tablist" aria-label="Разделы данных">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`data-tab${activeTab === tab ? ' data-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="data-tab-intro">
          <h2>{TAB_LABELS[activeTab]}</h2>
          <p className="muted">{TAB_DESCRIPTIONS[activeTab]}</p>
        </div>

        {loadError ? <p className="notice notice--error">{loadError}</p> : null}

        <div className="data-layout">
          <section className="data-panel" aria-labelledby="data-export-title">
            <div className="data-panel__head">
              <div>
                <h2 id="data-export-title">Экспорт</h2>
                <p className="muted">{TAB_EXPORT_HINTS[activeTab]}</p>
              </div>
              <span className="data-counter">
                {selectedItems.length} из {filteredExportItems.length}
              </span>
            </div>

            {activeTab !== 'realms' ? (
              <label className="field data-filter">
                <span className="field__label">Фильтр по сеттингу</span>
                <Select<string>
                  value={realmFilter}
                  options={realmFilterOptions}
                  onChange={changeRealmFilter}
                  ariaLabel="Фильтр по сеттингу"
                  placeholder="Все сеттинги"
                  searchable={realmFilterOptions.length > 9}
                />
              </label>
            ) : null}

            <div className="data-toolbar">
              {activeTab !== 'realms' ? (
                <button
                  type="button"
                  className="button button--tiny button--ghost"
                  onClick={selectAll}
                  disabled={filteredExportItems.length === 0}
                >
                  Выбрать все
                </button>
              ) : (
                <span className="muted data-toolbar__hint">Выберите один сеттинг</span>
              )}
              <button
                type="button"
                className="button button--tiny button--ghost"
                onClick={clearSelection}
                disabled={selectedItems.length === 0}
              >
                Снять выбор
              </button>
            </div>

            {loading ? (
              <p className="muted">Загрузка данных…</p>
            ) : filteredExportItems.length === 0 ? (
              <div className="empty">
                {activeTab === 'realms'
                  ? 'Сеттингов пока нет.'
                  : realmFilter !== 'all'
                    ? 'В выбранном сеттинге пока нечего экспортировать.'
                    : 'Здесь пока нечего экспортировать.'}
              </div>
            ) : (
              <ul className="data-choice-list">
                {filteredExportItems.map((item) => (
                  <li key={item.id}>
                    <label
                      className={`data-choice${
                        selectedSet.has(item.id) ? ' data-choice--on' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selectedSet.has(item.id)}
                        onChange={() => toggleItem(item.id)}
                      />
                      <span className="data-choice__body">
                        <span className="data-choice__title">{item.title}</span>
                        <span className="data-choice__meta">{item.meta}</span>
                        {item.detail ? (
                          <span className="data-choice__detail">{item.detail}</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            {exportPreview ? (
              <div className="data-summary">
                {exportPreview.error ? (
                  <p className="notice notice--error">{exportPreview.error}</p>
                ) : exportPreview.counts ? (
                  activeTab === 'maps' && mapExportHasLinks ? (
                    <>
                      <span className="data-summary__title">Со связанными картами</span>
                      <span className="data-summary__counts">
                        {describeCounts(exportPreview.counts)}
                      </span>
                      {selectedOnlyPreview ? (
                        <>
                          <span className="data-summary__title">Только выбранные карты</span>
                          <span className="data-summary__counts">
                            {describeCounts(selectedOnlyPreview)}
                          </span>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <span className="data-summary__title">В пакет войдёт</span>
                      <span className="data-summary__counts">
                        {describeCounts(exportPreview.counts)}
                      </span>
                    </>
                  )
                ) : null}
              </div>
            ) : null}

            {exportError ? <p className="notice notice--error">{exportError}</p> : null}
            {exportNotice ? <p className="notice notice--success">{exportNotice}</p> : null}

            <div className="data-panel__actions">
              <button
                type="button"
                className="button button--primary"
                onClick={requestExport}
                disabled={
                  exporting ||
                  mapExportPromptOpen ||
                  selectedIds.length === 0 ||
                  Boolean(exportPreview?.error)
                }
              >
                {exporting ? 'Экспорт…' : 'Экспортировать'}
              </button>
            </div>
          </section>

          <section className="data-panel data-panel--import" aria-labelledby="data-import-title">
            <div className="data-panel__head">
              <div>
                <h2 id="data-import-title">Импорт</h2>
                <p className="muted">
                  Пакет проверяется до записи. Все идентификаторы создаются заново,
                  связи внутри пакета сохраняются.
                </p>
              </div>
            </div>

            {importError ? <p className="notice notice--error">{importError}</p> : null}
            {importSuccess ? (
              <p className="notice notice--success">
                {importSuccess.result.counts.games > 0 ||
                importSuccess.result.counts.maps > 0 ||
                importSuccess.result.counts.monsters > 0 ||
                importSuccess.result.counts.uniqueMonsters > 0 ||
                importSuccess.result.counts.placeTypes > 0
                  ? `Импортировано в «${importSuccess.realmName}»: ${describeCounts(
                      importSuccess.result.counts
                    )}.`
                  : `Сеттинг «${importSuccess.realmName}» создан без сущностей.`}
              </p>
            ) : null}

            {!importDraft ? (
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
                <strong className="data-drop__title">Выберите файл .gmpack</strong>
                <span className="data-drop__hint">или перетащите его сюда</span>
              </button>
            ) : (
              <div className="data-import">
                <div className="data-import__file">
                  <div>
                    <strong>{importDraft.fileName}</strong>
                    <p className="muted">
                      Пакет «{DATA_EXPORT_KIND_LABELS[importDraft.pack.kind]}» ·{' '}
                      {describeCounts(importDraft.counts)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button button--tiny button--ghost"
                    onClick={() => {
                      setImportDraft(null)
                      setImportError(null)
                    }}
                    disabled={importing}
                  >
                    Убрать
                  </button>
                </div>

                {isRealmPackage ? (
                  <div className="data-import__fields">
                    <p className="muted">
                      Будет создан новый сеттинг. Его название можно изменить.
                    </p>
                    <label className="field">
                      <span className="field__label">Название сеттинга</span>
                      <input
                        className="input"
                        value={realmName}
                        maxLength={100}
                        onChange={(event) => setRealmName(event.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span className="field__label">Описание</span>
                      <textarea
                        className="input"
                        value={realmDescription}
                        maxLength={2000}
                        rows={3}
                        onChange={(event) => setRealmDescription(event.target.value)}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="data-import__fields">
                    <label className="field">
                      <span className="field__label">Сеттинг для импорта</span>
                      <Select<string>
                        value={targetRealmId}
                        options={realmOptions}
                        onChange={setTargetRealmId}
                        ariaLabel="Сеттинг для импорта"
                        placeholder="Выберите сеттинг"
                        searchable={realmOptions.length > 8}
                      />
                    </label>
                    <p className="muted">
                      Импортированные записи будут привязаны только к выбранному
                      сеттингу.
                    </p>
                  </div>
                )}

                <div className="data-panel__actions">
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => void handleImport()}
                    disabled={importDisabled}
                  >
                    {importing ? 'Импорт…' : 'Импортировать'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <Modal
        open={mapExportPromptOpen}
        title="Экспорт карт со связями"
        description="У выбранных карт есть выходы на другие карты. Что включить в файл экспорта?"
        onClose={() => setMapExportPromptOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="button"
              onClick={() => {
                setMapExportPromptOpen(false)
                void handleExport('selectedOnly')
              }}
            >
              Только выбранные карты
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                setMapExportPromptOpen(false)
                void handleExport('includeLinked')
              }}
            >
              Включить связанные карты
            </button>
          </>
        }
      >
        <p className="muted">
          При экспорте только выбранных карт ссылки на другие карты будут удалены
          из файла. В самих картах ничего не изменится.
        </p>
      </Modal>
    </main>
  )
}
