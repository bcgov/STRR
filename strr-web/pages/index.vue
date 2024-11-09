<script setup lang="ts">
const { isExaminer } = storeToRefs(useBcrosKeycloak())
const redirectUrl = isExaminer.value ? RouteNamesE.REGISTRY_DASHBOARD : RouteNamesE.APPLICATION_STATUS

// redirect to Host or Examiner Dashboard
navigateTo({ path: '/' + redirectUrl })
</script>

<template>
  <div data-test-id="index-page" />
</template>
