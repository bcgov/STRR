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
    label: t('label.continueBcsc'),
    subtext: loginConfig.options.bcscSubtext,
    icon: 'i-mdi-account-card-details-outline',
    click: () => keycloak.login(IdpHint.BCSC, redirectUrl)
  },
  bceid: {
    label: t('label.continueBceid'),
    subtext: loginConfig.options.bceidSubtext,
    icon: 'i-mdi-two-factor-authentication',
    click: () => keycloak.login(IdpHint.BCEID, redirectUrl)
  },
  idir: {
    label: t('label.continueIdir'),
    subtext: loginConfig.options.idirSubtext,
    icon: 'i-mdi-account-group-outline',
    click: () => keycloak.login(IdpHint.IDIR, redirectUrl)
  }
}

const options = computed(() => {
  const items = loginConfig.options.idps
  return items.map(key => loginOptionsMap[key]) // order by idps array
})

const isSessionExpired = sessionStorage.getItem(ConnectStorageKeys.CONNECT_SESSION_EXPIRED)

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
  <div class="flex grow flex-col items-center justify-center py-10">
    <div class="flex flex-col items-center gap-4">
      <h1>
        {{ $t('page.login.h1') }}
      </h1>
      <UAlert
        v-if="isSessionExpired"
        data-testid="alert-session-expired"
        color="yellow"
        icon="i-mdi-alert"
        :close-button="null"
        variant="subtle"
        title="Session Expired"
        description="Your session has expired. Please log in again to continue."
        :ui="{
          inner: 'pt-0',
          icon: { base: 'self-start text-outcomes-caution' },
          title: 'text-base font-bold',
          description: 'text-gray-900'
        }"
      />
      <UCard class="my-auto max-w-md">
        <img src="/img/BCReg_Generic_Login_image.jpg" class="pb-4" :alt="$t('imageAlt.genericLogin')">
        <div class="space-y-4 pt-2.5">
          <div
            v-for="(option, i) in options"
            :key="option.label"
            class="flex flex-col items-center gap-1"
          >
            <UButton
              :variant="i === 0 ? 'solid' : 'outline'"
              block
              :icon="option.icon"
              :label="option.label"
              :ui="{
                gap: { sm: 'gap-x-2.5' }
              }"
              @click="option.click"
            />
            <span
              v-if="option.subtext"
              class="text-xs"
            >
              {{ $t(option.subtext) }}
            </span>
          </div>
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
  </div>
</template>
