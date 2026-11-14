import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const spec = JSON.parse(readFileSync(join(here, 'spec.json'), 'utf8'))
const errors = []
const results = []

const forbiddenTags = /<(script|style|image|text|foreignObject)\b/i
const forbiddenRefs = /\b(href|xlink:href)\s*=/i
const hardcodedColor = /#[0-9a-f]{3,8}\b|\brgb\s*\(|\bhsl\s*\(/i
const fillAttribute = /\bfill\s*=\s*"([^"]*)"/gi

function fail(id, message) {
  errors.push(`${id}: ${message}`)
}

function checkIcon(entry) {
  const file = join(here, 'icons', `${entry.id}.svg`)
  const problems = []

  if (!existsSync(file)) {
    fail(entry.id, `файл icons/${entry.id}.svg не найден`)
    results.push({ id: entry.id, ok: false })
    return
  }

  const svg = readFileSync(file, 'utf8')
  const root = svg.match(/<svg\b[^>]*>/i)?.[0] ?? ''

  if (!root) problems.push('нет корневого <svg>')
  if (!/viewBox\s*=\s*"0 0 24 24"/.test(root)) problems.push('viewBox должен быть 0 0 24 24')
  if (!/fill\s*=\s*"none"/.test(root)) problems.push('у <svg> должен быть fill="none"')
  if (!/stroke\s*=\s*"currentColor"/.test(root)) problems.push('нет stroke="currentColor"')

  const width = root.match(/stroke-width\s*=\s*"([^"]+)"/)?.[1]
  if (!width || !Number.isFinite(Number(width)) || Number(width) < 1.2 || Number(width) > 2) {
    problems.push('stroke-width должен быть числом 1.2–2')
  }

  if (forbiddenTags.test(svg)) problems.push('запрещённый тег (script/style/image/text/foreignObject)')
  if (forbiddenRefs.test(svg)) problems.push('внешние ссылки href/xlink:href запрещены')
  if (hardcodedColor.test(svg)) problems.push('зашитый цвет: используй currentColor')

  for (const match of svg.matchAll(fillAttribute)) {
    if (match[1] !== 'none') {
      problems.push(`недопустимый fill="${match[1]}" — разрешён только fill="none"`)
    }
  }

  if (!/<(path|circle|rect|line|polyline|polygon)\b/i.test(svg)) {
    problems.push('в иконке нет графических элементов')
  }

  if (problems.length > 0) {
    for (const problem of problems) fail(entry.id, problem)
    results.push({ id: entry.id, ok: false })
    return
  }

  results.push({ id: entry.id, ok: true })
}

const ids = new Set()
for (const entry of spec.icons) {
  if (ids.has(entry.id)) fail(entry.id, 'дублирующийся id в spec.json')
  ids.add(entry.id)
  checkIcon(entry)
}

const manifest = {
  set: spec.set,
  title: spec.title,
  viewBox: spec.viewBox,
  generatedAt: new Date().toISOString(),
  icons: spec.icons.map((entry) => ({
    ...entry,
    file: `icons/${entry.id}.svg`
  }))
}

writeFileSync(join(here, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

console.log(`\nНабор: ${spec.title} (${spec.icons.length} иконок)\n`)
for (const result of results) {
  console.log(`  ${result.ok ? 'OK  ' : 'FAIL'}  ${result.id}`)
}

if (errors.length > 0) {
  console.error('\nОшибки:\n')
  for (const error of errors) console.error(`  - ${error}`)
  process.exitCode = 1
} else {
  console.log('\nВсё чисто: manifest.json обновлён.')
}
