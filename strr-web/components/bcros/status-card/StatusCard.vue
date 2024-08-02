<template>
  <div
    data-cy="status-card"
    :class="
      `
        ${single ? 'flex-1': ''}
        w-full
        mb-[42px] mobile:mb-[24px] justify-between flex-col
        bg-white px-[30px] mobile:px-[8px] py-[22px]
        border-[2px] border-bcGovColor-hairlinesOnWhite
      `
    "
  >
    <div class="flex justify-between">
      <BcrosChip :flavour="flavour" class="mobile:hidden mb-[24px]" />
      <p class="font-bold">
        {{ registrationNumber }}
      </p>
    </div>
    <div class="flex w-full justify-between">
      <slot />
      <BcrosChip :flavour="flavour" class="desktop:hidden mb-[24px]" />
    </div>
    <div class="flex flex-row text-bcGovColor-activeBlue justify-start">
      <p
        class="mr-[22px] cursor-pointer"
        @click="() => navigateTo(`/application-details/${applicationId}`, { open: { target: '_blank' } })"
      >
        {{ tRegistrationStatus('view') }}
      </p>
      <p
        v-if="status === 'ISSUED'"
        class="mr-[22px] cursor-pointer"
        @click="() => downloadCertificate(applicationId.toString())"
      >
        {{ tRegistrationStatus('download') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertsFlavourE } from '#imports'

const t = useNuxtApp().$i18n.t
const tRegistrationStatus = (translationKey: string) => t(`registration-status.${translationKey}`)

const { getCertificate } = useRegistrations()

const downloadCertificate = async (id: string) => {
  const file = await getCertificate(id)
  const link = document.createElement('a')
  const blob = new Blob([file], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  link.href = url
  link.target = '_blank'
  link.download = `${tRegistrationStatus('strr-certificate')}.pdf`
  document.body.appendChild(link)
  link.click()
  URL.revokeObjectURL(link.href)
}

const {
  single,
  applicationId,
  flavour,
  registrationNumber,
  status
} = defineProps<{
  single: boolean,
  applicationId: string,
  flavour: {
    text: string,
    alert: AlertsFlavourE
  },
  status: string,
  registrationNumber?: string
}>()
</script>
