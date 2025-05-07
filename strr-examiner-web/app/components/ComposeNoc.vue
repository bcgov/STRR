<script setup lang="ts">
const { sendNocSchema } = useExaminerStore()
const { nocContent, showComposeNocEmail, nocFormRef, isAssignedToUser } = storeToRefs(useExaminerStore())
const { t } = useI18n()

const handleInput = () => {
  if (nocContent.value.content.length > 1 && nocFormRef.value) {
    nocFormRef.value.clear()
  }
}
</script>

<template>
  <div v-if="showComposeNocEmail && isAssignedToUser" class="app-inner-container">
    <div class="mb-8 rounded bg-white py-6">
      <UForm
        ref="nocFormRef"
        :schema="sendNocSchema"
        :state="nocContent"
        :validate-on="['submit']"
        data-testid="compose-noc"
      >
        <div class="flex">
          <div class="flex w-1/5 flex-col items-center">
            <span class="pl-5 font-bold">{{ t('modal.noc.title') }}</span>
          </div>
          <div class="flex-auto pr-10">
            <UFormGroup name="content">
              <UTextarea
                v-model="nocContent.content"
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
