<template>
  <div class="rounded-lg flex flex-col justify-center mb-[32px]" data-cy="existing-accounts-list">
    <div
      v-for="(account, index) in accounts"
      :key="account.id"
      :class="`
        ${index == accounts.length - 1 ? 'rounded-b-[4px]' : ''}
        ${index == 0 ? 'rounded-t-[4px]' : ''}
        bg-white shadow-md
      `"
    >
      <div
        :class="`${index != accounts.length - 1 ? 'border-b' : ''} mobile:flex-col items-center pb-[24px] flex flex-row
        justify-space-between mobile:mx-[8px] mx-[32px] mt-[24px] border-bcGovColor-hairlinesOnWhite`"
      >
        <div class="flex grow mobile:justify-between mobile:w-full mobile:mb-[16px]">
          <div>
            <BcrosLetterIcon :letter="account.name.charAt(0)" />
          </div>
          <div class="grow pl-[20px]">
            <div class="text-[18px] font-bold">
              {{ account.name }}
            </div>
            <div class="text-[14px]">
              {{
                account.mailingAddress && account.mailingAddress[0]
                  ? `${account.mailingAddress[0].street}, ${account.mailingAddress[0].city},
              ${account.mailingAddress[0].region} ${account.mailingAddress[0].postalCode},
              ${account.mailingAddress[0].country}`
                  : '-'
              }}
            </div>
          </div>
        </div>
        <div class="mobile:w-full mobile:flex">
          <BcrosButtonsPrimary
            :action="() => chooseButtonAction(account)"
            icon="i-mdi-chevron-right"
            :label="useAccountButton"
            :trailing="true"
            class-name="mobile:grow"
          />
        </div>
      </div>
    </div>
  </div>
  <div class="flex justify-center">
    <BcrosButtonsPrimary
      :action="createButtonAction"
      icon="i-mdi-chevron-right"
      :label="createAccountButtonText"
      :trailing="true"
      variant="outline"
      class-name="mobile:grow px-[8px]"
    />
  </div>
</template>

<script setup lang="ts">
import { formState } from '@/stores/strr'

const { accounts } = defineProps<{ accounts: OrgI[] }>()
const t = useNuxtApp().$i18n.t
const { goToCreateAccount, goToCreateSbcAccount } = useBcrosNavigate()
const { switchCurrentAccount } = useBcrosAccount()

const createButtonAction = () => {
  goToCreateSbcAccount()
}

const chooseButtonAction = (account: OrgI) => {
  switchCurrentAccount(account.id)
  formState.selectedAccount = account
  goToCreateAccount()
}

const useAccountButton = t('account.existingAccountSection.useAccountButton')
const createAccountButtonText = t('account.existingAccountSection.createAccountButton')

</script>
