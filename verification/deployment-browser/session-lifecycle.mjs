import { expect } from '@playwright/test'

export async function prepareSessionClock(page, origin) {
  await page.clock.install()
  await page.addInitScript(expectedOrigin => {
    if (location.origin !== expectedOrigin) return
    const intervals = new Map()
    const schedule = window.setInterval.bind(window)
    const cancel = window.clearInterval.bind(window)
    const cancelTimeout = window.clearTimeout.bind(window)
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
    window.clearTimeout = id => { intervals.delete(id); cancelTimeout(id) }
    window.__strrSessionTimers = () => [...intervals.values()].map(item => ({ ...item }))
  }, origin)
}

export async function verifySessionLifecycle(page, result, origin) {
  const checks = result.sessionLifecycle = {
    scope: 'Real login/dashboard and actual inactivity popup/controls/logout with accelerated browser time. Observes interval lifecycle. No API stubs, application writes or payments. Not a real-elapsed-time or server session-duration test.',
    cases: [], timers: []
  }
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
  const description = page.locator('#session-expired-dialog-description')
  const timers = () => page.evaluate(() => window.__strrSessionTimers())
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100))
  const open = async cycle => {
    result.stage = 'session-open-' + cycle
    await page.mouse.move(10 + cycle, 10)
    await page.clock.runFor(200)
    const before = await timers()
    await page.clock.fastForward(idle + 1)
    await page.clock.runFor(500)
    await expect(modal).toBeVisible()
    await expect(description).toContainText('seconds')
    const added = (await timers()).filter(item => !before.some(old => old.id === item.id))
    checks.timers.push({ cycle, beforeCount: before.length, addedCount: added.length })
    expect(added).toHaveLength(1)
    return added[0].id
  }
  const closed = async (cycle, id) => {
    await page.clock.runFor(1000)
    await expect(modal).not.toBeVisible()
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
    expect(value).toBeGreaterThanOrEqual(duration / 1000 - 1)
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
