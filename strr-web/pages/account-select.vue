<template>
  <div data-test-id="account-select-page">
    <div v-if="userOrgs.length > 0">
      <div class="mobile:px-[8px]">
        <BcrosTypographyH1 :text="t('account.title')" data-test-id="accountPageTitle" class="mobile:pb-[20px]" />
        <BcrosAlertsMessage :flavour="alertFlavour">
          <b>{{ t('general.note') }} </b>{{ t('account.existingAccountWarning') }}
        </BcrosAlertsMessage>
        <BcrosTypographyH2 :text="existingAccountsTitle" data-test-id="accountPageAccountSectionTitle" />
        <span class="text-[16px] mb-[20px] block">{{ t('account.existingAccountSection.subTitle') }}</span>
      </div>
      <BcrosExistingAccountsList :accounts="userOrgs" />
    </div>
    <div v-else>
      <BcrosTypographyH1 :text="t('account.logIn')" data-test-id="accountPageTitle" class="mobile:pb-[20px]" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertsFlavourE } from '#imports'

const { t } = useTranslation()

const alertFlavour: AlertsFlavourE = AlertsFlavourE.INFO

const { userOrgs, me } = useBcrosAccount()

const existingAccountsTitle = `${t('account.existingAccountSection.title')} (${userOrgs.length})`

onMounted(() => {
  // if no sbc accounts navigate to sbc account creation
  if (!me?.settings.length) {
    navigateTo('/finalization')
  }
})
</script>
