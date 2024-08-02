<template>
  <div data-cy="declaration">
    <p class="mb-[4px]">
      {{ tReview('declaration-part-one') }}
    </p>
    <p class="pl-[12px] mb-[4px]">
      a. {{ tReview('declaration-a') }}
    </p>
    <p class="pl-[12px] mb-[4px]">
      b. {{ tReview('declaration-a') }}
    </p>
    <p>
      {{ tReview('declaration-part-two') }}
    </p>
  </div>
</template>

<script setup lang="ts">
const t = useNuxtApp().$i18n.t

const tReview = (translationKey: string) => t(`create-account.review.${translationKey}`)

</script>
