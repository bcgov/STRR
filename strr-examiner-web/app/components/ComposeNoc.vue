<script setup lang="ts">
const { sendNocSchema, validateNocContent } = useExaminerStore()
const { nocContent, showNocModal, nocFormRef } = storeToRefs(useExaminerStore())
const { t } = useI18n()

</script>

<template>
  <div v-if="showNocModal" class="app-inner-container">
    <div class="mb-8 rounded bg-white py-6">
      <UForm
        ref="nocFormRef"
        :schema="sendNocSchema"
        :state="nocContent"
        @input="validateNocContent()"
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
              />
            </UFormGroup>
          </div>
        </div>
      </UForm>
    </div>
  </div>
</template>

<style scoped></style>
