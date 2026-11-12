const MAX_SOURCE_BYTES = 8 * 1024 * 1024
const MAX_DIMENSION = 720

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Не удалось прочитать файл изображения'))
    reader.readAsDataURL(file)
  })
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Не удалось открыть изображение'))
    image.src = source
  })
}

/**
 * Готовит портрет персонажа к хранению в JSON: уменьшает до 720 px
 * по большей стороне и сжимает в webp (с прозрачностью).
 */
export async function prepareCharacterImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Выберите файл изображения (png, jpeg или webp)')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Изображение больше 8 МБ — выберите файл поменьше')
  }

  const source = await readAsDataUrl(file)
  const image = await loadImage(source)

  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Не удалось подготовить изображение')
  }

  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, width, height)

  return canvas.toDataURL('image/webp', 0.88)
}
