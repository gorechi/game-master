/**
 * Проверка локалей: наборы ключей, плейсхолдеры и формы склонений.
 *
 * TypeScript уже не даст забыть ключ, но не заметит опечатку в `{name}`.
 * Скрипт пригодится, когда появятся другие языки: `npm run i18n:check`.
 */
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const tempDir = await mkdtemp(path.join(tmpdir(), 'gm-i18n-'))
const outfile = path.join(tempDir, 'locales.mjs')

try {
  await build({
    absWorkingDir: root,
    entryPoints: ['src/shared/i18n/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'silent'
  })

  const { DEFAULT_LOCALE, LOCALE_CODES, locales } = await import(
    `${pathToFileURL(outfile).href}?t=${Date.now()}`
  )

  const problems = []
  const baseline = locales[DEFAULT_LOCALE]

  const isPlural = (value) =>
    value && typeof value === 'object' && typeof value.other === 'string'

  const placeholders = (value) => new Set([...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))

  const walk = (base, current, locale, trail) => {
    for (const [key, baseValue] of Object.entries(base)) {
      const where = `${locale}.${[...trail, key].join('.')}`

      if (/[А-Яа-яЁё]/.test(key)) {
        problems.push(`${where}: ключ содержит кириллицу`)
      }

      const currentValue = current?.[key]
      if (currentValue === undefined) {
        problems.push(`${where}: ключ отсутствует`)
        continue
      }

      if (typeof baseValue === 'string') {
        if (typeof currentValue !== 'string' || !currentValue.trim()) {
          problems.push(`${where}: ожидалась непустая строка`)
          continue
        }
        if (/[А-Яа-яЁё]/.test(currentValue)) {
          problems.push(`${where}: кириллица в значении`)
        }

        const expected = placeholders(baseValue)
        const actual = placeholders(currentValue)
        for (const name of expected) {
          if (!actual.has(name)) problems.push(`${where}: нет плейсхолдера {${name}}`)
        }
        for (const name of actual) {
          if (!expected.has(name)) problems.push(`${where}: лишний плейсхолдер {${name}}`)
        }
        continue
      }

      if (isPlural(baseValue)) {
        if (!isPlural(currentValue)) {
          problems.push(`${where}: ожидался объект склонений`)
          continue
        }
        if (!currentValue.other?.trim()) problems.push(`${where}: пустая форма other`)
        for (const [form, text] of Object.entries(currentValue)) {
          if (typeof text !== 'string' || !text.trim()) {
            problems.push(`${where}.${form}: пустая форма склонения`)
            continue
          }
          if (/[А-Яа-яЁё]/.test(text)) {
            problems.push(`${where}.${form}: кириллица в значении`)
          }
        }

        const basePlaceholders = new Set(
          Object.values(baseValue).flatMap((text) =>
            typeof text === 'string' ? [...placeholders(text)] : []
          )
        )
        const currentPlaceholders = new Set(
          Object.values(currentValue).flatMap((text) =>
            typeof text === 'string' ? [...placeholders(text)] : []
          )
        )
        for (const name of basePlaceholders) {
          if (!currentPlaceholders.has(name)) {
            problems.push(`${where}: в склонениях нет плейсхолдера {${name}}`)
          }
        }
        for (const name of currentPlaceholders) {
          if (!basePlaceholders.has(name)) {
            problems.push(`${where}: в склонениях лишний плейсхолдер {${name}}`)
          }
        }
        continue
      }

      if (currentValue && typeof currentValue === 'object') {
        walk(baseValue, currentValue, locale, [...trail, key])
      } else {
        problems.push(`${where}: ожидался объект`)
      }
    }
  }

  for (const locale of LOCALE_CODES) {
    if (locale !== DEFAULT_LOCALE) walk(baseline, locales[locale], locale, [])
  }

  if (problems.length > 0) {
    console.error(problems.join('\n'))
    process.exitCode = 1
  } else {
    console.log(`Локали в порядке: ${LOCALE_CODES.join(', ')}`)
  }
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
