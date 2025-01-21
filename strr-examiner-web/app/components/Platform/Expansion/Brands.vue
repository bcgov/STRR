<script setup lang="ts">

defineProps<{ title: string, brands: StrrBrand[] }>()
</script>
<template>
  <ConnectFormSection :title>
    <div class="grid grid-flow-col grid-rows-6 gap-x-5 gap-y-1">
      <ConnectInfoWithIcon
        v-for="brand in brands"
        :key="brand.name"
        icon="i-mdi-web"
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
  </ConnectFormSection>
</template>
