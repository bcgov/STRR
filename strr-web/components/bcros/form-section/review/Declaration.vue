<template>
  <div data-cy="declaration">
    <p class="mb-[4px]">
      {{ tReview('declarationPartOne') }}
    </p>
    <p class="pl-[12px] mb-[4px]">
      a. {{ tReview('declarationA') }}
    </p>
    <p class="pl-[12px] mb-[4px]">
      b. {{ tReview('declarationB') }}
    </p>
    <p>
      {{ tReview('declarationPartTwo') }}
    </p>
  </div>
</template>

<script setup lang="ts">
const t = useNuxtApp().$i18n.t

const tReview = (translationKey: string) => t(`createAccount.review.${translationKey}`)

</script>
