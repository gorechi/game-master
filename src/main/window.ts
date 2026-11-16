import { BrowserWindow, nativeTheme } from 'electron'
import path from 'node:path'
import type { LocaleCode } from '@shared/i18n'
import type { ThemeName } from '@shared/settings'

let mainWindow: BrowserWindow | null = null

const WINDOW_CHROME: Record<ThemeName, { background: string; symbol: string }> = {
  // Должно совпадать с --bg соответствующей темы в renderer.
  dark: { background: '#121016', symbol: '#f2cd7a' },
  light: { background: '#ece0c7', symbol: '#7a4f12' }
}

const TITLEBAR_HEIGHT = 38

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

/** Синхронизирует нативную рамку окна с темой приложения. */
export function applyWindowTheme(theme: ThemeName): void {
  const chrome = WINDOW_CHROME[theme]
  nativeTheme.themeSource = theme

  const win = mainWindow
  if (!win) return

  win.setBackgroundColor(chrome.background)

  if (process.platform === 'win32') {
    win.setTitleBarOverlay({
      color: chrome.background,
      symbolColor: chrome.symbol,
      height: TITLEBAR_HEIGHT
    })
  }
}

export function createMainWindow(
  theme: ThemeName = 'dark',
  locale: LocaleCode = 'ru'
): BrowserWindow {
  const chrome = WINDOW_CHROME[theme]
  nativeTheme.themeSource = theme

  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 960,
    minHeight: 620,
    show: false,
    backgroundColor: chrome.background,
    title: 'Game Master',
    autoHideMenuBar: true,
    // На Windows рисуем свою полосу и нативные кнопки поверх неё.
    // На macOS оставляем «светофоры», на Linux — обычную системную рамку.
    titleBarStyle:
      process.platform === 'darwin'
        ? 'hiddenInset'
        : process.platform === 'win32'
          ? 'hidden'
          : 'default',
    ...(process.platform === 'win32'
      ? {
          titleBarOverlay: {
            color: chrome.background,
            symbolColor: chrome.symbol,
            height: TITLEBAR_HEIGHT
          }
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      additionalArguments: [`--gm-locale=${locale}`]
    }
  })

  mainWindow = win

  win.once('ready-to-show', () => win.show())

  win.on('closed', () => {
    mainWindow = null
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
