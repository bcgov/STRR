// TODO: get ld flag working, organize plugin, comments, test, etc
export default defineNuxtPlugin(async () => {
  // const { ldClient, getStoredFlag } = useConnectLaunchdarklyStore()
  // await ldClient?.waitUntilReady()
  const rtc = useRuntimeConfig().public
  // const msgConfig = useAppConfig().strrBaseLayer.sbcWebMsg

  // const ldFlag = getStoredFlag('enable-sbc-web-messenger')

  const genesysUrl = rtc.genesysUrl
  const environmentKey = rtc.genesysEnvironmentKey
  const deploymentKey = rtc.genesysDeploymentKey

  if (!genesysUrl || !environmentKey || !deploymentKey) {
    console.warn('SBC Web Messenger configuration is incomplete. SBC Web Messenger will not be initialized.')
    return
  }

  const initGenesys = () => {
    // if (!msgConfig.enable || !ldFlag) {
    //   console.warn('SBC Web Messenger has been disabled.')
    //   return
    // }

    // prevent duplicate
    if (window._genesysJs) {
      console.warn('SBC Web Messenger has already been initialized.')
      return
    }

    // check if exists already
    const scriptExists = document.querySelector(`script[src="${genesysUrl}"]`)
    if (scriptExists) {
      console.warn('Genesys script already exists in the document.')
      return
    }

    window._genesysJs = 'Genesys'
    window.Genesys = window.Genesys || function () {
      (window.Genesys.q = window.Genesys.q || []).push(arguments)
    }
    window.Genesys.t = Date.now()
    window.Genesys.c = {
      environment: environmentKey,
      deploymentId: deploymentKey
    }
    const ys = document.createElement('script')
    ys.async = true
    ys.src = genesysUrl
    // ys.charset = 'utf-8'; // Deprecated
    ys.onload = () => {
      console.info('SBC Web Messenger script loaded successfully.')
    }
    ys.onerror = (error) => {
      console.error('Failed to load SBC Web Messenger script:', error)
    }
    document.head.appendChild(ys)
    localStorage.removeItem('_actmu')
  }

  const removeGenesys = () => {
    const script = document.querySelector(`script[src="${genesysUrl}"]`)
    if (script) {
      script.remove()
    }

    // clean up // TODO: cleanup
    // delete window.Genesys
    // delete window._genesysJs
    localStorage.removeItem('_actmu')
  }

  const router = useRouter()

  const allowedRoutes = useAppConfig().strrBaseLayer.sbcWebMsg.allowedRoutes

  const isRouteAllowed = (path: string): boolean => {
    if (allowedRoutes === undefined) {
      return true
    }
    return allowedRoutes.some(route => path.includes(route))
  }

  router.beforeEach((to, from, next) => {
    if (isRouteAllowed(to.path)) {
      initGenesys()
    } else {
      removeGenesys()
    }
    next()
  })
})
