<template>
  <div
    data-cy="status-card"
    :class="`${isSingle ? 'flex-1': ''}`"
    class="w-full mb-[42px] mobile:mb-[24px] justify-between flex-col
    bg-white px-[30px] mobile:px-[8px] py-[22px]
      border-[2px] border-bcGovColor-hairlinesOnWhite"
  >
    <div class="flex justify-between">
      <BcrosChip :flavour="flavour" class="mobile:hidden mb-[24px]" />
      <p class="font-bold">
        {{ registrationNumber }}
      </p>
    </div>
    <div class="flex w-full justify-between mb-5">
      <slot />
      <BcrosChip :flavour="flavour" class="desktop:hidden mb-[24px]" />
    </div>
    <div class="flex flex-row text-bcGovColor-activeBlue justify-start">
      <BcrosButtonsPrimary
        :action="() => navigateTo(`/application-details/${applicationId}`, { open: { target: '_blank' } })"
        :label="tRegistrationStatus('view')"
        class-name="px-4 py-1"
        variant="ghost"
      />

      <BcrosButtonsPrimary
        v-if="isCertificateIssued"
        :action="() => downloadCertificate(applicationId.toString())"
        :label="tRegistrationStatus('download')"
        class-name="px-4 py-1"
        variant="ghost"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertsFlavourE, RegistrationStatusE, ApplicationStatusE } from '#imports'

const t = useNuxtApp().$i18n.t
const tRegistrationStatus = (translationKey: string) => t(`registrationStatus.${translationKey}`)

const { getCertificate } = useRegistrations()

const downloadCertificate = async (id: string) => {
  const file = await getCertificate(id)
  const link = document.createElement('a')
  const blob = new Blob([file], { type: 'application/pdf' })
  link.href = window.URL.createObjectURL(blob)
  link.target = '_blank'
  link.download = `${tRegistrationStatus('strrCertificate')}.pdf`
  document.body.appendChild(link)
  link.click()
  URL.revokeObjectURL(link.href)
}

const {
  isSingle,
  applicationId,
  flavour,
  registrationNumber,
  status
} = defineProps<{
  isSingle: boolean,
  applicationId: string,
  flavour: {
    text: string,
    alert: AlertsFlavourE
  },
  status: RegistrationStatusE | ApplicationStatusE,
  registrationNumber?: string
}>()

const isCertificateIssued: boolean = status === RegistrationStatusE.ISSUED

</script>
