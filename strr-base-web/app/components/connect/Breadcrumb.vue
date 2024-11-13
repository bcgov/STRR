<script setup lang="ts">
const { t } = useI18n()
const accountStore = useConnectAccountStore()

const breadcrumbs = computed<ConnectBreadcrumb[]>(() => {
  const metaCrumbs = useRoute().meta.breadcrumbs

  if (metaCrumbs) {
    return metaCrumbs.map((bc) => {
      if (bc.appendAccountId && accountStore.currentAccount.id) {
        return {
          ...bc,
          to: appendUrlParam(bc.to as string, 'accountid', accountStore.currentAccount.id)
        }
      }
      return bc
    })
  } else {
    return [{ label: t('ConnectBreadcrumb.default') }]
  }
})

function resolveBackHref () {
  const bcLength = breadcrumbs.value.length

  if (bcLength > 1) {
    // return the second to last breadcrumb link
    return breadcrumbs.value[bcLength - 2]?.to ?? breadcrumbs.value[bcLength - 2]?.href
  } else {
    return ''
  }
}
</script>
<template>
  <div
    v-if="$route.meta.hideBreadcrumbs !== true"
    class="bg-blue-350"
  >
    <div class="mx-auto flex max-w-bcGovLg items-center divide-x divide-gray-300 px-4 py-2">
      <UButton
        class="mr-3 mt-px size-[28px] rounded-full px-1 text-blue-500"
        color="white"
        :disabled="breadcrumbs.length < 2"
        icon="i-mdi-arrow-left"
        :aria-label="$t('ConnectBreadcrumb.backBtn')"
        data-cy="crumb-back"
        :to="resolveBackHref()"
      />
      <UBreadcrumb
        :links="breadcrumbs"
        :aria-label="$t('ConnectBreadcrumb.arialabel')"
        class="pl-3"
        :ui="{
          li: 'flex items-center gap-x-1.5 text-xs text-white leading-6 min-w-0',
          base: 'flex items-center gap-x-1.5 group font-normal min-w-0',
          label: 'block truncate tracking-wide',
          active: 'text-white',
          inactive: 'text-white underline hover:text-white',
          icon: {
            base: 'flex-shrink-0 w-3 h-3 text-white',
            active: '',
            inactive: '',
          },
        }"
      />
    </div>
  </div>
</template>
