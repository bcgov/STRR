<template>
  <ModalBase :title="$t('modal.info.collectionNotice.title')">
    <div class="space-y-8">
      <i18n-t keypath="modal.info.collectionNotice.content" tag="p" scope="global">
        <template #straAct>
          <em class="italic">{{ $t('act.strrAccomodations') }}</em>
        </template>

        <template #fippaAct>
          <em class="italic">{{ $t('act.fippa') }}</em>
        </template>

        <template #email>
          <a
            class="text-blue-500 underline"
            href="mailto:STRBranch@gov.bc.ca"
            target="_blank"
          >
            STRBranch@gov.bc.ca
          </a>
        </template>
      </i18n-t>
    </div>
  </ModalBase>
</template>
