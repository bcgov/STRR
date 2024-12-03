<template>
  <ul :aria-label="$t('contactInfo.strr.listTitle')">
    <li>
      <span class="inline-flex items-center gap-1">
        <UIcon name="i-mdi-phone" class="mr-2 size-4 text-blue-350" />
        {{ $t('contactInfo.strr.tollFree.title') }}
        <a class="text-blue-500 underline" href="tel:+1-833-828-2240">1-833-828-2240</a>
      </span>
    </li>
    <li>
      <span class="inline-flex items-center gap-1">
        <UIcon name="i-mdi-phone" class="mr-2 size-4 text-blue-350" />
        {{ $t('contactInfo.strr.victoriaOffice.title') }}
        <a class="text-blue-500 underline" href="tel:+1-604-630-4058">604-630-4058</a>
      </span>
    </li>
    <li>
      <span class="inline-flex items-center gap-1">
        <UIcon name="i-mdi-email" class="mr-2 size-4 text-blue-350" />
        {{ $t('contactInfo.strr.email.title') }}
        <a
          class="text-blue-500 underline"
          href="mailto:STRregistry@gov.bc.ca"
          target="_blank"
        >
          STRregistry@gov.bc.ca
        </a>
      </span>
    </li>
  </ul>
</template>
