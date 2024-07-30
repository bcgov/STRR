<template>
  <header
    id="bcros-main-header"
    class="bg-bcGovColor-header border-b-2 border-bcGovColor-navDivider"
    data-cy="header"
  >
    <div
      id="bcros-main-header__container"
      class="flex flex-wrap content-center m-auto px-4 h-[68px] w-full max-w-[1360px]"
    >
      <nav
        id="bcros-main-header__container__actions"
        class="flex flex-wrap content-center h-[50px] w-full items-center"
      >
        <a id="bcros-main-header__container__actions__home-redirect" class="flex no-underline" @click="goToBcrosHome()">
          <picture class="mobile:w-[60px] mobile:h-[60px]">
            <source media="(max-width:1024px)" srcset="@/assets/images/gov_bc_logo_vert.png">
            <img src="@/assets/images/gov_bc_logo_horiz.png" alt="Government of British Columbia" width="100%" height="100%">
          </picture>
          <span
            data-cy="strr-title"
            class="flex flex-wrap content-center font-bold ml-5 text-white text-lg
            mobile:ml-[10px] mobile:leading-[20px] mobile:text-[14px] mobile:w-[130px]"
            style="letter-spacing: -.03rem;"
          >
            {{ t('header.title') }}
          </span>
        </a>
        <div
          id="bcros-main-header__container__actions__menus"
          class="flex flex-auto justify-end h-full text-white"
        >
          <div class="hidden mobile:flex justify-center items-center">
            <BcrosMobileIcon :icon-path="notificationIcon" alt-text="Notification Icon" />
            <BcrosMobileIcon :icon-path="hamburgerIcon" alt-text="Menu Icon" />
          </div>
          <div v-if="authenticated" class="flex flex-wrap self-center text-sm mobile:hidden">
            <BcrosHeaderMenu data-cy="logged-in-menu" :menu-lists="loggedInMenuOptions">
              <template #menu-button-text>
                <BcrosHeaderAccountLabel
                  :account-name="!personMode ? currentAccountName : ''"
                  :username="userFullName"
                />
              </template>
              <template #menu-list-header-0>
                <div class="flex px-4 mb-3">
                  <BcrosHeaderAccountLabel
                    :avatar-classes="'text-white'"
                    :account-name="!personMode ? currentAccountName : ''"
                    :username="userFullName"
                  />
                </div>
              </template>
            </BcrosHeaderMenu>
          </div>
          <div v-else class="flex flex-wrap self-center text-sm h-[36px] mobile:hidden">
            <BcrosHeaderMenu
              data-cy="logged-out-menu"
              :menu-button-text="'Log in'"
              :menu-lists="loggedOutMenuOptions"
            />
            <button
              class="text-white ml-2 p-2 hover:bg-bcGovColor-activeBlue/[0.2]"
              data-cy="logged-out-create-accnt"
              @click="createAccount()"
            >
              {{ t('header.buttons.createAccount') }}
            </button>
          </div>
        </div>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBcrosAuth } from '~/composables/useBcrosAuth'
import { useBcrosNavigate } from '~/composables/useBcrosNavigate'
import { useBcrosAccount } from '~/stores/account'
import { useBcrosKeycloak } from '~/stores/keycloak'
import notificationIcon from '~/assets/icons/notifications.svg'
import hamburgerIcon from '~/assets/icons/hamburger.svg'

const props = defineProps<{ personMode?: boolean }>()

const t = useNuxtApp().$i18n.t
const {
  goToAccountInfo,
  goToBcrosHome,
  goToBcrosLogin,
  goToEditProfile,
  goToTeamMembers,
  goToTransactions
} = useBcrosNavigate()
// account / user
const account = useBcrosAccount()
const { currentAccount, currentAccountName, userFullName, userAccounts } = storeToRefs(account)
// kc / auth
const keycloak = useBcrosKeycloak()
const authenticated = computed(() => keycloak.kc.authenticated)
const { createAccount, logout } = useBcrosAuth()

function switchAccount (accountId: string) {
  account.switchCurrentAccount(accountId)
  // refresh the page so that account based checks are rerun
  window.location.reload()
}

// logged out menu options
const loginOptions = [
  {
    label: t('labels.services.bcsc'),
    icon: 'i-mdi-account-card-details-outline',
    action: goToBcrosLogin,
    args: IdpHintE.BCSC
  },
  {
    label: t('labels.services.bceid'),
    icon: 'i-mdi-two-factor-authentication',
    action: goToBcrosLogin,
    args: IdpHintE.BCEID
  },
  {
    label: t('labels.services.idir'),
    icon: 'i-mdi-account-group-outline',
    action: goToBcrosLogin,
    args: IdpHintE.IDIR
  }
]

const loggedOutMenuOptions = [
  { header: t('header.menus.headers.selectLogin') },
  { items: loginOptions }
]

// logged in menu options
const basicAccountOptions = computed(() => {
  const options: HeaderMenuItemI[] = []
  if ([LoginSourceE.BCEID, LoginSourceE.BCSC].includes(keycloak.kcUser?.loginSource)) {
    options.unshift({
      label: t('header.menus.labels.editProfile'),
      icon: 'i-mdi-account-outline',
      action: goToEditProfile
    })
  }
  options.push({
    label: t('header.menus.labels.logOut'),
    icon: 'i-mdi-logout-variant',
    action: logout,
    args: window.location.href
  })
  return options
})

const accountSettingsOptions = computed(() => {
  const options: HeaderMenuItemI[] = [
    { label: t('header.menus.labels.accountInfo'), icon: 'i-mdi-information-outline', action: goToAccountInfo },
    { label: t('header.menus.labels.teamMembers'), icon: 'i-mdi-account-group-outline', action: goToTeamMembers }
  ]
  if ([AccountTypeE.PREMIUM, AccountTypeE.SBC_STAFF, AccountTypeE.STAFF].includes(currentAccount.value.accountType)) {
    options.push({
      label: t('header.menus.labels.transactions'),
      icon: 'i-mdi-file-document-outline',
      action: goToTransactions
    })
  }
  return options
})

const switchAccountOptions = computed(() => {
  const options: HeaderMenuItemI[] = []
  for (const i in userAccounts.value) {
    const isActive = currentAccount.value.id === userAccounts.value[i].id
    // add active account stuff to menu list item
    options.push({
      label: userAccounts.value[i].label,
      action: isActive ? undefined : switchAccount,
      args: userAccounts.value[i].id,
      icon: isActive ? 'i-mdi-check' : '',
      setActive: isActive
    })
  }
  return options
})

const createOptions = computed((): HeaderMenuItemI[] => {
  if ([LoginSourceE.BCROS, LoginSourceE.IDIR].includes(keycloak.kcUser?.loginSource)) {
    return []
  }
  return [{ label: t('header.menus.labels.createAccount'), icon: 'i-mdi-plus', action: createAccount }]
})

const loggedInMenuOptions: Ref<HeaderMenuItemI[]> = ref([])

function updateLoggedInMenuOptions () {
  const options: HeaderMenuItemI[] = [{ items: basicAccountOptions.value }]
  if (!props.personMode) {
    if (accountSettingsOptions.value.length > 0) {
      options.push({ header: t('header.menus.headers.accountSettings'), items: accountSettingsOptions.value })
    }
    if (switchAccountOptions.value.length > 1) {
      options.push({ header: t('header.menus.headers.switchAccount'), items: switchAccountOptions.value })
    }
    if (createOptions.value.length > 0) {
      options.push({ items: createOptions.value })
    }
  }
  loggedInMenuOptions.value = options
}

onBeforeMount(() => { updateLoggedInMenuOptions() })

watch(() => currentAccount.value, (val) => {
  // update loggedInMenuOptions (header menu)
  if (!val) {
    loggedInMenuOptions.value = []
  } else {
    updateLoggedInMenuOptions()
  }
})
</script>

<style scoped>
</style>
