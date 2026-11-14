import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateSvg } from './lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const spec = JSON.parse(readFileSync(join(here, 'spec.json'), 'utf8'))
const errors = []
const results = []

function checkIcon(entry) {
  const file = join(here, 'icons', `${entry.id}.svg`)

  if (!existsSync(file)) {
    errors.push(`${entry.id}: файл icons/${entry.id}.svg не найден`)
    results.push({ id: entry.id, ok: false })
    return
  }

  const problems = validateSvg(readFileSync(file, 'utf8'))

  if (problems.length > 0) {
    for (const problem of problems) errors.push(`${entry.id}: ${problem}`)
    results.push({ id: entry.id, ok: false })
    return
  }

  results.push({ id: entry.id, ok: true })
}

const ids = new Set()
for (const entry of spec.icons) {
  if (ids.has(entry.id)) errors.push(`${entry.id}: дублирующийся id в spec.json`)
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
