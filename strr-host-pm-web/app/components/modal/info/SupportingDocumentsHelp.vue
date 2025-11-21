<script setup lang="ts">
const { t } = useI18n()

const group1 = [
  DocumentUploadType.BC_DRIVERS_LICENSE,
  DocumentUploadType.BCSC,
  DocumentUploadType.COMBINED_BCSC_LICENSE
]

const group2 = [
  DocumentUploadType.PROPERTY_ASSESSMENT_NOTICE,
  DocumentUploadType.ICBC_CERTIFICATE_OF_INSURANCE,
  DocumentUploadType.HOME_INSURANCE_SUMMARY,
  DocumentUploadType.PROPERTY_TAX_NOTICE,
  DocumentUploadType.GOVT_OR_CROWN_CORP_OFFICIAL_NOTICE,
  DocumentUploadType.TITLE_CERTIFICATE_OR_SEARCH,
  DocumentUploadType.SPECULATION_VACANCY_TAX_DECLARATION,
  DocumentUploadType.HOME_OWNER_GRANT_APPROVAL,
  DocumentUploadType.NOTARIZED_REAL_ESTATE_DOC,
  DocumentUploadType.PROPERTY_TRANSFER_TAX_RETURN,
  DocumentUploadType.AFFIDAVIT_PRINCIPAL_RESIDENCE,
  DocumentUploadType.ASSESSMENT_ACT_NOTICE,
  DocumentUploadType.MORTGAGE_STATEMENT_OR_SAVINGS_DOC
]

const group3 = [
  DocumentUploadType.TENANCY_AGREEMENT,
  DocumentUploadType.RENT_RECEIPT_OR_BANK_STATEMENT
]

const group4 = [
  DocumentUploadType.FRACTIONAL_OWNERSHIP_AGREEMENT,
  DocumentUploadType.PROPERTY_TITLE_WITH_FRACTIONAL_OWNERSHIP
]

const groups = [
  {
    title: t('modal.supportingDocumentsHelp.groupTitle1'),
    docs: group1
  },
  {
    title: t('modal.supportingDocumentsHelp.groupTitle2'),
    docs: group2
  },
  {
    title: t('modal.supportingDocumentsHelp.groupTitle3'),
    docs: group3
  },
  {
    title: t('modal.supportingDocumentsHelp.groupTitle4'),
    docs: group4
  }
]

</script>
<template>
  <ModalBase :title="$t('modal.supportingDocumentsHelp.title')">
    <section
      v-for="group in groups"
      :key="group.title"
      class="mb-7 last:mb-0"
    >
      <h3 class="font-semibold text-[#495057]">
        {{ group.title }}
      </h3>
      <ul class="ml-6 mt-2 list-disc space-y-1">
        <li
          v-for="doc in group.docs"
          :key="doc"
        >
          {{ $t(`form.pr.docType.${doc}`) }}
        </li>
      </ul>
    </section>
  </ModalBase>
</template>
