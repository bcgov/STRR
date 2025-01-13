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
      window._genesysJs = 'Genesys'
      window.Genesys = window.Genesys || function (...args: any) {
        (window.Genesys.q = window.Genesys.q || []).push(args)
      }
      window.Genesys.t = Date.now()
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

    const removeWebMsg = () => {
      const script = document.querySelector(`script[src="${genesysUrl}"]`)
      if (script) {
        script.remove()
      }

      // clean up // TODO: cleanup
      delete window.Genesys
      delete window._genesysJs
      localStorage.removeItem('_actmu')
    }

    const isRouteAllowed = (path: string): boolean => {
      if (msgConfig.allowedRoutes === undefined) {
        return true
      }
      return msgConfig.allowedRoutes.some(route => path.includes(route))
    }

    if (isRouteAllowed(to.path)) {
      console.log('init')
      initWebMsg()
    } else {
      // TODO: make this work
      removeWebMsg()
      console.log('remove')
    }
  }
})
