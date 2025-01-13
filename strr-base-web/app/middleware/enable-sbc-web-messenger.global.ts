export default defineNuxtRouteMiddleware(async (to) => {
  const { ldClient, getStoredFlag } = useConnectLaunchdarklyStore()
  await ldClient?.waitUntilReady()
  const enableSbcWebMsg = getStoredFlag('enable-sbc-web-messenger')
  const msgConfig = useAppConfig().strrBaseLayer.sbcWebMsg

  if (ldClient && enableSbcWebMsg && msgConfig.enable) {
    const rtc = useRuntimeConfig().public
    const genesysUrl = rtc.genesysUrl as string
    const environmentKey = rtc.genesysEnvironmentKey as string
    const deploymentKey = rtc.genesysDeploymentKey as string

    const initWebMsg = () => {
      if (!genesysUrl || !environmentKey || !deploymentKey) {
        console.warn('Missing Sbc Web Messenger config, aborting setup.')
        return
      }

      window._genesysJs = 'Genesys'
      window.Genesys = window.Genesys || function (...args: any) {
        (window.Genesys.q = window.Genesys.q || []).push(args)
      }
      window.Genesys.t = new Date().getTime()
      window.Genesys.c = {
        environment: environmentKey,
        deploymentId: deploymentKey
      }

      const script = document.createElement('script')
      script.async = true
      script.src = genesysUrl
      document.head.appendChild(script)
      localStorage.removeItem('_actmu')
    }

    // TODO: how to remove ?
    // const removeWebMsg = () => {
    // const scripts = document.querySelectorAll('script[src^="https://apps.cac1.pure.cloud"]')
    // scripts.forEach(script => script.remove())

    // const el1 = document.getElementById('genesys-thirdparty')
    // if (el1) {
    //   el1.remove()
    // }

    // const el2 = document.getElementById('genesys-messenger')
    // if (el2) {
    //   el2.remove()
    // }

    // delete window.Genesys
    // delete window._genesysJs
    // localStorage.removeItem('_actmu')
    // }

    const isRouteAllowed = (path: string): boolean => {
      if (msgConfig.allowedRoutes === undefined) {
        return true
      }
      return msgConfig.allowedRoutes.some(route => path.includes(route))
    }

    if (isRouteAllowed(to.path)) {
      initWebMsg()
    } else {
      // TODO: how to remove ?
      // removeWebMsg()
    }
  }
})
