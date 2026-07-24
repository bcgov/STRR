import type { StrrLoginIdp } from '~/types/strr-base-app-config'
import { unwrapAppConfigList } from '~/utils/unwrap-app-config'

function realmRolesFromToken (): string[] {
  const parsed = useNuxtApp().$keycloak?.tokenParsed as { realm_access?: { roles?: string[] } } | undefined
  return parsed?.realm_access?.roles ?? []
}

function buildAuthLoginUrl (publicBaseUrl: string, locale: string, invalidIdp: string): string {
  const base = `${publicBaseUrl}${locale}/auth/login`
  return `${base}?invalidIdp=${encodeURIComponent(invalidIdp)}`
}

export default defineNuxtRouteMiddleware(() => {
  const { isAuthenticated, kcUser, logout } = useKeycloak()
  const loginOptions = useAppConfig().strrBaseLayer.page.login.options
  const allowedIdps = unwrapAppConfigList<StrrLoginIdp>(loginOptions.idps)
  const requiredRealmRoles = unwrapAppConfigList(loginOptions.requiredRealmRoles).filter(Boolean)

  if (!isAuthenticated.value) {
    const localePath = useLocalePath()
    return navigateTo(localePath('/auth/login'))
  }

  const loginSource = kcUser.value.loginSource.toLowerCase()
  const locale = useNuxtApp().$i18n.locale.value
  const publicBaseUrl = useRuntimeConfig().public.baseUrl

  const allowedLower = new Set(allowedIdps.map(idp => idp.toLowerCase()))
  if (!allowedLower.has(loginSource)) {
    logout(
      buildAuthLoginUrl(publicBaseUrl, locale, kcUser.value.loginSource)
    )
    return
  }

  const realmRoles = realmRolesFromToken()
  if (
    requiredRealmRoles.length > 0 &&
    !requiredRealmRoles.every((role: string) => realmRoles.includes(role))
  ) {
    logout(`${publicBaseUrl}${locale}/auth/login`)
  }
})
