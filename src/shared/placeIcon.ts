import { fill, m } from './i18n'

/**
 * Правила иконок мест и автоматическая починка SVG.
 *
 * Функции не зависят от Electron: их используют и renderer, и main.
 * Иконка хранится как inline-SVG и должна быть безопасной: только
 * простые фигуры, currentColor и никаких внешних ссылок.
 */

const ALLOWED_TAGS = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'rect',
  'line',
  'polyline',
  'polygon'
])

const DRAWABLE_TAGS = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon'])

/** Служебные элементы, которые не рисуют и мешают только проверке. */
const SERVICE_TAGS = ['title', 'desc', 'metadata', 'defs']

const ALLOWED_ATTRS = new Set([
  'xmlns',
  'viewbox',
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'fill-rule',
  'vector-effect',
  'opacity',
  'transform',
  'd',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'width',
  'height',
  'points'
])

/** Короткая формулировка требований — показывается пользователю. */
export function placeIconRequirements(): string {
  return m().realms.placeIcon.requirements
}

export interface PlaceIconCheck {
  ok: boolean
  problems: string[]
}

export interface PlaceIconRepair {
  ok: boolean
  svg: string | null
  /** Что пришлось изменить, чтобы иконка стала допустимой. */
  fixes: string[]
  /** Почему починить не получилось. */
  problems: string[]
}

interface OpenTag {
  name: string
  attrs: Array<[string, string]>
  selfClosing: boolean
  raw: string
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function formatNumber(value: number): string {
  return String(Number(value.toFixed(4)))
}

function parseAttrs(raw: string): Array<[string, string]> {
  const attrs: Array<[string, string]> = []
  const pattern = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

  for (const match of raw.matchAll(pattern)) {
    attrs.push([match[1]!, match[2] ?? match[3] ?? ''])
  }

  return attrs
}

function parseOpenTag(raw: string): OpenTag | null {
  const match = raw.match(/^<\s*([a-zA-Z][\w:-]*)([\s\S]*?)\/?\s*>$/)
  if (!match) return null

  return {
    name: match[1]!.toLowerCase(),
    attrs: parseAttrs(match[2] ?? ''),
    selfClosing: /\/\s*>$/.test(raw),
    raw
  }
}

function attr(attrs: Array<[string, string]>, name: string): string | undefined {
  const wanted = name.toLowerCase()
  for (const [key, value] of attrs) {
    if (key.toLowerCase() === wanted) return value
  }
  return undefined
}

function serializeTag(tag: OpenTag): string {
  const attrs = tag.attrs
    .map(([key, value]) => ` ${key}="${escapeAttr(value)}"`)
    .join('')
  return `<${tag.name}${attrs}${tag.selfClosing ? ' /' : ''}>`
}

function extractRoot(source: string): { openTag: OpenTag; inner: string } | null {
  const openMatch = source.match(/<svg\b[^>]*>/i)
  if (!openMatch || openMatch.index === undefined) return null
  if (/\/\s*>$/.test(openMatch[0])) return null

  const closeIndex = source.toLowerCase().lastIndexOf('</svg>')
  if (closeIndex < openMatch.index + openMatch[0].length) return null

  const openTag = parseOpenTag(openMatch[0])
  if (!openTag) return null

  return {
    openTag,
    inner: source.slice(openMatch.index + openMatch[0].length, closeIndex)
  }
}

function removeServiceElement(inner: string, tag: string): { html: string; removed: boolean } {
  const paired = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi')
  const selfClosing = new RegExp(`<${tag}\\b[^>]*?\\/\\s*>`, 'gi')
  const html = inner.replace(paired, '').replace(selfClosing, '')

  return { html, removed: html !== inner }
}

function parseNumbers(value: string): number[] {
  return value
    .trim()
    .split(/[\s,]+/)
    .map((part) => Number(part))
    .filter((number) => Number.isFinite(number))
}

function textContentWithoutTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, '')
}

/**
 * Проверяет готовую SVG-иконку. Возвращает список проблем для пользователя.
 */
export function validatePlaceIcon(svg: string): PlaceIconCheck {
  const problems: string[] = []
  const messages = m().realms.placeIcon
  const source = svg.trim()

  if (!source) return { ok: false, problems: [messages.emptyFile] }
  if (source.length > 20_000) {
    problems.push(messages.tooLarge)
  }
  if (!source.startsWith('<svg') || !/<\/svg>\s*$/i.test(source)) {
    return { ok: false, problems: [messages.noWholeSvg] }
  }
  if ((source.match(/<svg\b/gi) ?? []).length !== 1) {
    problems.push(messages.nestedSvg)
  }

  const openMatch = source.match(/^<svg\b([^>]*)>/i)
  const root = openMatch ? parseOpenTag(openMatch[0]) : null
  if (!root) return { ok: false, problems: [messages.rootUnreadable] }

  if (attr(root.attrs, 'viewBox') !== '0 0 24 24') {
    problems.push(messages.viewBoxRequired)
  }
  if (attr(root.attrs, 'fill') !== 'none') {
    problems.push(messages.rootFill)
  }
  if (attr(root.attrs, 'stroke') !== 'currentColor') {
    problems.push(messages.rootStroke)
  }

  const strokeWidth = Number(attr(root.attrs, 'stroke-width'))
  if (!Number.isFinite(strokeWidth) || strokeWidth < 1.2 || strokeWidth > 2) {
    problems.push(messages.strokeWidthRange)
  }
  if (attr(root.attrs, 'stroke-linecap') !== 'round') {
    problems.push(messages.linecapRound)
  }
  if (attr(root.attrs, 'stroke-linejoin') !== 'round') {
    problems.push(messages.linejoinRound)
  }

  if (/\b(url|href|xlink:href)\s*\(/i.test(source)) {
    problems.push(messages.externalLinks)
  }

  // Корневой тег тоже проверяем: обработчики вроде onload недопустимы.
  for (const [rawName, value] of root.attrs) {
    const name = rawName.toLowerCase()
    if (name === 'xmlns') continue
    if (name.startsWith('on') || name === 'style' || name === 'href' || name === 'xlink:href') {
      problems.push(fill(messages.attrForbidden, { name: rawName }))
      continue
    }
    if (!ALLOWED_ATTRS.has(name)) {
      problems.push(fill(messages.attrUnsupported, { name: rawName }))
    }
    if (value.includes('url(')) {
      problems.push(messages.externalLinks)
    }
  }

  const inner = source.slice(openMatch![0].length, source.lastIndexOf('</svg>'))
  const tags = [...inner.matchAll(/<\s*([a-zA-Z][\w:-]*)/g)]
  let drawableCount = 0

  for (const match of tags) {
    const name = match[1]!.toLowerCase()
    if (!ALLOWED_TAGS.has(name)) {
      problems.push(fill(messages.elementUnsupported, { name }))
    }
    if (name === 'svg') {
      problems.push(messages.nestedSvg)
    }
    if (DRAWABLE_TAGS.has(name)) drawableCount += 1
  }

  for (const tagMatch of inner.matchAll(/<[^>]+>/g)) {
    const tag = parseOpenTag(tagMatch[0])
    if (!tag) continue

    for (const [rawName, value] of tag.attrs) {
      const name = rawName.toLowerCase()

      if (name.startsWith('on') || name === 'style' || name === 'href' || name === 'xlink:href') {
        problems.push(fill(messages.attrForbidden, { name: rawName }))
        continue
      }
      if (!ALLOWED_ATTRS.has(name)) {
        problems.push(fill(messages.attrUnsupported, { name: rawName }))
        continue
      }
      if (value.includes('url(')) {
        problems.push(messages.externalLinks)
      }
      if (name === 'fill' && value.trim().toLowerCase() !== 'none') {
        problems.push(messages.fillForbidden)
      }
      if (name === 'stroke' && value.trim().toLowerCase() !== 'currentcolor') {
        problems.push(messages.strokeInherit)
      }
      if (name === 'stroke-width') {
        const width = Number(value)
        if (!Number.isFinite(width) || width < 1.2 || width > 2) {
          problems.push(messages.strokeWidthRange)
        }
      }
      if (name === 'vector-effect' && value !== 'non-scaling-stroke') {
        problems.push(messages.vectorEffect)
      }
    }
  }

  if (textContentWithoutTags(inner)) {
    problems.push(messages.textForbidden)
  }
  if (drawableCount === 0) {
    problems.push(messages.noOutline)
  }

  return { ok: problems.length === 0, problems }
}

/**
 * Пытается привести иконку к требованиям, не перерисовывая её:
 * убирает служебные элементы и лишние атрибуты, чинит цвета,
 * добавляет обязательные атрибуты и при необходимости масштабирует
 * исходный viewBox до 24×24.
 */
export function repairPlaceIcon(source: string): PlaceIconRepair {
  const fixes = new Set<string>()
  const messages = m().realms.placeIcon
  const fail = (problems: string[]): PlaceIconRepair => ({
    ok: false,
    svg: null,
    fixes: [...fixes],
    problems
  })

  let text = source.replace(/^\uFEFF/, '').trim()
  if (!text) return fail([messages.emptyFile])

  const withoutJunk = text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^<\?xml[\s\S]*?\?>/i, '')
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .trim()

  if (withoutJunk !== text) {
    fixes.add(messages.fixRemovedJunk)
    text = withoutJunk
  }

  const extracted = extractRoot(text)
  if (!extracted) {
    return fail([messages.noWholeSvg])
  }

  const rootAttrs = extracted.openTag.attrs
  let inner = extracted.inner

  for (const tag of SERVICE_TAGS) {
    const result = removeServiceElement(inner, tag)
    if (result.removed) fixes.add(messages.fixServiceElements)
    inner = result.html
  }

  const tagNames = [...inner.matchAll(/<\s*([a-zA-Z][\w:-]*)/g)].map((match) =>
    match[1]!.toLowerCase()
  )

  for (const name of tagNames) {
    if (name === 'svg') {
      return fail([messages.nestedSvgRepair])
    }
    if (!ALLOWED_TAGS.has(name)) {
      return fail([fill(messages.unsafeElement, { name })])
    }
  }

  if (/\burl\s*\(/i.test(inner)) {
    return fail([messages.gradientLinks])
  }

  const viewBoxValue =
    attr(rootAttrs, 'viewBox') ??
    (Number(attr(rootAttrs, 'width')) > 0 && Number(attr(rootAttrs, 'height')) > 0
      ? `0 0 ${attr(rootAttrs, 'width')} ${attr(rootAttrs, 'height')}`
      : null)

  if (!viewBoxValue) {
    return fail([messages.missingViewBox])
  }

  const box = parseNumbers(viewBoxValue)
  if (box.length !== 4 || box[2]! <= 0 || box[3]! <= 0) {
    return fail([messages.viewBoxNumbers])
  }

  const [minX, minY, boxWidth, boxHeight] = box as [number, number, number, number]
  const scale = 24 / Math.max(boxWidth, boxHeight)
  const needsScale =
    Math.abs(minX) > 0.0001 || Math.abs(minY) > 0.0001 || Math.abs(scale - 1) > 0.0001

  let removedAttributes = false
  let flattenedFills = false
  let recoloredStrokes = false
  let fixedWidths = false
  let removedBackground = false

  inner = inner.replace(/<([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g, (full) => {
    const tag = parseOpenTag(full)
    if (!tag) return full

    // Плашка на весь холст — это фон, а не часть иконки.
    if (tag.name === 'rect' && !attr(tag.attrs, 'rx') && !attr(tag.attrs, 'ry')) {
      const x = Number(attr(tag.attrs, 'x') ?? 0)
      const y = Number(attr(tag.attrs, 'y') ?? 0)
      const width = Number(attr(tag.attrs, 'width'))
      const height = Number(attr(tag.attrs, 'height'))

      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        x <= minX + 0.01 &&
        y <= minY + 0.01 &&
        x + width >= minX + boxWidth - 0.01 &&
        y + height >= minY + boxHeight - 0.01
      ) {
        removedBackground = true
        return ''
      }
    }

    const attrs: Array<[string, string]> = []

    for (const [rawName, rawValue] of tag.attrs) {
      const name = rawName.toLowerCase()
      const value = rawValue.trim()

      if (
        name.startsWith('on') ||
        name === 'style' ||
        name === 'href' ||
        name === 'xlink:href' ||
        name === 'class' ||
        name === 'id' ||
        name === 'xmlns' ||
        !ALLOWED_ATTRS.has(name)
      ) {
        removedAttributes = true
        continue
      }

      if (name === 'fill') {
        if (value.toLowerCase() !== 'none') {
          flattenedFills = true
          attrs.push(['fill', 'none'])
        } else {
          attrs.push(['fill', 'none'])
        }
        continue
      }

      if (name === 'stroke') {
        if (value.toLowerCase() !== 'currentcolor') {
          recoloredStrokes = true
        }
        attrs.push(['stroke', 'currentColor'])
        continue
      }

      if (name === 'stroke-width') {
        const width = Number(value)
        if (!Number.isFinite(width) || width < 1.2 || width > 2) {
          fixedWidths = true
          attrs.push(['stroke-width', '1.5'])
        } else {
          attrs.push(['stroke-width', value])
        }
        continue
      }

      if (name === 'vector-effect') {
        if (value !== 'non-scaling-stroke') {
          removedAttributes = true
          continue
        }
        attrs.push(['vector-effect', value])
        continue
      }

      if (name === 'opacity') {
        const opacity = Number(value)
        if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
          removedAttributes = true
          continue
        }
        attrs.push(['opacity', value])
        continue
      }

      if (name === 'fill-rule' && value !== 'nonzero' && value !== 'evenodd') {
        removedAttributes = true
        continue
      }

      attrs.push([name, rawValue])
    }

    if (needsScale && DRAWABLE_TAGS.has(tag.name) && !attrs.some(([key]) => key === 'vector-effect')) {
      attrs.push(['vector-effect', 'non-scaling-stroke'])
    }

    return serializeTag({ ...tag, attrs })
  })

  if (removedAttributes) fixes.add(messages.fixAttributes)
  if (flattenedFills) fixes.add(messages.fixFills)
  if (recoloredStrokes) fixes.add(messages.fixStrokes)
  if (fixedWidths) fixes.add(messages.fixStrokeWidth)
  if (removedBackground) fixes.add(messages.fixBackground)

  if (needsScale) {
    const translateX = formatNumber((24 - boxWidth * scale) / 2 - minX * scale)
    const translateY = formatNumber((24 - boxHeight * scale) / 2 - minY * scale)
    inner = `<g transform="translate(${translateX} ${translateY}) scale(${formatNumber(scale)})">${inner}</g>`
    fixes.add(messages.fixScale)
  }

  const rootWidth = Number(attr(rootAttrs, 'stroke-width'))
  const strokeWidth = Number.isFinite(rootWidth) && rootWidth >= 1.2 && rootWidth <= 2 ? rootWidth : 1.5
  if (strokeWidth !== rootWidth) fixes.add(messages.fixStrokeWidth)

  if (attr(rootAttrs, 'fill') !== 'none' || attr(rootAttrs, 'stroke') !== 'currentColor') {
    fixes.add(messages.fixRequiredAttrs)
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${formatNumber(strokeWidth)}" stroke-linecap="round" stroke-linejoin="round">`,
    inner.trim(),
    '</svg>'
  ].join('')

  const check = validatePlaceIcon(svg)
  if (!check.ok) {
    return fail(check.problems)
  }

  return { ok: true, svg, fixes: [...fixes], problems: [] }
}
