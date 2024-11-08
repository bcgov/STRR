<template>
  <ModalBase :title="$t('modal.helpRegisterStrataHotel.title')">
    <div class="space-y-8">
      <i18n-t keypath="modal.helpRegisterStrataHotel.content" tag="p" scope="global">
        <template #act>
          <em>{{ $t('act.strrAccomodations') }}</em>
        </template>

        <template #link>
          <a
            href=""
            target="_blank"
            class="text-bcGovColor-activeBlue underline"
          >
            {{ $t('link.strataHotelInfoPage') }}
          </a>
        </template>
      </i18n-t>
      <div class="h-20 w-full border border-black">
        CONTACT INFO HERE, NEED HREF FOR ABOVE LINK
      </div>
    </div>
  </ModalBase>
</template>
