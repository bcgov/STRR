<script setup lang="ts">
// import { initWebMsg } from './utils/initWebMsg'

const i18nHead = useLocaleHead({
  addDirAttribute: true,
  addSeoAttributes: true
})

// set lang and dir attributes on head
useHead({
  htmlAttrs: {
    lang: () => i18nHead.value.htmlAttrs!.lang,
    dir: () => i18nHead.value.htmlAttrs!.dir
  }
})

onMounted(async () => {
  const { ldClient, getStoredFlag } = useConnectLaunchdarklyStore()
  await ldClient?.waitUntilReady()
  const enableSbcWebMsg = getStoredFlag('enable-sbc-web-messenger')
  const msgConfig = useAppConfig().strrBaseLayer.sbcWebMsg

  if (ldClient && enableSbcWebMsg && msgConfig.enable) {
    const rtc = useRuntimeConfig().public
    const genesysUrl = rtc.genesysUrl as string
    const environmentKey = rtc.genesysEnvironmentKey as string
    const deploymentKey = rtc.genesysDeploymentKey as string

    initWebMsg(genesysUrl, environmentKey, deploymentKey)
  }
})
</script>
<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <UNotifications />
    <UModals />
    <USlideovers />
  </div>
</template>
