import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateSvg } from './lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const previewDir = join(here, 'preview')
mkdirSync(previewDir, { recursive: true })

const spec = JSON.parse(readFileSync(join(here, 'spec.json'), 'utf8'))
const styleGuide = readFileSync(join(here, 'style.md'), 'utf8')

const apiKey = process.env.DEEPSEEK_API_KEY
const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '')
const model = process.env.ICON_FORGE_MODEL || 'deepseek-chat'

const args = process.argv.slice(2)
const idIndex = args.indexOf('--id')
const requestedId = idIndex === -1 ? null : args[idIndex + 1]
const allMissing = args.includes('--all-missing')
const force = args.includes('--force')

function fail(message) {
  console.error(`\n${message}\n`)
  process.exit(1)
}

if (!apiKey) {
  fail(
    'Не задан DEEPSEEK_API_KEY. Создай tools/icon-forge/.env по образцу .env.example и положи ключ туда. В чат ключ присылать не нужно.'
  )
}

if (!requestedId && !allMissing) {
  fail('Укажи --id <иконка> или --all-missing. Например: npm run icons:generate -- --id swamp')
}

const golden = ['forest', 'mountains', 'exit-arch']
  .map((id) => {
    const file = join(here, 'icons', `${id}.svg`)
    return existsSync(file) ? `=== ${id}.svg ===\n${readFileSync(file, 'utf8')}` : ''
  })
  .filter(Boolean)
  .join('\n\n')

const systemPrompt = `Ты — senior SVG-иконограф и арт-директор интерфейсов.

Ты рисуешь одну SVG-иконку для круглого жетона места на карте настольной D&D-игры.
Жетон 76 px, сама иконка внутри него около 40–48 px. Под жетоном название места.
Фон, круг и рамку рисует интерфейс.

ЖЁСТКИЕ ТЕХНИЧЕСКИЕ ПРАВИЛА

- viewBox="0 0 24 24"
- Корневой SVG: fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
- Только контур. Большие fill-заливки запрещены.
- Никаких <style>, <script>, <image>, <text>, <foreignObject>, href, xlink:href.
- Никаких зашитых цветов: только currentColor и opacity.
- Никаких градиентов, фильтров, теней, фонов, рамок и текста.
- Внутренние отступы 2–3 px от краёв viewBox.
- Иконка должна читаться при 24 px и не быть перегруженной.
- Одинаковая толщина линий у всех элементов.

СТИЛЬ

${styleGuide}

ЭТАЛОНЫ СТИЛЯ

${golden}

ФОРМАТ ОТВЕТА

Верни ТОЛЬКО один SVG в блоке \`\`\`svg ... \`\`\`.
Без объяснений, без markdown-текста вокруг, без нескольких вариантов.
Не сокращай SVG многоточием.`

function buildUserPrompt(entry, repair) {
  if (repair) {
    return `Исправь SVG для иконки «${entry.title}» (${entry.id}).
Проблемы:
${repair.problems.map((problem) => `- ${problem}`).join('\n')}

Предыдущий SVG:
\`\`\`svg
${repair.svg}
\`\`\`

Верни только исправленный SVG в блоке \`\`\`svg ... \`\`\`. Без объяснений.`
  }

  return `Нарисуй иконку:
- id: ${entry.id}
- название: ${entry.title}
- теги: ${entry.tags.join(', ')}

Верни только SVG в блоке \`\`\`svg ... \`\`\`. Никаких пояснений.`
}

function extractSvg(content) {
  const match = content.match(/<svg\b[\s\S]*?<\/svg>/i)
  return match ? match[0].trim() : null
}

async function callDeepSeek(messages) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.25,
      max_tokens: 4000,
      stream: false
    }),
    signal: AbortSignal.timeout(120_000)
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`DeepSeek ответил ${response.status}: ${body.slice(0, 800)}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('DeepSeek вернул пустой ответ')
  }

  return content
}

async function generateIcon(entry) {
  const file = join(here, 'icons', `${entry.id}.svg`)

  if (existsSync(file) && !force) {
    console.log(`SKIP  ${entry.id}: файл уже есть. Используй --force, чтобы перезаписать.`)
    return true
  }

  let messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: buildUserPrompt(entry) }
  ]

  let lastSvg = null
  let lastProblems = []

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    console.log(`GEN   ${entry.id}: попытка ${attempt}/3…`)
    const content = await callDeepSeek(messages)
    const svg = extractSvg(content)

    if (!svg) {
      lastProblems = ['ответ не содержит <svg>...</svg>']
      messages = [
        ...messages,
        { role: 'assistant', content },
        {
          role: 'user',
          content:
            'В ответе нет SVG. Верни только один SVG в блоке ```svg ... ```, без пояснений.'
        }
      ]
      continue
    }

    const problems = validateSvg(svg)

    if (problems.length === 0) {
      writeFileSync(file, `${svg}\n`)
      console.log(`OK    ${entry.id}: сохранено в icons/${entry.id}.svg`)
      return true
    }

    lastSvg = svg
    lastProblems = problems
    console.error(`FAIL  ${entry.id}: ${problems.join('; ')}`)

    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildUserPrompt(entry, { svg, problems }) }
    ]
  }

  if (lastSvg) {
    writeFileSync(join(previewDir, `rejected-${entry.id}.svg`), `${lastSvg}\n`)
  }
  console.error(`\nНе удалось получить валидную иконку ${entry.id}.`)
  console.error(`Проблемы: ${lastProblems.join('; ')}`)
  return false
}

const entries = allMissing
  ? spec.icons.filter((entry) => !existsSync(join(here, 'icons', `${entry.id}.svg`)))
  : spec.icons.filter((entry) => entry.id === requestedId)

if (entries.length === 0) {
  fail(
    requestedId
      ? `В spec.json нет иконки с id "${requestedId}"`
      : 'Все иконки из spec.json уже существуют.'
  )
}

let ok = true
for (const entry of entries) {
  try {
    const result = await generateIcon(entry)
    if (!result) ok = false
  } catch (error) {
    console.error(`ERROR ${entry.id}: ${String(error)}`)
    ok = false
  }
}

if (!ok) {
  console.error('\nЕсть неудачные иконки. Проверь preview/rejected-*.svg и вывод выше.')
  process.exitCode = 1
} else {
  console.log('\nГотово. Теперь запусти:')
  console.log('  npm run icons:validate')
  console.log('  npm run icons:preview')
}
