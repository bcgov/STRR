<script setup lang="ts">
// import { isoCountriesList } from '~/utils/isoCountriesList'
const localePath = useLocalePath()
const { t } = useI18n()
const isSmallScreen = useMediaQuery('(max-width: 640px)')
const strrModal = useStrrModals()
const accountStore = useConnectAccountStore()

useHead({
  title: t('strr.title.chooseAccount')
})

definePageMeta({
  middleware: ['auth', 'check-tos']
})

function handleAccountSwitch (id: string) {
  const route = useRoute()
  accountStore.switchCurrentAccount(id)

  if (route.query.return) {
    return navigateTo(route.query.return as string)
  } else {
    return navigateTo(localePath('/strata-hotel/dashboard'))
  }
}
</script>
<template>
  <div class="space-y-8 py-8 sm:py-10">
    <ConnectTypographyH1 :text="$t('label.selectAccount')" />

    <p>What subtitle/text should go here?</p>
    <!-- <p>{{ $t('strr.text.selectAccountForStrr') }}</p> -->

    <UAlert
      color="yellow"
      icon="i-mdi-alert"
      :close-button="null"
      variant="subtle"
      :ui="{
        inner: 'pt-0',
      }"
    >
      <template #description>
        <span class="text-gray-900">Some warning here maybe</span>
        <!-- eslint-disable-next-line -->
        <!-- <ConnectI18nBold class="text-bcGovColor-darkGray" translation-path="strr.text.onlyPremiumAccountWarning" /> -->
      </template>
    </UAlert>

    <ConnectTypographyH2
      :text="$t('label.yourExistingAccounts', { count: accountStore.userAccounts.length })"
    />

    <section
      :aria-label="$t('label.yourExistingAccounts', { count: accountStore.userAccounts.length })"
      class="max-h-96 w-full overflow-y-auto rounded bg-white px-8 shadow"
    >
      <div
        v-if="accountStore.userAccounts.length === 0"
        class="flex h-36 flex-col items-center justify-center gap-4 text-center sm:h-48"
      >
        <UIcon name="i-mdi-database" class="size-6" />
        <span>{{ $t('text.noAccountsFound') }}</span>
      </div>

      <ul
        v-else
        class="flex flex-col divide-y"
      >
        <li
          v-for="account in accountStore.userAccounts"
          :key="account.id"
          class="flex flex-col items-start justify-between gap-4 py-8 sm:flex-row sm:items-center"
        >
          <div
            class="flex flex-row items-center gap-4 sm:gap-6"
            :class="(account.accountStatus !== AccountStatus.ACTIVE)
              ? 'opacity-50' : ''"
          >
            <UAvatar
              :alt="account.label[0]"
              :ui="{
                background: 'bg-blue-300 dark:bg-[#E0E7ED]',
                text: 'font-semibold leading-none text-white dark:text-bcGovColor-darkGray truncate',
                placeholder: 'font-semibold leading-none text-white truncate dark:text-bcGovColor-darkGray text-xl',
                rounded: 'rounded-sm'
              }"
            />
            <div class="flex w-full flex-col text-left">
              <span class="text-lg font-semibold text-bcGovColor-darkGray">
                {{ account.label }}
              </span>
              <!-- TODO: Add mailing address ? -->
              <!-- <span
                v-if="Array.isArray(account.contacts) && account.contacts.length !== 0 &&
                 'street' in account.contacts[0]"
                :id="`account-address-${account.id}`"
                class="text-bcGovColor-midGray dark:text-gray-300"
              >
                {{ account.contacts[0].street }},
                {{ account.contacts[0].city }},
                {{ account.contacts[0].region }}
                {{ account.contacts[0].postalCode }},
                {{ isoCountriesList.find((country: SbcCountry) => country.alpha_2 ===
                 account.contacts[0].country)?.name || account.contacts[0].country }}
              </span> -->
            </div>
          </div>
          <div class="flex w-full flex-col gap-4 sm:w-fit sm:flex-row">
            <div class="my-auto flex gap-2">
              <UBadge
                v-if="account.accountStatus !== AccountStatus.ACTIVE"
                :label="$t('badge.inactiveAccount')"
                class="bg-[#fff7e3] px-3 text-center font-bold text-bcGovColor-midGray"
              />
            </div>

            <UButton
              :label="$t('btn.useThisAccount.main')"
              :aria-label="$t('btn.useThisAccount.aria', { name: account.label })"
              :icon="'i-mdi-chevron-right'"
              trailing
              size="bcGov"
              :block="isSmallScreen"
              :disabled="account.accountStatus !== AccountStatus.ACTIVE"
              data-testid="choose-existing-account-button"
              @click="handleAccountSwitch(account.id)"
            />
          </div>
        </li>
      </ul>
    </section>
    <div class="flex justify-center">
      <UButton
        variant="outline"
        size="bcGov"
        :label="$t('btn.createNewAccount')"
        icon="i-mdi-chevron-right"
        trailing
        :block="isSmallScreen"
        @click="strrModal.openCreateAccountModal()"
      />
    </div>
  </div>
</template>
