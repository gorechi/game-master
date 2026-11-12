import { BrowserWindow } from 'electron'
import path from 'node:path'
import { IPC } from '@shared/api'

let mainWindow: BrowserWindow | null = null

/** Флаги протокола закрытия окна: renderer успевает дописать кампанию на диск. */
let allowClose = false
let flushed = false
let closeTimer: NodeJS.Timeout | null = null
let afterFlush: (() => void) | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 960,
    minHeight: 620,
    show: false,
    backgroundColor: '#14121a',
    title: 'Game Master',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  })

  mainWindow = win

  win.once('ready-to-show', () => win.show())

  win.on('closed', () => {
    mainWindow = null
  })

  win.on('close', (event) => {
    if (allowClose) return

    event.preventDefault()
    beginCloseHandshake(() => win.close())
  })

  // В dev-режиме electron-vite поднимает dev-сервер; в сборке грузим файл.
  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (devServerUrl) {
    void win.loadURL(devServerUrl)
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return win
}

/**
 * Просит renderer сохранить несохранённое и закрыться.
 * Если renderer не ответил (завис/упал) — закрываем принудительно по таймауту.
 */
export function beginCloseHandshake(callback: () => void): void {
  const win = mainWindow
  if (!win) {
    callback()
    return
  }

  if (flushed) {
    allowClose = true
    callback()
    return
  }

  afterFlush = callback
  if (closeTimer) return

  win.webContents.send(IPC.appBeforeClose)
  closeTimer = setTimeout(() => finishClose(), 2500)
}

/** Вызывается из renderer после записи данных (или по таймауту). */
export function finishClose(): void {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }

  flushed = true
  allowClose = true
  mainWindow?.setProgressBar(-1)

  const callback = afterFlush
  afterFlush = null
  callback?.()
}

export function isCloseAllowed(): boolean {
  return allowClose
}
