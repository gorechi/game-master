import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const electronPath = require('electron')

const here = dirname(fileURLToPath(import.meta.url))
const spec = JSON.parse(readFileSync(join(here, 'spec.json'), 'utf8'))
const previewDir = join(here, 'preview')
mkdirSync(previewDir, { recursive: true })

const icons = spec.icons.map((entry) => ({
  ...entry,
  svg: readFileSync(join(here, 'icons', `${entry.id}.svg`), 'utf8')
}))

function icon(svg, size, className = 'icon') {
  return svg.replace(
    '<svg ',
    `<svg class="${className}" style="width:${size}px;height:${size}px" `
  )
}

function card(entry) {
  return `
    <article class="card">
      <h3>${entry.title} <code>${entry.id}</code></h3>
      <div class="sizes">
        <div class="size">${icon(entry.svg, 24)}<span>24</span></div>
        <div class="size">${icon(entry.svg, 32)}<span>32</span></div>
        <div class="size">${icon(entry.svg, 48)}<span>48</span></div>
      </div>
      <div class="token-row">
        <div class="token">${icon(entry.svg, 42, 'icon icon--token')}</div>
        <span class="token-label">${entry.title}</span>
      </div>
    </article>`
}

function theme(name, className) {
  return `
    <section class="theme ${className}">
      <h2>${name}</h2>
      <div class="cards">${icons.map(card).join('')}</div>
    </section>`
}

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Icon Forge — ${spec.title}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    padding: 28px 32px 36px;
    font-family: "Segoe UI", system-ui, sans-serif;
    background: #e9e5dc;
    color: #2b241c;
  }
  h1 { margin: 0 0 4px; font-size: 24px; }
  .caption { margin: 0 0 22px; font-size: 12px; color: #7b6c58; }
  .themes { display: grid; gap: 20px; }
  .theme { padding: 22px; border-radius: 18px; }
  .theme--light {
    color: #7a4f12;
    background-color: #ece0c7;
    background-image:
      radial-gradient(1200px 720px at 10% -14%, rgba(255,253,245,.9), transparent 62%),
      repeating-linear-gradient(0deg, rgba(120,88,45,.035) 0 1px, transparent 1px 30px);
  }
  .theme--dark { color: #d8b25c; background: #17131f; }
  .theme h2 {
    margin: 0 0 14px;
    font-size: 12px;
    letter-spacing: .12em;
    text-transform: uppercase;
    opacity: .8;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }
  .card {
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(120,88,45,.22);
    min-width: 0;
  }
  .theme--dark .card {
    border-color: rgba(216,178,92,.2);
    background: rgba(255,255,255,.025);
  }
  .card h3 {
    margin: 0 0 10px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card h3 code { font-size: 10px; opacity: .5; font-weight: 400; }
  .sizes { display: flex; align-items: flex-end; gap: 12px; min-height: 54px; margin-bottom: 12px; }
  .size { display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 9px; opacity: .6; }
  .icon { display: block; overflow: visible; }
  .token-row { display: flex; align-items: center; gap: 10px; }
  .token {
    display: grid; place-items: center; width: 76px; height: 76px; flex: none;
    border-radius: 50%;
    border: 1px solid rgba(122,86,44,.45);
    background: radial-gradient(circle at 35% 28%, rgba(255,255,255,.35), transparent 42%), linear-gradient(160deg, #fdf6e6, #e8d8b8);
    box-shadow: 0 9px 20px rgba(74,52,26,.18);
  }
  .theme--dark .token {
    border-color: rgba(216,178,92,.55);
    background: radial-gradient(circle at 35% 28%, rgba(255,255,255,.12), transparent 42%), linear-gradient(160deg, #2a2338, #1d1828);
    box-shadow: 0 9px 22px rgba(0,0,0,.4);
  }
  .token .icon { width: 42px; height: 42px; }
  .token-label {
    display: block; max-width: 96px; padding: 2px 9px; border-radius: 999px;
    border: 1px solid rgba(122,86,44,.35); font-size: 11px; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .theme--dark .token-label { border-color: rgba(216,178,92,.3); }
</style>
</head>
<body>
  <h1>${spec.title}</h1>
  <p class="caption">Icon Forge · ${icons.length} иконок · 24 / 32 / 48 px · жетон 76 px · currentColor</p>
  <div class="themes">${theme('Светлая тема', 'theme--light')}${theme('Тёмная тема', 'theme--dark')}</div>
</body>
</html>`

writeFileSync(join(previewDir, 'index.html'), html)

const result = spawnSync(
  electronPath,
  [join(here, 'capture-preview.cjs'), join(previewDir, 'index.html'), join(previewDir, 'preview.png')],
  { stdio: 'inherit' }
)

if (result.status !== 0) {
  console.error('Не удалось сделать preview.png')
  process.exitCode = result.status ?? 1
} else {
  console.log(`\nПревью: ${join(previewDir, 'preview.png')}`)
}
