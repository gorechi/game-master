import { promises as fs } from 'node:fs'

/**
 * Общие примитивы работы с JSON-файлами на диске.
 * Используются хранилищами игроков, персонажей и настроек.
 */

export class JsonFileError extends Error {
  readonly code: string | undefined

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'JsonFileError'
    this.code = code
  }
}

export async function readJsonFile(file: string): Promise<unknown> {
  let raw: string

  try {
    raw = await fs.readFile(file, 'utf8')
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    throw new JsonFileError(
      code === 'ENOENT' ? 'Файл не найден' : `Не удалось прочитать файл: ${(error as Error).message}`,
      code
    )
  }

  try {
    return JSON.parse(raw) as unknown
  } catch {
    throw new JsonFileError('Файл повреждён: некорректный JSON')
  }
}

/**
 * Атомарная запись: сначала во временный файл, затем rename поверх целевого.
 * Так обрыв питания/падение приложения не оставит полуразрушенный JSON.
 */
export async function writeJsonAtomic(target: string, data: unknown): Promise<void> {
  const payload = `${JSON.stringify(data, null, 2)}\n`
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`

  try {
    await fs.writeFile(tmp, payload, 'utf8')
    await fs.rename(tmp, target)
  } catch (error) {
    await fs.rm(tmp, { force: true }).catch(() => undefined)
    throw error
  }
}

const queues = new Map<string, Promise<unknown>>()

/** Сериализует записи одного файла: две параллельные записи недопустимы. */
export function withFileLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve()
  const run = previous.then(task, task)
  const settled = run.then(
    () => undefined,
    () => undefined
  )

  queues.set(key, settled)
  void settled.then(() => {
    if (queues.get(key) === settled) queues.delete(key)
  })

  return run
}
