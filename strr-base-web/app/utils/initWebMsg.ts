export const initWebMsg = (genesysUrl: string, environmentKey: string, deploymentKey: string) => {
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
