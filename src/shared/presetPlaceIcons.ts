// Сгенерировано scripts/build-preset-icons.mjs. Не редактировать вручную.
import type { PresetPlaceIcon } from './presetIcons'

export const PRESET_ICON_CATALOG_VERSION = 1

export const PRESET_PLACE_ICONS = [
  {
    key: "test-circle",
    title: "Тестовый круг",
    revision: 1,
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n  <circle cx=\"12\" cy=\"12\" r=\"7\" />\n</svg>"
  },
  {
    key: "test-square",
    title: "Тестовый квадрат",
    revision: 1,
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n  <rect x=\"5\" y=\"5\" width=\"14\" height=\"14\" rx=\"2\" />\n</svg>"
  }
] as const satisfies readonly PresetPlaceIcon[]
