<script setup lang="ts">
const { t } = useI18n()
const tReview = (translationKey: string) => t(`createAccount.review.${translationKey}`)
const tContact = (translationKey: string) => t(`createAccount.contactForm.${translationKey}`)
const tPlat = (path: string) => t(`platform.${path}`)
const tPlatReview = (path: string) => t(`platform.review.${path}`)

const accountStore = useConnectAccountStore()

const { completingParty, primaryRep, secondaryRep } = storeToRefs(useStrrPlatformContact())
const { platformBusiness } = storeToRefs(useStrrPlatformBusiness())
const { platformDetails } = storeToRefs(useStrrPlatformDetails())

const { confirmInfoAccuracy, confirmDelistAndCancelBookings } = storeToRefs(useStrrPlatformApplication())

defineProps<{ isComplete: boolean }>()

defineEmits<{
  edit: [index: number]
}>()
</script>
<template>
  <div class="space-y-10" data-testid="platform-review-confirm">
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
        <ConnectI18nBold class="text-bcGovGray-900" translation-path="platform.review.alert.contactInfo" />
      </template>
    </UAlert>

    <!-- person completing platform application -->
    <ConnectPageSection>
      <template #header>
        <FormPlatformReviewEditCardHeader
          :title="tPlat('section.title.completingParty')"
          icon="i-mdi-account-multiple-plus"
          @edit="$emit('edit', 0)"
        />
      </template>

      <div class="p-8">
        <FormCommonReviewRow>
          <template #item-1>
            <ConnectInfoBox
              :title="tReview('contactName')"
              title-class="font-bold text-bcGovGray-900"
              :content="`${accountStore.userFullName || '-'}`"
            />
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="tContact('phoneNumber')"
              title-class="font-bold text-bcGovGray-900"
              :content="`+${completingParty.phone.countryCode || '-'} ` +
                completingParty.phone.number + ' ' + completingParty.phone.extension || ''"
            />
          </template>
          <template #item-3>
            <ConnectInfoBox
              :title="$t('label.emailAddress')"
              title-class="font-bold text-bcGovGray-900"
              :content="completingParty.emailAddress || '-'"
            />
          </template>
        </FormCommonReviewRow>
      </div>
    </ConnectPageSection>

    <!-- primary platform rep section -->
    <ConnectPageSection>
      <template #header>
        <FormPlatformReviewEditCardHeader
          :title="tPlat('section.title.primaryRep')"
          icon="i-mdi-account-multiple-plus"
          @edit="$emit('edit', 0)"
        />
      </template>

      <div class="space-y-6 p-8">
        <FormCommonReviewRow>
          <template #item-1>
            <ConnectInfoBox
              :title="tReview('contactName')"
              title-class="font-bold text-bcGovGray-900"
              :content="`${primaryRep?.firstName || '-'} ` +
                `${primaryRep?.middleName || ''}` + ` ${primaryRep?.lastName || ''}`"
            />
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="tContact('phoneNumber')"
              title-class="font-bold text-bcGovGray-900"
              :content="`+${primaryRep?.phone.countryCode || '-'} ` +
                `${primaryRep?.phone.number || ''}` + ' ' + `${primaryRep?.phone.extension || ''}`"
            />
          </template>
          <template #item-3>
            <ConnectInfoBox
              :title="$t('label.emailAddress')"
              title-class="font-bold text-bcGovGray-900"
              :content="primaryRep?.emailAddress || '-'"
            />
          </template>
        </FormCommonReviewRow>
        <FormCommonReviewRow>
          <template #item-1>
            <ConnectInfoBox
              :title="$t('label.positionTitle')"
              title-class="font-bold text-bcGovGray-900"
              :content="primaryRep?.position || '-'"
            />
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="$t('label.faxNumber')"
              title-class="font-bold text-bcGovGray-900"
              :content="primaryRep?.faxNumber || '-'"
            />
          </template>
        </FormCommonReviewRow>
      </div>
    </ConnectPageSection>

    <!-- secondary platform rep section -->
    <ConnectPageSection v-if="secondaryRep">
      <template #header>
        <FormPlatformReviewEditCardHeader
          :title="tPlat('section.title.secondaryRep')"
          icon="i-mdi-account-multiple-plus"
          @edit="$emit('edit', 0)"
        />
      </template>

      <div class="space-y-6 p-8">
        <FormCommonReviewRow>
          <template #item-1>
            <ConnectInfoBox
              :title="tReview('contactName')"
              title-class="font-bold text-bcGovGray-900"
              :content="`${secondaryRep?.firstName || '-'} ` +
                `${secondaryRep?.middleName || ''}` + ` ${secondaryRep?.lastName || ''}`"
            />
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="tContact('phoneNumber')"
              title-class="font-bold text-bcGovGray-900"
              :content="`+${secondaryRep?.phone.countryCode || '-'} ` +
                `${secondaryRep?.phone.number || ''}` + ' ' + `${secondaryRep?.phone.extension || ''}`"
            />
          </template>
          <template #item-3>
            <ConnectInfoBox
              :title="$t('label.emailAddress')"
              title-class="font-bold text-bcGovGray-900"
              :content="secondaryRep?.emailAddress || '-'"
            />
          </template>
        </FormCommonReviewRow>
        <FormCommonReviewRow>
          <template #item-1>
            <ConnectInfoBox
              :title="$t('label.positionTitle')"
              title-class="font-bold text-bcGovGray-900"
              :content="secondaryRep?.position || '-'"
            />
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="$t('label.faxNumber')"
              title-class="font-bold text-bcGovGray-900"
              :content="secondaryRep?.faxNumber || '-'"
            />
          </template>
        </FormCommonReviewRow>
      </div>
    </ConnectPageSection>

    <!-- business info section -->
    <ConnectPageSection>
      <template #header>
        <FormPlatformReviewEditCardHeader
          :title="tPlat('section.title.businessInfo')"
          icon="i-mdi-domain"
          @edit="$emit('edit', 1)"
        />
      </template>

      <div class="space-y-6 p-8">
        <FormCommonReviewRow>
          <template #item-1>
            <ConnectInfoBox
              :title="$t('label.busNameLegal')"
              title-class="font-bold text-bcGovGray-900"
              :content="platformBusiness.legalName || '-'"
            />
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="tPlatReview('busInfo.attForSvcName')"
              title-class="font-bold text-bcGovGray-900"
              :content="platformBusiness.regOfficeOrAtt.attorneyName || '-'"
            />
          </template>
          <template #item-3>
            <ConnectInfoBox
              :title="tPlat('section.subTitle.noticeNonCompliance')"
              title-class="font-bold text-bcGovGray-900"
            >
              <span> {{ platformBusiness.nonComplianceEmail || '-' }} </span>
              <span v-if="platformBusiness.nonComplianceEmailOptional">
                {{ platformBusiness.nonComplianceEmailOptional }}
              </span>
            </ConnectInfoBox>
          </template>
        </FormCommonReviewRow>

        <FormCommonReviewRow>
          <template #item-1>
            <ConnectInfoBox
              :title="$t('label.homeJurisdiction')"
              title-class="font-bold text-bcGovGray-900"
              :content="platformBusiness.homeJurisdiction || '-'"
            />
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="tPlat('section.subTitle.regOfficeAttSvcAddrress')"
              title-class="font-bold text-bcGovGray-900"
            >
              <ConnectAddressDisplay
                v-if="platformBusiness.regOfficeOrAtt.mailingAddress.street"
                :address="platformBusiness.regOfficeOrAtt.mailingAddress"
              />
              <span v-else> - </span>
            </ConnectInfoBox>
          </template>
          <template #item-3>
            <ConnectInfoBox
              :title="tPlat('section.subTitle.takedownRequest')"
              title-class="font-bold text-bcGovGray-900"
            >
              <span> {{ platformBusiness.takeDownEmail || '-' }} </span>
              <span v-if="platformBusiness.takeDownEmailOptional">
                {{ platformBusiness.takeDownEmailOptional }}
              </span>
            </ConnectInfoBox>
          </template>
        </FormCommonReviewRow>

        <FormCommonReviewRow>
          <template #item-1>
            <ConnectInfoBox
              :title="$t('label.busNum')"
              title-class="font-bold text-bcGovGray-900"
              :content="platformBusiness.businessNumber || '-'"
            />
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="tPlat('section.subTitle.businessMailAddress')"
              title-class="font-bold text-bcGovGray-900"
            >
              <ConnectAddressDisplay
                v-if="platformBusiness.mailingAddress.street"
                :address="platformBusiness.mailingAddress"
              />
              <span v-else> - </span>
            </ConnectInfoBox>
          </template>
        </FormCommonReviewRow>
      </div>
    </ConnectPageSection>

    <!-- platform info section -->
    <ConnectPageSection>
      <template #header>
        <FormPlatformReviewEditCardHeader
          :title="tPlat('step.description.2')"
          icon="i-mdi-map-marker-plus-outline"
          @edit="$emit('edit', 2)"
        />
      </template>

      <div class="space-y-6 p-8">
        <FormCommonReviewRow
          v-if="platformDetails.brands.length === 0"
        >
          <template #item-1>
            <ConnectInfoBox
              :title="$t('platform.review.platInfo.brandName', 0)"
              title-class="font-bold text-bcGovGray-900"
              content="-"
            />
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="$t('platform.review.platInfo.brandSite', 0)"
              title-class="font-bold text-bcGovGray-900"
              content="-"
            />
          </template>
          <template #item-3>
            <ConnectInfoBox
              :title="tPlat('section.subTitle.size')"
              title-class="font-bold text-bcGovGray-900"
              :content="platformDetails.listingSize || '-'"
            />
          </template>
        </FormCommonReviewRow>
        <template v-else>
          <FormCommonReviewRow
            v-for="(brand, i) in platformDetails.brands"
            :key="brand.name"
          >
            <template #item-1>
              <ConnectInfoBox
                :title="$t('platform.review.platInfo.brandName', { count: i + 1})"
                title-class="font-bold text-bcGovGray-900"
                :content="brand.name || '-'"
              />
            </template>
            <template #item-2>
              <ConnectInfoBox
                :title="$t('platform.review.platInfo.brandSite', { count: i + 1})"
                title-class="font-bold text-bcGovGray-900"
                :content="brand.website || '-'"
              />
            </template>
            <template #item-3>
              <ConnectInfoBox
                v-if="i === 0"
                :title="tPlat('section.subTitle.size')"
                title-class="font-bold text-bcGovGray-900"
                :content="platformDetails.listingSize ?
                  tPlatReview(`platInfo.sizeDesc.${platformDetails.listingSize}`) :
                  '-'"
              />
            </template>
          </FormCommonReviewRow>
        </template>
      </div>
    </ConnectPageSection>

    <section class="space-y-6">
      <h2>Certify</h2>

      <UCheckbox
        v-model="confirmInfoAccuracy"
        :label="tPlatReview('confirm.infoAccuracy')"
        class="rounded bg-white p-4"
        :class="`${isComplete && !confirmInfoAccuracy ? 'outline outline-red-600' : ''}`"
      />

      <UCheckbox
        v-model="confirmDelistAndCancelBookings"
        :label="tPlatReview('confirm.delistAndCancelBookings')"
        class="rounded bg-white p-4"
        :class="`${isComplete && !confirmDelistAndCancelBookings ? 'outline outline-red-600' : ''}`"
      />
    </section>
    <!-- <ConnectPageSection :heading="{ label: tReview('review') }">
      <UCheckbox
        v-model="confirmInfoAccuracy"
        :label="tReview('confirm')"
        class="p-4"
        :class="`${isComplete && !confirmInfoAccuracy ? 'outline outline-red-600' : ''}`"
      />

      <UCheckbox
        v-model="confirmDelistAndCancelBookings"
        :label="tReview('confirm')"
        class="p-4"
        :class="`${isComplete && !confirmDelistAndCancelBookings ? 'outline outline-red-600' : ''}`"
      />
    </ConnectPageSection> -->
  </div>
</template>
