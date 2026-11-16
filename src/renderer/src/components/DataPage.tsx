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
  DATA_PACK_EXTENSION,
  countDataPack,
  createDataPack,
  dataExportKindLabels,
  dataPackSchema,
  type DataExportKind,
  type DataImportFile,
  type DataImportResult,
  type DataMapLinkMode,
  type DataPack,
  type DataPackCounts
} from '@shared/dataPack'
import { fill, m, type Messages, type PluralForms } from '@shared/i18n'
import { api, errorMessage } from '@renderer/lib/api'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { BackupPanel } from './BackupPanel'
import { Modal } from './ui/Modal'
import { Select } from './ui/Select'

type ExchangeTab = 'games' | 'maps' | 'monsters' | 'uniqueMonsters' | 'realms'
type DataTab = ExchangeTab | 'backup'

interface DataPageProps {
  realms: Realm[]
  onRealmsChanged: () => Promise<void> | void
  onAppDataRestored: () => Promise<void> | void
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
  'realms',
  'backup'
]

function kindForTab(tab: ExchangeTab): DataExportKind {
  return tab === 'realms' ? 'realm' : tab
}

function describeCounts(
  counts: DataPackCounts,
  messages: Messages['data'],
  pluralize: (count: number, forms: PluralForms) => string
): string {
  const parts: string[] = []

  if (counts.games > 0) parts.push(pluralize(counts.games, messages.plural.games))
  if (counts.maps > 0) parts.push(pluralize(counts.maps, messages.plural.maps))
  if (counts.monsters > 0) parts.push(pluralize(counts.monsters, messages.plural.monsters))
  if (counts.uniqueMonsters > 0) {
    parts.push(pluralize(counts.uniqueMonsters, messages.plural.uniqueMonsters))
  }
  if (counts.placeTypes > 0) {
    parts.push(pluralize(counts.placeTypes, messages.plural.placeTypes))
  }

  return parts.length > 0 ? parts.join(' · ') : messages.emptyPack
}

function parsePackText(text: string): DataPack {
  let json: unknown

  try {
    json = JSON.parse(text) as unknown
  } catch {
    throw new Error(m().data.errors.notJson)
  }

  const parsed = dataPackSchema.safeParse(json)
  if (parsed.success) return parsed.data

  const first = parsed.error.issues[0]
  const where = first?.path.length ? ` (${first.path.join('.')})` : ''
  throw new Error(
    fill(m().data.errors.invalidPack, {
      where,
      reason: first?.message ?? m().data.errors.unknown
    })
  )
}

export function DataPage({
  realms,
  onRealmsChanged,
  onAppDataRestored
}: DataPageProps): JSX.Element {
  const { messages: m, fill, plural } = useI18n()
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
    if (activeTab === 'backup') return []
    if (activeTab === 'games') {
      return sources.games.map((game) => ({
        id: game.id,
        realmId: game.realmId,
        title: game.name,
        meta: `${realmNames.get(game.realmId) ?? m.data.items.withoutRealm} · ${gameStatusLabels[game.status]}`,
        detail: plural(game.monsters.length, m.data.plural.monstersInGame)
      }))
    }

    if (activeTab === 'maps') {
      return sources.maps.map((map) => ({
        id: map.id,
        realmId: map.realmId,
        title: map.name,
        meta: realmNames.get(map.realmId) ?? m.data.items.withoutRealm,
        detail: `${plural(map.places.length, m.data.plural.places)} · ${plural(
          map.paths.length,
          m.data.plural.paths
        )}`
      }))
    }

    if (activeTab === 'monsters') {
      return sources.monsters.map((monster) => ({
        id: monster.id,
        realmId: monster.realmId,
        title: monster.name,
        meta: realmNames.get(monster.realmId) ?? m.data.items.withoutRealm,
        detail: fill(m.data.items.monsterStats, {
          cr: formatChallengeRating(monster.challengeRating),
          ac: monster.armorClass,
          hp: monster.hitPoints
        })
      }))
    }

    if (activeTab === 'uniqueMonsters') {
      return sources.uniqueMonsters.map((monster) => ({
        id: monster.id,
        realmId: monster.realmId,
        title: monster.name,
        meta: realmNames.get(monster.realmId) ?? m.data.items.withoutRealm,
        detail: fill(m.data.items.monsterStats, {
          cr: formatChallengeRating(monster.challengeRating),
          ac: monster.armorClass,
          hp: monster.hitPoints
        })
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
        meta: describeCounts(
          {
            games: games.length,
            maps: maps.length,
            monsters: monsters.length,
            uniqueMonsters: unique.length,
            placeTypes: icons.length
          },
          m.data,
          plural
        ),
        detail: realm.description || m.data.items.withoutDescription
      }
    })
  }, [activeTab, fill, m, plural, realmNames, realms, sources])

  const realmFilter =
    activeTab === 'backup' ? 'all' : (realmFilters[activeTab] ?? 'all')
  const filteredExportItems = useMemo(() => {
    if (activeTab === 'realms' || realmFilter === 'all') return exportItems
    return exportItems.filter((item) => item.realmId === realmFilter)
  }, [activeTab, exportItems, realmFilter])

  const selectedSet =
    activeTab === 'backup' ? new Set<string>() : (selection[activeTab] ?? new Set())
  const selectedItems = filteredExportItems.filter((item) => selectedSet.has(item.id))
  const selectedIds = selectedItems.map((item) => item.id)
  const exportKind = activeTab === 'backup' ? null : kindForTab(activeTab)
  const selectedIdSet = new Set(selectedIds)
  const mapExportHasLinks =
    activeTab === 'maps' &&
    sources.maps.some(
      (map) =>
        selectedIdSet.has(map.id) &&
        map.places.some((place) => Boolean(place.linkedMapId))
    )

  const exportPreview = useMemo((): ExportPreview | null => {
    if (!exportKind || selectedIds.length === 0) return null

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
    if (activeTab === 'backup') return
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
    if (activeTab === 'realms' || activeTab === 'backup') return
    setSelection((previous) => ({
      ...previous,
      [activeTab]: new Set(filteredExportItems.map((item) => item.id))
    }))
  }

  function clearSelection(): void {
    if (activeTab === 'backup') return
    setSelection((previous) => ({ ...previous, [activeTab]: new Set() }))
  }

  function changeRealmFilter(value: string): void {
    if (activeTab === 'realms' || activeTab === 'backup') return

    setRealmFilters((previous) => ({ ...previous, [activeTab]: value }))
  }

  async function handleExport(mapLinks?: DataMapLinkMode): Promise<void> {
    if (!exportKind || selectedIds.length === 0) return

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
        const counts = describeCounts(result.counts, m.data, plural)
        setExportNotice(
          mapLinks === 'selectedOnly'
            ? fill(m.data.export.savedWithRemovedLinks, {
                fileName: result.fileName,
                counts
              })
            : fill(m.data.export.saved, { fileName: result.fileName, counts })
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
    if (activeTab === 'backup') return
    const expectedKind = kindForTab(activeTab)

    if (expectedKind !== draft.pack.kind) {
      const targetTab = KIND_TAB[draft.pack.kind]
      setImportDraft(null)
      setImportSuccess(null)
      setImportError(
        fill(m.data.errors.wrongTab, {
          kind: dataExportKindLabels()[draft.pack.kind],
          tab: m.data.tabs[targetTab]
        })
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
      throw new Error(m.data.errors.tooLarge)
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
      setImportError(m.data.errors.realmNameRequired)
      return
    }
    if (importDraft.pack.kind !== 'realm' && !targetRealmId) {
      setImportError(m.data.errors.targetRealmRequired)
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
          : (realmNames.get(targetRealmId) ?? m.data.import.selectedRealm)

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
    { value: 'all', label: m.data.export.allRealms },
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
            <h1>{m.data.title}</h1>
            <p className="muted">{m.data.description}</p>
          </div>
        </header>

        <div className="data-tabs" role="tablist" aria-label={m.data.tabs.label}>
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`data-tab${activeTab === tab ? ' data-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {m.data.tabs[tab]}
            </button>
          ))}
        </div>

        {activeTab === 'backup' ? (
          <BackupPanel
            onRestored={async () => {
              await onAppDataRestored()
              reload()
            }}
          />
        ) : (
          <>
            <div className="data-tab-intro">
              <h2>{m.data.tabs[activeTab]}</h2>
              <p className="muted">{m.data.tabDescriptions[activeTab]}</p>
            </div>

            {loadError ? <p className="notice notice--error">{loadError}</p> : null}

            <div className="data-layout">
              <section className="data-panel" aria-labelledby="data-export-title">
                <div className="data-panel__head">
                  <div>
                    <h2 id="data-export-title">{m.data.export.title}</h2>
                    <p className="muted">{m.data.exportHints[activeTab]}</p>
                  </div>
                  <span className="data-counter">
                    {fill(m.data.export.counter, {
                      selected: selectedItems.length,
                      total: filteredExportItems.length
                    })}
                  </span>
                </div>

                {activeTab !== 'realms' ? (
                  <label className="field data-filter">
                    <span className="field__label">{m.data.export.filterLabel}</span>
                    <Select<string>
                      value={realmFilter}
                      options={realmFilterOptions}
                      onChange={changeRealmFilter}
                      ariaLabel={m.data.export.filterAriaLabel}
                      placeholder={m.data.export.filterPlaceholder}
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
                      {m.data.export.selectAll}
                    </button>
                  ) : (
                    <span className="muted data-toolbar__hint">
                      {m.data.export.selectOneRealm}
                    </span>
                  )}
                  <button
                    type="button"
                    className="button button--tiny button--ghost"
                    onClick={clearSelection}
                    disabled={selectedItems.length === 0}
                  >
                    {m.data.export.clearSelection}
                  </button>
                </div>

                {loading ? (
                  <p className="muted">{m.data.export.loading}</p>
                ) : filteredExportItems.length === 0 ? (
                  <div className="empty">
                    {activeTab === 'realms'
                      ? m.data.export.noRealms
                      : realmFilter !== 'all'
                        ? m.data.export.nothingInRealm
                        : m.data.export.nothing}
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
                          <span className="data-summary__title">
                            {m.data.export.withLinkedMaps}
                          </span>
                          <span className="data-summary__counts">
                            {describeCounts(exportPreview.counts, m.data, plural)}
                          </span>
                          {selectedOnlyPreview ? (
                            <>
                              <span className="data-summary__title">
                                {m.data.export.selectedMapsOnly}
                              </span>
                              <span className="data-summary__counts">
                                {describeCounts(selectedOnlyPreview, m.data, plural)}
                              </span>
                            </>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <span className="data-summary__title">
                            {m.data.export.packWillInclude}
                          </span>
                          <span className="data-summary__counts">
                            {describeCounts(exportPreview.counts, m.data, plural)}
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
                    {exporting ? m.data.export.exporting : m.data.export.submit}
                  </button>
                </div>
              </section>

              <section className="data-panel data-panel--import" aria-labelledby="data-import-title">
                <div className="data-panel__head">
                  <div>
                    <h2 id="data-import-title">{m.data.import.title}</h2>
                    <p className="muted">{m.data.import.description}</p>
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
                      ? fill(m.data.import.success, {
                          realm: importSuccess.realmName,
                          counts: describeCounts(importSuccess.result.counts, m.data, plural)
                        })
                      : fill(m.data.import.emptyRealmCreated, {
                          realm: importSuccess.realmName
                        })}
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
                    <strong className="data-drop__title">
                      {fill(m.data.import.dropTitle, { extension: DATA_PACK_EXTENSION })}
                    </strong>
                    <span className="data-drop__hint">{m.data.import.dropHint}</span>
                  </button>
                ) : (
                  <div className="data-import">
                    <div className="data-import__file">
                      <div>
                        <strong>{importDraft.fileName}</strong>
                        <p className="muted">
                          {fill(m.data.import.packSummary, {
                            kind: dataExportKindLabels()[importDraft.pack.kind],
                            counts: describeCounts(importDraft.counts, m.data, plural)
                          })}
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
                        {m.data.import.remove}
                      </button>
                    </div>

                    {isRealmPackage ? (
                      <div className="data-import__fields">
                        <p className="muted">{m.data.import.newRealmHint}</p>
                        <label className="field">
                          <span className="field__label">{m.data.import.realmNameLabel}</span>
                          <input
                            className="input"
                            value={realmName}
                            maxLength={100}
                            onChange={(event) => setRealmName(event.target.value)}
                          />
                        </label>
                        <label className="field">
                          <span className="field__label">
                            {m.data.import.descriptionLabel}
                          </span>
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
                          <span className="field__label">
                            {m.data.import.targetRealmLabel}
                          </span>
                          <Select<string>
                            value={targetRealmId}
                            options={realmOptions}
                            onChange={setTargetRealmId}
                            ariaLabel={m.data.import.targetRealmAriaLabel}
                            placeholder={m.data.import.targetRealmPlaceholder}
                            searchable={realmOptions.length > 8}
                          />
                        </label>
                        <p className="muted">{m.data.import.targetRealmHint}</p>
                      </div>
                    )}

                    <div className="data-panel__actions">
                      <button
                        type="button"
                        className="button button--primary"
                        onClick={() => void handleImport()}
                        disabled={importDisabled}
                      >
                        {importing ? m.data.import.submitting : m.data.import.submit}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>

      <Modal
        open={mapExportPromptOpen}
        title={m.data.export.modalTitle}
        description={m.data.export.modalDescription}
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
              {m.data.export.modalSelectedOnly}
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                setMapExportPromptOpen(false)
                void handleExport('includeLinked')
              }}
            >
              {m.data.export.modalIncludeLinked}
            </button>
          </>
        }
      >
        <p className="muted">{m.data.export.modalBody}</p>
      </Modal>
    </main>
  )
}
