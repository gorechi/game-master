import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { validateSvg } from './lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(here, 'icons')
const specPath = join(here, 'spec.json')
const uiPath = join(here, 'ui.html')
const port = Number(process.env.ICON_FORGE_PORT || 5190)
const keyConfigured = Boolean(process.env.DEEPSEEK_API_KEY)

mkdirSync(iconsDir, { recursive: true })

function readSpec() {
  return JSON.parse(readFileSync(specPath, 'utf8'))
}

function writeSpec(spec) {
  writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`)
}

function readState() {
  const spec = readSpec()

  const icons = spec.icons.map((entry) => {
    const file = join(iconsDir, `${entry.id}.svg`)
    const exists = existsSync(file)
    const svg = exists ? readFileSync(file, 'utf8') : null
    const problems = svg ? validateSvg(svg) : ['файл ещё не создан']

    return {
      ...entry,
      exists,
      valid: problems.length === 0,
      problems,
      svg: problems.length === 0 ? svg : null
    }
  })

  return {
    set: spec.set,
    title: spec.title,
    viewBox: spec.viewBox,
    keyConfigured,
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

function runGenerator(id, force) {
  return new Promise((resolve) => {
    const args = [join(here, 'generate.mjs'), '--id', id]
    if (force) args.push('--force')

    const child = spawn(process.execPath, args, {
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

function normalizeEntry(input) {
  const id = String(input.id ?? '')
    .trim()
    .toLowerCase()
  const title = String(input.title ?? '').trim()
  const tags = Array.isArray(input.tags)
    ? input.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : String(input.tags ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)

  if (!/^[a-z0-9-]+$/.test(id)) {
    throw new Error('id может содержать только строчные латинские буквы, цифры и дефис')
  }
  if (!title) throw new Error('Укажи название иконки')

  return { id, title, tags }
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
      const force = Boolean(body.force)
      const spec = readSpec()
      const index = spec.icons.findIndex((icon) => icon.id === entry.id)

      if (index === -1) {
        spec.icons.push(entry)
      } else {
        spec.icons[index] = { ...spec.icons[index], ...entry }
      }
      writeSpec(spec)

      const result = await runGenerator(entry.id, force)
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
