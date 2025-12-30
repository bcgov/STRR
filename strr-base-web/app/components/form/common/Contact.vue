<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const tPlat = (path: string) => t(`strr.${path}`)

const fullName = defineModel<string>('fullName', { required: false })
const preferredName = defineModel<string>('preferredName', { required: false })
const firstName = defineModel<string>('firstName', { required: false })
const middleName = defineModel<string>('middleName', { required: false })
const lastName = defineModel<string>('lastName', { required: false })
const position = defineModel<string>('position', { required: false })
const faxNumber = defineModel<string>('faxNumber', { required: false })
const emailAddress = defineModel<string>('emailAddress', { required: false })
const phone = defineModel<ConnectPhone>('phone', { required: false })

defineProps<{
  idPrefix: string,
  prepopulateName: boolean,
  prepopulateType?: 'BCSC' | 'BCEID' | 'IDIR'
  sectionInfo?: string
  nameDivider?: boolean
  emailWarning?: boolean
  errorName?: boolean
  errorDetails?: boolean
}>()
</script>

<template>
  <div class="space-y-10 py-10">
    <ConnectFormSection v-if="prepopulateName" :title="tPlat('section.subTitle.yourName')">
      <p class="font-bold">
        <span v-if="fullName">{{ fullName }}</span>
        <span v-else>{{ firstName }} {{ lastName }}</span>
      </p>
      <p v-if="prepopulateType" class="text-sm">
        {{ tPlat(`text.yourName${prepopulateType}`) }}
      </p>
    </ConnectFormSection>
    <ConnectFormSection v-else :title="tPlat('section.subTitle.contactName')" :error="errorName">
      <div class="space-y-5">
        <p v-if="sectionInfo" class="mt-1 text-sm">
          {{ sectionInfo }}
        </p>
        <!-- TODO: add isRequired prop? -->
        <ConnectFormFieldGroup
          v-if="fullName !== undefined"
          :id="idPrefix + '-full-name'"
          v-model="fullName"
          :aria-label="t('label.fullName')"
          name="fullName"
          :placeholder="t('label.fullName')"
        />
        <div v-else class="flex max-w-bcGovInput flex-col gap-3 sm:flex-row">
          <ConnectFormFieldGroup
            v-if="firstName !== undefined"
            :id="idPrefix + '-first-name'"
            v-model="firstName"
            class="grow"
            :aria-label="t('label.firstName')"
            name="firstName"
            :placeholder="t('label.firstName')"
            :is-required="true"
          />
          <ConnectFormFieldGroup
            v-if="middleName !== undefined"
            :id="idPrefix + '-middle-name'"
            v-model="middleName"
            class="grow"
            :aria-label="t('label.middleName')"
            name="middleName"
            :placeholder="t('label.middleNameOpt')"
          />
          <ConnectFormFieldGroup
            v-if="lastName !== undefined"
            :id="idPrefix + '-last-name'"
            v-model="lastName"
            class="grow"
            :aria-label="t('label.lastName')"
            name="lastName"
            :placeholder="t('label.lastName')"
            :is-required="true"
          />
        </div>
        <ConnectFormFieldGroup
          v-if="preferredName !== undefined"
          :id="idPrefix + '-preferred-name'"
          v-model="preferredName"
          name="preferredName"
          :placeholder="$t('label.preferredName')"
          :help="$t('text.preferredName.hint')"
          data-testid="preferredName"
        />
      </div>
    </ConnectFormSection>
    <div v-if="nameDivider" class="h-px w-full border-b border-gray-100" />
    <ConnectFormSection :title="tPlat('section.subTitle.contactDetails')" :error="errorDetails">
      <div class="space-y-5">
        <ConnectFormFieldGroup
          v-if="position !== undefined"
          :id="idPrefix + '-position'"
          v-model="position"
          :aria-label="t('label.positionTitle')"
          :help="t('strr.text.positionTitle')"
          name="position"
          :placeholder="t('label.positionTitle')"
          :is-required="true"
        />
        <ConnectFormPhoneNumber
          v-if="phone"
          v-model:country-code="phone.countryCode"
          v-model:country-iso2="phone.countryIso2"
          v-model:extension="phone.extension"
          v-model:number="phone.number"
        />
        <ConnectFormFieldGroup
          v-if="faxNumber !== undefined"
          :id="idPrefix + '-fax-number'"
          v-model="faxNumber"
          :aria-label="t('label.faxNumberOpt')"
          name="faxNumber"
          :placeholder="t('label.faxNumberOpt')"
          :mask="phone?.countryCode === '1' ? '(###) ###-####' : '##############'"
        />
        <ConnectFormFieldGroup
          v-if="emailAddress !== undefined"
          :id="idPrefix + '-party-email'"
          v-model="emailAddress"
          :aria-label="t('label.emailAddress')"
          name="emailAddress"
          :placeholder="t('label.emailAddress')"
          :is-required="true"
          type="email"
        />
        <EmailAlert v-if="emailWarning" />
      </div>
    </ConnectFormSection>
  </div>
</template>
