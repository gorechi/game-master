import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { formatChallengeRating, formatModifier, modifierFromScore } from '@shared/domain'
import { errorMessage } from '@renderer/lib/api'
import { MONSTER_STAT_FIELDS } from '@renderer/lib/monsterStats'
import type { CombatResultEntry, CombatStart } from './CombatModal'
import { IconCoffin, IconSkull } from '../ui/icons'

interface CombatScreenProps {
  initial: CombatStart
  onFinish: () => void
  onMonsterHpChange: (monsterId: string, hitPoints: number) => Promise<void>
  /** Сохраняет или снимает отметку «повержен» у участника схватки. */
  onDefeatChange: (entry: CombatResultEntry, defeated: boolean) => Promise<void>
}

const HP_MIN = 0
const HP_MAX = 100000

function sortEntries(entries: readonly CombatResultEntry[]): CombatResultEntry[] {
  return [...entries].sort(
    (a, b) =>
      b.initiative - a.initiative ||
      (b.tieBreaker ?? 0) - (a.tieBreaker ?? 0) ||
      a.name.localeCompare(b.name, 'ru')
  )
}

function initiativeLabel(entry: CombatResultEntry): string {
  return entry.tieBreaker !== null
    ? `${entry.initiative} · ${entry.tieBreaker}`
    : String(entry.initiative)
}

function entryMeta(entry: CombatResultEntry): string {
  if (entry.kind === 'character') return entry.playerName ?? 'Без игрока'
  return `HP ${entry.monster?.hitPoints ?? '—'}`
}

/** Полноэкранный бой: очередь, текущий атакующий и кладбище. */
export function CombatScreen({
  initial,
  onFinish,
  onMonsterHpChange,
  onDefeatChange
}: CombatScreenProps): JSX.Element {
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

  return (
    <main className="combat-screen">
      <header className="combat-screen__head">
        <div>
          <p className="page-kicker">Схватка</p>
          <h1>Очередь инициативы</h1>
        </div>
        <button
          type="button"
          className="button button--danger-solid combat-screen__finish"
          onClick={() => void finishCombat()}
          disabled={finishing}
        >
          {finishing ? 'Заканчиваем…' : 'Закончить'}
        </button>
      </header>

      {saveError ? <p className="notice notice--error combat-screen__save-error">{saveError}</p> : null}

      <div className="combat-screen__main">
        <section className="combat-focus" aria-live="polite">
          {current ? (
            <CombatFocusCard entry={current} />
          ) : (
            <div className="combat-focus__empty">
              <p>В схватке не осталось активных участников.</p>
              <span>Оживите кого-нибудь из кладбища или введите резерв.</span>
            </div>
          )}

          <button
            type="button"
            className="button button--primary combat-next"
            onClick={nextTurn}
            disabled={active.length === 0}
          >
            Следующий
          </button>
        </section>

        <aside className="combat-side">
          <section className="combat-side__section" aria-labelledby="combat-queue-title">
            <header className="combat-side__head">
              <h2 id="combat-queue-title">Очередь схватки</h2>
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
                      onHpLive={(value) => updateHp(entry.key, value)}
                      onHpCommit={(value) => commitHp(entry, value)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="combat-side__empty">Очередь пуста.</p>
            )}
          </section>

          <section
            className="combat-side__section combat-side__section--reserves"
            aria-labelledby="combat-reserves-title"
          >
            <header className="combat-side__head">
              <h2 id="combat-reserves-title">Не участвуют</h2>
              <span className="combat-side__count">{reserves.length}</span>
            </header>

            {reserves.length > 0 ? (
              <ul className="combat-queue combat-queue--reserves">
                {reserves.map((entry) => (
                  <li key={entry.key}>
                    <ReserveCard entry={entry} onJoin={() => join(entry)} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="combat-side__empty">Все добавленные участники уже в схватке.</p>
            )}
          </section>
        </aside>
      </div>

      <section className="combat-graveyard" aria-labelledby="combat-graveyard-title">
        <header className="combat-side__head">
          <h2 id="combat-graveyard-title">Кладбище</h2>
          <span className="combat-side__count">{cemetery.length}</span>
        </header>

        {cemetery.length > 0 ? (
          <ul className="combat-graveyard__list">
            {cemetery.map((entry) => (
              <li className="combat-graveyard__card" key={entry.key}>
                <span className="combat-graveyard__name">{entry.name}</span>
                <span className="combat-graveyard__meta">{entryMeta(entry)}</span>
                <button
                  type="button"
                  className="button button--tiny combat-graveyard__revive"
                  onClick={() => revive(entry)}
                >
                  Оживить
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="combat-side__empty">Пока пусто.</p>
        )}
      </section>
    </main>
  )
}

function QueueCard({
  entry,
  current,
  onDefeat,
  onHpLive,
  onHpCommit
}: {
  entry: CombatResultEntry
  current: boolean
  onDefeat: () => void
  onHpLive: (hitPoints: number) => void
  onHpCommit: (hitPoints: number) => void
}): JSX.Element {
  return (
    <article className={`combat-queue-card${current ? ' combat-queue-card--current' : ''}`}>
      <span className="combat-queue-card__body">
        <span className="combat-queue-card__name">{entry.name}</span>
        {entry.kind === 'monster' && entry.monster ? (
          <span className="combat-queue-card__meta combat-queue-card__hp">
            HP
            <HpEditor
              value={entry.monster.hitPoints}
              label={entry.name}
              onLive={onHpLive}
              onCommit={onHpCommit}
            />
          </span>
        ) : (
          <span className="combat-queue-card__meta">{entryMeta(entry)}</span>
        )}
      </span>

      <span className="combat-queue-card__initiative" title="Инициатива">
        {initiativeLabel(entry)}
      </span>

      <button
        type="button"
        className="button button--tiny button--danger combat-queue-card__defeat"
        onClick={onDefeat}
      >
        Повержен
      </button>
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
      aria-label={`HP: ${label}`}
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
  onJoin
}: {
  entry: CombatResultEntry
  onJoin: () => void
}): JSX.Element {
  return (
    <article className="combat-queue-card combat-queue-card--reserve">
      <span className="combat-queue-card__body">
        <span className="combat-queue-card__name">{entry.name}</span>
        <span className="combat-queue-card__meta">{entryMeta(entry)}</span>
      </span>

      <span className="combat-queue-card__initiative" title="Инициатива">
        {initiativeLabel(entry)}
      </span>

      <button
        type="button"
        className="button button--tiny button--primary combat-queue-card__join"
        onClick={onJoin}
      >
        Вступить
      </button>
    </article>
  )
}

function CombatFocusCard({ entry }: { entry: CombatResultEntry }): JSX.Element {
  if (entry.kind === 'character') {
    const character = entry.character

    return (
      <article className="combat-focus-card">
        <div className="combat-focus-card__art">
          {character?.image ? (
            <img src={character.image} alt={`Портрет: ${entry.name}`} />
          ) : (
            <span className="combat-focus-card__initial">{entry.name.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="combat-focus-card__body">
          <p className="combat-focus-card__kicker">Сейчас атакует · Персонаж</p>
          <h2>{entry.name}</h2>
          <p className="combat-focus-card__player">
            Игрок: {entry.playerName ?? 'без игрока'}
          </p>

          <dl className="combat-focus-card__facts">
            <div>
              <dt>Класс</dt>
              <dd>{character?.className || '—'}</dd>
            </div>
            <div>
              <dt>Уровень</dt>
              <dd>{character?.level ?? '—'}</dd>
            </div>
            <div>
              <dt>Раса</dt>
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
            Инициатива <strong>{initiativeLabel(entry)}</strong>
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
          aria-label="HP 0 — монстр не атакует, нужен спасбросок"
          title="HP 0 — монстр не атакует, нужен спасбросок"
        >
          <IconCoffin width={32} height={32} />
        </span>
      ) : null}

      <div className="combat-focus-card__art combat-focus-card__art--monster">
        <IconSkull width={72} height={72} />
      </div>

      <div className="combat-focus-card__body">
        <p className="combat-focus-card__kicker">Сейчас атакует · Монстр</p>
        <h2>{entry.name}</h2>

        <dl className="combat-focus-card__facts">
          <div>
            <dt>HP</dt>
            <dd className="combat-focus-card__hp">{monster?.hitPoints ?? '—'}</dd>
          </div>
          <div>
            <dt>КЗ</dt>
            <dd>{monster?.armorClass ?? '—'}</dd>
          </div>
          <div>
            <dt>КО</dt>
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
          <p className="combat-focus-card__no-abilities">Без способностей</p>
        )}

        <p className="combat-focus-card__initiative">
          Инициатива <strong>{initiativeLabel(entry)}</strong>
        </p>
      </div>
    </article>
  )
}
