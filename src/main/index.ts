import { app, BrowserWindow, session, shell } from 'electron'
import path from 'node:path'
import { bootstrapUserData } from './bootstrap'
import { registerIpcHandlers } from './ipc'
import { registerAutoBackupOnQuit, runAutoBackupIfDue } from './backupService'
import { getSettings } from './storage/settingsStore'
import { setActiveLocale } from '@shared/i18n'
import { createMainWindow, getMainWindow } from './window'

const isDev = !app.isPackaged

// Данные dev-сборки отделены от рабочих данных пользователя.
if (isDev) {
  app.setPath('userData', path.join(app.getPath('appData'), 'Game Master (dev)'))
}

app.setName('Game Master')

if (process.platform === 'win32') {
  app.setAppUserModelId('com.gamemaster.desktop')
}

/** Один экземпляр приложения: второй запуск фокусирует уже открытое окно. */
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = getMainWindow()
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })

  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://') || url.startsWith('http://')) {
        void shell.openExternal(url)
      }
      return { action: 'deny' }
    })

    contents.on('will-navigate', (event, url) => {
      const current = contents.getURL()
      if (!current) return

      try {
        if (new URL(url).origin === new URL(current).origin) return
      } catch {
        // Некорректный URL — просто блокируем навигацию.
      }

      event.preventDefault()
      if (url.startsWith('https://') || url.startsWith('http://')) {
        void shell.openExternal(url)
      }
    })
  })

  app.whenReady().then(async () => {
    // CSP только для собранного приложения — dev-серверу нужен HMR/wss.
    if (!isDev) {
      session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'"
            ]
          }
        })
      })
    }

    registerIpcHandlers()
    registerAutoBackupOnQuit()

    const settings = await getSettings()
    setActiveLocale(settings.locale)

    try {
      await bootstrapUserData()
    } catch (error) {
      // Не мешаем запуску приложения: иконки можно будет добавить позже.
      console.error('Не удалось применить встроенный набор иконок:', error)
    }

    createMainWindow(settings.theme)

    // Бэкап не должен задерживать появление окна.
    void runAutoBackupIfDue('startup').catch((error: unknown) => {
      console.error('Не удалось проверить автоматический бэкап:', error)
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length > 0) return
      void getSettings().then((loaded) => createMainWindow(loaded.theme))
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
