import { useState } from 'react'
import type { JSX } from 'react'
import { formatChallengeRating } from '@shared/domain'
import type { CombatResultEntry, CombatStart } from './CombatModal'
import { IconSkull } from '../ui/icons'

interface CombatScreenProps {
  initial: CombatStart
  onFinish: () => void
}

const SCORE_FIELDS = [
  { key: 'strength', label: 'СИЛ' },
  { key: 'dexterity', label: 'ЛОВ' },
  { key: 'intelligence', label: 'ИНТ' },
  { key: 'wisdom', label: 'МДР' },
  { key: 'constitution', label: 'ТЕЛ' },
  { key: 'charisma', label: 'ХАР' }
] as const

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
export function CombatScreen({ initial, onFinish }: CombatScreenProps): JSX.Element {
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

  const current = active.find((entry) => entry.key === currentKey) ?? active[0] ?? null

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
          onClick={onFinish}
        >
          Закончить
        </button>
      </header>

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
  onDefeat
}: {
  entry: CombatResultEntry
  current: boolean
  onDefeat: () => void
}): JSX.Element {
  return (
    <article className={`combat-queue-card${current ? ' combat-queue-card--current' : ''}`}>
      <span className="combat-queue-card__body">
        <span className="combat-queue-card__name">{entry.name}</span>
        <span className="combat-queue-card__meta">{entryMeta(entry)}</span>
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

  return (
    <article className="combat-focus-card">
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
            {SCORE_FIELDS.map((field) => (
              <span className="combat-focus-card__score" key={field.key}>
                <span>{field.label}</span>
                <strong>{monster[field.key]}</strong>
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
