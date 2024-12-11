<script setup lang="ts">
const { t, locale } = useI18n()
const keycloak = useKeycloak()
const { createAccountUrl } = useConnectNav()
const runtimeConfig = useRuntimeConfig()
const loginConfig = useAppConfig().strrBaseLayer.page.login

const redirectUrl = loginConfig.redirectPath
  ? runtimeConfig.public.baseUrl + locale.value + loginConfig.redirectPath
  : undefined

const loginOptionsMap = {
  bcsc: {
    label: t('label.loginBcsc'),
    icon: 'i-mdi-account-card-details-outline',
    click: () => keycloak.login(IdpHint.BCSC, redirectUrl)
  },
  bceid: {
    label: t('label.loginBceid'),
    icon: 'i-mdi-two-factor-authentication',
    click: () => keycloak.login(IdpHint.BCEID, redirectUrl)
  },
  idir: {
    label: t('label.loginIdir'),
    icon: 'i-mdi-account-group-outline',
    click: () => keycloak.login(IdpHint.IDIR, redirectUrl)
  }
}

const options = computed(() => {
  const items = loginConfig.options.idps
  return items.map(key => loginOptionsMap[key]) // order by idps array
})

// page stuff
useHead({
  title: t('page.login.h1')
})

definePageMeta({
  middleware: 'login-page',
  hideBreadcrumbs: true
})

// show notification if user was redirected here with an invalid login
onMounted(() => {
  const invalidIdp = useRoute().query.invalidIdp
  if (invalidIdp && LoginSource[invalidIdp as LoginSource] !== undefined) {
    useToast().add({ title: t('toast.invalidIdp.generic') })
  }
})
</script>
<template>
  <div class="flex grow justify-center py-10">
    <UCard class="my-auto max-w-md">
      <h1>
        {{ $t('page.login.h1') }}
      </h1>
      <img src="/img/BCReg_Generic_Login_image.jpg" class="py-4" :alt="$t('imageAlt.genericLogin')">
      <div class="space-y-4 pt-2.5">
        <UButton
          v-for="(option, i) in options"
          :key="option.label"
          :color="i === 0 ? 'primary' : 'gray'"
          block
          :icon="option.icon"
          :label="option.label"
          :ui="{
            gap: { sm: 'gap-x-2.5' }
          }"
          @click="option.click"
        />
        <UDivider
          v-if="loginConfig.options.createAccount"
          :label="$t('word.OR')"
        />
        <UButton
          v-if="loginConfig.options.createAccount"
          :label="$t('btn.createAnAccount')"
          block
          color="gray"
          :to="createAccountUrl()"
        />
      </div>
    </UCard>
  </div>
</template>
