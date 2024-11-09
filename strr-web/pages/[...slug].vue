<script setup>

// [...slug].vue - catch-all route to match any URL path that is not defined
const { isExaminer } = storeToRefs(useBcrosKeycloak())
const redirectUrl = isExaminer.value ? RouteNamesE.REGISTRY_DASHBOARD : RouteNamesE.APPLICATION_STATUS

// redirect to Host or Examiner Dashboard
navigateTo({ path: '/' + redirectUrl })

</script>
