<template>
  <div class="space-y-5">
    <ul class="space-y-1">
      <li>
        <span>
          {{ $t('contactInfo.bcRegGeneral.tollFree.title') }}
          <a class="underline" href="tel:+1-877-526-1526">1-877-526-1526</a>
        </span>
      </li>
      <li>
        <span>
          {{ $t('contactInfo.bcRegGeneral.victoriaOffice.title') }}
          <a class="underline" href="tel:+1-250-387-7848">250-387-7848</a>
        </span>
      </li>
      <li>
        <span>
          {{ $t('contactInfo.bcRegGeneral.email.title') }}
          <a
            class="underline"
            href="mailto:bcregistries@gov.bc.ca?subject=BC%20Registries%20Support%20Request"
          >
            BCRegistries@gov.bc.ca
          </a>
        </span>
      </li>
    </ul>

    <p>
      <strong>{{ $t('contactInfo.bcRegGeneral.hours.title') }}</strong>
      <br>
      {{ $t('contactInfo.bcRegGeneral.hours.value') }}
    </p>
  </div>
</template>
