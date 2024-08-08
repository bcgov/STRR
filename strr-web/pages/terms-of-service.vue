<template>
  <div>
    <BcrosTypographyH1 :text="tTos('tosTitle')" />
    <div class="bg-white flex flex-col pb-[20px]">
      <div class="px-[20px] py-[25px]">
        <!-- eslint-disable-next-line -->
        <span v-html="tos?.content" />
      </div>
      <div class="flex flex-row justify-center">
        <BcrosButtonsPrimary
          :label="tTos('accept')"
          :action="() => acceptTos(true, tos?.versionId)"
        />
        <BcrosButtonsPrimary
          :label="tTos('decline')"
          :action="() => acceptTos(false)"
          variant="outline"
          class-name="ml-[4px]"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

const t = useNuxtApp().$i18n.t
const tTos = (translationKey: string) => t(`tos.${translationKey}`)

const { updateTosAcceptance, acceptTos } = useBcrosAccount()

const tos = await updateTosAcceptance()

</script>
