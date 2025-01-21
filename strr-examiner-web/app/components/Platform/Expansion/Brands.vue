<script setup lang="ts">

defineProps<{ brands: StrrBrand[] }>()
</script>
<template>
  <CommonExpansionTemplate :label="$t('strr.label.platforms')">
    <div class="grid auto-cols-min grid-flow-col grid-rows-6 gap-x-10 gap-y-1">
      <ConnectInfoWithIcon
        v-for="brand in brands"
        :key="brand.name"
        icon="i-mdi-web"
        class="whitespace-nowrap"
      >
        <UButton
          class="underline underline-offset-2"
          icon="i-mdi-open-in-new"
          :label="brand.name"
          :padded="false"
          :to="brand.website"
          target="_blank"
          trailing
          variant="link"
        />
      </ConnectInfoWithIcon>
    </div>
  </CommonExpansionTemplate>
</template>
