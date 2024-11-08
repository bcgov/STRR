<template>
  <ModalBase :title="$t('modal.infoCollectionNotice.title')">
    <div class="space-y-8">
      <i18n-t keypath="modal.infoCollectionNotice.content" tag="p" scope="global">
        <template #act>
          <em>{{ $t('act.strrAccomodations') }}</em>
        </template>

        <template #link>
          <a
            href=""
            target="_blank"
            class="text-bcGovColor-activeBlue underline"
          >
            STRBranch@gov.bc.ca
          </a>
        </template>
      </i18n-t>
      <div class="h-20 w-full border border-black">
        NEED MAILTO HREF FOR ABOVE LINK
      </div>
    </div>
  </ModalBase>
</template>
