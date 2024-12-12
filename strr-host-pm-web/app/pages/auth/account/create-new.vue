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
const loadingSubmitForm = ref<boolean>(false)
const loadingCheckAccountName = ref<boolean>(false)
const accountExists = ref<boolean>(false)

const createAccountSchema = computed(
  () => compPartySchema.extend({
    accountName: z
      .string()
      .trim()
      .min(1, t('validation.accountName.required')) // check for a non empty string
      .refine(() => accountExists.value !== true, t('validation.accountName.exists'))
  })
)

type CreateAccountSchema = z.output<typeof createAccountSchema.value>

const state = reactive({
  ...completingParty.value,
  accountName: ''
})

const createAccountFormRef = ref<Form<CreateAccountSchema>>()

async function handleCreateAccount () {
  try {
    loadingSubmitForm.value = true
    const response = await $strrApi<{sbc_account_id: number, user_id: number}>('/accounts', { // TODO: move function to store/composable?
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
    strrModal.openErrorModal(t('error.createAccount.title'), t('error.createAccount.description'), true)
    logFetchError(e, 'Unable to create account')
  } finally {
    loadingSubmitForm.value = false
  }
}

// validate account name already exists
watchDebounced(
  () => state.accountName,
  async (newVal) => {
    if (newVal.trim() !== '') {
      try {
        loadingCheckAccountName.value = true
        // also returns limit: number, orgs: Array<any>, page: number, but we only need the total here
        const { total } = await $strrApi<{ total: number }>('/accounts/search', { // TODO: move function to store/composable?
          params: { name: newVal }
        })
        accountExists.value = total > 0
      } catch (e) {
        logFetchError(e, 'Error checking if account name exists')
        accountExists.value = true // assume account exists if api error
      } finally {
        loadingCheckAccountName.value = false
      }
    } else {
      accountExists.value = false // set to false if accountName is empty
    }
    // revalidate input after accountExists ref is updated
    createAccountFormRef.value?.validate('accountName', { silent: true })
  },
  { debounce: 150 } // short debounce to get the 'on input' real time validation, this may need to be tweaked
)

useHead({
  title: t('page.createAccount.title')
})

definePageMeta({
  middleware: ['auth', 'check-tos', 'create-account-page'],
  hideBreadcrumbs: true
})
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
          :loading="loadingSubmitForm"
          :disabled="loadingCheckAccountName"
          :block="isSmallScreen"
        />
      </div>
    </UForm>
  </div>
</template>
