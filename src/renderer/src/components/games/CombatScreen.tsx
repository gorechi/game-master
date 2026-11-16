import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { formatChallengeRating, formatModifier, modifierFromScore } from '@shared/domain'
import { fill, getActiveLocale, type Messages } from '@shared/i18n'
import { errorMessage } from '@renderer/lib/api'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { MONSTER_STAT_FIELDS } from '@renderer/lib/monsterStats'
import type { CombatResultEntry, CombatStart } from './CombatModal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { IconCoffin, IconRun, IconSkull } from '../ui/icons'

interface CombatScreenProps {
  initial: CombatStart
  onFinish: () => void
  onMonsterHpChange: (monsterId: string, hitPoints: number) => Promise<void>
  /** Сохраняет или снимает отметку «повержен» у участника схватки. */
  onDefeatChange: (entry: CombatResultEntry, defeated: boolean) => Promise<void>
  /** Убирает привязку сбежавшего монстра к локации, оставляя его в игре. */
  onMonsterEscape: (monsterId: string) => Promise<void>
}

const HP_MIN = 0
const HP_MAX = 100000

function sortEntries(entries: readonly CombatResultEntry[]): CombatResultEntry[] {
  return [...entries].sort(
    (a, b) =>
      b.initiative - a.initiative ||
      (b.tieBreaker ?? 0) - (a.tieBreaker ?? 0) ||
      a.name.localeCompare(b.name, getActiveLocale())
  )
}

function initiativeLabel(entry: CombatResultEntry): string {
  return entry.tieBreaker !== null
    ? `${entry.initiative} · ${entry.tieBreaker}`
    : String(entry.initiative)
}

function entryMeta(entry: CombatResultEntry, messages: Messages): string {
  if (entry.kind === 'character') return entry.playerName ?? messages.games.combat.noPlayer
  return fill(messages.games.combat.hpValue, { hp: entry.monster?.hitPoints ?? '—' })
}

/** Полноэкранный бой: очередь, текущий атакующий и кладбище. */
export function CombatScreen({
  initial,
  onFinish,
  onMonsterHpChange,
  onDefeatChange,
  onMonsterEscape
}: CombatScreenProps): JSX.Element {
  const { messages: m, fill } = useI18n()
  const [active, setActive] = useState<CombatResultEntry[]>(() =>
    sortEntries(initial.participants)
  )
  const [reserves, setReserves] = useState<CombatResultEntry[]>(() =>
    sortEntries(initial.reserves)
  )
  const [cemetery, setCemetery] = useState<CombatResultEntry[]>([])
  const [currentKey, setCurrentKey] = useState<string | null>(
    () => sortEntries(initial.participants)[0]?.key ?? null
  )
  const [saveError, setSaveError] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [escapingEntry, setEscapingEntry] = useState<CombatResultEntry | null>(null)

  const current = active.find((entry) => entry.key === currentKey) ?? active[0] ?? null

  function updateHp(key: string, hitPoints: number): void {
    const patch = (items: CombatResultEntry[]): CombatResultEntry[] =>
      items.map((entry) =>
        entry.key === key && entry.monster
          ? { ...entry, monster: { ...entry.monster, hitPoints } }
          : entry
      )

    setActive(patch)
    setReserves(patch)
    setCemetery(patch)
  }

  function commitHp(entry: CombatResultEntry, hitPoints: number): void {
    setSaveError(null)
    void onMonsterHpChange(entry.id, hitPoints).catch((caught: unknown) => {
      setSaveError(errorMessage(caught))
    })
  }

  function nextTurn(): void {
    if (active.length === 0) return
    const index = current ? active.findIndex((entry) => entry.key === current.key) : -1
    const next = active[(index + 1) % active.length]
    setCurrentKey(next?.key ?? null)
  }

  function defeat(entry: CombatResultEntry): void {
    const index = active.findIndex((item) => item.key === entry.key)
    if (index === -1) return

    const nextActive = active.filter((item) => item.key !== entry.key)
    setActive(nextActive)
    setCemetery((items) => [...items, entry])

    if (current?.key === entry.key) {
      const next = nextActive.length > 0 ? nextActive[index % nextActive.length] : null
      setCurrentKey(next?.key ?? null)
    }

    setSaveError(null)
    void onDefeatChange(entry, true).catch((caught: unknown) => {
      setSaveError(errorMessage(caught))
    })
  }

  function join(entry: CombatResultEntry): void {
    const hadCurrent = current !== null
    const nextActive = sortEntries([...active, entry])
    setActive(nextActive)
    setReserves((items) => items.filter((item) => item.key !== entry.key))
    if (!hadCurrent) setCurrentKey(nextActive[0]?.key ?? null)
  }

  function revive(entry: CombatResultEntry): void {
    const nextActive = sortEntries([...active, entry])
    setActive(nextActive)
    setCemetery((items) => items.filter((item) => item.key !== entry.key))
    if (!current) setCurrentKey(nextActive[0]?.key ?? null)

    setSaveError(null)
    void onDefeatChange(entry, false).catch((caught: unknown) => {
      setSaveError(errorMessage(caught))
    })
  }

  async function finishCombat(): Promise<void> {
    if (finishing) return

    setFinishing(true)
    setSaveError(null)

    try {
      const zeroHpMonsters = [...active, ...reserves, ...cemetery].filter(
        (entry) => entry.kind === 'monster' && entry.monster?.hitPoints === 0
      )

      await Promise.all(
        zeroHpMonsters.map((entry) => onDefeatChange(entry, true))
      )
      onFinish()
    } catch (caught) {
      setSaveError(errorMessage(caught))
      setFinishing(false)
    }
  }

  async function confirmEscape(): Promise<void> {
    const entry = escapingEntry
    if (!entry || entry.kind !== 'monster') return

    setEscapingEntry(null)
    setSaveError(null)

    try {
      await onMonsterEscape(entry.id)

      const index = active.findIndex((item) => item.key === entry.key)
      const nextActive = active.filter((item) => item.key !== entry.key)
      setActive(nextActive)
      setReserves((items) => items.filter((item) => item.key !== entry.key))
      setCemetery((items) => items.filter((item) => item.key !== entry.key))

      if (current?.key === entry.key) {
        const next = nextActive.length > 0 ? nextActive[index % nextActive.length] : null
        setCurrentKey(next?.key ?? null)
      }
    } catch (caught) {
      setSaveError(errorMessage(caught))
    }
  }

  return (
    <main className="combat-screen">
      <header className="combat-screen__head">
        <div>
          <p className="page-kicker">{m.games.combat.kicker}</p>
          <h1>{m.games.combat.title}</h1>
        </div>
        <button
          type="button"
          className="button button--danger-solid combat-screen__finish"
          onClick={() => void finishCombat()}
          disabled={finishing}
        >
          {finishing ? m.games.combat.finishing : m.games.combat.finish}
        </button>
      </header>

      {saveError ? <p className="notice notice--error combat-screen__save-error">{saveError}</p> : null}

      <div className="combat-screen__main">
        <section className="combat-focus" aria-live="polite">
          {current ? (
            <CombatFocusCard entry={current} />
          ) : (
            <div className="combat-focus__empty">
              <p>{m.games.combat.noActive}</p>
              <span>{m.games.combat.reviveHint}</span>
            </div>
          )}

          <button
            type="button"
            className="button button--primary combat-next"
            onClick={nextTurn}
            disabled={active.length === 0}
          >
            {m.games.combat.next}
          </button>
        </section>

        <aside className="combat-side">
          <section className="combat-side__section" aria-labelledby="combat-queue-title">
            <header className="combat-side__head">
              <h2 id="combat-queue-title">{m.games.combat.queueTitle}</h2>
              <span className="combat-side__count">{active.length}</span>
            </header>

            {active.length > 0 ? (
              <ul className="combat-queue">
                {active.map((entry) => (
                  <li key={entry.key}>
                    <QueueCard
                      entry={entry}
                      current={current?.key === entry.key}
                      onDefeat={() => defeat(entry)}
                      onEscape={
                        entry.kind === 'monster'
                          ? () => setEscapingEntry(entry)
                          : undefined
                      }
                      onHpLive={(value) => updateHp(entry.key, value)}
                      onHpCommit={(value) => commitHp(entry, value)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="combat-side__empty">{m.games.combat.queueEmpty}</p>
            )}
          </section>

          <section
            className="combat-side__section combat-side__section--reserves"
            aria-labelledby="combat-reserves-title"
          >
            <header className="combat-side__head">
              <h2 id="combat-reserves-title">{m.games.combat.reservesTitle}</h2>
              <span className="combat-side__count">{reserves.length}</span>
            </header>

            {reserves.length > 0 ? (
              <ul className="combat-queue combat-queue--reserves">
                {reserves.map((entry) => (
                  <li key={entry.key}>
                    <ReserveCard
                      entry={entry}
                      onJoin={() => join(entry)}
                      onEscape={
                        entry.kind === 'monster'
                          ? () => setEscapingEntry(entry)
                          : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="combat-side__empty">{m.games.combat.reservesEmpty}</p>
            )}
          </section>
        </aside>
      </div>

      <section className="combat-graveyard" aria-labelledby="combat-graveyard-title">
        <header className="combat-side__head">
          <h2 id="combat-graveyard-title">{m.games.combat.graveyardTitle}</h2>
          <span className="combat-side__count">{cemetery.length}</span>
        </header>

        {cemetery.length > 0 ? (
          <ul className="combat-graveyard__list">
            {cemetery.map((entry) => (
              <li className="combat-graveyard__card" key={entry.key}>
                <span className="combat-graveyard__name">{entry.name}</span>
                <span className="combat-graveyard__meta">{entryMeta(entry, m)}</span>
                <button
                  type="button"
                  className="button button--tiny combat-graveyard__revive"
                  onClick={() => revive(entry)}
                >
                  {m.games.combat.revive}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="combat-side__empty">{m.games.combat.graveyardEmpty}</p>
        )}
      </section>

      <ConfirmDialog
        open={escapingEntry !== null}
        title={
          escapingEntry
            ? fill(m.games.combat.escapeTitle, { name: escapingEntry.name })
            : m.games.combat.escapeDefaultTitle
        }
        description={m.games.combat.escapeDescription}
        confirmLabel={m.games.combat.escapeConfirm}
        cancelLabel={m.games.combat.escapeCancel}
        onConfirm={() => void confirmEscape()}
        onCancel={() => setEscapingEntry(null)}
      />
    </main>
  )
}

function QueueCard({
  entry,
  current,
  onDefeat,
  onEscape,
  onHpLive,
  onHpCommit
}: {
  entry: CombatResultEntry
  current: boolean
  onDefeat: () => void
  onEscape?: () => void
  onHpLive: (hitPoints: number) => void
  onHpCommit: (hitPoints: number) => void
}): JSX.Element {
  const { messages: m, fill } = useI18n()

  return (
    <article className={`combat-queue-card${current ? ' combat-queue-card--current' : ''}`}>
      <span className="combat-queue-card__body">
        <span className="combat-queue-card__name">{entry.name}</span>
        {entry.kind === 'monster' && entry.monster ? (
          <span className="combat-queue-card__meta combat-queue-card__hp">
            {m.games.combat.hp}
            <HpEditor
              value={entry.monster.hitPoints}
              label={entry.name}
              onLive={onHpLive}
              onCommit={onHpCommit}
            />
          </span>
        ) : (
          <span className="combat-queue-card__meta">{entryMeta(entry, m)}</span>
        )}
      </span>

      <span className="combat-queue-card__initiative" title={m.games.combat.initiativeTitle}>
        {initiativeLabel(entry)}
      </span>

      {onEscape ? (
        <button
          type="button"
          className="combat-escape-button"
          title={m.games.combat.escape}
          aria-label={fill(m.games.combat.escapeAria, { name: entry.name })}
          onClick={onEscape}
        >
          <IconRun width={15} height={15} />
        </button>
      ) : null}

      {!current ? (
        <button
          type="button"
          className="combat-defeat-button"
          title={m.games.combat.defeat}
          aria-label={fill(m.games.combat.defeatAria, { name: entry.name })}
          onClick={onDefeat}
        >
          <IconSkull width={22} height={22} />
        </button>
      ) : null}
    </article>
  )
}

function HpEditor({
  value,
  label,
  onLive,
  onCommit
}: {
  value: number
  label: string
  onLive: (hitPoints: number) => void
  onCommit: (hitPoints: number) => void
}): JSX.Element {
  const { messages: m, fill } = useI18n()
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  function parse(raw: string): number | null {
    if (!raw.trim()) return null
    const parsed = Number(raw)
    if (!Number.isInteger(parsed)) return null
    if (parsed < HP_MIN || parsed > HP_MAX) return null
    return parsed
  }

  function change(raw: string): void {
    if (!raw.trim()) {
      setDraft('')
      return
    }

    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed < HP_MIN || parsed > HP_MAX) return

    setDraft(raw)
    onLive(parsed)
  }

  function commit(): void {
    const parsed = parse(draft)
    if (parsed === null) {
      setDraft(String(value))
      return
    }
    setDraft(String(parsed))
    onCommit(parsed)
  }

  return (
    <input
      className="input combat-hp-input"
      type="number"
      min={HP_MIN}
      max={HP_MAX}
      inputMode="numeric"
      value={draft}
      aria-label={fill(m.games.combat.hpAria, { name: label })}
      onChange={(event) => change(event.target.value)}
      onBlur={commit}
      onFocus={(event) => event.currentTarget.select()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
    />
  )
}

function ReserveCard({
  entry,
  onJoin,
  onEscape
}: {
  entry: CombatResultEntry
  onJoin: () => void
  onEscape?: () => void
}): JSX.Element {
  const { messages: m, fill } = useI18n()

  return (
    <article className="combat-queue-card combat-queue-card--reserve">
      <span className="combat-queue-card__body">
        <span className="combat-queue-card__name">{entry.name}</span>
        <span className="combat-queue-card__meta">{entryMeta(entry, m)}</span>
      </span>

      <span className="combat-queue-card__initiative" title={m.games.combat.initiativeTitle}>
        {initiativeLabel(entry)}
      </span>

      {onEscape ? (
        <button
          type="button"
          className="combat-escape-button"
          title={m.games.combat.escape}
          aria-label={fill(m.games.combat.escapeAria, { name: entry.name })}
          onClick={onEscape}
        >
          <IconRun width={15} height={15} />
        </button>
      ) : null}

      <button
        type="button"
        className="button button--tiny button--primary combat-queue-card__join"
        onClick={onJoin}
      >
        {m.games.combat.join}
      </button>
    </article>
  )
}

function CombatFocusCard({ entry }: { entry: CombatResultEntry }): JSX.Element {
  const { messages: m, fill } = useI18n()

  if (entry.kind === 'character') {
    const character = entry.character

    return (
      <article className="combat-focus-card">
        <div className="combat-focus-card__art">
          {character?.image ? (
            <img
              src={character.image}
              alt={fill(m.games.combat.portraitAlt, { name: entry.name })}
            />
          ) : (
            <span className="combat-focus-card__initial">{entry.name.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="combat-focus-card__body">
          <p className="combat-focus-card__kicker">{m.games.combat.attackingCharacter}</p>
          <h2>{entry.name}</h2>
          <p className="combat-focus-card__player">
            {fill(m.games.combat.player, {
              name: entry.playerName ?? m.games.combat.noPlayerInline
            })}
          </p>

          <dl className="combat-focus-card__facts">
            <div>
              <dt>{m.games.combat.classLabel}</dt>
              <dd>{character?.className || '—'}</dd>
            </div>
            <div>
              <dt>{m.games.combat.levelLabel}</dt>
              <dd>{character?.level ?? '—'}</dd>
            </div>
            <div>
              <dt>{m.games.combat.raceLabel}</dt>
              <dd>{character?.race || '—'}</dd>
            </div>
          </dl>

          {character && character.statuses.length > 0 ? (
            <div className="combat-focus-card__statuses">
              {character.statuses.map((status) => (
                <span key={status} className="status-tag">
                  {status}
                </span>
              ))}
            </div>
          ) : null}

          <p className="combat-focus-card__initiative">
            {m.games.combat.initiative} <strong>{initiativeLabel(entry)}</strong>
          </p>
        </div>
      </article>
    )
  }

  const monster = entry.monster
  const dead = monster?.hitPoints === 0

  return (
    <article className={`combat-focus-card${dead ? ' combat-focus-card--dead' : ''}`}>
      {dead ? (
        <span
          className="combat-focus-card__dead"
          role="img"
          aria-label={m.games.combat.deadTitle}
          title={m.games.combat.deadTitle}
        >
          <IconCoffin width={32} height={32} />
        </span>
      ) : null}

      <div className="combat-focus-card__art combat-focus-card__art--monster">
        <IconSkull width={72} height={72} />
      </div>

      <div className="combat-focus-card__body">
        <p className="combat-focus-card__kicker">{m.games.combat.attackingMonster}</p>
        <h2>{entry.name}</h2>

        <dl className="combat-focus-card__facts">
          <div>
            <dt>{m.games.combat.hp}</dt>
            <dd className="combat-focus-card__hp">{monster?.hitPoints ?? '—'}</dd>
          </div>
          <div>
            <dt>{m.games.combat.ac}</dt>
            <dd>{monster?.armorClass ?? '—'}</dd>
          </div>
          <div>
            <dt>{m.games.combat.cr}</dt>
            <dd>{monster ? formatChallengeRating(monster.challengeRating) : '—'}</dd>
          </div>
        </dl>

        {monster ? (
          <div className="combat-focus-card__scores">
            {MONSTER_STAT_FIELDS.map((field) => (
              <span className="combat-focus-card__score" key={field.key}>
                <span className="combat-focus-card__score-label">{field.short}</span>
                <strong className="combat-focus-card__score-modifier">
                  {formatModifier(modifierFromScore(monster[field.key]))}
                </strong>
                <span className="combat-focus-card__score-value">
                  {monster[field.key]}
                </span>
              </span>
            ))}
          </div>
        ) : null}

        {monster && monster.statuses.length > 0 ? (
          <div className="combat-focus-card__statuses">
            {monster.statuses.map((status) => (
              <span key={status} className="status-tag">
                {status}
              </span>
            ))}
          </div>
        ) : null}

        {monster && monster.abilities.length > 0 ? (
          <ul className="combat-focus-card__abilities">
            {monster.abilities.map((ability) => (
              <li key={ability.id}>
                <strong>{ability.name}.</strong> {ability.description}
              </li>
            ))}
          </ul>
        ) : (
          <p className="combat-focus-card__no-abilities">{m.games.combat.noAbilities}</p>
        )}

        <p className="combat-focus-card__initiative">
          {m.games.combat.initiative} <strong>{initiativeLabel(entry)}</strong>
        </p>
      </div>
    </article>
  )
}
