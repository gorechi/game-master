const forbiddenTags = /<(script|style|image|text|foreignObject)\b/i
const forbiddenRefs = /\b(href|xlink:href)\s*=/i
const hardcodedColor = /#[0-9a-f]{3,8}\b|\brgb\s*\(|\bhsl\s*\(/i
const fillAttribute = /\bfill\s*=\s*"([^"]*)"/gi

/** Проверяет SVG по правилам набора. Возвращает список проблем. */
export function validateSvg(svg) {
  const problems = []
  const root = svg.match(/<svg\b[^>]*>/i)?.[0] ?? ''

  if (!root) problems.push('нет корневого <svg>')
  if (!/viewBox\s*=\s*"0 0 24 24"/.test(root)) problems.push('viewBox должен быть 0 0 24 24')
  if (!/fill\s*=\s*"none"/.test(root)) problems.push('у <svg> должен быть fill="none"')
  if (!/stroke\s*=\s*"currentColor"/.test(root)) {
    problems.push('нет stroke="currentColor"')
  }

  const width = root.match(/stroke-width\s*=\s*"([^"]+)"/)?.[1]
  if (!width || !Number.isFinite(Number(width)) || Number(width) < 1.2 || Number(width) > 2) {
    problems.push('stroke-width должен быть числом 1.2–2')
  }

  if (forbiddenTags.test(svg)) {
    problems.push('запрещённый тег (script/style/image/text/foreignObject)')
  }
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

  return problems
}
