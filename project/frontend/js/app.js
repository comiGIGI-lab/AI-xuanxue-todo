// ============================================
// 主应用逻辑 - 玄学宜do（动态化版）
// ============================================

import { calculateAstrology } from './astrology.js'
import { calculateBazi, getThreePillarsForDate } from './bazi.js'
import { calcEightFunctions, calcTopMBTITypes, ALL_MBTI_TYPES } from './mbti.js'

// DOM 元素
const els = {
  form: document.querySelector('#birth-form'),
  birthYear: document.querySelector('#birth-year'),
  birthMonth: document.querySelector('#birth-month'),
  birthDay: document.querySelector('#birth-day'),
  submitBtn: document.querySelector('#submit-btn'),
  loading: document.querySelector('#loading'),
  error: document.querySelector('#error'),
  errorMessage: document.querySelector('#error-message'),
  retryBtn: document.querySelector('#retry-btn'),
  results: document.querySelector('#results'),
  astrologyBody: document.querySelector('#astrology-body'),
  baziBody: document.querySelector('#bazi-body'),
  mbtiBody: document.querySelector('#mbti-body'),
  dateSwitcher: document.querySelector('#date-switcher'),
  dateDisplay: document.querySelector('#date-display'),
  recommendationBody: document.querySelector('#recommendation-body'),
  analysisBody: document.querySelector('#analysis-body'),
  stars: document.querySelector('#stars'),
  sunReasoning: document.querySelector('#sun-reasoning'),
  calcModal: document.querySelector('#calc-modal')
}

// 全局状态
const state = {
  birthYear: null, birthMonth: null, birthDay: null,
  astrology: null, bazi: null,
  mbtiResult: null, confirmedMBTI: null, mbtiUnknown: false,
  selectedDateOffset: 0
}

// 绑定事件
els.form.addEventListener('submit', handleSubmit)
els.retryBtn.addEventListener('click', handleSubmit)
els.dateSwitcher.addEventListener('click', handleDateSwitch)

// 生成星空背景
function generateStars() {
  const starsContainer = els.stars
  for (let i = 0; i < 100; i++) {
    const star = document.createElement('div')
    star.style.cssText = `
      position: absolute;
      width: ${Math.random() * 3 + 1}px;
      height: ${Math.random() * 3 + 1}px;
      background: white;
      border-radius: 50%;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      opacity: ${Math.random() * 0.7 + 0.3};
      animation: twinkle ${Math.random() * 3 + 2}s ease-in-out infinite alternate;
    `
    starsContainer.appendChild(star)
  }
}
generateStars()

// 填充年月日选择器
function populateDateSelects() {
  // 年份倒序：2026 → 1900，默认选中2000年附近
  for (let y = 2026; y >= 1900; y--) {
    const opt = document.createElement('option')
    opt.value = y
    opt.textContent = y
    els.birthYear.appendChild(opt)
  }
  // 默认选中2000年
  els.birthYear.value = 2000

  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option')
    opt.value = m
    opt.textContent = m
    els.birthMonth.appendChild(opt)
  }
  updateDayOptions()
  els.birthYear.addEventListener('change', updateDayOptions)
  els.birthMonth.addEventListener('change', updateDayOptions)
}

function updateDayOptions() {
  const year = parseInt(els.birthYear.value)
  const month = parseInt(els.birthMonth.value)
  const currentDay = parseInt(els.birthDay.value)

  els.birthDay.innerHTML = '<option value="">dd</option>'
  if (!year || !month) return

  const maxDay = new Date(year, month, 0).getDate()
  for (let d = 1; d <= maxDay; d++) {
    const opt = document.createElement('option')
    opt.value = d
    opt.textContent = d
    els.birthDay.appendChild(opt)
  }
  if (currentDay && currentDay <= maxDay) {
    els.birthDay.value = currentDay
  }
}

populateDateSelects()

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 处理表单提交
async function handleSubmit(e) {
  e.preventDefault()

  const year = parseInt(els.birthYear.value)
  const month = parseInt(els.birthMonth.value)
  const day = parseInt(els.birthDay.value)

  if (!year || !month || !day) {
    showError('请选择完整的出生日期（yyyy/mm/dd）')
    return
  }

  if (year < 1900 || year > 2026) {
    showError('年份必须在 1900-2026 之间')
    return
  }

  const testDate = new Date(year, month - 1, day)
  if (testDate.getFullYear() !== year || testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
    showError('日期无效，请检查是否为闰年等特殊情况')
    return
  }

  state.birthYear = year
  state.birthMonth = month
  state.birthDay = day
  state.selectedDateOffset = 0
  state.confirmedMBTI = null
  state.mbtiUnknown = false

  showLoading()

  try {
    // 1. 计算星盘
    state.astrology = calculateAstrology(year, month, day)

    // 2. 计算八字
    state.bazi = calculateBazi(year, month, day)

    // 3. 计算荣格八维和MBTI
    const eightFunc = calcEightFunctions(state.astrology, state.bazi)
    state.mbtiResult = calcTopMBTITypes(eightFunc)

    // 4. 依次动态展示模块
    await revealModule('module-astrology')
    await runSunReasoningAnimation(state.birthMonth, state.birthDay, state.astrology.sun)
    renderAstrology(state.astrology)

    await delay(400)
    await revealModule('module-bazi')
    renderBazi(state.bazi)

    await delay(400)
    await revealModule('module-mbti')
    renderMBTIChart(state.mbtiResult)

    await delay(400)
    await revealModule('module-date')
    updateDateDisplay(0)

    await delay(400)
    await revealModule('module-recommend')
    await fetchRecommendation()

    await delay(400)
    await revealModule('module-analysis')
    await fetchAnalysis()

    els.loading.classList.add('hidden')
    els.results.classList.remove('hidden')

    // 绑定区块折叠
    bindSectionCollapsibles()

  } catch (error) {
    console.error('计算错误:', error)
    showError(`计算失败: ${error.message}`)
  }
}

// 模块淡入动画
async function revealModule(moduleId) {
  const module = document.getElementById(moduleId)
  if (!module) return
  module.style.opacity = '0'
  module.style.transform = 'translateY(20px)'
  module.style.transition = 'opacity 0.6s ease, transform 0.6s ease'

  module.offsetHeight // 强制重排

  module.style.opacity = '1'
  module.style.transform = 'translateY(0)'

  await delay(600)
  module.classList.add('revealed')
}

// 太阳星座推理动画
async function runSunReasoningAnimation(month, day, sunSign) {
  const reasoningEl = els.sunReasoning
  const step1 = document.querySelector('#reasoning-step-1')
  const step2 = document.querySelector('#reasoning-step-2')
  const step3 = document.querySelector('#reasoning-step-3')

  reasoningEl.classList.remove('hidden')

  step1.textContent = `你出生于 ${month}月${day}日`
  step1.classList.add('visible')
  await delay(800)

  step2.textContent = `根据星盘推算，太阳位于黄道${sunSign}区间`
  step2.classList.add('visible')
  await delay(800)

  step3.textContent = `你的太阳星座是 ${sunSign}`
  step3.classList.add('highlight')
  await delay(600)

  await delay(400)
  reasoningEl.classList.add('fade-out')
  await delay(600)
  reasoningEl.classList.add('hidden')
  reasoningEl.classList.remove('fade-out')
  step1.classList.remove('visible')
  step2.classList.remove('visible')
  step3.classList.remove('highlight')
}

// 渲染星盘结果（手风琴式展开）
function renderAstrology(astrology) {
  const meanings = astrology.planetMeanings || {}
  const planetKeys = ['sun', 'moon', 'rising', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']

  let html = '<div class="planet-accordion">'
  for (const key of planetKeys) {
    const m = meanings[key] || {}
    const value = astrology[key]
    const range = astrology[key + 'Range']
    const meaningText = m.meaning || ''
    const needsTime = m.needsTime
    const yearBased = m.yearBased
    const generation = m.generation

    // 折叠状态：只显示名称和落位星座
    let displayValue = value
    if (range && range.length > 1) {
      const others = range.filter(r => r !== value)
      displayValue = `${value} 或 ${others.join(' 或 ')}`
    }

    // 展开后才显示的标签
    let badgeHtml = ''
    if (needsTime) {
      badgeHtml = '<span class="planet-badge planet-badge--time">（需时辰确认）</span>'
    } else if (yearBased && generation) {
      badgeHtml = '<span class="planet-badge planet-badge--year">同代人相同</span>'
    } else if (yearBased) {
      badgeHtml = '<span class="planet-badge planet-badge--year">按年份可确定</span>'
    }

    html += `
      <div class="planet-item" data-planet="${key}" data-node-id="d83183bc-5c8e-11f1-a41d-3e8984a7e676">
        <div class="planet-item__header" data-node-id="d831847a-5c8e-11f1-a41d-3e8984a7e676">
          <div class="planet-item__main" data-node-id="d8318146-5c8e-11f1-a41d-3e8984a7e676">
            <span class="planet-item__name" data-node-id="d83182f4-5c8e-11f1-a41d-3e8984a7e676">${m.name || key}</span>
            <span class="planet-item__value" data-node-id="d831822c-5c8e-11f1-a41d-3e8984a7e676">${displayValue}</span>
          </div>
          <span class="planet-item__toggle" data-node-id="d8318538-5c8e-11f1-a41d-3e8984a7e676">▼</span>
        </div>
        <div class="planet-item__detail hidden" data-node-id="d83185f6-5c8e-11f1-a41d-3e8984a7e676">
          <div class="planet-item__meaning" data-node-id="d83186b4-5c8e-11f1-a41d-3e8984a7e676">${meaningText}</div>
          ${badgeHtml}
        </div>
      </div>
    `
  }
  html += '</div>'

  els.astrologyBody.innerHTML = html

  // 绑定手风琴事件
  els.astrologyBody.querySelectorAll('.planet-item__header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement
      const detail = item.querySelector('.planet-item__detail')
      const toggle = header.querySelector('.planet-item__toggle')
      const isHidden = detail.classList.contains('hidden')

      detail.classList.toggle('hidden')
      toggle.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)'
    })
  })
}

// 渲染八字结果
function renderBazi(bazi) {
  els.baziBody.innerHTML = `
    <div class="bazi-display" data-node-id="d83195be-5c8e-11f1-a41d-3e8984a7e676">
      <div class="bazi-pillar" data-node-id="d8319776-5c8e-11f1-a41d-3e8984a7e676">
        <div class="bazi-pillar__label" data-node-id="d83199ba-5c8e-11f1-a41d-3e8984a7e676">年柱</div>
        <div class="bazi-pillar__value" data-node-id="d83196b8-5c8e-11f1-a41d-3e8984a7e676">${bazi.year}</div>
      </div>
      <div class="bazi-pillar" data-node-id="d8319a64-5c8e-11f1-a41d-3e8984a7e676">
        <div class="bazi-pillar__label" data-node-id="d8319b18-5c8e-11f1-a41d-3e8984a7e676">月柱</div>
        <div class="bazi-pillar__value" data-node-id="d8319bcc-5c8e-11f1-a41d-3e8984a7e676">${bazi.month}</div>
      </div>
      <div class="bazi-pillar" data-node-id="d8319834-5c8e-11f1-a41d-3e8984a7e676">
        <div class="bazi-pillar__label" data-node-id="d8319c80-5c8e-11f1-a41d-3e8984a7e676">日柱</div>
        <div class="bazi-pillar__value" data-node-id="d83198fc-5c8e-11f1-a41d-3e8984a7e676">${bazi.day}</div>
      </div>
    </div>
    <div style="text-align: center; margin-top: 1rem; color: var(--color-muted); font-size: 0.875rem;" data-node-id="d8319d3e-5c8e-11f1-a41d-3e8984a7e676">
      五行：年${bazi.yearWuxing} · 月${bazi.monthWuxing} · 日${bazi.dayWuxing} · 主导${bazi.dominantWuxing}
    </div>
  `
}

// 渲染MBTI荣格八维概率图表
function renderMBTIChart(result) {
  const { eightFunc, allTypes, dimensions } = result

  // 八维进度条
  const funcOrder = ['Ni', 'Ne', 'Si', 'Se', 'Ti', 'Te', 'Fi', 'Fe']
  const funcNames = { Ni: 'Ni', Ne: 'Ne', Si: 'Si', Se: 'Se', Ti: 'Ti', Te: 'Te', Fi: 'Fi', Fe: 'Fe' }

  let eightFuncHtml = '<div class="eight-func-chart">'
  for (const key of funcOrder) {
    const pct = eightFunc[key]
    eightFuncHtml += `
      <div class="eight-func-bar" data-node-id="d831a5f4-5c8e-11f1-a41d-3e8984a7e676">
        <div class="eight-func-bar__label" data-node-id="d831a388-5c8e-11f1-a41d-3e8984a7e676">${funcNames[key]}</div>
        <div class="eight-func-bar__track" data-node-id="d831a540-5c8e-11f1-a41d-3e8984a7e676">
          <div class="eight-func-bar__fill" data-target="${pct}" style="width: 0%" data-node-id="d831a478-5c8e-11f1-a41d-3e8984a7e676"></div>
        </div>
        <div class="eight-func-bar__pct" data-target="${pct}" data-node-id="d831a6a8-5c8e-11f1-a41d-3e8984a7e676">0%</div>
      </div>
    `
  }
  eightFuncHtml += '</div>'

  // 全部MBTI类型（按置信度排序，点击即校准）
  let allTypesHtml = '<div class="top-mbti-types">'
  for (const item of allTypes) {
    allTypesHtml += `
      <div class="top-mbti-type" data-type="${item.type}" data-node-id="d831a9f0-5c8e-11f1-a41d-3e8984a7e676">
        <span class="top-mbti-type__name" data-node-id="d831aac2-5c8e-11f1-a41d-3e8984a7e676">${item.type}</span>
        <span class="top-mbti-type__conf" data-node-id="d831ab76-5c8e-11f1-a41d-3e8984a7e676">${item.confidence}%</span>
      </div>
    `
  }
  allTypesHtml += '</div>'

  els.mbtiBody.innerHTML = `
    <div class="mbti-section" data-node-id="d831c746-5c8e-11f1-a41d-3e8984a7e676">
      <div class="mbti-section__title" data-node-id="d831c872-5c8e-11f1-a41d-3e8984a7e676">荣格八维概率</div>
      ${eightFuncHtml}
    </div>
    <div class="mbti-section" data-node-id="d831c50c-5c8e-11f1-a41d-3e8984a7e676">
      <div class="mbti-section__title" data-node-id="d831c44e-5c8e-11f1-a41d-3e8984a7e676">MBTI 类型置信度排名（点击选择）</div>
      ${allTypesHtml}
    </div>
    <div class="mbti-actions" data-node-id="d831c372-5c8e-11f1-a41d-3e8984a7e676">
      <button class="btn btn--ghost btn--small" id="mbti-unknown-btn" data-node-id="d831c5ca-5c8e-11f1-a41d-3e8984a7e676">我不知道自己的MBTI</button>
    </div>
    <div id="mbti-confirmed" class="hidden" data-node-id="d831c688-5c8e-11f1-a41d-3e8984a7e676"></div>
  `

  // 计数动画
  animateCounters()

  // 绑定MBTI类型点击事件（点击即校准）
  els.mbtiBody.querySelectorAll('.top-mbti-type').forEach(el => {
    el.addEventListener('click', () => {
      const type = el.dataset.type
      if (!type) return
      // 高亮已选中的类型
      els.mbtiBody.querySelectorAll('.top-mbti-type').forEach(t => t.classList.remove('selected'))
      el.classList.add('selected')
      confirmMBTI(type)
    })
  })

  // 绑定"我不知道"按钮
  els.mbtiBody.querySelector('#mbti-unknown-btn').addEventListener('click', () => {
    state.mbtiUnknown = true
    state.confirmedMBTI = null
    // 清除高亮
    els.mbtiBody.querySelectorAll('.top-mbti-type').forEach(t => t.classList.remove('selected'))
    showConfirmed('已选择：不加入MBTI维度，仅基于星盘和八字五行分析')
    // 显示加载提示
    els.recommendationBody.innerHTML = '<div class="loading__mini">正在为您推算中，请稍候…</div>'
    els.analysisBody.innerHTML = '<div class="loading__mini">正在为您推算中，请稍候…</div>'
    fetchRecommendation()
    fetchAnalysis()
  })
}

// 计数动画
function animateCounters() {
  const fills = els.mbtiBody.querySelectorAll('.eight-func-bar__fill')
  const pcts = els.mbtiBody.querySelectorAll('.eight-func-bar__pct')

  fills.forEach(fill => {
    const target = parseInt(fill.dataset.target)
    fill.style.transition = 'width 1s ease-out'
    fill.style.width = target + '%'
  })

  pcts.forEach(pct => {
    const target = parseInt(pct.dataset.target)
    animateNumber(pct, 0, target, 1000)
  })
}

// 数字增长动画
function animateNumber(el, start, end, duration) {
  const startTime = performance.now()
  function update(currentTime) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const current = Math.round(start + (end - start) * progress)
    el.textContent = current + '%'
    if (progress < 1) requestAnimationFrame(update)
  }
  requestAnimationFrame(update)
}

// 确认MBTI
function confirmMBTI(type) {
  state.confirmedMBTI = type
  state.mbtiUnknown = false
  showCalcModal()

  setTimeout(() => {
    hideCalcModal()
    showConfirmed(`确认 MBTI：${type}`)
    fetchRecommendation()
    fetchAnalysis()
  }, 1500)
}

// 显示确认状态
function showConfirmed(text) {
  const confirmedEl = els.mbtiBody.querySelector('#mbti-confirmed')
  confirmedEl.classList.remove('hidden')
  confirmedEl.innerHTML = `
    <div class="mbti-confirmed" data-node-id="d83162c4-5c8e-11f1-a41d-3e8984a7e676">
      <div class="mbti-confirmed__type" data-node-id="d831645e-5c8e-11f1-a41d-3e8984a7e676">${text}</div>
    </div>
  `
}

// 显示加载弹窗
function showCalcModal() {
  els.calcModal.classList.remove('hidden')
}

// 隐藏加载弹窗
function hideCalcModal() {
  els.calcModal.classList.add('hidden')
}

// 绑定区块折叠
function bindSectionCollapsibles() {
  document.querySelectorAll('.section__title--collapsible').forEach(title => {
    title.addEventListener('click', () => {
      const targetId = title.dataset.target
      const content = document.getElementById(targetId)
      const toggle = title.querySelector('.section__toggle')
      if (!content || !toggle) return

      const isHidden = content.classList.contains('hidden')
      content.classList.toggle('hidden')
      toggle.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)'
    })
  })
}

// 日期切换
function handleDateSwitch(e) {
  const btn = e.target.closest('.date-btn')
  if (!btn) return

  els.dateSwitcher.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')

  state.selectedDateOffset = parseInt(btn.dataset.offset)
  updateDateDisplay(state.selectedDateOffset)

  // 切换日期时只更新每日宜忌，不重新生成综合分析（综合分析与日期无关）
  els.recommendationBody.innerHTML = '<div class="loading__mini">正在为您推算中，请稍候…</div>'
  fetchRecommendation()
}

// 更新日期显示
function updateDateDisplay(offset) {
  const today = new Date()
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + offset)

  const year = targetDate.getFullYear()
  const month = targetDate.getMonth() + 1
  const day = targetDate.getDate()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekDay = weekDays[targetDate.getDay()]

  const pillars = getThreePillarsForDate(year, month, day)

  els.dateDisplay.innerHTML = `
    <div class="date-display__date" data-node-id="d83167ce-5c8e-11f1-a41d-3e8984a7e676">${year}年${month}月${day}日 ${weekDay}</div>
    <div class="date-display__pillars" data-node-id="d83168b4-5c8e-11f1-a41d-3e8984a7e676">日柱：${pillars.day}（${pillars.dayWuxing}）</div>
  `
}

// 获取AI推荐
async function fetchRecommendation() {
  if (!state.confirmedMBTI && !state.mbtiUnknown) {
    els.recommendationBody.innerHTML = `
      <div style="color: var(--color-muted); text-align: center; padding: 1rem;" data-node-id="d831b328-5c8e-11f1-a41d-3e8984a7e676">
        请先确认你的 MBTI 类型，或选择"我不知道自己的MBTI"
      </div>
    `
    return
  }

  // 显示加载提示
  els.recommendationBody.innerHTML = '<div class="loading__mini">正在为您推算中，请稍候…</div>'

  try {
    const { edgeFunctionUrl, SUPABASE_ANON_KEY } = await import('./supabase.js')

    const today = new Date()
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + state.selectedDateOffset)

    const targetPillars = getThreePillarsForDate(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      targetDate.getDate()
    )

    const response = await fetch(edgeFunctionUrl('ai-recommend'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        astrology: state.astrology,
        bazi: state.bazi,
        mbti: state.mbtiUnknown ? null : { type: state.confirmedMBTI },
        targetDate: {
          year: targetDate.getFullYear(),
          month: targetDate.getMonth() + 1,
          day: targetDate.getDate(),
          pillars: targetPillars
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    renderRecommendation(result.recommendation)

  } catch (error) {
    console.error('获取推荐失败:', error)
    els.recommendationBody.innerHTML = `
      <div style="color: var(--color-warning); text-align: center; padding: 1rem;" data-node-id="d831af4a-5c8e-11f1-a41d-3e8984a7e676">
        AI推荐生成失败: ${error.message}<br data-node-id="d831b0e4-5c8e-11f1-a41d-3e8984a7e676">
        <span style="font-size: 0.875rem; color: var(--color-muted);" data-node-id="d831b01c-5c8e-11f1-a41d-3e8984a7e676">请检查网络连接或稍后重试</span>
      </div>
    `
  }
}

// 渲染推荐结果（可折叠卡片，去重，排序，跳过空维度）
function renderRecommendation(content) {
  // 如果内容为空，显示重新加载按钮
  if (!content || !content.trim()) {
    els.recommendationBody.innerHTML = `
      <div class="recommendation-empty" data-node-id="d8318a6a-5c8e-11f1-a41d-3e8984a7e676">
        <div class="recommendation-empty__text" data-node-id="d8318b46-5c8e-11f1-a41d-3e8984a7e676">暂无推荐内容</div>
        <button class="btn btn--ghost btn--small" id="reload-recommend-btn" data-node-id="d8318c04-5c8e-11f1-a41d-3e8984a7e676">点击重新加载</button>
      </div>
    `
    els.recommendationBody.querySelector('#reload-recommend-btn').addEventListener('click', () => {
      fetchRecommendation()
    })
    return
  }

  const paragraphs = content.split('\n').filter(p => p.trim())
  const sectionsMap = {}
  let currentSection = null
  const seenNames = new Set()

  // 定义排序顺序：吃/玩/学始终排在最前面
  const sectionOrder = [
    '今日适合吃什么',
    '今日适合玩什么',
    '今日适合学什么',
    '今日不宜',
    '人际交往',
    '事业发展',
    '生活',
    '家庭',
    '健康',
    '参考来源'
  ]

  const sectionPatterns = [
    { name: '今日适合吃什么', icon: '🍽️' },
    { name: '今日适合玩什么', icon: '🎮' },
    { name: '今日适合学什么', icon: '📚' },
    { name: '今日不宜', icon: '⛔' },
    { name: '人际交往', icon: '🤝' },
    { name: '事业发展', icon: '💼' },
    { name: '生活', icon: '🏠' },
    { name: '家庭', icon: '👨‍👩‍👧' },
    { name: '健康', icon: '💪' },
    { name: '参考来源', icon: '📖' }
  ]

  for (const p of paragraphs) {
    let matched = false
    for (const pattern of sectionPatterns) {
      if (p.includes(pattern.name)) {
        // 去重：如果已经出现过同名section，跳过
        if (seenNames.has(pattern.name)) {
          matched = true
          break
        }
        currentSection = { name: pattern.name, icon: pattern.icon, content: [] }
        sectionsMap[pattern.name] = currentSection
        seenNames.add(pattern.name)
        matched = true
        break
      }
    }
    if (!matched && currentSection && p.trim()) {
      currentSection.content.push(p.trim())
    }
  }

  // 按预定义顺序排序，跳过内容为空的维度
  const orderedSections = sectionOrder
    .filter(name => sectionsMap[name] && sectionsMap[name].content.length > 0)
    .map(name => sectionsMap[name])

  // 如果有未匹配到顺序的额外section，追加到后面
  for (const section of Object.values(sectionsMap)) {
    if (!orderedSections.includes(section) && section.content.length > 0) {
      orderedSections.push(section)
    }
  }

  if (orderedSections.length === 0) {
    els.recommendationBody.innerHTML = `
      <div class="recommendation-empty" data-node-id="d8316c1a-5c8e-11f1-a41d-3e8984a7e676">
        <div class="recommendation-empty__text" data-node-id="d8316daa-5c8e-11f1-a41d-3e8984a7e676">暂无推荐内容</div>
        <button class="btn btn--ghost btn--small" id="reload-recommend-btn" data-node-id="d8316cec-5c8e-11f1-a41d-3e8984a7e676">点击重新加载</button>
      </div>
    `
    els.recommendationBody.querySelector('#reload-recommend-btn').addEventListener('click', () => {
      fetchRecommendation()
    })
    return
  }

  // 定义默认展开的 section（吃/玩/学/不宜）
  const defaultOpenSections = ['今日适合吃什么', '今日适合玩什么', '今日适合学什么', '今日不宜']

  let html = '<div class="collapsible-list">'
  for (const section of orderedSections) {
    const contentHtml = section.content.join('<br>')
    const isOpen = defaultOpenSections.includes(section.name)
    html += `
      <div class="collapsible-item" data-node-id="d831bbd4-5c8e-11f1-a41d-3e8984a7e676">
        <div class="collapsible-item__header" data-node-id="d831ba44-5c8e-11f1-a41d-3e8984a7e676">
          <span class="collapsible-item__icon" data-node-id="d831bc92-5c8e-11f1-a41d-3e8984a7e676">${section.icon}</span>
          <span class="collapsible-item__title" data-node-id="d831bd46-5c8e-11f1-a41d-3e8984a7e676">${section.name}</span>
          <span class="collapsible-item__toggle" style="transform: ${isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}" data-node-id="d831b95e-5c8e-11f1-a41d-3e8984a7e676">▼</span>
        </div>
        <div class="collapsible-item__content${isOpen ? '' : ' hidden'}" data-node-id="d831bb0c-5c8e-11f1-a41d-3e8984a7e676">
          ${contentHtml}
        </div>
      </div>
    `
  }
  html += '</div>'

  els.recommendationBody.innerHTML = html

  // 绑定折叠事件
  els.recommendationBody.querySelectorAll('.collapsible-item__header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement
      const content = item.querySelector('.collapsible-item__content')
      const toggle = header.querySelector('.collapsible-item__toggle')
      const isHidden = content.classList.contains('hidden')

      content.classList.toggle('hidden')
      toggle.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)'
    })
  })
}

// 获取综合分析
async function fetchAnalysis() {
  if (!state.confirmedMBTI && !state.mbtiUnknown) {
    els.analysisBody.innerHTML = `
      <div style="color: var(--color-muted); text-align: center; padding: 1rem;" data-node-id="d831cac0-5c8e-11f1-a41d-3e8984a7e676">
        请先确认你的 MBTI 类型，或选择"我不知道自己的MBTI"
      </div>
    `
    return
  }

  // 显示加载提示
  els.analysisBody.innerHTML = '<div class="loading__mini">正在为你测算中，请稍候…</div>'

  try {
    const { edgeFunctionUrl, SUPABASE_ANON_KEY } = await import('./supabase.js')

    const response = await fetch(edgeFunctionUrl('ai-comprehensive'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        astrology: state.astrology,
        bazi: state.bazi,
        mbti: state.mbtiUnknown ? null : { type: state.confirmedMBTI }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    renderAnalysis(result.analysis)

  } catch (error) {
    console.error('获取综合分析失败:', error)
    els.analysisBody.innerHTML = `
      <div style="color: var(--color-warning); text-align: center; padding: 1rem;" data-node-id="d831ce26-5c8e-11f1-a41d-3e8984a7e676">
        综合分析生成失败: ${error.message}<br data-node-id="d831ceee-5c8e-11f1-a41d-3e8984a7e676">
        <span style="font-size: 0.875rem; color: var(--color-muted);" data-node-id="d831d006-5c8e-11f1-a41d-3e8984a7e676">请检查网络连接或稍后重试</span>
      </div>
    `
  }
}

// 渲染综合分析（可折叠卡片）
function renderAnalysis(content) {
  const paragraphs = content.split('\n').filter(p => p.trim())
  const sections = []
  let currentSection = null
  const seenNames = new Set()

  const sectionPatterns = [
    { name: '性格特征', icon: '🧬' },
    { name: '日柱性格', icon: '📅' },
    { name: '成长环境', icon: '🏡' },
    { name: '五行缺失', icon: '⚖️' },
    { name: '伴侣画像', icon: '💑' },
    { name: '职业发展', icon: '💼' },
    { name: '健康建议', icon: '💪' },
    { name: '财运分析', icon: '💰' }
  ]

  for (const p of paragraphs) {
    let matched = false
    for (const pattern of sectionPatterns) {
      if (p.includes(pattern.name)) {
        if (seenNames.has(pattern.name)) {
          matched = true
          break
        }
        currentSection = { name: pattern.name, icon: pattern.icon, content: [] }
        sections.push(currentSection)
        seenNames.add(pattern.name)
        matched = true
        break
      }
    }
    if (!matched && currentSection && p.trim()) {
      currentSection.content.push(p.trim())
    }
  }

  if (sections.length === 0) {
    els.analysisBody.innerHTML = `
      <div class="analysis-content" data-node-id="d8316fd0-5c8e-11f1-a41d-3e8984a7e676">
        ${content.replace(/\n/g, '<br>')}
      </div>
    `
    return
  }

  let html = '<div class="collapsible-list">'
  for (const section of sections) {
    const contentHtml = section.content.join('<br>')
    html += `
      <div class="collapsible-item" data-node-id="d831757a-5c8e-11f1-a41d-3e8984a7e676">
        <div class="collapsible-item__header" data-node-id="d83177fa-5c8e-11f1-a41d-3e8984a7e676">
          <span class="collapsible-item__icon" data-node-id="d831766a-5c8e-11f1-a41d-3e8984a7e676">${section.icon}</span>
          <span class="collapsible-item__title" data-node-id="d83178ae-5c8e-11f1-a41d-3e8984a7e676">${section.name}</span>
          <span class="collapsible-item__toggle" data-node-id="d83179ee-5c8e-11f1-a41d-3e8984a7e676">▼</span>
        </div>
        <div class="collapsible-item__content hidden" data-node-id="d8317728-5c8e-11f1-a41d-3e8984a7e676">
          ${contentHtml}
        </div>
      </div>
    `
  }
  html += '</div>'

  els.analysisBody.innerHTML = html

  // 绑定折叠事件
  els.analysisBody.querySelectorAll('.collapsible-item__header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement
      const content = item.querySelector('.collapsible-item__content')
      const toggle = header.querySelector('.collapsible-item__toggle')
      const isHidden = content.classList.contains('hidden')

      content.classList.toggle('hidden')
      toggle.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)'
    })
  })
}

// 显示加载状态
function showLoading() {
  els.loading.classList.remove('hidden')
  els.error.classList.add('hidden')
  els.results.classList.add('hidden')
  els.submitBtn.disabled = true
}

// 显示错误状态
function showError(message) {
  els.loading.classList.add('hidden')
  els.error.classList.remove('hidden')
  els.results.classList.add('hidden')
  els.errorMessage.textContent = message
  els.submitBtn.disabled = false
}

// ============================================
// 邮件订阅功能
// ============================================

// 初始化订阅表单的年月日选择器
function initSubscribeDateSelects() {
  const subYear = document.querySelector('#sub-year')
  const subMonth = document.querySelector('#sub-month')
  const subDay = document.querySelector('#sub-day')
  if (!subYear || !subMonth || !subDay) return

  for (let y = 2026; y >= 1900; y--) {
    const opt = document.createElement('option')
    opt.value = y
    opt.textContent = y
    subYear.appendChild(opt)
  }
  subYear.value = 2000

  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option')
    opt.value = m
    opt.textContent = m
    subMonth.appendChild(opt)
  }

  function updateSubDays() {
    const y = parseInt(subYear.value)
    const m = parseInt(subMonth.value)
    const cur = parseInt(subDay.value)
    subDay.innerHTML = '<option value="">dd</option>'
    if (!y || !m) return
    const max = new Date(y, m, 0).getDate()
    for (let d = 1; d <= max; d++) {
      const opt = document.createElement('option')
      opt.value = d
      opt.textContent = d
      subDay.appendChild(opt)
    }
    if (cur && cur <= max) subDay.value = cur
  }

  updateSubDays()
  subYear.addEventListener('change', updateSubDays)
  subMonth.addEventListener('change', updateSubDays)
}

initSubscribeDateSelects()

// 订阅表单提交
const subscribeForm = document.querySelector('#subscribe-form')
const subscribeStatus = document.querySelector('#subscribe-status')
const subscribeBtn = document.querySelector('#subscribe-btn')

if (subscribeForm) {
  subscribeForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    const email = document.querySelector('#sub-email').value.trim()
    const birth_year = document.querySelector('#sub-year').value
    const birth_month = document.querySelector('#sub-month').value
    const birth_day = document.querySelector('#sub-day').value
    const send_weekday = document.querySelector('#sub-weekday').value
    const send_hour = document.querySelector('#sub-hour').value

    if (!email || !birth_year || !birth_month || !birth_day || send_weekday === '' || send_hour === '') {
      showSubscribeStatus('请填写所有必填项', 'error')
      return
    }

    subscribeBtn.disabled = true
    showSubscribeStatus('正在提交订阅，稍候…', 'loading')

    try {
      const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('./supabase.js')

      const res = await fetch(`${SUPABASE_URL}/functions/v1/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email, birth_year, birth_month, birth_day, send_weekday, send_hour }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        showSubscribeStatus(`✦ ${data.message}`, 'success')
        subscribeForm.reset()
        initSubscribeDateSelects()
      } else {
        showSubscribeStatus(data.error || '订阅失败，请稍后重试', 'error')
        subscribeBtn.disabled = false
      }
    } catch (err) {
      console.error('Subscribe error:', err)
      showSubscribeStatus(`订阅失败：${err.message}`, 'error')
      subscribeBtn.disabled = false
    }
  })
}

function showSubscribeStatus(msg, type) {
  if (!subscribeStatus) return
  subscribeStatus.textContent = msg
  subscribeStatus.className = `subscribe-status ${type}`
  subscribeStatus.classList.remove('hidden')
}
