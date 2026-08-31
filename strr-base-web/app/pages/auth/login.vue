<script setup lang="ts">
import type { StrrLoginIdp } from '~/types/strr-base-app-config'
import { unwrapAppConfigList } from '~/utils/unwrap-app-config'

const { t, locale } = useNuxtApp().$i18n
const keycloak = useKeycloak()
const { createAccountUrl } = useConnectNav()
const runtimeConfig = useRuntimeConfig()
const loginConfig = useAppConfig().strrBaseLayer.page.login

const redirectUrl = loginConfig.redirectPath
  ? runtimeConfig.public.baseUrl + locale.value + loginConfig.redirectPath
  : undefined

type RuntimeLoginOptions = typeof loginConfig.options & {
  idps?: StrrLoginIdp[] | (() => StrrLoginIdp[])
  loginButtonIdps?: StrrLoginIdp[] | (() => StrrLoginIdp[])
}

const loginOpts = (): RuntimeLoginOptions => loginConfig.options as RuntimeLoginOptions

const allowedIdps = computed(() => unwrapAppConfigList<StrrLoginIdp>(loginOpts().idps))

const loginOptionsMap: Record<
  StrrLoginIdp,
  {
    label: string
    subtext: string | undefined
    icon: string
    click: () => Promise<void>
  }
> = {
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

const idpKeysForButtons = computed((): StrrLoginIdp[] => {
  const allowed = allowedIdps.value
  const shown = unwrapAppConfigList(loginOpts().loginButtonIdps)
  if (shown.length === 0) {
    return [...allowed]
  }
  const filtered = shown.filter((k): k is StrrLoginIdp => allowed.includes(k))
  return filtered.length > 0 ? filtered : [...allowed]
})

const options = computed(() =>
  idpKeysForButtons.value.map(key => ({
    ...loginOptionsMap[key]
  }))
)

const isSessionExpired = sessionStorage.getItem(ConnectStorageKeys.CONNECT_SESSION_EXPIRED)

const IDP_QUERY = 'idp'
const idpQueryLoginStarted = ref(false)

const STRR_LOGIN_IDPS = ['bcsc', 'bceid', 'idir'] as const satisfies readonly StrrLoginIdp[]

function parseIdpFromQuery (query: Record<string, unknown>): StrrLoginIdp | null {
  const raw = query[IDP_QUERY]
  const s = (Array.isArray(raw) ? raw[0] : raw)?.toString().toLowerCase().trim()
  if (!s || !(STRR_LOGIN_IDPS as readonly string[]).includes(s)) {
    return null
  }
  return s as StrrLoginIdp
}

function idpToKeycloakHint (idp: StrrLoginIdp) {
  switch (idp) {
    case 'bcsc':
      return IdpHint.BCSC
    case 'bceid':
      return IdpHint.BCEID
    case 'idir':
      return IdpHint.IDIR
  }
}

/** Deep link: `?idp=bceid` when that IdP is in allowed `idps`. */
async function runLoginFromIdpQuery () {
  if (idpQueryLoginStarted.value) {
    return
  }
  const route = useRoute()
  const idp = parseIdpFromQuery(route.query as Record<string, unknown>)
  if (!idp || !allowedIdps.value.includes(idp)) {
    return
  }
  idpQueryLoginStarted.value = true
  await keycloak.login(idpToKeycloakHint(idp), redirectUrl)
}

useHead({
  title: t('page.login.h1')
})

definePageMeta({
  middleware: 'login-page',
  hideBreadcrumbs: true
})

onMounted(() => {
  const route = useRoute()
  const invalidIdp = route.query.invalidIdp
  if (invalidIdp && LoginSource[invalidIdp as LoginSource] !== undefined) {
    useToast().add({ title: t('toast.invalidIdp.generic') })
  }
  runLoginFromIdpQuery().catch(() => {})
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
        :title="$t('label.sessionExpired')"
        :description="$t('text.sessionExpired')"
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
