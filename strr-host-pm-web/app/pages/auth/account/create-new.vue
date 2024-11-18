<script setup lang="ts">
import type { Form } from '#ui/types'
import { z } from 'zod'
const { $strrApi } = useNuxtApp()
const localePath = useLocalePath()
const { t } = useI18n()
const strrModal = useStrrModals()
const hostpmModal = useHostPmModals()
const isSmallScreen = useMediaQuery('(max-width: 640px)')
const accountStore = useConnectAccountStore()
const { compPartySchema } = useStrrContactStore()
const { completingParty } = storeToRefs(useStrrContactStore())
const loading = ref<boolean>(false)

const createAccountSchema = compPartySchema.extend({
  accountName: z
    .string()
    .trim()
    .min(1, t('validation.accountName.required')) // check for a non empty string
    .refine( // check account doesnt already exist
      name => !accountStore.userAccounts.some(account => account.label === name),
      t('validation.accountName.exists')
    )
})

type CreateAccountSchema = z.output<typeof createAccountSchema>

const state = reactive({
  ...completingParty.value,
  accountName: ''
})

const createAccountFormRef = ref<Form<CreateAccountSchema>>()

useHead({
  title: t('page.createAccount.title')
})

definePageMeta({
  middleware: ['auth', 'check-tos'],
  hideBreadcrumbs: true
})

async function handleCreateAccount () {
  try {
    loading.value = true

    const response = await $strrApi<{sbc_account_id: number, user_id: number}>('/accounts', {
      method: 'POST',
      body: {
        name: state.accountName,
        email: state.emailAddress,
        phone: state.phone.countryCode + state.phone.number,
        phoneExtension: state.phone.extension
      }
    })

    if (response.sbc_account_id) {
      await accountStore.setAccountInfo() // reload user accounts
      accountStore.switchCurrentAccount(response.sbc_account_id as unknown as string) // set new account as current account // TODO: fix type in core layer (layer expects string, should be number)
      await navigateTo(localePath('/application'))
    }
  } catch (e) {
    strrModal.openAppSubmitError(e) // TODO: better error message
    logFetchError(e, 'Unable to create account')
  } finally {
    loading.value = false
  }
}
</script>
<template>
  <div class="flex flex-col gap-8 py-8 sm:py-10">
    <div class="flex flex-col gap-4">
      <ConnectTypographyH1 :text="$t('page.createAccount.h1')" />
      <p>{{ $t('page.createAccount.subtitle') }}</p>
      <UButton
        :label="$t('modal.createAccount.triggerBtn')"
        variant="link"
        :padded="false"
        icon="i-mdi-help-circle-outline"
        class="w-fit"
        @click="hostpmModal.openHelpCreateAccountModal()"
      />
    </div>

    <UForm
      ref="createAccountFormRef"
      :schema="createAccountSchema"
      :state="state"
      class="space-y-10"
      @submit="handleCreateAccount()"
    >
      <ConnectPageSection
        :heading="{ label: $t('label.accountInfo'), labelClass: 'font-bold md:ml-6' }"
      >
        <div class="py-10">
          <ConnectFormSection
            :title="$t('label.accountName')"
            :error="hasFormErrors(createAccountFormRef, ['accountName'])"
          >
            <ConnectFormFieldGroup
              id="create-account-account-name"
              v-model="state.accountName"
              :aria-label="$t('label.accountName')"
              name="accountName"
              :placeholder="$t('label.accountName')"
              :is-required="true"
              :help="$t('page.createAccount.accountNameHint')"
            />
          </ConnectFormSection>
        </div>
      </ConnectPageSection>

      <ConnectPageSection
        :heading="{ label: $t('label.primaryContactInfo'), labelClass: 'font-bold md:ml-6' }"
      >
        <FormCommonContact
          v-model:first-name="state.firstName"
          v-model:last-name="state.lastName"
          v-model:phone="state.phone"
          v-model:emailAddress="state.emailAddress"
          id-prefix="create-account-form"
          name-divider
          prepopulate-name
          :prepopulate-type="$keycloak.tokenParsed?.loginSource"
          :error-details="hasFormErrors(createAccountFormRef, ['phone.countryCode', 'phone.number', 'email'])"
        />
      </ConnectPageSection>
      <div class="flex pb-0">
        <UButton
          :label="$t('btn.saveStartApplication')"
          size="bcGov"
          class="ml-auto"
          type="submit"
          :loading
          :block="isSmallScreen"
        />
      </div>
    </UForm>
  </div>
</template>
