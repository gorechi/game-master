import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { validateSvg } from './lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(here, 'icons')
const specPath = join(here, 'spec.json')
const briefsPath = join(here, 'briefs.json')
const uiPath = join(here, 'ui.html')
const port = Number(process.env.ICON_FORGE_PORT || 5190)
const keyConfigured = Boolean(process.env.DEEPSEEK_API_KEY)
const model = process.env.ICON_FORGE_MODEL || 'deepseek-flash'

// Эти иконки передаются модели как эталоны стиля, поэтому их нельзя удалить.
const styleAnchors = new Set(['forest', 'mountains', 'exit-arch'])

mkdirSync(iconsDir, { recursive: true })

function readSpec() {
  return JSON.parse(readFileSync(specPath, 'utf8'))
}

function writeSpec(spec) {
  writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`)
}

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

function normalizeId(value) {
  const id = String(value ?? '')
    .trim()
    .toLowerCase()
  if (!/^[a-z0-9-]+$/.test(id)) {
    throw new Error('id может содержать только строчные латинские буквы, цифры и дефис')
  }
  return id
}

function cleanText(value) {
  const text = String(value ?? '').trim()
  return /^(undefined|null|nan)$/i.test(text) ? '' : text
}

function readState() {
  const spec = readSpec()
  const briefs = readBriefs()

  const icons = spec.icons.map((entry) => {
    const file = join(iconsDir, `${entry.id}.svg`)
    const exists = existsSync(file)
    const svg = exists ? readFileSync(file, 'utf8') : null
    const problems = svg ? validateSvg(svg) : ['файл ещё не создан']
    const meta = briefs[entry.id] ?? {}

    return {
      ...entry,
      exists,
      valid: problems.length === 0,
      problems,
      svg: problems.length === 0 ? svg : null,
      brief: typeof meta.brief === 'string' ? cleanText(meta.brief) : '',
      avoid: typeof meta.avoid === 'string' ? cleanText(meta.avoid) : '',
      directionCount: Array.isArray(meta.directions) ? meta.directions.length : 0,
      lastDirection: typeof meta.lastDirection === 'string' ? meta.lastDirection : '',
      protected: styleAnchors.has(entry.id)
    }
  })

  return {
    set: spec.set,
    title: spec.title,
    viewBox: spec.viewBox,
    keyConfigured,
    model,
    previewExists: existsSync(join(here, 'preview', 'preview.png')),
    icons
  }
}

function json(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  })
  res.end(body)
}

async function readBody(req) {
  let body = ''
  for await (const chunk of req) {
    body += chunk
    if (body.length > 1_000_000) throw new Error('Слишком большой запрос')
  }
  return body ? JSON.parse(body) : {}
}

function runNode(script, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, script), ...args], {
      env: process.env,
      windowsHide: true
    })

    let output = ''
    child.stdout.on('data', (chunk) => {
      output += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      output += chunk.toString()
    })
    child.on('error', (error) => {
      resolve({ ok: false, output: `${output}\n${String(error)}` })
    })
    child.on('close', (code) => {
      resolve({ ok: code === 0, output: output.trim() })
    })
  })
}

function runGenerator(id, options = {}) {
  const args = ['--id', id]
  if (options.force) args.push('--force')
  if (options.variant) args.push('--variant')
  if (options.brief) args.push('--brief', options.brief)
  if (options.avoid) args.push('--avoid', options.avoid)
  return runNode('generate.mjs', args)
}

function normalizeEntry(input) {
  const title = String(input.title ?? '').trim()
  const tags = Array.isArray(input.tags)
    ? input.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : String(input.tags ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)

  if (!title) throw new Error('Укажи название иконки')

  return { id: normalizeId(input.id), title, tags }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      })
      res.end(readFileSync(uiPath))
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/state') {
      json(res, 200, readState())
      return
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/icon/')) {
      const id = decodeURIComponent(url.pathname.slice('/api/icon/'.length)).replace(
        /\.svg$/,
        ''
      )
      const file = join(iconsDir, `${id}.svg`)

      if (!existsSync(file)) {
        json(res, 404, { error: 'Иконка не найдена' })
        return
      }

      res.writeHead(200, {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-store'
      })
      res.end(readFileSync(file))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/validate') {
      const result = await runNode('validate.mjs')
      json(res, 200, { ...result, state: readState() })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/preview') {
      const result = await runNode('preview.mjs')
      json(res, 200, {
        ...result,
        previewUrl: result.ok ? `/preview.png?v=${Date.now()}` : null,
        state: readState()
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/preview.png') {
      const file = join(here, 'preview', 'preview.png')

      if (!existsSync(file)) {
        json(res, 404, { error: 'Превью ещё не собрано' })
        return
      }

      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store'
      })
      res.end(readFileSync(file))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/brief') {
      const body = await readBody(req)
      const id = normalizeId(body.id)
      const briefs = readBriefs()

      briefs[id] = {
        ...briefs[id],
        brief: cleanText(body.brief),
        avoid: cleanText(body.avoid),
        updatedAt: new Date().toISOString()
      }
      writeBriefs(briefs)

      json(res, 200, { state: readState() })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/reset') {
      const body = await readBody(req)
      const id = normalizeId(body.id)
      const briefs = readBriefs()

      briefs[id] = {
        ...briefs[id],
        directions: [],
        lastDirection: '',
        updatedAt: new Date().toISOString()
      }
      writeBriefs(briefs)

      json(res, 200, { state: readState() })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/delete') {
      const body = await readBody(req)
      const id = normalizeId(body.id)

      if (styleAnchors.has(id)) {
        json(res, 400, {
          error: `${id} — эталон стиля для генерации, его нельзя удалить`
        })
        return
      }

      const spec = readSpec()
      const index = spec.icons.findIndex((icon) => icon.id === id)

      if (index === -1) {
        json(res, 404, { error: `В spec.json нет иконки "${id}"` })
        return
      }

      spec.icons.splice(index, 1)
      writeSpec(spec)

      const briefs = readBriefs()
      if (briefs[id]) {
        delete briefs[id]
        writeBriefs(briefs)
      }

      const files = [
        join(iconsDir, `${id}.svg`),
        join(here, 'preview', `rejected-${id}.svg`),
        join(here, 'preview', 'preview.png'),
        join(here, 'preview', 'index.html')
      ]
      for (const file of files) {
        if (existsSync(file)) unlinkSync(file)
      }

      const validation = await runNode('validate.mjs')
      json(res, 200, {
        ok: true,
        validationOk: validation.ok,
        output: `Иконка ${id} удалена.\n${validation.output}`,
        state: readState()
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/generate') {
      if (!keyConfigured) {
        json(res, 400, {
          error:
            'DEEPSEEK_API_KEY не задан. Создай tools/icon-forge/.env и перезапусти сервер.'
        })
        return
      }

      const body = await readBody(req)
      const entry = normalizeEntry(body)
      const brief = cleanText(body.brief)
      const avoid = cleanText(body.avoid)
      const spec = readSpec()
      const index = spec.icons.findIndex((icon) => icon.id === entry.id)

      if (index === -1) {
        spec.icons.push(entry)
      } else {
        spec.icons[index] = { ...spec.icons[index], ...entry }
      }
      writeSpec(spec)

      const briefs = readBriefs()
      briefs[entry.id] = {
        ...briefs[entry.id],
        brief,
        avoid,
        updatedAt: new Date().toISOString()
      }
      writeBriefs(briefs)

      const result = await runGenerator(entry.id, {
        force: Boolean(body.force),
        variant: Boolean(body.variant),
        brief,
        avoid
      })
      json(res, 200, { ...result, state: readState() })
      return
    }

    json(res, 404, { error: 'Не найдено' })
  } catch (error) {
    json(res, 500, { error: error instanceof Error ? error.message : String(error) })
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`\nIcon Forge UI: http://localhost:${port}`)
  console.log(keyConfigured ? 'DeepSeek key: загружен' : 'DeepSeek key: НЕ НАЙДЕН (tools/icon-forge/.env)')
})
