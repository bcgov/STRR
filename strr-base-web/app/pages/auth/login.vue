<script setup lang="ts">
const { t, locale } = useI18n()
const keycloak = useKeycloak()
const redirectUrl = useRuntimeConfig().public.baseUrl + locale.value + '/auth/login'

keycloak.setLogoutRedirectUrl(redirectUrl)

// page stuff
useHead({
  title: t('login.h1.login')
})

definePageMeta({
  middleware: 'login-page'
})

setBreadcrumbs([
  { label: t('label.bcregDash'), to: useRuntimeConfig().public.registryHomeURL + 'dashboard' },
  { label: t('label.login') }
])
</script>
<template>
  <div class="flex grow justify-center py-10">
    <UCard class="my-auto max-w-md">
      <h1>
        {{ $t('login.h1.login') }}
      </h1>
      <img src="/img/BCReg_Generic_Login_image.jpg" class="py-4" :alt="$t('imageAlt.genericLogin')">
      <div class="space-y-4 pt-2.5">
        <UButton
          :label="$t('label.loginBceid')"
          icon="i-mdi-two-factor-authentication"
          block
          @click="keycloak.login(IdpHint.BCEID, redirectUrl)"
        />
        <UButton
          :label="$t('label.loginBcsc')"
          icon="i-mdi-account-card-details-outline"
          color="gray"
          block
          @click="keycloak.login(IdpHint.BCSC, redirectUrl)"
        />
        <UButton
          :label="$t('label.loginIdir')"
          icon="i-mdi-account-group-outline"
          color="gray"
          block
          @click="keycloak.login(IdpHint.IDIR, redirectUrl)"
        />
      </div>
    </UCard>
  </div>
</template>
