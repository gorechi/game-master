(() => {
  'use strict'

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const finePointer = window.matchMedia('(pointer: fine)').matches
  const english = document.documentElement.lang.toLowerCase().startsWith('en')

  /* ------------------------------------------------------------------------
     Шапка и полоса прокрутки
     ------------------------------------------------------------------------ */

  const head = document.getElementById('siteHead')
  const progress = document.getElementById('scrollProgress')

  const onScroll = () => {
    const top = window.scrollY
    head?.classList.toggle('is-scrolled', top > 24)

    if (progress) {
      const height = document.documentElement.scrollHeight - window.innerHeight
      const ratio = height > 0 ? Math.min(1, Math.max(0, top / height)) : 0
      progress.style.transform = `scaleX(${ratio})`
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  /* ------------------------------------------------------------------------
     Свечение за курсором
     ------------------------------------------------------------------------ */

  const glow = document.getElementById('cursorGlow')
  let pointerX = window.innerWidth / 2
  let pointerY = window.innerHeight / 3
  let glowX = pointerX
  let glowY = pointerY
  let glowActive = false

  if (glow && finePointer && !reduceMotion) {
    window.addEventListener(
      'pointermove',
      (event) => {
        pointerX = event.clientX
        pointerY = event.clientY
        if (!glowActive) {
          glowActive = true
          glow.style.opacity = '1'
        }
      },
      { passive: true }
    )

    document.addEventListener('pointerleave', () => {
      glowActive = false
      glow.style.opacity = '0'
    })

    const animateGlow = () => {
      glowX += (pointerX - glowX) * 0.08
      glowY += (pointerY - glowY) * 0.08
      glow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`
      requestAnimationFrame(animateGlow)
    }

    animateGlow()
  }

  /* ------------------------------------------------------------------------
     Искры в фоне
     ------------------------------------------------------------------------ */

  const canvas = document.getElementById('embers')

  if (canvas && !reduceMotion) {
    const context = canvas.getContext('2d')
    const particles = []
    let width = 0
    let height = 0
    let dpr = 1

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const spawn = () => ({
      x: Math.random() * width,
      y: height * (0.35 + Math.random() * 0.75),
      radius: 0.6 + Math.random() * 1.6,
      speed: 0.08 + Math.random() * 0.28,
      drift: -0.16 + Math.random() * 0.32,
      alpha: 0.12 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      warm: Math.random() > 0.35
    })

    const seed = () => {
      particles.length = 0
      const count = Math.min(64, Math.round((width * height) / 26000))
      for (let index = 0; index < count; index += 1) {
        particles.push(spawn())
      }
    }

    const draw = (time) => {
      context.clearRect(0, 0, width, height)

      for (const particle of particles) {
        particle.y -= particle.speed
        particle.x += particle.drift
        particle.phase += 0.012

        if (particle.y < -20 || particle.x < -40 || particle.x > width + 40) {
          Object.assign(particle, spawn(), { y: height + Math.random() * 60 })
        }

        const flicker = 0.55 + Math.sin(particle.phase) * 0.45
        const alpha = particle.alpha * flicker
        const color = particle.warm ? '216, 178, 92' : '143, 109, 214'

        context.beginPath()
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        context.fillStyle = `rgba(${color}, ${alpha.toFixed(3)})`
        context.fill()

        context.beginPath()
        context.arc(particle.x, particle.y, particle.radius * 3.4, 0, Math.PI * 2)
        context.fillStyle = `rgba(${color}, ${(alpha * 0.12).toFixed(3)})`
        context.fill()
      }

      requestAnimationFrame(draw)
    }

    resize()
    seed()
    requestAnimationFrame(draw)
    window.addEventListener('resize', () => {
      resize()
      seed()
    })
  }

  /* ------------------------------------------------------------------------
     Параллакс сцены
     ------------------------------------------------------------------------ */

  const stage = document.getElementById('heroStage')

  if (stage && finePointer && !reduceMotion) {
    const apply = (event) => {
      const rect = stage.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width
      const y = (event.clientY - rect.top) / rect.height
      stage.style.setProperty('--nx', ((x - 0.5) * 1.8).toFixed(3))
      stage.style.setProperty('--ny', ((y - 0.5) * 1.8).toFixed(3))
    }

    stage.addEventListener('pointermove', apply, { passive: true })
    stage.addEventListener('pointerleave', () => {
      stage.style.setProperty('--nx', '0')
      stage.style.setProperty('--ny', '0')
    })
  }

  /* ------------------------------------------------------------------------
     Подсветка карточек за курсором
     ------------------------------------------------------------------------ */

  if (finePointer && !reduceMotion) {
    for (const card of document.querySelectorAll('.feature-card')) {
      card.addEventListener(
        'pointermove',
        (event) => {
          const rect = card.getBoundingClientRect()
          card.style.setProperty('--mx', `${event.clientX - rect.left}px`)
          card.style.setProperty('--my', `${event.clientY - rect.top}px`)
        },
        { passive: true }
      )
      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--mx')
        card.style.removeProperty('--my')
      })
    }
  }

  /* ------------------------------------------------------------------------
     Появление блоков при прокрутке
     ------------------------------------------------------------------------ */

  const revealItems = document.querySelectorAll('.reveal')

  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.14, rootMargin: '0px 0px -40px 0px' }
    )

    revealItems.forEach((item) => observer.observe(item))
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'))
  }

  /* ------------------------------------------------------------------------
     Двадцатигранник
     ------------------------------------------------------------------------ */

  const d20 = document.getElementById('heroD20')
  const d20Result = document.getElementById('d20Result')

  if (d20 && d20Result) {
    d20Result.setAttribute('aria-live', 'polite')
    let rolling = false

    d20.addEventListener('click', () => {
      if (rolling) return
      rolling = true
      d20.classList.add('is-rolling')

      window.setTimeout(() => {
        const value = 1 + Math.floor(Math.random() * 20)
        d20Result.textContent = String(value)
        d20.classList.remove('is-rolling')
        rolling = false
      }, reduceMotion ? 30 : 620)
    })
  }

  /* ------------------------------------------------------------------------
     Переключение экранов
     ------------------------------------------------------------------------ */

  const tabs = Array.from(document.querySelectorAll('.demo-tab'))
  const panels = Array.from(document.querySelectorAll('.demo-panel'))

  const selectTab = (nextTab) => {
    if (!nextTab) return

    for (const tab of tabs) {
      const active = tab === nextTab
      tab.classList.toggle('is-active', active)
      tab.setAttribute('aria-selected', String(active))
      tab.tabIndex = active ? 0 : -1
    }

    for (const panel of panels) {
      const active = panel.id === nextTab.getAttribute('aria-controls')
      panel.hidden = !active
      panel.classList.toggle('is-active', active)
    }
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => selectTab(tab))
    tab.addEventListener('keydown', (event) => {
      const index = tabs.indexOf(tab)
      let target = null

      if (event.key === 'ArrowRight') target = tabs[(index + 1) % tabs.length]
      if (event.key === 'ArrowLeft') target = tabs[(index - 1 + tabs.length) % tabs.length]
      if (event.key === 'Home') target = tabs[0]
      if (event.key === 'End') target = tabs[tabs.length - 1]

      if (target) {
        event.preventDefault()
        selectTab(target)
        target.focus()
      }
    })
  }

  /* ------------------------------------------------------------------------
     Демонстрация карты
     ------------------------------------------------------------------------ */

  const copy = {
    ru: {
      places: {
        camp: {
          title: 'Лагерь у тракта',
          note: 'Палатки, костёр и повозка с припасами. Утром отсюда выходят к переправе.',
          exits: ['Тракт', 'Переправа']
        },
        mill: {
          title: 'Переправа у мельницы',
          note: 'Старый мост держится на честном слове. Ночью слышно, как под ним переговариваются камни.',
          exits: ['Чаща', 'Лагерь']
        },
        wood: {
          title: 'Тихая чаща',
          note: 'Деревья стоят слишком ровно. Тропа петляет, но всегда возвращает к одному и тому же дубу.',
          exits: ['Переправа', 'Руины']
        },
        ruins: {
          title: 'Руины Северных ворот',
          note: 'Арка из чёрного камня и лестница вниз. На ступенях осталась золотая пыль.',
          exits: ['Чаща', 'Пещера']
        },
        cave: {
          title: 'Пещера под холмом',
          note: 'Узкий лаз зарос мхом. Внутри тепло, а эхо приходит с опозданием на пару шагов.',
          exits: ['Переправа']
        }
      },
      fighters: [
        { name: 'Ария', kind: 'герой', hero: true, hp: 24, maxHp: 31, initiative: 18 },
        { name: 'Скелет-стражник', kind: 'нежить', hero: false, hp: 13, maxHp: 13, initiative: 14 },
        { name: 'Тэм', kind: 'герой', hero: true, hp: 19, maxHp: 22, initiative: 11 },
        { name: 'Гоблин-лучник', kind: 'гуманоид', hero: false, hp: 7, maxHp: 7, initiative: 7 }
      ]
    },
    en: {
      places: {
        camp: {
          title: 'Camp by the road',
          note: 'Tents, a campfire and a supply cart. In the morning the trail leads to the crossing.',
          exits: ['Road', 'Crossing']
        },
        mill: {
          title: 'The Mill Crossing',
          note: 'The old bridge holds on by sheer luck. At night you can hear the stones talking beneath it.',
          exits: ['Thicket', 'Camp']
        },
        wood: {
          title: 'The Quiet Thicket',
          note: 'The trees stand too evenly. The path winds, but always brings you back to the same oak.',
          exits: ['Crossing', 'Ruins']
        },
        ruins: {
          title: 'The North Gate Ruins',
          note: 'An arch of black stone and a stair leading down. Gold dust remains on the steps.',
          exits: ['Thicket', 'Cave']
        },
        cave: {
          title: 'The Cave Under the Hill',
          note: 'A narrow passage overgrown with moss. It is warm inside, and the echo arrives a couple of steps late.',
          exits: ['Crossing']
        }
      },
      fighters: [
        { name: 'Aria', kind: 'hero', hero: true, hp: 24, maxHp: 31, initiative: 18 },
        { name: 'Skeleton Guard', kind: 'undead', hero: false, hp: 13, maxHp: 13, initiative: 14 },
        { name: 'Tam', kind: 'hero', hero: true, hp: 19, maxHp: 22, initiative: 11 },
        { name: 'Goblin Archer', kind: 'humanoid', hero: false, hp: 7, maxHp: 7, initiative: 7 }
      ]
    }
  }

  const text = copy[english ? 'en' : 'ru']
  const places = text.places

  const mapNodes = Array.from(document.querySelectorAll('.map-place'))
  const mapTitle = document.getElementById('mapPlaceTitle')
  const mapNote = document.getElementById('mapPlaceNote')
  const mapExits = document.getElementById('mapPlaceExits')

  const selectPlace = (node) => {
    const place = places[node.dataset.place]
    if (!place) return

    mapNodes.forEach((item) =>
      item.classList.toggle('is-selected', item.dataset.place === node.dataset.place)
    )
    if (mapTitle) mapTitle.textContent = place.title
    if (mapNote) mapNote.textContent = place.note
    if (mapExits) {
      mapExits.replaceChildren(
        ...place.exits.map((exit) => {
          const chip = document.createElement('span')
          chip.textContent = exit
          return chip
        })
      )
    }
  }

  for (const node of mapNodes) {
    node.addEventListener('click', () => selectPlace(node))
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        selectPlace(node)
      }
    })

    if (node.dataset.place === 'mill') node.classList.add('is-selected')
  }

  /* ------------------------------------------------------------------------
     Демонстрация схватки
     ------------------------------------------------------------------------ */

  const combatList = document.getElementById('combatList')
  const combatName = document.getElementById('combatActive')
  const combatHp = document.getElementById('combatHp')
  const combatHpBar = document.getElementById('combatHpBar')
  const combatRound = document.getElementById('combatRound')
  const rollButton = document.getElementById('rollInitiative')

  const fighters = text.fighters

  let activeFighter = 0

  const updateCombatSide = () => {
    const fighter = fighters[activeFighter]
    if (!fighter) return

    if (combatName) combatName.textContent = fighter.name
    if (combatHp) combatHp.textContent = `${fighter.hp} / ${fighter.maxHp}`
    if (combatHpBar) {
      const ratio = Math.round((fighter.hp / fighter.maxHp) * 100)
      combatHpBar.style.width = `${ratio}%`
      combatHpBar.style.background =
        fighter.hero
          ? 'linear-gradient(90deg, #b98f3f, #f2cd7a)'
          : 'linear-gradient(90deg, #8d3e39, #d1584f)'
    }
  }

  const renderCombat = () => {
    if (!combatList) return
    const fragment = document.createDocumentFragment()

    fighters.forEach((fighter, index) => {
      const row = document.createElement('button')
      row.type = 'button'
      row.className = `combat-row${index === activeFighter ? ' is-active' : ''}`
      row.setAttribute('aria-pressed', String(index === activeFighter))
      row.innerHTML = `
        <span class="combat-row__num">${fighter.initiative}</span>
        <span class="combat-row__name">${fighter.name}<small>${fighter.kind}</small></span>
        <span class="combat-row__bar${fighter.hero ? '' : ' is-foe'}">
          <i style="width: ${Math.round((fighter.hp / fighter.maxHp) * 100)}%"></i>
        </span>
        <span class="combat-row__hp">${fighter.hp} / ${fighter.maxHp}</span>
      `

      row.addEventListener('click', () => {
        activeFighter = index
        renderCombat()
        updateCombatSide()
      })

      fragment.append(row)
    })

    combatList.replaceChildren(fragment)
  }

  const rollInitiative = () => {
    for (const fighter of fighters) {
      fighter.initiative = 1 + Math.floor(Math.random() * 20)
    }

    fighters.sort((left, right) => right.initiative - left.initiative)
    activeFighter = 0
    if (combatRound) {
      combatRound.textContent = String(1 + Math.floor(Math.random() * 2))
    }
    renderCombat()
    updateCombatSide()
  }

  if (combatList) {
    renderCombat()
    updateCombatSide()
  }

  rollButton?.addEventListener('click', () => {
    rollButton.animate?.(
      [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-2px)' },
        { transform: 'translateY(0)' }
      ],
      { duration: 180, easing: 'ease-out' }
    )
    rollInitiative()
  })

  /* ------------------------------------------------------------------------
     Версия последнего релиза
     ------------------------------------------------------------------------ */

  const versionLabel = document.getElementById('versionLabel')
  const footVersion = document.getElementById('footVersion')

  fetch('https://api.github.com/repos/gorechi/game-master/releases/latest', {
    headers: { Accept: 'application/vnd.github+json' }
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((release) => {
      const version = String(release?.tag_name ?? '').replace(/^v/, '')
      if (!/^\d+\.\d+\.\d+$/.test(version)) return
      if (versionLabel) versionLabel.textContent = version
      if (footVersion) footVersion.textContent = version
    })
    .catch(() => {
      /* Оставляем версию, указанную в разметке. */
    })
})()
