<script setup lang="ts">
const {
  loading,
  title,
  subtitles,
  details,
  sideDetails,
  bottomButtons
} = storeToRefs(useConnectDetailsHeaderStore())

const validate = (sideDetail: ConnectDetailHeaderSideDetail, onlyOnExistingErr: boolean) => {
  if (onlyOnExistingErr && !sideDetail.edit?.validation?.error) {
    return
  }
  if (sideDetail.edit?.validation) {
    sideDetail.edit.validation.error = sideDetail.edit?.validation?.validate(sideDetail.value)
  }
}

const save = (sideDetail: ConnectDetailHeaderSideDetail) => {
  if (sideDetail.edit) {
    sideDetail.edit.validation?.validate(sideDetail.value)
    if (sideDetail.edit.validation?.error) {
      return
    }
    sideDetail.edit.isEditing = false
    sideDetail.edit.action()
  }
}

</script>

<template>
  <div class="bg-white py-5" data-testid="connect-details-header">
    <div class="app-inner-container">
      <div v-if="loading" class="flex animate-pulse flex-col gap-2 *:space-y-2 sm:flex-row">
        <div class="grow">
          <div class="h-9 w-[400px] rounded bg-gray-200" />
          <div class="h-5 w-[250px] rounded bg-gray-200" />
          <div class="h-5 w-[200px] rounded bg-gray-200" />
          <div class="h-5 w-[150px] rounded bg-gray-200" />
        </div>
        <div>
          <div class="h-5 w-[300px] rounded bg-gray-200" />
          <div class="h-5 w-[300px] rounded bg-gray-200" />
          <div class="h-5 w-[300px] rounded bg-gray-200" />
          <div class="h-5 w-[300px] rounded bg-gray-200" />
        </div>
      </div>
      <div v-else class="flex flex-col gap-2 sm:flex-row">
        <div class="grow space-y-2">
          <div>
            <ConnectTypographyH1 v-if="title" custom-class="text-[1.375rem] font-bold" :text="title" />
            <div v-if="subtitles.length" class="flex divide-x *:border-gray-500 *:px-2 first:*:pl-0">
              <p v-for="subtitle in subtitles" :key="subtitle" class="text-sm">
                {{ subtitle }}
              </p>
            </div>
          </div>
          <div class="space-y-1">
            <slot name="details">
              <UBadge
                v-if="details?.chip"
                :label="details.chip.text"
                :color="details.chip.colour || 'primary'"
                class="px-3"
              />
              <p v-if="details?.text" class="text-sm">
                {{ details }}
              </p>
            </slot>
            <slot name="buttons">
              <div v-if="bottomButtons.length" class="flex flex-wrap gap-2">
                <UButton
                  v-for="btn in bottomButtons"
                  :key="btn.label"
                  :label="btn.label"
                  :icon="btn.icon"
                  class="pl-0"
                  color="primary"
                  variant="link"
                  @click="btn.action()"
                />
              </div>
            </slot>
          </div>
        </div>
        <dl class="space-y-1 pt-1 text-sm">
          <template v-for="detail in sideDetails" :key="detail.label">
            <div :class="[detail.edit && !detail.edit.isEditing && 'mr-14']">
              <!-- TODO: design not finalized, this is a WIP  -->
              <UTooltip
                :prevent="detail.edit?.isEditing"
                :close-delay="100"
                :popper="{ placement: 'right', arrow: false, offsetDistance: 0 }"
                :ui="{ background: 'bg-transparent', container: 'opacity-100', shadow: 'shadow-none' }"
              >
                <div class="flex flex-row flex-wrap gap-2">
                  <dt class="font-bold" :class="[detail.edit?.isEditing && 'mt-1']">
                    {{ detail.label }}:
                  </dt>
                  <dd v-if="!detail.edit?.isEditing">
                    {{ detail.value }}
                  </dd>
                  <UFormGroup
                    v-else
                    :name="detail.label"
                    :error="detail.edit?.validation?.error || undefined"
                    size="xs"
                  >
                    <UInput
                      v-model="detail.value"
                      size="2xs"
                      @input="validate(detail, true)"
                      @change="validate(detail, false)"
                    />
                  </UFormGroup>
                  <UButton
                    v-if="detail.edit?.isEditing"
                    class="mt-[2px] items-start"
                    :label="$t('word.Save')"
                    :padded="false"
                    variant="link"
                    @click="save(detail)"
                  />
                </div>
                <template #text>
                  <UButton
                    v-if="detail.edit && !detail.edit.isEditing"
                    icon="i-mdi-edit"
                    :label="$t('word.Edit')"
                    :padded="false"
                    variant="link"
                    @click="detail.edit.isEditing = true"
                  />
                </template>
              </UTooltip>
            </div>
          </template>
        </dl>
      </div>
    </div>
  </div>
</template>
