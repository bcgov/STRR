import { expect } from '@playwright/test'

export async function prepareSessionClock(page, origin) {
  const pending = new Map()
  const completed = []
  page.on('request', request => {
    const url = new URL(request.url())
    const category = url.origin === origin ? 'app'
      : url.hostname.startsWith('strr-api-test-') ? 'strr-api'
      : url.hostname.startsWith('pay-api-test-') ? 'pay-api'
      : url.hostname === 'idtest.gov.bc.ca' ? 'test-identity' : 'other'
    pending.set(request, { category, resourceType: request.resourceType(), startedAt: Date.now() })
  })
  const finish = request => {
    const item = pending.get(request)
    if (!item) return
    pending.delete(request)
    completed.push({ category: item.category, resourceType: item.resourceType(), finishedAt: Date.now() })
    if (completed.length > 20) completed.shift()
  }
  page.on('requestfinished', finish)
  page.on('requestfailed', finish)
  const networkSnapshot = () => ({
    pendingCount: pending.size,
    pending: [...pending.values()].slice(0, 20).map(({ startedAt, ...item }) => ({ ...item, ageMs: Date.now() - startedAt })),
    recent: completed.map(({ finishedAt, ...item }) => ({ ...item, ageMs: Date.now() - finishedAt }))
  })
  await page.clock.install()
  await page.addInitScript(expectedOrigin => {
    if (location.origin !== expectedOrigin) return
    const intervals = new Map()
    const timeouts = new Map()
    const events = []
    const record = item => { events.push(item); if (events.length > 80) events.shift() }
    const schedule = window.setInterval.bind(window)
    const scheduleTimeout = window.setTimeout.bind(window)
    const cancel = window.clearInterval.bind(window)
    const cancelTimeout = window.clearTimeout.bind(window)
    window.setTimeout = function (handler, delay, ...args) {
      if (![30000, 120000, 1800000].includes(Number(delay)) || typeof handler !== 'function') {
        return scheduleTimeout(handler, delay, ...args)
      }
      let id
      const callback = function (...values) {
        timeouts.delete(id)
        record({ id, delay: Number(delay), action: 'fired', at: Date.now() })
        return handler.apply(this, values)
      }
      id = scheduleTimeout(callback, delay, ...args)
      timeouts.set(id, { id, delay: Number(delay), due: Date.now() + Number(delay) })
      record({ id, delay: Number(delay), action: 'scheduled', at: Date.now() })
      return id
    }
    window.setInterval = function (handler, delay, ...args) {
      let id
      const callback = typeof handler === 'function' ? function (...values) {
        const item = intervals.get(id)
        if (item) item.ticks++
        return handler.apply(this, values)
      } : handler
      id = schedule(callback, delay, ...args)
      if (Number(delay) === 1000) intervals.set(id, { id, ticks: 0 })
      return id
    }
    window.clearInterval = id => { intervals.delete(id); cancel(id) }
    window.clearTimeout = id => {
      if (timeouts.has(id)) record({ id, delay: timeouts.get(id).delay, action: 'cleared', at: Date.now() })
      timeouts.delete(id)
      intervals.delete(id)
      cancelTimeout(id)
    }
    window.__strrSessionTimers = () => [...intervals.values()].map(item => ({ ...item }))
    window.__strrSessionTimeouts = () => ({
      pending: [...timeouts.values()].map(({ id, delay, due }) => ({ id, delay, remaining: due - Date.now() })),
      events: events.map(({ at, ...item }) => ({ ...item, age: Date.now() - at }))
    })
  }, origin)
  return networkSnapshot
}

export async function verifySessionLifecycle(page, result, origin, networkSnapshot) {
  const checks = result.sessionLifecycle = {
    scope: 'Real login/dashboard and actual inactivity popup/controls/logout with accelerated browser time. Observes interval lifecycle. No API stubs, application writes or payments. Not a real-elapsed-time or server session-duration test.',
    cases: [], timers: [], messages: [], errors: [], consoleWarnings: 0, consoleErrors: 0
  }
  page.on('pageerror', error => {
    const frames = [...(error.stack || '').matchAll(/https:\/\/[^\s)]+\/(_nuxt\/[A-Za-z0-9_.-]+\.js):(\d+):(\d+)/g)]
      .slice(0, 3).map(match => ({ asset: match[1], line: Number(match[2]), column: Number(match[3]) }))
    const category = /Cannot (read|set) properties of (undefined|null)/.test(error.message) ? 'null-property-access'
      : /Cannot clear timer/.test(error.message) ? 'timer-kind-mismatch'
      : /Nuxt instance|Nuxt context|useModal\(\) is called without provider/.test(error.message) ? 'missing-app-context'
      : /fetch|network/i.test(error.message) ? 'network'
      : /session|token|auth/i.test(error.message) ? 'session-or-auth'
      : 'unclassified'
    const chunkUrl = error.name === 'ChunkLoadError' ? error.message.match(/https?:\/\/[^\s)]+/)?.[0] : undefined
    checks.errors.push({ name: error.name, stage: result.stage, category, frames,
      ...(chunkUrl ? { chunkHost: new URL(chunkUrl).hostname } : {}) })
  })
  page.on('console', message => {
    const text = message.text()
    if (message.type() === 'warning') checks.consoleWarnings++
    if (message.type() === 'error') checks.consoleErrors++
    for (const [match, category] of [
      ['useModal() is called without provider', 'modal-provider-unavailable'],
      ['inject() can only be used', 'injection-outside-context'],
      ['Unhandled error during execution of watcher', 'watcher-error'],
      ['Failed to resolve component', 'component-resolution-error']
    ]) if (text.includes(match)) checks.messages.push(category)
    if (['User unauthenticated or inactive, stopping token refresh schedule.',
      'Token set to expire soon. Refreshing token...', 'Token updated.',
      'Starting token refresh schedule.', 'Failed to refresh token on expiration; logging out.'].includes(text)) {
      checks.messages.push(text)
    }
  })
  const verify = async (name, action) => {
    result.stage = 'session-' + name
    try {
      await action()
      checks.cases.push({ name, result: 'passed' })
    } catch (error) {
      checks.cases.push({ name, result: 'failed', error: error.name })
    }
  }
  const settings = await page.evaluate(() => {
    const config = window.__NUXT__?.config?.public
    return Object.fromEntries(['tokenRefreshInterval', 'tokenMinValidity', 'sessionIdleTimeout', 'sessionExpiredModalTimeout']
      .map(key => [key, { type: typeof config?.[key], value: config?.[key] }]))
  })
  checks.settings = settings
  await verify('numeric-millisecond-settings', async () => {
    expect(Object.values(settings).every(item => item.type === 'number' && Number.isFinite(item.value))).toBe(true)
  })
  const idle = Number(settings.sessionIdleTimeout.value)
  const duration = Number(settings.sessionExpiredModalTimeout.value)
  expect(idle > 0 && idle <= 3600000 && duration >= 5000 && duration <= 300000).toBe(true)
  const modal = page.locator('#session-expired-dialog')
  const title = page.locator('#session-expired-dialog-title')
  const description = page.locator('#session-expired-dialog-description')
  const timers = () => page.evaluate(() => window.__strrSessionTimers())
  const open = async cycle => {
    result.stage = 'session-open-' + cycle + '-resume-clock'
    await page.clock.resume()
    // A dashboard response can arrive before the new page's auth plugin finishes.
    result.stage = 'session-open-' + cycle + '-idle-timer-ready'
    await expect.poll(() => page.evaluate(delay => window.__strrSessionTimeouts().pending.some(item => item.delay === delay), idle),
      { timeout: 20000 }).toBe(true)
    // Do not expire in-flight script/network load deadlines with the time jump.
    result.stage = 'session-open-' + cycle + '-network-idle'
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 })
    } finally {
      checks.networkReadiness ||= []
      checks.networkReadiness.push({ cycle, ...networkSnapshot() })
    }
    result.stage = 'session-open-' + cycle + '-pause-clock'
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100))
    result.stage = 'session-open-' + cycle + '-activity'
    await page.mouse.move(10 + cycle, 10)
    await page.clock.runFor(200)
    result.stage = 'session-open-' + cycle + '-timers'
    checks.timerObserverAvailable = await page.evaluate(() => typeof window.__strrSessionTimers === 'function')
    const before = await timers()
    checks.beforeAdvance = await page.evaluate(() => window.__strrSessionTimeouts())
    result.stage = 'session-open-' + cycle + '-advance'
    await page.clock.fastForward(idle + 1)
    await page.clock.runFor(500)
    checks.afterAdvance = await page.evaluate(() => window.__strrSessionTimeouts())
    result.stage = 'session-open-' + cycle + '-visible'
    try {
      // Keep animation/timer callbacks moving while asynchronous rendering settles.
      await expect.poll(async () => {
        await page.clock.runFor(100)
        return description.isVisible()
      }, { timeout: 10000 }).toBe(true)
    } finally {
      checks.openState = { cycle, appOrigin: new URL(page.url()).origin === origin,
        authRoute: new URL(page.url()).pathname.includes('/auth/'), modalCount: await modal.count(),
        modalVisible: await modal.isVisible(), descriptionCount: await description.count(),
        descriptionVisible: await description.isVisible(),
        modalBox: await modal.boundingBox(),
        trackedIntervals: (await timers()).length,
        timeouts: await page.evaluate(() => window.__strrSessionTimeouts()) }
    }
    await expect(modal).toHaveCount(1)
    await expect(title).toBeVisible()
    await expect(description).toBeVisible()
    await expect(description).toContainText('seconds')
    const added = (await timers()).filter(item => !before.some(old => old.id === item.id))
    checks.timers.push({ cycle, beforeCount: before.length, addedCount: added.length })
    expect(added).toHaveLength(1)
    return added[0].id
  }
  const closed = async (cycle, id) => {
    await page.clock.runFor(1000)
    await expect(title).not.toBeVisible()
    await expect(description).not.toBeVisible()
    const afterClose = (await timers()).find(item => item.id === id)
    await page.clock.runFor(2000)
    const later = (await timers()).find(item => item.id === id)
    Object.assign(checks.timers.find(item => item.cycle === cycle), {
      retainedAfterClose: Boolean(afterClose), ticksAfterClose: later ? later.ticks - (afterClose?.ticks || 0) : 0
    })
    await verify('timer-released-' + cycle, async () => expect(later).toBeUndefined())
    await expect(page).toHaveURL(url => url.origin === origin && !url.pathname.includes('/auth/'))
  }
  const first = await open(1)
  await verify('countdown-decreases-in-seconds', async () => {
    const before = Number((await description.innerText()).match(/(\d+) seconds?/)?.[1])
    expect(before).toBeGreaterThan(0)
    expect(before).toBeLessThanOrEqual(duration / 1000)
    await page.clock.runFor(2000)
    const after = Number((await description.innerText()).match(/(\d+) seconds?/)?.[1])
    expect(after).toBe(before - 2)
  })
  result.stage = 'session-keyboard-continue'
  await page.keyboard.press('Enter')
  await closed(1, first)
  checks.cases.push({ name: 'keyboard-continues-session', result: 'passed' })

  const second = await open(2)
  await verify('reopened-countdown-is-fresh', async () => {
    const value = Number((await description.innerText()).match(/(\d+) seconds?/)?.[1])
    const timer = (await timers()).find(item => item.id === second)
    expect(value).toBe(duration / 1000 - timer.ticks)
  })
  result.stage = 'session-button-continue'
  await modal.getByRole('button', { name: 'Your session is about to expire, press any key to continue your session.', exact: true }).click()
  await closed(2, second)
  checks.cases.push({ name: 'button-continues-session', result: 'passed' })

  await open(3)
  result.stage = 'session-inactivity-logout'
  await page.clock.runFor(duration + 1000)
  await page.clock.resume()
  await page.waitForURL(url => url.origin === origin && url.pathname.endsWith('/auth/login'), { timeout: 45000 })
  await expect(page.getByTestId('alert-session-expired')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with BC Services Card', exact: true })).toBeVisible()
  checks.cases.push({ name: 'inactivity-logs-out-with-expired-message', result: 'passed' })
  checks.result = checks.cases.every(item => item.result === 'passed') ? 'passed' : 'failed'
  expect(checks.result).toBe('passed')
}
