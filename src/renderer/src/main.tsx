import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { readCachedTheme } from './lib/theme'
import './styles.css'
import './theme-manuscript.css'

// Тему ставим до первого рендера, чтобы не было вспышки тёмной темы.
const cachedTheme = readCachedTheme()
if (cachedTheme) {
  document.documentElement.dataset.theme = cachedTheme
}

const container = document.getElementById('root')

if (!container) {
  throw new Error('Не найден корневой элемент приложения')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
)
