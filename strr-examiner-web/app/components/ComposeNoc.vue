<script setup lang="ts">
const { sendNocSchema, sendEmailSchema } = useExaminerStore()
const {
  emailFormRef,
  showComposeEmail,
  emailContent,
  showComposeNocEmail,
  isAssignedToUser,
  activeHeader
} = storeToRefs(useExaminerStore())
const { t } = useI18n()
const formSchema = computed(
  () =>
    [
      ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING,
      ApplicationStatus.PROVISIONAL_REVIEW_NOC_EXPIRED
    ].includes(activeHeader.value?.status)
      ? sendEmailSchema.value
      : sendNocSchema.value
)

const handleInput = () => {
  if (emailContent.value.content.length > 1 && emailFormRef.value) {
    emailFormRef.value.clear()
  }
}
</script>

<template>
  <div v-if="(showComposeEmail || showComposeNocEmail) && isAssignedToUser" class="app-inner-container">
    <div class="mb-8 rounded bg-white py-6">
      <UForm
        ref="emailFormRef"
        :schema="formSchema"
        :state="emailContent"
        :validate-on="['submit']"
        data-testid="compose-email"
      >
        <div class="flex">
          <div class="flex w-1/5 flex-col items-center">
            <span class="pl-5 font-bold">{{ t('modal.noc.title') }}</span>
          </div>
          <div class="flex-auto pr-10">
            <UFormGroup name="content">
              <UTextarea
                v-model="emailContent.content"
                :placeholder="t('modal.noc.placeholder')"
                :aria-label="t('modal.noc.placeholder')"
                :color="'gray'"
                class="text-bcGovColor-midGray focus:ring-0"
                auto-resize
                resize
                :rows="3"
                @update:model-value="handleInput"
              />
            </UFormGroup>
          </div>
        </div>
      </UForm>
    </div>
  </div>
</template>
