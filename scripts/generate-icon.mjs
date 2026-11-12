/**
 * Генерирует build/icon.png (1024×1024) без внешних зависимостей:
 * тёмный скруглённый квадрат + золотой d20.
 *
 * electron-builder сам конвертирует PNG в .ico (Windows) и .icns (macOS),
 * поэтому достаточно одного исходника. Запуск: npm run icons
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SIZE = 1024
const SS = 3 // суперсэмплинг для сглаживания
const W = SIZE * SS

/* ------------------------------- геометрия ------------------------------ */

const center = SIZE / 2
const R = SIZE * 0.3 // радиус описанной окружности гексагона

function polygon(radius, startDeg, count, offsetX = 0, offsetY = 0) {
  const points = []
  for (let i = 0; i < count; i += 1) {
    const angle = ((startDeg + (360 / count) * i) * Math.PI) / 180
    points.push([center + offsetX + Math.cos(angle) * radius, center + offsetY + Math.sin(angle) * radius])
  }
  return points
}

// Гексагон остриём вверх и вписанный треугольник (классический силуэт d20).
const hexagon = polygon(R, -90, 6)
const triangle = polygon(R, -90, 3)

function insidePolygon(poly, x, y) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function insideRoundedRect(x, y, inset, radius) {
  const min = inset
  const max = SIZE - inset
  if (x < min || y < min || x > max || y > max) return false

  const cx = Math.min(Math.max(x, min + radius), max - radius)
  const cy = Math.min(Math.max(y, min + radius), max - radius)
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2
}

/* --------------------------------- цвета -------------------------------- */

const lerp = (a, b, t) => a + (b - a) * t
const rgb = (hex) => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16)
]

const bgTop = rgb('#231c33')
const bgBottom = rgb('#121017')
const goldTop = rgb('#f0d492')
const goldBottom = rgb('#b98f3f')
const facetTop = rgb('#2a2340')
const facetBottom = rgb('#171320')

function shade(top, bottom, y) {
  const t = Math.min(1, Math.max(0, (y - center * 0.2) / (SIZE * 0.8)))
  return [lerp(top[0], bottom[0], t), lerp(top[1], bottom[1], t), lerp(top[2], bottom[2], t)]
}

/* ------------------------------- растеризация ---------------------------- */

const pixels = Buffer.alloc(SIZE * SIZE * 4)
const samples = SS * SS

for (let py = 0; py < SIZE; py += 1) {
  for (let px = 0; px < SIZE; px += 1) {
    let r = 0
    let g = 0
    let b = 0
    let a = 0

    for (let sy = 0; sy < SS; sy += 1) {
      for (let sx = 0; sx < SS; sx += 1) {
        const x = px + (sx + 0.5) / SS
        const y = py + (sy + 0.5) / SS

        if (!insideRoundedRect(x, y, SIZE * 0.03, SIZE * 0.19)) continue

        let color = shade(bgTop, bgBottom, y)

        if (insidePolygon(hexagon, x, y)) {
          color = shade(goldTop, goldBottom, y)
          if (insidePolygon(triangle, x, y)) {
            color = shade(facetTop, facetBottom, y)
          }
        }

        r += color[0]
        g += color[1]
        b += color[2]
        a += 255
      }
    }

    const index = (py * SIZE + px) * 4
    if (a > 0) {
      // Усредняем premultiplied-цвет, затем возвращаем альфу.
      const coverage = a / samples
      pixels[index] = Math.round(r / (a / 255))
      pixels[index + 1] = Math.round(g / (a / 255))
      pixels[index + 2] = Math.round(b / (a / 255))
      pixels[index + 3] = Math.round(coverage)
    }
  }
}

/* --------------------------------- PNG ---------------------------------- */

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) {
    c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)
  return Buffer.concat([length, typeAndData, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // бит на канал
ihdr[9] = 6 // RGBA

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE)
for (let y = 0; y < SIZE; y += 1) {
  raw[y * (SIZE * 4 + 1)] = 0 // фильтр None
  pixels.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
])

const target = resolve(here, '../build/icon.png')
mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, png)

console.log(`Иконка записана: ${target} (${SIZE}×${SIZE}, ${Math.round(png.length / 1024)} КБ)`)
