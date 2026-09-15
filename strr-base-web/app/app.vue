<script setup lang="ts">
import { expansionInjectionKey } from '#baseWeb/composables/useStrrExpansion'

const i18nHead = useLocaleHead()

// set lang and dir attributes on head
useHead(() => ({ htmlAttrs: i18nHead.value.htmlAttrs }))

// provide initial expansion state
const initialExpansionState = shallowRef<ExpansionState>({
  component: 'div',
  props: {}
})
provide(expansionInjectionKey, initialExpansionState)

onMounted(async () => {
  const msgConfig = useAppConfig().strrBaseLayer.sbcWebMsg

  if (msgConfig.enable) {
    const { ldClient, getStoredFlag } = useConnectLaunchdarklyStore()
    await ldClient?.waitUntilReady()
    const enableSbcWebMsg = getStoredFlag('enable-sbc-web-messenger')

    if (ldClient && enableSbcWebMsg) {
      const rtc = useRuntimeConfig().public
      const genesysUrl = rtc.genesysUrl as string
      const environmentKey = rtc.genesysEnvironmentKey as string
      const deploymentKey = rtc.genesysDeploymentKey as string

      initWebMsg(genesysUrl, environmentKey, deploymentKey)
    }
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
