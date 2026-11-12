/**
 * Скачивает шрифты для страницы-каталога `typography.html` и генерирует
 * @font-face для подмножеств cyrillic + latin.
 *
 * Запуск: node scripts/fetch-preview-fonts.mjs
 * Результат: src/renderer/public/fonts/*.woff2 + preview-fonts.css
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '../src/renderer/public/fonts')
mkdirSync(outDir, { recursive: true })

const FAMILIES = [
  { family: 'Yeseva One', weights: [400] },
  { family: 'Ruslan Display', weights: [400] },
  { family: 'Oranienbaum', weights: [400] },
  { family: 'Forum', weights: [400] },
  { family: 'Kelly Slab', weights: [400] },
  { family: 'Underdog', weights: [400] },
  { family: 'Alegreya Sans', weights: [400, 500, 700] },
  { family: 'Golos Text', weights: [400, 500, 600] },
  { family: 'Onest', weights: [400, 500, 600] },
  { family: 'Nunito', weights: [400, 600, 700] },
  { family: 'Rubik', weights: [400, 500, 600] },
  { family: 'Manrope', weights: [400, 600, 700] }
]

const SUBSETS = ['cyrillic', 'latin']
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

let css = '/* Сгенерировано scripts/fetch-preview-fonts.mjs — не редактировать вручную. */\n\n'
let files = 0
let bytes = 0

for (const { family, weights } of FAMILIES) {
  const slug = family.toLowerCase().replace(/\s+/g, '-')
  const query = family.replace(/\s+/g, '+')
  const url = `https://fonts.googleapis.com/css2?family=${query}:wght@${weights.join(';')}&display=swap`

  const response = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!response.ok) {
    throw new Error(`${family}: HTTP ${response.status}`)
  }

  const text = await response.text()
  const blocks = text.split('/*').slice(1)

  for (const rawBlock of blocks) {
    const block = `/*${rawBlock}`
    const subset = block.match(/^\/\*\s*([a-z-]+)\s*\*\//)?.[1]
    if (!subset || !SUBSETS.includes(subset)) continue

    const weight = block.match(/font-weight:\s*(\d+)/)?.[1]
    const src = block.match(/url\((https:[^)]+)\)/)?.[1]
    const unicodeRange = block.match(/unicode-range:\s*([^;]+);/)?.[1]

    if (!weight || !src || !unicodeRange) continue

    const fileName = `${slug}-${weight}-${subset}.woff2`
    const fontResponse = await fetch(src, { headers: { 'User-Agent': UA } })
    if (!fontResponse.ok) {
      throw new Error(`${family} ${weight} ${subset}: HTTP ${fontResponse.status}`)
    }

    const buffer = Buffer.from(await fontResponse.arrayBuffer())
    writeFileSync(resolve(outDir, fileName), buffer)

    files += 1
    bytes += buffer.length

    css += `@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url('./${fileName}') format('woff2');
  unicode-range: ${unicodeRange};
}

`
  }

  console.log(`ok ${family}`)
}

writeFileSync(resolve(outDir, 'preview-fonts.css'), css)
console.log(`\nГотово: ${files} файлов, ${Math.round(bytes / 1024)} КБ`)
