<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import productUi from '@/assets/flyer/product-ui.png'
import rzdReview from '@/assets/flyer/rzd-review.png'
import databaseCertificate from '@/assets/flyer/database-certificate.png'
import softwareCertificate from '@/assets/flyer/software-certificate.png'
import logo from '@/assets/syspanellogo_2.png'
import mascotLis from '@/assets/mascot-lis.png'

const page = ref(null)
const progress = ref(0)
const menuOpen = ref(false)
const lightbox = ref(null)

const proofDocuments = [
  {
    image: rzdReview,
    label: 'Отзыв ЦФТО Восточно-Сибирской железной дороги',
    short: 'Практическая ценность',
  },
  {
    image: databaseCertificate,
    label: 'Свидетельство о регистрации базы данных № 2025625587',
    short: 'База данных',
  },
  {
    image: softwareCertificate,
    label: 'Свидетельство о регистрации программы для ЭВМ № 2025682128',
    short: 'Программа для ЭВМ',
  },
]

let revealObserver
let counterObserver
let handleScroll
let handlePointer
let parallaxFrame = 0
let reduceMotion = false

const audienceParallax = {
  current: { rocket: 0, student: 0, teacher: 0 },
  target: { rocket: 0, student: 0, teacher: 0 },
}

function applyAudienceParallax() {
  const root = page.value
  if (!root) return
  root.style.setProperty('--audience-rocket-y', `${audienceParallax.current.rocket.toFixed(2)}px`)
  root.style.setProperty('--audience-student-y', `${audienceParallax.current.student.toFixed(2)}px`)
  root.style.setProperty('--audience-teacher-y', `${audienceParallax.current.teacher.toFixed(2)}px`)
}

function animateAudienceParallax() {
  let largestDelta = 0

  Object.keys(audienceParallax.current).forEach((key) => {
    const delta = audienceParallax.target[key] - audienceParallax.current[key]
    audienceParallax.current[key] += delta * 0.16
    largestDelta = Math.max(largestDelta, Math.abs(delta))
  })

  applyAudienceParallax()

  if (largestDelta > 0.08) {
    parallaxFrame = requestAnimationFrame(animateAudienceParallax)
  } else {
    Object.assign(audienceParallax.current, audienceParallax.target)
    applyAudienceParallax()
    parallaxFrame = 0
  }
}

function setAudienceParallax(rocket, student, teacher) {
  Object.assign(audienceParallax.target, { rocket, student, teacher })

  if (reduceMotion) {
    Object.assign(audienceParallax.current, audienceParallax.target)
    applyAudienceParallax()
    return
  }

  if (!parallaxFrame) parallaxFrame = requestAnimationFrame(animateAudienceParallax)
}

function closeMenu() {
  menuOpen.value = false
}

function openDocument(document) {
  lightbox.value = document
  document.body.style.overflow = 'hidden'
}

function closeDocument() {
  lightbox.value = null
  document.body.style.overflow = ''
}

function animateCounter(element) {
  const target = Number(element.dataset.count || 0)
  const suffix = element.dataset.suffix || ''
  const startedAt = performance.now()
  const duration = 1100

  function tick(now) {
    const position = Math.min((now - startedAt) / duration, 1)
    const eased = 1 - Math.pow(1 - position, 3)
    element.textContent = `${Math.round(target * eased)}${suffix}`
    if (position < 1) requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}

onMounted(() => {
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          revealObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.13 },
  )

  page.value?.querySelectorAll('[data-reveal]').forEach((element) => revealObserver.observe(element))

  counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target)
          counterObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.65 },
  )

  page.value?.querySelectorAll('[data-count]').forEach((element) => counterObserver.observe(element))

  handleScroll = () => {
    const available = document.documentElement.scrollHeight - window.innerHeight
    progress.value = available > 0 ? (window.scrollY / available) * 100 : 0

    const root = page.value
    const audienceSection = root?.querySelector('.audiences')
    if (root && audienceSection) {
      const rect = audienceSection.getBoundingClientRect()
      const travel = window.innerHeight + rect.height
      const sectionProgress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / travel))
      const parallax = (sectionProgress - 0.5) * 260
      setAudienceParallax(parallax * 0.58, parallax * -0.72, parallax * 0.9)
    }
  }

  handlePointer = (event) => {
    const root = page.value
    if (!root) return
    root.style.setProperty('--pointer-x', `${event.clientX}px`)
    root.style.setProperty('--pointer-y', `${event.clientY}px`)
    root.style.setProperty('--tilt-x', `${(event.clientX / window.innerWidth - 0.5) * 8}deg`)
    root.style.setProperty('--tilt-y', `${(event.clientY / window.innerHeight - 0.5) * -6}deg`)
  }

  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('pointermove', handlePointer, { passive: true })
})

onBeforeUnmount(() => {
  revealObserver?.disconnect()
  counterObserver?.disconnect()
  if (parallaxFrame) cancelAnimationFrame(parallaxFrame)
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('pointermove', handlePointer)
  document.body.style.overflow = ''
})
</script>

<template>
  <main ref="page" class="flyer-page">
    <div class="scroll-progress" :style="{ width: `${progress}%` }" aria-hidden="true"></div>
    <div class="pointer-light" aria-hidden="true"></div>

    <header class="flyer-header">
      <a class="brand" href="#top" aria-label="ОТРЭД — на главную лендинга">
        <span class="brand-mark"><img :src="logo" alt="" /></span>
        <span class="brand-copy">
          <strong>ОТРЭД</strong>
          <small>цифровой тренажёр</small>
        </span>
      </a>

      <nav class="desktop-nav" aria-label="Навигация по лендингу">
        <a href="#capabilities">Возможности</a>
        <a href="#ai-tutor">ИИ-тьютор</a>
        <a href="#proof">Признание</a>
      </nav>

      <RouterLink class="header-cta" to="/">Войти в систему <span>↗</span></RouterLink>
      <button class="menu-button" type="button" aria-label="Открыть меню" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
        <span></span><span></span>
      </button>

      <div v-if="menuOpen" class="mobile-nav">
        <a href="#capabilities" @click="closeMenu">Возможности</a>
        <a href="#ai-tutor" @click="closeMenu">ИИ-тьютор</a>
        <a href="#proof" @click="closeMenu">Признание</a>
        <RouterLink to="/" @click="closeMenu">Войти в систему</RouterLink>
      </div>
    </header>

    <section id="top" class="hero section-shell">
      <div class="hero-noise" aria-hidden="true"></div>
      <div class="hero-copy" data-reveal>
        <div class="eyebrow"><span></span> Цифровая среда подготовки специалистов</div>
        <h1>Транспортные документы<br /><em>от теории</em> до уверенного навыка</h1>
        <p class="hero-lead">
          Онлайн-тренажёр ОТРЭД превращает сложные регламенты в понятную практику:
          от заполнения документов до проверки знаний и разбора ошибок.
        </p>
        <div class="hero-actions">
          <RouterLink class="primary-button" to="/">
            <span>Начать обучение</span><b>→</b>
          </RouterLink>
          <a class="secondary-button" href="#capabilities"><span>Смотреть возможности</span><b>↓</b></a>
        </div>
        <div class="hero-note">
          <span class="note-icon">✓</span>
          <span>Интерфейс приближён к рабочей среде АС ЭТРАН НП</span>
        </div>
      </div>

      <div class="hero-visual" data-reveal style="--delay: .16s">
        <div class="orbit orbit-one" aria-hidden="true"></div>
        <div class="orbit orbit-two" aria-hidden="true"></div>
        <div class="product-window">
          <div class="window-bar">
            <div class="window-dots"><i></i><i></i><i></i></div>
            <span>app.otred.ru</span>
            <div class="secure-pill"><i></i> защищённое соединение</div>
          </div>
          <img :src="productUi" alt="Интерфейс тренажёра ОТРЭД с учебными модулями" />
          <div class="screen-shine" aria-hidden="true"></div>
        </div>
        <div class="float-card float-card-top">
          <span class="pulse-dot"></span>
          <div><small>Учебный маршрут</small><strong>Прогресс сохранён</strong></div>
        </div>
        <div class="float-card float-card-bottom">
          <span class="float-icon"><img :src="mascotLis" alt="" /></span>
          <div><small>ИИ-наставник</small><strong>Готов помочь</strong></div>
        </div>
      </div>

      <div class="hero-stats" data-reveal style="--delay: .28s">
        <div><strong data-count="19">0</strong><span>учебных модулей</span></div>
        <div><strong data-count="5">0</strong><span>направлений подготовки</span></div>
        <div><strong data-count="1">0</strong><span>единая цифровая среда</span></div>
        <p>Практика · Контроль · Результат</p>
      </div>
    </section>

    <section class="ticker" aria-label="Учебные направления">
      <div class="ticker-track">
        <div v-for="copy in 4" :key="copy" class="ticker-group" :aria-hidden="copy > 2">
          <span>Заявка на грузоперевозку</span><i>✦</i>
          <span>Накладная</span><i>✦</i>
          <span>Акты</span><i>✦</i>
          <span>Ведомости</span><i>✦</i>
          <span>Сценарии</span><i>✦</i>
          <span>Тестирование</span><i>✦</i>
        </div>
      </div>
    </section>

    <section id="capabilities" class="story section-shell">
      <div class="section-intro" data-reveal>
        <span class="section-index">01 / ПРАКТИКА</span>
        <h2>Не просто показать форму.<br /><em>Научить работать.</em></h2>
        <p>Каждый шаг обучения связан с реальной задачей: понять документ, заполнить его и увидеть результат.</p>
      </div>

      <div class="journey-grid">
        <article class="journey-card journey-dark" data-reveal>
          <span class="card-number">01</span>
          <div class="doc-stack" aria-hidden="true">
            <i></i><i></i>
            <div class="doc-preview"><img :src="productUi" alt="" /></div>
          </div>
          <div>
            <small>Понять</small>
            <h3>Регламент становится маршрутом</h3>
            <p>Подсказки, правила заполнения и учебные сценарии ведут от первого поля до готового документа.</p>
          </div>
        </article>

        <article class="journey-card journey-blue" data-reveal style="--delay: .1s">
          <span class="card-number">02</span>
          <div class="form-animation" aria-hidden="true">
            <b></b><b></b><b></b><span>✓</span>
          </div>
          <div>
            <small>Попробовать</small>
            <h3>Навык рождается в практике</h3>
            <p>Студент заполняет электронные транспортно-логистические документы в безопасной учебной среде.</p>
          </div>
        </article>

        <article class="journey-card journey-light" data-reveal style="--delay: .2s">
          <span class="card-number">03</span>
          <div class="score-ring" aria-hidden="true"><span class="score-value"><b>87</b><small>%</small></span></div>
          <div>
            <small>Закрепить</small>
            <h3>Ошибки превращаются в точки роста</h3>
            <p>Тестирование, журнал результатов и обратная связь помогают увидеть пробелы и повторить нужное.</p>
          </div>
        </article>
      </div>

      <div class="capability-rail" data-reveal>
        <span>Документы</span><span>Сценарии</span><span>Справочники</span><span>Тесты</span><span>Аналитика</span><span>Роли</span>
      </div>
    </section>

    <section id="ai-tutor" class="ai-section">
      <div class="ai-grid section-shell">
        <div class="ai-copy" data-reveal>
          <div class="ai-label"><span><img :src="mascotLis" alt="" /></span> Следующий этап развития</div>
          <h2>ИИ-тьютор,<br /><em>обученный на данных от РЖД</em></h2>
          <p class="ai-lead">
            Персональный наставник внутри тренажёра: объясняет сложное простыми словами,
            помогает отработать слабые места и сопровождает обучение в собственном темпе студента.
          </p>
          <div class="ai-features">
            <div><i>01</i><span><strong>Создаёт и проводит тесты</strong><small>Подбирает вопросы под тему и уровень подготовки</small></span></div>
            <div><i>02</i><span><strong>Разбирает ошибки</strong><small>Объясняет логику и возвращает к нужному материалу</small></span></div>
            <div><i>03</i><span><strong>Строит персональный маршрут</strong><small>Подсказывает порядок заполнения и ведёт по документу шаг за шагом</small></span></div>
          </div>
          <p class="roadmap-note"><span></span>Функциональность находится в плане развития продукта</p>
        </div>

        <div class="ai-visual" data-reveal style="--delay: .15s">
          <div class="ai-halo halo-a"></div><div class="ai-halo halo-b"></div><div class="ai-halo halo-c"></div>
          <div class="ai-core"><span>О</span><i></i></div>
          <div class="chat-panel">
            <div class="chat-head"><span class="chat-avatar"><img :src="mascotLis" alt="Лис, цифровой помощник ОТРЭД" /></span><div><strong>Лис · ИИ-тьютор ОТРЭД</strong><small><i></i> в сети</small></div><b>•••</b></div>
            <div class="chat-body">
              <div class="message message-user">Проверь мои знания по накладной</div>
              <div class="message message-ai">
                <span class="typing-label">Формирую тест по вашей траектории</span>
                <div class="question-preview"><small>Вопрос 1 из 8</small><strong>Какое поле определяет станцию назначения?</strong><i></i></div>
              </div>
            </div>
            <div class="chat-input"><span>Ваш вопрос...</span><button aria-label="Отправить пример сообщения">↑</button></div>
          </div>
          <span class="ai-float ai-float-one">Контекст РЖД</span>
          <span class="ai-float ai-float-two">Адаптивные тесты</span>
          <span class="ai-float ai-float-three">24 / 7</span>
          <span class="ai-float ai-float-four">Проверка в реальном времени</span>
        </div>
      </div>
    </section>

    <section class="audiences section-shell">
      <div class="audience-decor" aria-hidden="true">
        <span class="audience-float audience-float-rocket"><span class="audience-float-core"><b>🚀</b><small>К практике</small></span></span>
        <span class="audience-float audience-float-student"><span class="audience-float-core"><b>🧑‍🎓</b><small>Студент</small></span></span>
        <span class="audience-float audience-float-teacher"><span class="audience-float-core"><b>🧑‍🏫</b><small>Преподаватель</small></span></span>
      </div>
      <div class="section-intro compact" data-reveal>
        <span class="section-index">02 / ДЛЯ КАЖДОГО УЧАСТНИКА</span>
        <h2>Одна платформа.<br /><em>Разные точки роста.</em></h2>
      </div>

      <div class="audience-grid">
        <article data-reveal>
          <span class="audience-icon">01</span>
          <small>Студенту</small>
          <h3>Учиться без страха ошибиться</h3>
          <p>Тренироваться в своём темпе, возвращаться к сложным темам и видеть прогресс.</p>
          <ul><li>Пошаговые сценарии</li><li>Практические документы</li><li>История результатов</li></ul>
        </article>
        <article data-reveal style="--delay: .1s">
          <span class="audience-icon">02</span>
          <small>Преподавателю</small>
          <h3>Видеть не оценки, а динамику</h3>
          <p>Создавать тесты, проверять документы и понимать, где группе нужна поддержка.</p>
          <ul><li>Конструктор заданий</li><li>Проверка работ</li><li>Панель успеваемости</li></ul>
        </article>
        <article data-reveal style="--delay: .2s">
          <span class="audience-icon">03</span>
          <small>Организации</small>
          <h3>Сократить путь от теории к работе</h3>
          <p>Формировать прикладные навыки до выхода специалиста в производственный процесс.</p>
          <ul><li>Единые стандарты обучения</li><li>Ролевой доступ</li><li>Контроль подготовки</li></ul>
        </article>
      </div>
    </section>

    <section id="proof" class="proof-section section-shell">
      <div class="proof-copy" data-reveal>
        <span class="section-index">03 / ДОВЕРИЕ</span>
        <h2>Создано для отрасли.<br /><em>Подтверждено делом.</em></h2>
        <blockquote>
          «Интерфейс программного обеспечения ОТРЭД приближен к оригиналу дублируемой системы»
        </blockquote>
        <p>
          В отзыве Центра фирменного транспортного обслуживания Восточно-Сибирской железной дороги
          отмечена практическая ценность тренажёра для учебного процесса и подготовки будущих специалистов.
        </p>
        <div class="proof-tags"><span>Официальный отзыв</span><span>Госрегистрация БД</span><span>Госрегистрация ПО</span></div>
      </div>

      <div class="documents-stage" data-reveal style="--delay: .14s">
        <button
          v-for="(document, index) in proofDocuments"
          :key="document.label"
          class="document-card"
          :class="`document-card-${index + 1}`"
          type="button"
          :aria-label="`Открыть: ${document.label}`"
          @click="openDocument(document)"
        >
          <img :src="document.image" :alt="document.label" />
          <span><small>{{ document.short }}</small><b>Открыть ↗</b></span>
        </button>
      </div>
    </section>

    <section class="final-cta section-shell" data-reveal>
      <div class="cta-lines" aria-hidden="true"></div>
      <div>
        <span class="section-index">ГОТОВЫ К ПРАКТИКЕ?</span>
        <h2>Подготовьте специалиста<br />к реальной работе <em>до первого рабочего дня</em></h2>
      </div>
      <div class="final-actions">
        <RouterLink class="primary-button light" to="/"><span>Открыть ОТРЭД</span><b>→</b></RouterLink>
        <a href="mailto:ilyasenovskey0@mail.ru">Обсудить внедрение</a>
      </div>
      <div class="cta-orb" aria-hidden="true"></div>
    </section>

    <footer class="flyer-footer section-shell">
      <a class="brand footer-brand" href="#top"><span class="brand-mark"><img :src="logo" alt="" /></span><span class="brand-copy"><strong>ОТРЭД</strong><small>цифровой тренажёр</small></span></a>
      <p>Онлайн-тренажёр по оформлению электронных транспортно-логистических документов.</p>
      <div><a href="#capabilities">Возможности</a><a href="#ai-tutor">ИИ-тьютор</a><RouterLink to="/">Войти</RouterLink></div>
    </footer>

    <Transition name="lightbox">
      <div v-if="lightbox" class="lightbox" role="dialog" aria-modal="true" :aria-label="lightbox.label" @click.self="closeDocument">
        <button type="button" aria-label="Закрыть" @click="closeDocument">×</button>
        <img :src="lightbox.image" :alt="lightbox.label" />
        <p>{{ lightbox.label }}</p>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
:global(html) { scroll-behavior: smooth; }
:global(body) { margin: 0; background: #f4f7fb; }
:global(body:has(.flyer-page)) { display: block; }

.flyer-page {
  --ink: #071426;
  --muted: #5d6a7c;
  --blue: #1965ff;
  --cyan: #64e7ff;
  --lime: #c8ff57;
  --red: #ef3124;
  --surface: #f4f7fb;
  --pointer-x: 50vw;
  --pointer-y: 40vh;
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  color: var(--ink);
  background: var(--surface);
  font-family: Inter, Manrope, "Segoe UI", Arial, sans-serif;
  isolation: isolate;
}

.flyer-page *, .flyer-page *::before, .flyer-page *::after { box-sizing: border-box; }
.flyer-page a { color: inherit; padding: 0; text-decoration: none; }
.flyer-page a:hover { background: transparent; }
.section-shell { width: min(1240px, calc(100% - 48px)); margin-inline: auto; }
.scroll-progress { position: fixed; z-index: 100; top: 0; left: 0; height: 3px; background: linear-gradient(90deg, var(--blue), var(--cyan), var(--lime)); box-shadow: 0 0 18px var(--cyan); }
.pointer-light { position: fixed; z-index: -1; left: var(--pointer-x); top: var(--pointer-y); width: 520px; height: 520px; border-radius: 50%; transform: translate(-50%, -50%); background: radial-gradient(circle, rgba(25,101,255,.09), transparent 68%); pointer-events: none; }

.flyer-header { position: fixed; z-index: 90; top: 18px; left: 50%; transform: translateX(-50%); width: min(1240px, calc(100% - 36px)); height: 70px; display: flex; align-items: center; gap: 42px; padding: 9px 12px 9px 18px; border: 1px solid rgba(255,255,255,.85); border-radius: 20px; background: rgba(246,249,253,.78); box-shadow: 0 16px 45px rgba(12,30,60,.09); backdrop-filter: blur(18px); }
.brand { display: inline-flex; align-items: center; gap: 11px; flex: none; }
.brand-mark { display: grid; place-items: center; width: 42px; height: 42px; overflow: hidden; border-radius: 13px; background: linear-gradient(145deg, #fff, #dbe8fb); box-shadow: inset 0 0 0 1px rgba(21,80,160,.1); }
.brand-mark img { width: 36px; height: 36px; object-fit: contain; }
.brand-copy { display: flex; flex-direction: column; line-height: 1; }
.brand-copy strong { font-size: 16px; letter-spacing: .06em; }
.brand-copy small { margin-top: 5px; color: #728096; font-size: 9px; letter-spacing: .09em; text-transform: uppercase; }
.desktop-nav { display: flex; align-items: center; gap: 32px; margin: auto; }
.desktop-nav a { position: relative; color: #435168; font-size: 13px; font-weight: 650; }
.desktop-nav a::after { content: ""; position: absolute; left: 0; bottom: -7px; width: 100%; height: 2px; transform: scaleX(0); transform-origin: right; background: var(--blue); transition: transform .25s ease; }
.desktop-nav a:hover::after { transform: scaleX(1); transform-origin: left; }
.header-cta { display: inline-flex; align-items: center; gap: 13px; padding: 13px 17px !important; border-radius: 14px; color: white !important; background: var(--ink) !important; font-size: 13px; font-weight: 700; transition: transform .25s ease, box-shadow .25s ease; }
.header-cta span { color: var(--lime); font-size: 18px; }
.header-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(7,20,38,.2); }
.menu-button, .mobile-nav { display: none; }

.hero { position: relative; min-height: 930px; padding-top: 180px; display: grid; grid-template-columns: .91fr 1.09fr; gap: 54px; align-items: start; }
.hero::before { content: ""; position: absolute; z-index: -2; top: -180px; right: -340px; width: 900px; height: 900px; border-radius: 50%; background: radial-gradient(circle, rgba(75,145,255,.18), rgba(100,231,255,.06) 45%, transparent 68%); animation: breathe 7s ease-in-out infinite; }
.hero-noise { position: absolute; inset: 0; z-index: -1; opacity: .22; background-image: radial-gradient(#205dab 0.6px, transparent 0.6px); background-size: 18px 18px; mask-image: linear-gradient(90deg, #000, transparent 72%); }
.hero-copy { padding-top: 54px; }
.eyebrow, .section-index { display: flex; align-items: center; gap: 10px; color: #426184; font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
.eyebrow span { width: 28px; height: 2px; background: var(--blue); box-shadow: 0 0 12px var(--blue); }
h1 { max-width: 680px; margin: 24px 0 25px; font-size: clamp(52px, 5.3vw, 82px); line-height: .98; letter-spacing: -.055em; font-weight: 780; }
h1 em, h2 em { color: var(--blue); font-family: Georgia, serif; font-weight: 400; }
.hero-lead { max-width: 620px; margin: 0; color: var(--muted); font-size: 18px; line-height: 1.7; }
.hero-actions { display: flex; align-items: center; gap: 14px; margin-top: 34px; }
.primary-button { position: relative; isolation: isolate; display: inline-flex; align-items: center; gap: 28px; overflow: hidden; padding: 17px 18px 17px 23px !important; border-radius: 16px; color: white !important; background: var(--blue) !important; box-shadow: 0 16px 38px rgba(25,101,255,.28); font-size: 14px; font-weight: 760; transition: transform .25s ease, box-shadow .25s ease; }
.primary-button::before { content: ""; position: absolute; z-index: 0; top: -70%; bottom: -70%; left: 0; right: 54px; transform: translateX(-120%) skewX(-18deg); background: linear-gradient(90deg, transparent, rgba(255,255,255,.27), transparent); animation: buttonShine 3.8s ease-in-out infinite; }
.primary-button span,.primary-button b { position: relative; z-index: 1; }.primary-button b { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 10px; background: rgba(255,255,255,.2); }
.primary-button:hover { transform: translateY(-3px); box-shadow: 0 20px 46px rgba(25,101,255,.36); }
.secondary-button { display: inline-flex; align-items: center; justify-content: center; gap: 18px; padding: 15px 17px 15px 20px !important; border: 1px solid #ccd7e5; border-radius: 16px; color: #344258 !important; background: rgba(255,255,255,.72); box-shadow: 0 10px 28px rgba(21,49,87,.07); font-size: 14px; font-weight: 700; transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease; }.secondary-button b { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 10px; color: var(--blue); background: #e8f0ff; }.secondary-button:hover { transform: translateY(-3px); border-color: #9db9ed; box-shadow: 0 16px 34px rgba(21,49,87,.12); }
.hero-note { display: flex; align-items: center; gap: 11px; margin-top: 27px; color: #607089; font-size: 12px; }
.note-icon { display: grid; place-items: center; width: 23px; height: 23px; border-radius: 50%; color: #34741e; background: #dcffc8; font-weight: 900; }

.hero-visual { position: relative; padding-top: 24px; perspective: 1100px; }
.product-window { position: relative; z-index: 2; overflow: hidden; border: 1px solid rgba(255,255,255,.9); border-radius: 25px; background: #fff; box-shadow: 0 40px 80px rgba(22,60,115,.2), 0 10px 25px rgba(13,35,68,.09); transform: rotateY(var(--tilt-x)) rotateX(var(--tilt-y)) rotateZ(1.2deg); transition: transform .18s ease-out; animation: windowFloat 6s ease-in-out infinite; }
.window-bar { height: 52px; display: flex; align-items: center; padding: 0 18px; border-bottom: 1px solid #e9edf4; color: #7b8797; background: rgba(255,255,255,.93); font-size: 10px; }
.window-dots { display: flex; gap: 6px; margin-right: 35px; }.window-dots i { width: 8px; height: 8px; border-radius: 50%; background: #d7deea; }.window-dots i:first-child { background: #ff735e; }.window-dots i:nth-child(2) { background: #ffc65a; }.window-dots i:last-child { background: #71d489; }
.secure-pill { display: flex; align-items: center; gap: 6px; margin-left: auto; padding: 6px 9px; border-radius: 30px; background: #f1f7f1; color: #4c6b51; }.secure-pill i { width: 5px; height: 5px; border-radius: 50%; background: #44bc62; }
.product-window img { display: block; width: 100%; aspect-ratio: 1.75; object-fit: cover; object-position: center top; }
.screen-shine { position: absolute; inset: 52px 0 0; background: linear-gradient(115deg, transparent 25%, rgba(255,255,255,.5) 46%, transparent 63%); transform: translateX(-120%); animation: screenShine 6s 1.2s ease-in-out infinite; }
.orbit { position: absolute; border: 1px solid rgba(25,101,255,.15); border-radius: 50%; animation: orbitSpin 18s linear infinite; }.orbit::after { content: ""; position: absolute; width: 9px; height: 9px; border-radius: 50%; background: var(--blue); box-shadow: 0 0 16px var(--blue); }
.orbit-one { inset: -40px -80px 40px 30px; }.orbit-one::after { top: 14%; left: 7%; }.orbit-two { inset: 40px -25px -60px -40px; animation-direction: reverse; animation-duration: 23s; }.orbit-two::after { right: 5%; bottom: 24%; background: var(--lime); box-shadow: 0 0 16px var(--lime); }
.float-card { position: absolute; z-index: 4; display: flex; align-items: center; gap: 11px; min-width: 185px; padding: 13px 15px; border: 1px solid rgba(255,255,255,.9); border-radius: 16px; background: rgba(255,255,255,.86); box-shadow: 0 18px 38px rgba(25,55,100,.16); backdrop-filter: blur(14px); animation: cardFloat 4s ease-in-out infinite; }
.float-card div { display: flex; flex-direction: column; gap: 3px; }.float-card small { color: #8490a0; font-size: 9px; }.float-card strong { font-size: 11px; }.float-card-top { top: 0; right: -20px; }.float-card-bottom { left: -34px; bottom: -30px; animation-delay: -1.3s; }
.pulse-dot { width: 11px; height: 11px; border-radius: 50%; background: #53d879; box-shadow: 0 0 0 0 rgba(83,216,121,.6); animation: pulse 1.8s infinite; }.float-icon { position: relative; width: 34px; height: 34px; overflow: hidden; border-radius: 11px; background: linear-gradient(135deg, #d9fff2, var(--cyan)); }.float-icon img { position: absolute; left: 50%; top: 50%; width: 78px; height: auto; max-width: none; transform: translate(-50%, -50%); }
.hero-stats { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, 1fr) 1.25fr; margin-top: 48px; border-top: 1px solid #dce3ed; border-bottom: 1px solid #dce3ed; }
.hero-stats > div { display: flex; align-items: center; gap: 13px; min-height: 104px; border-right: 1px solid #dce3ed; }.hero-stats strong { font-size: 40px; letter-spacing: -.05em; }.hero-stats span { max-width: 100px; color: #657389; font-size: 11px; line-height: 1.35; text-transform: uppercase; }.hero-stats p { display: grid; place-items: center; margin: 0; color: #7b8797; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }

.ticker { overflow: hidden; padding: 19px 0; color: white; background: var(--ink); transform: rotate(-1.2deg) scale(1.03); }.ticker-track { display: flex; align-items: center; width: max-content; animation: tickerMove 38s linear infinite; will-change: transform; }.ticker-group { display: flex; flex: 0 0 auto; align-items: center; }.ticker span { padding: 0 28px; white-space: nowrap; font-size: 13px; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; }.ticker i { color: var(--lime); font-style: normal; }

.story { padding-top: 145px; padding-bottom: 150px; }
.section-intro { display: grid; grid-template-columns: 1fr 1.7fr 1fr; gap: 50px; align-items: end; margin-bottom: 62px; }.section-intro h2, .proof-copy h2 { margin: 0; font-size: clamp(42px, 4.7vw, 67px); line-height: 1.02; letter-spacing: -.05em; }.section-intro p { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.75; }
.journey-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }.journey-card { position: relative; min-height: 470px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; padding: 24px 27px 29px; border-radius: 27px; transition: transform .35s ease, box-shadow .35s ease; }.journey-card:hover { transform: translateY(-9px); box-shadow: 0 28px 60px rgba(14,33,63,.15); }.journey-card h3 { max-width: 290px; margin: 9px 0 13px; font-size: 26px; line-height: 1.12; letter-spacing: -.035em; }.journey-card p { margin: 0; font-size: 13px; line-height: 1.65; opacity: .72; }.journey-card small { font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }.card-number { align-self: flex-end; font-size: 11px; opacity: .55; }
.journey-dark { color: white; background: #08172a; }.journey-blue { color: white; background: linear-gradient(145deg, #1262ff, #1746b7); }.journey-light { border: 1px solid #dae3ef; background: #eaf0f7; }
.doc-stack { position: relative; width: 220px; height: 145px; margin: 28px auto 10px; }.doc-stack i { position: absolute; inset: 0; border: 1px solid rgba(255,255,255,.18); border-radius: 15px; background: #122844; }.doc-stack i:nth-child(1) { transform: rotate(-11deg) translate(-17px, 7px); }.doc-stack i:nth-child(2) { transform: rotate(7deg) translate(17px, 4px); background: #163357; }.doc-preview { position: absolute; inset: 0; overflow: hidden; border: 4px solid white; border-radius: 15px; background: white; box-shadow: 0 20px 35px rgba(0,0,0,.22); }.doc-preview img { width: 100%; height: 100%; object-fit: cover; object-position: center top; transform: scale(1.06); }
.form-animation { position: relative; width: 230px; height: 155px; margin: 22px auto; border: 1px solid rgba(255,255,255,.3); border-radius: 18px; background: rgba(255,255,255,.1); }.form-animation b { display: block; width: 72%; height: 13px; margin: 24px 20px -8px; border-radius: 8px; background: rgba(255,255,255,.18); overflow: hidden; }.form-animation b::after { content: ""; display: block; width: 78%; height: 100%; border-radius: inherit; background: rgba(255,255,255,.78); animation: formFill 3s ease-in-out infinite; }.form-animation b:nth-child(2)::after { width: 54%; animation-delay: -.7s; }.form-animation b:nth-child(3)::after { width: 88%; animation-delay: -1.4s; }.form-animation span { position: absolute; right: 16px; bottom: 15px; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; color: #17390d; background: var(--lime); font-weight: 900; }
.score-ring { width: 154px; height: 154px; display: grid; place-items: center; margin: 25px auto; border-radius: 50%; background: radial-gradient(circle at center, #eaf0f7 57%, transparent 58%), conic-gradient(var(--blue) 0 87%, #cdd8e7 87%); box-shadow: 0 18px 36px rgba(33,80,140,.13); animation: scoreSpin 4s ease-in-out infinite; }.score-value { display: flex; align-items: baseline; justify-content: center; transform: translateY(-1px); }.score-value b { font-size: 45px; font-weight: 800; letter-spacing: -.07em; }.score-value small { margin-left: 5px; font-size: 25px; font-weight: 800; line-height: 1; }
.capability-rail { display: grid; grid-template-columns: repeat(6, 1fr); margin-top: 20px; border: 1px solid #dce4ee; border-radius: 18px; background: white; box-shadow: 0 13px 32px rgba(20,45,80,.06); }.capability-rail span { padding: 20px 10px; border-right: 1px solid #e2e8f0; color: #5d6a7c; text-align: center; font-size: 11px; font-weight: 750; text-transform: uppercase; }.capability-rail span:last-child { border: 0; }

.ai-section { position: relative; overflow: hidden; color: white; background: #05101f; }.ai-section::before { content: ""; position: absolute; inset: 0; opacity: .18; background-image: linear-gradient(rgba(89,141,212,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(89,141,212,.15) 1px, transparent 1px); background-size: 52px 52px; mask-image: radial-gradient(circle at 70% 50%, #000, transparent 72%); }.ai-grid { min-height: 850px; display: grid; grid-template-columns: .92fr 1.08fr; gap: 70px; align-items: center; }.ai-copy { position: relative; z-index: 3; padding: 120px 0; }.ai-label { display: flex; align-items: center; gap: 10px; color: #9bb2d0; font-size: 11px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }.ai-label span { position: relative; width: 34px; height: 34px; overflow: hidden; border: 1px solid rgba(100,231,255,.5); border-radius: 10px; background: linear-gradient(135deg, #d9fff2, var(--cyan)); }.ai-label img { position: absolute; left: 50%; top: 50%; width: 78px; height: auto; max-width: none; transform: translate(-50%, -50%); }
.ai-copy h2 { margin: 26px 0 25px; font-size: clamp(46px, 5vw, 70px); line-height: .98; letter-spacing: -.055em; }.ai-copy h2 em { color: var(--cyan); }.ai-lead { max-width: 570px; color: #9eb0c8; font-size: 16px; line-height: 1.75; }.ai-features { display: grid; gap: 10px; margin-top: 34px; }.ai-features > div { display: flex; gap: 16px; align-items: center; padding: 13px 15px; border: 1px solid rgba(159,194,235,.13); border-radius: 15px; background: rgba(255,255,255,.035); transition: border-color .25s, transform .25s, background .25s; }.ai-features > div:hover { transform: translateX(8px); border-color: rgba(100,231,255,.45); background: rgba(100,231,255,.06); }.ai-features i { color: var(--cyan); font-size: 10px; font-style: normal; }.ai-features span { display: flex; flex-direction: column; gap: 4px; }.ai-features strong { font-size: 13px; }.ai-features small { color: #8295ae; font-size: 11px; }.roadmap-note { display: flex; align-items: center; gap: 9px; margin-top: 21px; color: #7187a2; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }.roadmap-note span { width: 6px; height: 6px; border-radius: 50%; background: #ffb749; box-shadow: 0 0 11px #ffb749; }
.ai-visual { position: relative; min-height: 620px; display: grid; place-items: center; }.ai-halo { position: absolute; left: 50%; top: 50%; border: 1px solid rgba(100,231,255,.18); border-radius: 50%; transform: translate(-50%, -50%); }.halo-a { width: 560px; height: 560px; animation: haloSpin 18s linear infinite; }.halo-b { width: 440px; height: 440px; border-style: dashed; animation: haloSpin 13s linear reverse infinite; }.halo-c { width: 320px; height: 320px; box-shadow: inset 0 0 80px rgba(25,101,255,.08); animation: haloBreathe 5s ease-in-out infinite; }.ai-core { position: absolute; left: 50%; top: 50%; width: 95px; height: 95px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.4); border-radius: 31px; transform: translate(-50%, -50%) rotate(45deg); color: #071426; background: linear-gradient(135deg, var(--cyan), var(--lime)); box-shadow: 0 0 70px rgba(100,231,255,.45); }.ai-core span { transform: rotate(-45deg); font: 900 37px Georgia; }.ai-core i { position: absolute; inset: -13px; border: 1px solid rgba(100,231,255,.26); border-radius: 38px; animation: corePulse 2.6s ease-in-out infinite; }
.chat-panel { position: relative; z-index: 3; width: min(430px, 85%); overflow: hidden; border: 1px solid rgba(151,203,255,.26); border-radius: 24px; background: rgba(8,27,52,.82); box-shadow: 0 35px 85px rgba(0,0,0,.35); backdrop-filter: blur(22px); animation: chatFloat 5s ease-in-out infinite; }.chat-head { display: flex; align-items: center; gap: 11px; padding: 15px 17px; border-bottom: 1px solid rgba(161,196,235,.13); }.chat-avatar { position: relative; width: 39px; height: 39px; overflow: hidden; border-radius: 12px; background: linear-gradient(135deg, #d9fff2, var(--cyan)); }.chat-avatar img { position: absolute; left: 50%; top: 50%; width: 90px; height: auto; max-width: none; transform: translate(-50%, -50%); }.chat-head div { display: flex; flex-direction: column; gap: 3px; }.chat-head strong { font-size: 12px; }.chat-head small { color: #8ea2ba; font-size: 9px; }.chat-head small i { display: inline-block; width: 5px; height: 5px; margin-right: 3px; border-radius: 50%; background: #6fea8c; }.chat-head > b { margin-left: auto; color: #6f86a1; letter-spacing: .13em; }.chat-body { min-height: 265px; display: flex; flex-direction: column; gap: 15px; padding: 20px; background: radial-gradient(circle at 15% 90%, rgba(25,101,255,.15), transparent 45%); }.message { max-width: 84%; padding: 12px 14px; font-size: 11px; line-height: 1.5; }.message-user { align-self: flex-end; border-radius: 15px 15px 4px 15px; background: #1c66f1; }.message-ai { border: 1px solid rgba(255,255,255,.11); border-radius: 15px 15px 15px 4px; background: rgba(255,255,255,.06); }.typing-label { display: block; margin-bottom: 11px; color: #9db0c7; }.question-preview { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 12px; overflow: hidden; border-radius: 11px; color: #12243a; background: #f5f8fc; }.question-preview small { color: #6e7a89; font-size: 8px; }.question-preview strong { font-size: 10px; line-height: 1.35; }.question-preview i { position: absolute; left: 0; bottom: 0; width: 67%; height: 2px; background: var(--cyan); animation: questionProgress 3.2s ease-in-out infinite; }.chat-input { display: flex; align-items: center; padding: 12px 13px 12px 18px; border-top: 1px solid rgba(161,196,235,.13); color: #657c97; font-size: 10px; }.chat-input button { display: grid; place-items: center; width: 31px; height: 31px; margin-left: auto; border: 0; border-radius: 10px; color: #04111f; background: var(--lime); cursor: pointer; font-weight: 900; }.ai-float { position: absolute; z-index: 4; padding: 9px 12px; border: 1px solid rgba(100,231,255,.24); border-radius: 30px; color: #a8bdd5; background: rgba(6,20,38,.78); box-shadow: 0 10px 30px rgba(0,0,0,.22); backdrop-filter: blur(12px); font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; animation: cardFloat 4s ease-in-out infinite; }.ai-float-one { left: 2%; top: 23%; }.ai-float-two { right: 0; top: 32%; animation-delay: -1s; }.ai-float-three { right: 8%; bottom: 18%; animation-delay: -2s; }.ai-float-four { left: 4%; bottom: 11%; animation-delay: -2.8s; }

.audiences { position: relative; width: min(1040px, calc(100% - 280px)); padding-top: 145px; padding-bottom: 150px; }.audience-decor { position: absolute; z-index: 4; inset: 0; pointer-events: none; }.audience-float { position: absolute; width: 138px; height: 138px; will-change: transform; }.audience-float-core { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; border: 1px solid rgba(178,194,216,.78); border-radius: 42px; background: rgba(255,255,255,.84); box-shadow: 0 26px 70px rgba(24,55,97,.18); backdrop-filter: blur(16px); animation: audienceDrift 5s ease-in-out infinite; }.audience-float b { display: grid; place-items: center; width: 82px; height: 82px; border-radius: 28px; background: linear-gradient(145deg, #edf3ff, #dce8ff); font-size: 54px; line-height: 1; filter: drop-shadow(0 10px 14px rgba(24,55,97,.16)); }.audience-float small { color: #435975; font-size: 9px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }.audience-float-rocket { left: -166px; top: 170px; transform: translate3d(0, var(--audience-rocket-y, 0), 0) rotate(-8deg); }.audience-float-student { right: -168px; top: 285px; transform: translate3d(0, var(--audience-student-y, 0), 0) rotate(6deg); }.audience-float-teacher { left: -164px; bottom: 55px; transform: translate3d(0, var(--audience-teacher-y, 0), 0) rotate(5deg); }.audience-float-student .audience-float-core { animation-delay: -1.4s; }.audience-float-teacher .audience-float-core { animation-delay: -2.8s; }.section-intro.compact { position: relative; z-index: 3; grid-template-columns: 1fr 2.7fr; }.audience-grid { position: relative; z-index: 3; display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid #d6deea; }.audience-grid article { min-height: 430px; padding: 34px 32px 28px; border-right: 1px solid #d6deea; transition: background .3s, transform .3s; }.audience-grid article:last-child { border-right: 0; }.audience-grid article:hover { transform: translateY(-7px); background: white; }.audience-icon { display: grid; place-items: center; width: 48px; height: 48px; margin-bottom: 82px; border-radius: 15px; color: var(--blue); background: #e4edff; font-size: 11px; font-weight: 800; }.audience-grid small { color: var(--blue); font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }.audience-grid h3 { min-height: 64px; margin: 13px 0; font-size: 25px; line-height: 1.16; letter-spacing: -.03em; }.audience-grid p { color: var(--muted); font-size: 13px; line-height: 1.65; }.audience-grid ul { display: grid; gap: 8px; padding: 0; margin: 26px 0 0; list-style: none; }.audience-grid li { color: #35455b; font-size: 11px; }.audience-grid li::before { content: "↳"; margin-right: 8px; color: var(--blue); }

.proof-section { min-height: 850px; display: grid; grid-template-columns: .82fr 1.18fr; gap: 70px; align-items: center; padding-top: 90px; padding-bottom: 120px; }.proof-copy h2 { margin-top: 24px; }.proof-copy blockquote { position: relative; margin: 44px 0 20px; padding-left: 25px; border-left: 3px solid var(--red); color: #26384e; font: italic 21px/1.55 Georgia, serif; }.proof-copy p { color: var(--muted); font-size: 13px; line-height: 1.72; }.proof-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 24px; }.proof-tags span { padding: 8px 11px; border: 1px solid #d7e0eb; border-radius: 30px; color: #56657a; background: white; font-size: 9px; font-weight: 750; text-transform: uppercase; }
.documents-stage { position: relative; min-height: 650px; perspective: 1200px; }.document-card { position: absolute; width: 310px; padding: 0; overflow: hidden; border: 8px solid white; border-radius: 10px; background: white; box-shadow: 0 30px 65px rgba(16,39,74,.22); cursor: pointer; transition: transform .45s cubic-bezier(.2,.8,.2,1), box-shadow .35s; }.document-card img { display: block; width: 100%; max-height: 500px; object-fit: cover; object-position: top; }.document-card span { display: flex; justify-content: space-between; align-items: center; padding: 11px 7px 4px; }.document-card small { color: #718095; font-size: 9px; }.document-card b { color: var(--blue); font-size: 9px; }.document-card-1 { z-index: 3; left: 0; top: 55px; transform: rotate(-7deg); }.document-card-2 { z-index: 1; right: 20px; top: 0; transform: rotate(7deg) scale(.87); }.document-card-3 { z-index: 2; right: 4px; bottom: 5px; transform: rotate(11deg) scale(.84); }.document-card:hover { z-index: 6; transform: rotate(0) scale(1.04); box-shadow: 0 40px 85px rgba(16,39,74,.3); }

.final-cta { position: relative; min-height: 440px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; margin-bottom: 46px; padding: 64px; border-radius: 34px; color: white; background: var(--blue); box-shadow: 0 30px 80px rgba(25,101,255,.24); }.final-cta h2 { max-width: 920px; margin: 22px 0 0; font-size: clamp(43px, 5vw, 69px); line-height: 1; letter-spacing: -.055em; }.final-cta h2 em { color: var(--lime); }.final-cta .section-index { color: rgba(255,255,255,.64); }.final-actions { position: relative; z-index: 3; display: flex; align-items: center; gap: 24px; margin-top: 42px; }.primary-button.light { color: var(--ink) !important; background: white !important; box-shadow: none; }.final-actions > a:last-child { color: white; border-bottom: 1px solid rgba(255,255,255,.5); font-size: 13px; font-weight: 700; }.cta-lines { position: absolute; inset: 0; opacity: .2; background: repeating-radial-gradient(circle at 92% 120%, transparent 0 35px, white 36px 37px); }.cta-orb { position: absolute; right: 6%; top: 22%; width: 180px; height: 180px; border-radius: 50%; background: var(--lime); filter: blur(1px); opacity: .92; box-shadow: 0 0 100px rgba(200,255,87,.6); animation: breathe 5s infinite; }
.flyer-footer { min-height: 150px; display: grid; grid-template-columns: 1fr 1.3fr 1fr; align-items: center; gap: 30px; }.flyer-footer p { color: #7a8798; font-size: 11px; line-height: 1.5; }.flyer-footer > div { display: flex; justify-content: flex-end; gap: 20px; }.flyer-footer > div a { color: #4e5e72; font-size: 11px; font-weight: 700; }

[data-reveal] { opacity: 0; transform: translateY(35px); transition: opacity .8s ease var(--delay, 0s), transform .8s cubic-bezier(.2,.7,.2,1) var(--delay, 0s); }[data-reveal].is-visible { opacity: 1; transform: translateY(0); }
.lightbox { position: fixed; z-index: 200; inset: 0; display: grid; place-items: center; padding: 40px; background: rgba(4,12,24,.88); backdrop-filter: blur(15px); }.lightbox img { max-width: min(900px, 88vw); max-height: 82vh; border: 8px solid white; border-radius: 8px; box-shadow: 0 35px 100px rgba(0,0,0,.45); }.lightbox button { position: fixed; right: 28px; top: 22px; border: 0; color: white; background: transparent; font-size: 42px; cursor: pointer; }.lightbox p { position: fixed; bottom: 15px; color: white; font-size: 11px; letter-spacing: .06em; }.lightbox-enter-active,.lightbox-leave-active { transition: opacity .25s ease; }.lightbox-enter-from,.lightbox-leave-to { opacity: 0; }

@keyframes breathe { 0%,100% { transform: scale(.96); opacity: .75; } 50% { transform: scale(1.05); opacity: 1; } }
@keyframes buttonShine { 0%,55% { transform: translateX(-120%) skewX(-18deg); } 85%,100% { transform: translateX(120%) skewX(-18deg); } }
@keyframes windowFloat { 0%,100% { translate: 0 0; } 50% { translate: 0 -9px; } }
@keyframes screenShine { 0%,55% { transform: translateX(-120%); } 80%,100% { transform: translateX(120%); } }
@keyframes orbitSpin { to { transform: rotate(360deg); } }
@keyframes haloSpin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
@keyframes haloBreathe { 0%,100% { transform: translate(-50%, -50%) scale(.94); opacity: .52; } 50% { transform: translate(-50%, -50%) scale(1.06); opacity: .9; } }
@keyframes cardFloat { 0%,100% { translate: 0 0; } 50% { translate: 0 -9px; } }
@keyframes pulse { 70% { box-shadow: 0 0 0 9px rgba(83,216,121,0); } 100% { box-shadow: 0 0 0 0 rgba(83,216,121,0); } }
@keyframes tickerMove { to { transform: translateX(-50%); } }
@keyframes formFill { 0%,100% { transform: scaleX(.2); transform-origin: left; } 50% { transform: scaleX(1); transform-origin: left; } }
@keyframes scoreSpin { 0%,100% { rotate: -3deg; } 50% { rotate: 3deg; } }
@keyframes corePulse { 0%,100% { transform: scale(.92); opacity: .5; } 50% { transform: scale(1.13); opacity: 1; } }
@keyframes chatFloat { 0%,100% { transform: translateY(8px) rotate(-1deg); } 50% { transform: translateY(-8px) rotate(1deg); } }
@keyframes questionProgress { 0% { width: 0; } 75%,100% { width: 100%; } }
@keyframes audienceDrift { 0%,100% { translate: 0 0; rotate: -2deg; } 50% { translate: 0 -14px; rotate: 2deg; } }

@media (max-width: 1050px) {
  .hero { min-height: auto; grid-template-columns: 1fr; padding-top: 150px; }.hero-copy { max-width: 800px; padding-top: 20px; }.hero-visual { width: min(790px, 94%); margin: 20px auto 0; }.hero-stats { margin-top: 90px; }
  .section-intro { grid-template-columns: 1fr 2.2fr; }.section-intro p { grid-column: 2; }.journey-grid { grid-template-columns: 1fr 1fr; }.journey-card:last-child { grid-column: 1 / -1; min-height: 390px; }
  .ai-grid { grid-template-columns: 1fr; gap: 0; }.ai-copy { padding: 100px 0 30px; }.ai-visual { min-height: 680px; }
  .audiences { width: min(880px, calc(100% - 190px)); }.audience-float { width: 110px; height: 110px; }.audience-float-core { border-radius: 34px; }.audience-float b { width: 66px; height: 66px; border-radius: 22px; font-size: 43px; }.audience-float small { font-size: 7px; }.audience-float-rocket { left: -126px; }.audience-float-student { right: -127px; }.audience-float-teacher { left: -124px; }
  .proof-section { grid-template-columns: 1fr; }.proof-copy { max-width: 760px; }.documents-stage { width: min(720px, 100%); margin: auto; }
}

@media (max-width: 760px) {
  .section-shell { width: min(100% - 28px, 640px); }.flyer-header { height: 62px; top: 10px; width: calc(100% - 20px); border-radius: 17px; }.desktop-nav,.header-cta { display: none; }.menu-button { display: grid; gap: 5px; margin-left: auto; padding: 12px; border: 0; background: transparent; }.menu-button span { width: 23px; height: 2px; background: var(--ink); }.mobile-nav { position: absolute; display: grid; gap: 6px; top: 70px; left: 0; width: 100%; padding: 12px; border: 1px solid white; border-radius: 16px; background: rgba(246,249,253,.96); box-shadow: 0 18px 40px rgba(12,30,60,.14); }.mobile-nav a { padding: 12px 14px; border-radius: 10px; color: #344258; font-size: 13px; font-weight: 700; }.mobile-nav a:last-child { color: white; background: var(--ink); }
  .hero { padding-top: 110px; }.hero-copy { padding-top: 25px; }h1 { font-size: clamp(43px, 13vw, 63px); }.hero-lead { font-size: 15px; }.hero-actions { align-items: stretch; flex-direction: column; }.primary-button,.secondary-button { justify-content: space-between; }.hero-visual { width: 100%; margin-top: 35px; }.window-bar { height: 39px; padding: 0 10px; }.window-bar > span,.secure-pill { display: none; }.product-window img { aspect-ratio: 1.75; }.screen-shine { inset: 39px 0 0; }.float-card { min-width: 155px; padding: 10px; }.float-card-top { right: -7px; }.float-card-bottom { left: -4px; bottom: -38px; }.hero-stats { grid-template-columns: repeat(3, 1fr); margin-top: 80px; }.hero-stats > div { min-height: 90px; flex-direction: column; justify-content: center; gap: 3px; text-align: center; }.hero-stats strong { font-size: 30px; }.hero-stats span { font-size: 8px; }.hero-stats p { display: none; }
  .story,.audiences { padding-top: 100px; padding-bottom: 100px; }.section-intro,.section-intro.compact { grid-template-columns: 1fr; gap: 18px; }.section-intro p { grid-column: auto; }.section-intro h2,.proof-copy h2 { font-size: 42px; }.journey-grid { grid-template-columns: 1fr; }.journey-card,.journey-card:last-child { grid-column: auto; min-height: 430px; }.capability-rail { grid-template-columns: repeat(3,1fr); }.capability-rail span:nth-child(3) { border-right: 0; }.capability-rail span:nth-child(-n+3) { border-bottom: 1px solid #e2e8f0; }
  .ai-copy { padding-top: 90px; }.ai-copy h2 { font-size: 45px; }.ai-visual { min-height: 610px; margin-bottom: 40px; }.halo-a { width: 460px; height: 460px; }.halo-b { width: 360px; height: 360px; }.halo-c { width: 270px; height: 270px; }.chat-panel { width: 88%; }.ai-float-one { left: 0; }.ai-float-two { right: -3%; }.ai-float-three { right: 2%; bottom: 15%; }.ai-float-four { left: 1%; bottom: 6%; }
  .audience-decor { display: none; }.audience-grid { grid-template-columns: 1fr; }.audience-grid article { min-height: auto; border-right: 0; border-bottom: 1px solid #d6deea; }.audience-icon { margin-bottom: 42px; }
  .proof-section { padding-top: 90px; padding-bottom: 90px; }.documents-stage { min-height: 580px; }.document-card { width: 230px; }.document-card img { max-height: 400px; }.document-card-1 { left: 0; }.document-card-2 { right: -25px; }.document-card-3 { right: -10px; bottom: 25px; }
  .final-cta { min-height: 510px; padding: 38px 27px; border-radius: 25px; }.final-cta h2 { font-size: 43px; }.final-actions { align-items: stretch; flex-direction: column; }.final-actions > a:last-child { align-self: flex-start; }.cta-orb { width: 100px; height: 100px; top: auto; bottom: 12%; }.flyer-footer { grid-template-columns: 1fr; padding: 28px 0 45px; }.flyer-footer > div { justify-content: flex-start; }.lightbox { padding: 18px; }.lightbox img { max-width: 96vw; max-height: 80vh; }
}

@media (prefers-reduced-motion: reduce) {
  .flyer-page { scroll-behavior: auto; }.flyer-page *, .flyer-page *::before, .flyer-page *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; }[data-reveal] { opacity: 1; transform: none; }
}
</style>
