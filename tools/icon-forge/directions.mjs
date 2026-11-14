/**
 * Композиционные подходы для генерации иконок.
 *
 * Модель при каждом запросе получает один случайный подход, которого ещё не
 * было у этой иконки. Это ломает «залипание» на одной и той же картинке:
 * вместо повторения одного силуэта меняется сама композиция.
 *
 * Подходы намеренно конкретные и предметные. Абстрактные художественные
 * схемы («диагональ», «негативное пространство») модель понимает как
 * разрешение рисовать что угодно и выдаёт нечитаемый набор линий.
 *
 * `kinds` ограничивает выбор: если в уточнении написано «внутреннее
 * помещение», модель не получит подсказку про фасад или крышу.
 */
export const directions = [
  {
    id: 'facade-front',
    kinds: ['exterior'],
    text: 'Фронтальный фасад: вход по центру, окна симметрично, крыша и труба.'
  },
  {
    id: 'facade-angle',
    kinds: ['exterior'],
    text: 'Фасад в три четверти: видны две стены, вход сбоку, лёгкая перспектива.'
  },
  {
    id: 'roofline',
    kinds: ['exterior'],
    text: 'Силуэт крыши и труб крупным планом, стены намечены одной линией.'
  },
  {
    id: 'cutaway',
    kinds: ['interior', 'exterior'],
    text: 'Разрез сооружения: открытая стена показывает внутреннее пространство.'
  },
  {
    id: 'entrance',
    kinds: ['exterior'],
    text: 'Крупный вход: арка, дверь, ступени; остальное сооружение уходит за край.'
  },
  {
    id: 'gate',
    kinds: ['exterior'],
    text: 'Ворота или проём в стене как главный элемент, по бокам — опоры.'
  },
  {
    id: 'hanging-sign',
    kinds: ['exterior'],
    text: 'Вывеска на кронштейне без надписи и фрагмент стены как опора.'
  },
  {
    id: 'archway-view',
    kinds: ['exterior'],
    text: 'Вид через арку или проём: края кадра образуют вход, внутри видно место.'
  },
  {
    id: 'isometric',
    kinds: ['exterior', 'plan'],
    text: 'Изометрический объём: сооружение или участок местности под углом сверху.'
  },
  {
    id: 'top-down',
    kinds: ['plan', 'landscape'],
    text: 'Вид сверху, как условный знак на карте: контур и несколько внутренних линий.'
  },
  {
    id: 'horizon',
    kinds: ['landscape'],
    text: 'Линия горизонта: передний план и дальний силуэт, ощущение глубины.'
  },
  {
    id: 'panorama',
    kinds: ['landscape'],
    text: 'Широкая панорама: линия земли, несколько объектов, дальний план.'
  },
  {
    id: 'path',
    kinds: ['landscape'],
    text: 'Дорога или тропа уходит вглубь, по сторонам — характерные объекты.'
  },
  {
    id: 'close-up',
    kinds: ['generic'],
    text: 'Крупный фрагмент, по которому сразу узнаётся место, а не абстрактные линии.'
  },
  {
    id: 'silhouette',
    kinds: ['generic'],
    text: 'Цельный силуэт без внутренних деталей: только контур и 2–3 акцента.'
  },
  {
    id: 'layers',
    kinds: ['landscape', 'generic'],
    text: 'Три плана: передний, средний и дальний, каждый с понятным объектом.'
  },
  {
    id: 'symmetry',
    kinds: ['generic', 'exterior'],
    text: 'Строгая осевая симметрия: центральный элемент и парные детали.'
  },
  {
    id: 'vertical-section',
    kinds: ['exterior'],
    text: 'Вертикальный срез: подземная часть, основание и верх сооружения.'
  },
  {
    id: 'interior',
    kinds: ['interior'],
    text: 'Внутренний вид: пол, стены, дверь или окно, один предмет обстановки.'
  },
  {
    id: 'interior-corner',
    kinds: ['interior'],
    text: 'Угол помещения: две стены сходятся, на одной дверь, на другой окно.'
  },
  {
    id: 'interior-wall',
    kinds: ['interior'],
    text: 'Прямо на стене: дверь, окно и предмет мебели, пол обозначен одной линией.'
  },
  {
    id: 'courtyard',
    kinds: ['exterior'],
    text: 'Внутренний двор: стены по краям, вход в глубине.'
  },
  {
    id: 'street',
    kinds: ['exterior'],
    text: 'Улица: дома по сторонам, дорога уходит в перспективу.'
  },
  {
    id: 'tower',
    kinds: ['exterior'],
    text: 'Вертикальный акцент: высокая постройка, мелкие детали у основания.'
  },
  {
    id: 'wall-fragment',
    kinds: ['exterior'],
    text: 'Фрагмент стены или ограды с проходом, остальное за краем кадра.'
  },
  {
    id: 'cave-mouth',
    kinds: ['landscape', 'exterior'],
    text: 'Тёмный проём в скале или стене, вход в подземелье.'
  },
  {
    id: 'island',
    kinds: ['landscape'],
    text: 'Остров или участок в окружении: контур и вода либо пропасть вокруг.'
  },
  {
    id: 'forest-edge',
    kinds: ['landscape'],
    text: 'Опушка: деревья по краям, открытое место в центре.'
  },
  {
    id: 'bridge',
    kinds: ['landscape', 'exterior'],
    text: 'Мост или переправа: опоры, пролёт, вода или пропасть под ним.'
  },
  {
    id: 'banner',
    kinds: ['generic', 'exterior'],
    text: 'Полотнище или флаг на шесте как акцент, под ним — само место.'
  },
  {
    id: 'cluster',
    kinds: ['generic', 'landscape'],
    text: 'Несколько мелких объектов одного типа на общей линии земли.'
  },
  {
    id: 'map-symbol',
    kinds: ['plan'],
    text: 'Условный картографический знак: контур, штриховка, минимум деталей.'
  }
]

/**
 * Подход, которого ещё не было у иконки. `kinds` сужает выбор под смысл
 * уточнения. Когда подходящие подходы исчерпаны, начинается новый круг
 * только по ним, а не по всему списку.
 */
export function pickDirection(usedIds = [], kinds = []) {
  const used = new Set(usedIds)
  const scoped = kinds.length > 0
    ? directions.filter((direction) => kinds.some((kind) => direction.kinds?.includes(kind)))
    : directions
  const fresh = scoped.filter((direction) => !used.has(direction.id))

  if (fresh.length > 0) {
    return {
      direction: fresh[Math.floor(Math.random() * fresh.length)],
      resetIds: []
    }
  }

  return {
    direction: scoped[Math.floor(Math.random() * scoped.length)],
    resetIds: scoped.map((direction) => direction.id)
  }
}
