import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateSvg } from '../tools/icon-forge/lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = dirname(here)
const presetDir = join(root, 'preset-icons')
const manifestPath = join(presetDir, 'manifest.json')
const outputPath = join(root, 'src/shared/presetPlaceIcons.ts')
const checkOnly = process.argv.includes('--check')

function fail(message) {
  console.error(`\n${message}\n`)
  process.exit(1)
}

if (!existsSync(manifestPath)) {
  fail('Не найден preset-icons/manifest.json')
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const catalogVersion = Number(manifest.catalogVersion)

if (!Number.isInteger(catalogVersion) || catalogVersion < 1) {
  fail('catalogVersion в preset-icons/manifest.json должен быть целым числом от 1')
}

if (!Array.isArray(manifest.icons)) {
  fail('В preset-icons/manifest.json поле icons должно быть массивом')
}

const keys = new Set()
const entries = []

for (const item of manifest.icons) {
  const key = String(item.key ?? '').trim()
  const title = String(item.title ?? '').trim()
  const file = String(item.file ?? '').trim()
  const revision = Number(item.revision)

  if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) {
    fail(`Недопустимый ключ иконки: "${key}". Разрешены строчные латинские буквы, цифры и дефис.`)
  }
  if (keys.has(key)) {
    fail(`Ключ "${key}" повторяется в наборе`)
  }
  keys.add(key)

  if (!title) fail(`У иконки "${key}" нет title`)
  if (!Number.isInteger(revision) || revision < 1) {
    fail(`У иконки "${key}" revision должен быть целым числом от 1`)
  }
  if (!file || file.includes('..') || file.includes('/') || file.includes('\\')) {
    fail(`У иконки "${key}" некорректное имя файла`)
  }

  const filePath = join(presetDir, file)
  if (!existsSync(filePath)) {
    fail(`Не найден файл preset-icons/${file}`)
  }

  const svg = readFileSync(filePath, 'utf8').trim()
  if (svg.length > 20_000) {
    fail(`Иконка "${key}" больше 20 КБ`)
  }

  const problems = validateSvg(svg)
  if (problems.length > 0) {
    fail(`Иконка "${key}" не прошла проверку:\n- ${problems.join('\n- ')}`)
  }

  entries.push({ key, title, revision, svg })
}

function renderCatalog() {
  const body = entries
    .map(
      (entry) => `  {
    key: ${JSON.stringify(entry.key)},
    title: ${JSON.stringify(entry.title)},
    revision: ${entry.revision},
    svg: ${JSON.stringify(entry.svg)}
  }`
    )
    .join(',\n')

  return `// Сгенерировано scripts/build-preset-icons.mjs. Не редактировать вручную.
import type { PresetPlaceIcon } from './presetIcons'

export const PRESET_ICON_CATALOG_VERSION = ${catalogVersion}

export const PRESET_PLACE_ICONS = [
${body}
] as const satisfies readonly PresetPlaceIcon[]
`
}

const next = renderCatalog()
const previous = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : ''

if (checkOnly) {
  if (previous === next) {
    console.log(`Набор актуален: ${entries.length} иконок, версия ${catalogVersion}.`)
    process.exit(0)
  }
  console.error('Файл src/shared/presetPlaceIcons.ts устарел. Запусти npm run presets:build.')
  process.exit(1)
}

const previousEntries = new Map()
const previousEntryRe =
  /key: "([^"]+)",\s*title: "(?:\\.|[^"\\])*",\s*revision: (\d+),\s*svg: ("(?:\\.|[^"\\])*")/g

for (const match of previous.matchAll(previousEntryRe)) {
  try {
    previousEntries.set(match[1], {
      revision: Number(match[2]),
      svg: JSON.parse(match[3])
    })
  } catch {
    fail('Не удалось прочитать предыдущий сгенерированный каталог. Удали его и собери заново.')
  }
}

for (const entry of entries) {
  const previousEntry = previousEntries.get(entry.key)
  if (!previousEntry) continue

  if (entry.revision < previousEntry.revision) {
    fail(
      `У иконки "${entry.key}" revision уменьшился с ${previousEntry.revision} до ${entry.revision}.`
    )
  }

  if (entry.revision === previousEntry.revision && entry.svg !== previousEntry.svg) {
    fail(
      `У иконки "${entry.key}" изменилась картинка, но revision остался ${entry.revision}. ` +
        'Подними revision, иначе приложение не обновит её у пользователей.'
    )
  }
}

const nextKeys = new Set(entries.map((entry) => entry.key))
const added = entries.filter((entry) => !previousEntries.has(entry.key)).map((entry) => entry.key)
const changed = entries
  .filter(
    (entry) =>
      previousEntries.has(entry.key) &&
      previousEntries.get(entry.key).revision !== entry.revision
  )
  .map((entry) => entry.key)
const removed = [...previousEntries.keys()].filter((key) => !nextKeys.has(key))

writeFileSync(outputPath, next)

console.log(`\nНабор иконок: ${entries.length} шт., версия каталога ${catalogVersion}`)
if (added.length > 0) console.log(`  добавлено: ${added.join(', ')}`)
if (changed.length > 0) console.log(`  новые версии: ${changed.join(', ')}`)
if (removed.length > 0) console.log(`  убрано из набора: ${removed.join(', ')}`)
if (added.length + changed.length + removed.length === 0) {
  console.log('  состав набора не изменился')
}
console.log('\nЕсли картинка изменилась, не забудь поднять revision этой иконки.')
console.log(`Записано: ${outputPath}\n`)
