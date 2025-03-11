<script setup lang="ts">

const exStore = useExaminerStore()
const { isApplication, activeHeader, activeReg } = storeToRefs(exStore)

</script>

<template>
  <div>
    <div
      class="flex flex-row gap-x-5 divide-x text-sm"
    >
      <div>
        <dl class="grid grid-cols-[repeat(2,auto)] gap-x-4">
          <dt>Status:</dt>
          <dd>{{ activeHeader?.hostStatus }}</dd>

          <dt>Submitted:</dt>
          <dd>{{ dateToString(activeHeader?.applicationDateTime || '') }}</dd>

          <dt>Registration Type:</dt>
          <dd>{{ activeReg?.registrationType }}</dd>
        </dl>
      </div>

      <div v-if="isApplication">
        <dl class="grid grid-cols-[repeat(2,auto)] gap-x-4 pl-5">
          <dt>Completing Party</dt>
          <dd />

          <dt>Name:</dt>
          <dd>{{ displayContactFullName(activeReg?.completingParty) }}</dd>

          <dt>Email:</dt>
          <dd>{{ activeReg?.completingParty.emailAddress }}</dd>

          <dt>Phone:</dt>
          <dd>{{ activeReg?.completingParty.phoneNumber }}</dd>
        </dl>
      </div>

      <div>
        <dl class="grid grid-cols-[repeat(2,auto)] gap-x-4 pl-5">
          <dt>Platform Representative</dt>
          <dd />

          <dt>Name:</dt>
          <dd>{{ displayContactFullName(activeReg?.platformRepresentatives[0]) }}</dd>

          <dt>Email:</dt>
          <dd>{{ activeReg?.platformRepresentatives[0].emailAddress }}</dd>
        </dl>
      </div>
    </div>

    <!-- APPLICATION SECTIONS -->
    <div class="mt-6 divide-y">
      <ApplicationDetailsSection
        label="Business Details"
      >
        <div class="flex items-center justify-between">
          <div class="flex">
            {{ activeReg?.businessDetails?.legalName }} |
            {{ displayFullAddress(activeReg?.businessDetails.mailingAddress) }}
          </div>
        </div>
      </ApplicationDetailsSection>
    </div>
  </div>
</template>

<style scoped></style>
