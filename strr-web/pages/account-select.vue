<template>
  <div data-cy="account-select-page">
    <div v-if="userOrgs.length > 0">
      <div class="mobile:px-[8px]">
        <BcrosTypographyH1 text="account.title" data-cy="accountPageTitle" class-name="mobile:pb-[20px]" />
        <BcrosAlertsMessage :flavour="alertFlavour">
          <b>{{ t('general.note') }} </b>{{ t('account.existing-account-warning') }}
        </BcrosAlertsMessage>
        <BcrosTypographyH2 :text="existingAccountsTitle" data-cy="accountPageAccountSectionTitle" />
        <span class="text-[16px] mb-[20px] block">{{ t('account.existing-account-section.sub-title') }}</span>
      </div>
      <BcrosExistingAccountsList :accounts="userOrgs" />
    </div>
    <div v-else>
      <BcrosTypographyH1 text="account.logIn" data-cy="accountPageTitle" class-name="mobile:pb-[20px]" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertsFlavourE } from '#imports'

const t = useNuxtApp().$i18n.t

const alertFlavour: AlertsFlavourE = AlertsFlavourE.INFO

const { userOrgs, me, updateTosAcceptance } = useBcrosAccount()

const existingAccountsTitle = `${t('account.existing-account-section.title')} (${userOrgs.length})`

onMounted(async () => {
  // if no sbc accounts navigate to sbc account creation
  if (!me?.settings.length) {
    navigateTo('/finalization')
  }
  const tos = await updateTosAcceptance()
  const currentTosAccepted = me?.profile.userTerms.isTermsOfUseAccepted &&
    me?.profile.userTerms.termsOfUseAcceptedVersion === tos?.versionId
  if (!currentTosAccepted) {
    navigateTo('/terms-of-service')
  }
})

</script>
