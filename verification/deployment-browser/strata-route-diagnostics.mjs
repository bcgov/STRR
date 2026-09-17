// Passive observers only: allowlisted categories/timing, never URLs, headers, bodies or error text.
export async function prepareStrataRouteDiagnostics(page, result, environment) {
  if (!['dev', 'test'].includes(environment)) throw new Error('Only DEV/TEST diagnostics are allowed')
  const start = Date.now()
  const elapsed = () => Date.now() - start
  const log = result.routeDiagnostics = { requests: [], navigations: [], routerEvents: [], inputEvents: [], omittedRequests: 0 }
  const entries = new WeakMap()
  const routeCategory = value => {
    const pathname = new URL(value).pathname
    return pathname === '/en-CA/strata-hotel/dashboard' ? 'dashboard'
      : pathname === '/en-CA/strata-hotel/application' ? 'application'
      : pathname.includes('/auth/') ? 'auth' : 'other'
  }
  page.on('request', request => {
    const url = new URL(request.url())
    const api = ['auth', 'strr', 'pay'].find(name => url.hostname.startsWith(`${name}-api-${environment}-`))
    if (!api) return
    if (log.requests.length >= 120) { log.omittedRequests++; return }
    const resource = ['orgs', 'users', 'accounts', 'applications', 'registrations', 'fees'].find(name =>
      url.pathname.split('/').includes(name)) || 'other'
    const entry = { api, resource, method: request.method(), startedMs: elapsed(), stage: result.stage }
    log.requests.push(entry)
    entries.set(request, entry)
  })
  page.on('response', response => {
    const entry = entries.get(response.request())
    if (entry) { entry.status = response.status(); entry.responseMs = elapsed() }
  })
  page.on('requestfinished', request => {
    const entry = entries.get(request)
    if (entry) { entry.finishedMs = elapsed(); entry.failed = false }
  })
  page.on('requestfailed', request => {
    const entry = entries.get(request)
    if (entry) { entry.finishedMs = elapsed(); entry.failed = true }
  })
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame() && log.navigations.length < 50) {
      log.navigations.push({ atMs: elapsed(), route: routeCategory(frame.url()), stage: result.stage })
    }
  })
  await page.exposeFunction('__strrRouteDiagnosticEvent', event => {
    const kinds = ['before', 'resolve', 'after', 'error']
    const routes = ['dashboard', 'application', 'auth', 'other']
    if (!event || log.routerEvents.length >= 50 || !kinds.includes(event.kind) ||
        !routes.includes(event.to) || !routes.includes(event.from)) return
    log.routerEvents.push({ atMs: elapsed(), kind: event.kind, to: event.to, from: event.from,
      failure: event.failure === true,
      failureType: [4, 8, 16].includes(event.failureType) ? event.failureType : null })
  })
  await page.exposeFunction('__strrInputDiagnosticEvent', event => {
    if (!event || log.inputEvents.length >= 180 ||
        !['input', 'maska', 'change', 'blur', 'click'].includes(event.kind) ||
        !['phone-number', 'phone-countryCode', 'platform-primary-rep-party-email', 'application-link'].includes(event.field) ||
        !['capture', 'microtask', 'frame'].includes(event.phase)) return
    log.inputEvents.push({ atMs: elapsed(), stage: result.stage, kind: event.kind, field: event.field,
      phase: event.phase, trusted: event.trusted === true, prevented: event.prevented === true,
      phonePresent: event.phonePresent === true,
      phoneDigitCount: Number.isInteger(event.phoneDigitCount) && event.phoneDigitCount >= 0 && event.phoneDigitCount <= 20
        ? event.phoneDigitCount : null,
      matchesSyntheticPhone: event.matchesSyntheticPhone === true, matchesCountryCode: event.matchesCountryCode === true })
  })
  await page.addInitScript(() => {
    if (!/^https:\/\/(dev|test)\.stratahotel\.shorttermrental\.registry\.gov\.bc\.ca$/.test(location.origin)) return
    for (const kind of ['input', 'maska', 'change', 'blur', 'click']) {
      document.addEventListener(kind, event => {
        const target = event.target
        let field = target?.getAttribute?.('data-testid')
        if (kind === 'click' && target?.closest?.('a')?.getAttribute('href') === '/en-CA/strata-hotel/application') {
          field = 'application-link'
        }
        if (!['phone-number', 'phone-countryCode', 'platform-primary-rep-party-email', 'application-link'].includes(field)) return
        const snapshot = phase => {
          const phone = document.querySelector('[data-testid="phone-number"]')
          const digits = (phone?.value || '').replace(/\D/g, '')
          void window.__strrInputDiagnosticEvent({ kind, field, phase, trusted: event.isTrusted,
            prevented: event.defaultPrevented, phonePresent: Boolean(phone), phoneDigitCount: Math.min(digits.length, 20),
            matchesSyntheticPhone: digits === '2505550100',
            matchesCountryCode: document.querySelector('[data-testid="phone-countryCode"]')?.value === '+1'
          }).catch(() => {})
        }
        snapshot('capture')
        queueMicrotask(() => snapshot('microtask'))
        requestAnimationFrame(() => snapshot('frame'))
      }, true)
    }
  })
  return async () => {
    log.routerAvailable = await page.evaluate(() => {
      const app = document.querySelector('#__nuxt')?.__vue_app__
      const router = app?.config?.globalProperties?.$router
      if (!router?.beforeEach || !router?.beforeResolve || !router?.afterEach || !router?.onError) return false
      const classify = route => route.path === '/en-CA/strata-hotel/dashboard' ? 'dashboard'
        : route.path === '/en-CA/strata-hotel/application' ? 'application'
        : route.path?.includes('/auth/') ? 'auth' : 'other'
      const emit = (kind, to, from, failure) => {
        void window.__strrRouteDiagnosticEvent({ kind, to: classify(to), from: classify(from),
          failure: Boolean(failure), failureType: failure?.type ?? null }).catch(() => {})
      }
      router.beforeEach((to, from) => { emit('before', to, from) })
      router.beforeResolve((to, from) => { emit('resolve', to, from) })
      router.afterEach((to, from, failure) => { emit('after', to, from, failure) })
      router.onError((_error, to, from) => { emit('error', to, from, true) })
      return true
    })
    log.routerObserverStartedMs = elapsed()
  }
}
