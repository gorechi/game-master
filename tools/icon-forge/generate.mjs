import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateSvg } from './lib.mjs'
import { pickDirection } from './directions.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const previewDir = join(here, 'preview')
const briefsPath = join(here, 'briefs.json')
mkdirSync(previewDir, { recursive: true })

const spec = JSON.parse(readFileSync(join(here, 'spec.json'), 'utf8'))
const styleGuide = readFileSync(join(here, 'style.md'), 'utf8')

function readBriefs() {
  if (!existsSync(briefsPath)) return {}
  try {
    return JSON.parse(readFileSync(briefsPath, 'utf8'))
  } catch {
    return {}
  }
}

function writeBriefs(briefs) {
  writeFileSync(briefsPath, `${JSON.stringify(briefs, null, 2)}\n`)
}

const apiKey = process.env.DEEPSEEK_API_KEY
const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '')
const model = process.env.ICON_FORGE_MODEL || 'deepseek-chat'

const args = process.argv.slice(2)
const idIndex = args.indexOf('--id')
const requestedId = idIndex === -1 ? null : args[idIndex + 1]
const allMissing = args.includes('--all-missing')
const force = args.includes('--force')
const variant = args.includes('--variant') || args.includes('--fresh')

function cleanText(value) {
  const text = String(value ?? '').trim()
  return /^(undefined|null|nan)$/i.test(text) ? '' : text
}

function readArg(name) {
  const index = args.indexOf(name)
  if (index === -1) return null
  const value = args[index + 1]
  return typeof value === 'string' && !value.startsWith('--') ? cleanText(value) : null
}

const briefOverride = readArg('--brief')
const avoidOverride = readArg('--avoid')

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

СМЫСЛ ИКОНКИ

- Иконка обозначает само место: сооружение, ландшафт или их характерный фрагмент.
- Не заменяй место предметом-метафорой. Для таверны это не кружка и не бокал,
  для магазина — не монета, для кузницы — не один молот. Рисуй место, если
  заказчик прямо не попросил предмет.
- Иконку должны узнавать без подписи. Абстрактные линии, лепестки и росчерки,
  в которых угадывается «что-то», — брак.
- Не рисуй пустую геометрическую фигуру — куб, квадрат или круг — без
  характерных примет конкретного места.
- Не повторяй одну и ту же композицию: в каждом запросе указан новый подход,
  и его нужно соблюдать, пока он не мешает узнаваемости.
- Уточнение заказчика и список «не изображать» важнее любой композиционной
  подсказки. Если подсказка противоречит уточнению или запрету — отмени её
  и выбери ракурс, который соответствует уточнению.

СТИЛЬ

${styleGuide}

ЭТАЛОНЫ СТИЛЯ

${golden}

ФОРМАТ ОТВЕТА

Верни ТОЛЬКО один SVG в блоке \`\`\`svg ... \`\`\`.
Без объяснений, без markdown-текста вокруг, без нескольких вариантов.
Не сокращай SVG многоточием.`

function buildUserPrompt(entry, options = {}) {
  const { repair, brief, avoid, direction } = options

  if (repair) {
    return `Исправь SVG для иконки «${entry.title}» (${entry.id}).
Проблемы:
${repair.problems.map((problem) => `- ${problem}`).join('\n')}
${brief ? `\nУточнение заказчика: ${brief}\n` : ''}
Предыдущий SVG:
\`\`\`svg
${repair.svg}
\`\`\`

Верни только исправленный SVG в блоке \`\`\`svg ... \`\`\`. Без объяснений.`
  }

  const lines = [
    'Нарисуй иконку:',
    `- id: ${entry.id}`,
    `- название: ${entry.title}`,
    `- теги: ${entry.tags.join(', ')}`
  ]

  if (brief) {
    lines.push(
      '',
      'УТОЧНЕНИЕ ЗАКАЗЧИКА (важнее типичных ассоциаций):',
      brief
    )
  }

  if (avoid) {
    lines.push('', 'НЕ ИЗОБРАЖАТЬ (жёсткий запрет):', avoid)
  }

  if (direction) {
    lines.push(
      '',
      'ПОДСКАЗКА КОМПОЗИЦИИ (подчиняется уточнению и запретам):',
      direction.text,
      'Если подсказка противоречит уточнению или запрету — не используй её.'
    )
  }

  lines.push(
    '',
    `ГЛАВНОЕ: иконку «${entry.title}» должны узнавать без подписи. Если выбранный`,
    'подход мешает узнать место, выбери ближайший узнаваемый ракурс того же места.',
    'Силуэт важнее эффектной композиции.'
  )

  lines.push('', 'Верни только SVG в блоке ```svg ... ```. Никаких пояснений.')
  return lines.join('\n')
}

function extractSvg(content) {
  const match = content.match(/<svg\b[\s\S]*?<\/svg>/i)
  return match ? match[0].trim() : null
}

async function callDeepSeek(messages, temperature) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
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

function detectKinds(entry, brief) {
  const text = `${brief} ${entry.title} ${entry.tags.join(' ')} ${entry.id}`

  if (
    /(внутренн|помещен|комнат|интерьер|внутри|\broom\b|\binterior\b|\binside\b|зал\b|кабинет|спальн|кухн|коридор|подземель|шахт[аеуы]?\b|темниц)/i.test(
      text
    ) &&
    !/двор/i.test(text)
  ) {
    return ['interior']
  }

  if (/(снаружи|наружн|фасад|здани|\bbuilding\b|\bfacade\b|\bexterior\b|улиц|двор)/i.test(text)) {
    return ['exterior']
  }

  if (
    /(лес|гор[аыу]?\b|озер|рек[аиу]?\b|мор[ея]\b|полян|долин|берег|остров|пустын|болот|\bforest\b|\bmountain|\blake\b|\briver\b|\bsea\b|\bisland\b|\bdesert\b|\bswamp\b|\bmarsh\b)/i.test(
      text
    )
  ) {
    return ['landscape']
  }

  return []
}

function rememberDirection(id, direction, brief, avoid, resetIds) {
  const briefs = readBriefs()
  const previous = briefs[id] ?? {}
  const used = Array.isArray(previous.directions) ? previous.directions : []
  const nextUsed = resetIds.length > 0
    ? used.filter((directionId) => !resetIds.includes(directionId))
    : used

  briefs[id] = {
    ...previous,
    brief,
    avoid,
    directions: [...nextUsed, direction.id].slice(-40),
    lastDirection: direction.text,
    updatedAt: new Date().toISOString()
  }
  writeBriefs(briefs)
}

async function generateIcon(entry) {
  const file = join(here, 'icons', `${entry.id}.svg`)

  if (existsSync(file) && !force) {
    console.log(`SKIP  ${entry.id}: файл уже есть. Используй --force, чтобы перезаписать.`)
    return true
  }

  const stored = readBriefs()[entry.id] ?? {}
  const brief = cleanText(briefOverride ?? stored.brief)
  const avoid = cleanText(avoidOverride ?? stored.avoid)
  const used = Array.isArray(stored.directions) ? stored.directions : []
  const kinds = detectKinds(entry, brief)
  const { direction, resetIds } = pickDirection(used, kinds)
  const isVariant = variant || (existsSync(file) && force)

  rememberDirection(entry.id, direction, brief, avoid, resetIds)

  console.log(`GEN   ${entry.id}: подход «${direction.text}»`)

  let messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: buildUserPrompt(entry, { brief, avoid, direction }) }
  ]

  let lastSvg = null
  let lastProblems = []

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    console.log(`GEN   ${entry.id}: попытка ${attempt}/3…`)
    const content = await callDeepSeek(messages, isVariant ? 0.85 : 0.5)
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
      {
        role: 'user',
        content: buildUserPrompt(entry, { brief, repair: { svg, problems } })
      }
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
