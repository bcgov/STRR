<script lang="ts" setup>
import { mockExaminerNotes } from '../../tests/mocks/mockedData'
const { openConfirmActionModal, close } = useStrrModals()
const { t } = useNuxtApp().$i18n
const { kcUser } = useKeycloak()

const notes = ref<ExaminerNote[]>([...mockExaminerNotes])

const NOTE_MAX_LENGTH = 1000
const noteContent = ref('')

const handleSaveNote = () => {
  // TODO: implement actual save when api is ready
  const newNote: ExaminerNote = {
    id: Math.random(),
    timestamp: new Date().toISOString(),
    username: kcUser.value.userName,
    text: noteContent.value.trim()
  }
  notes.value.unshift(newNote)
  noteContent.value = ''
}

const handleDiscardNote = () => {
  openConfirmActionModal(
    t('modal.discardNote.title'),
    t('modal.discardNote.message'),
    t('modal.discardNote.confirmBtn'),
    () => {
      noteContent.value = ''
      close()
      return Promise.resolve()
    },
    t('modal.discardNote.keepEditing')
  )
}

</script>

<template>
  <div class="app-inner-container mb-4">
    <!-- Header -->
    <div class="flex items-center justify-between rounded-t-lg bg-[#E2E8EE] px-6 py-4">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-mdi-message-text-outline"
          class="size-6 text-str-blue"
        />
        <h3 class="text-lg text-str-textGray">
          {{ t('label.examinerNotes') }} ({{ notes.length }})
        </h3>
      </div>
    </div>

    <div class="bg-white p-6">
      <div class="grid grid-cols-2 gap-x-5">
        <!-- Left side: textarea, character counter, Discard and Save buttons -->
        <div>
          <UForm :state="{}" :validate-on="['submit']">
            <UFormGroup
              name="noteContent"
              :ui="{
                wrapper: 'mb-1',
                error: 'text-xs mt-1'
              }"
            >
              <UTextarea
                v-model="noteContent"
                :placeholder="t('label.examinerNotePlaceholder')"
                color="gray"
                :maxlength="NOTE_MAX_LENGTH"
                :ui="{
                  base: 'h-[290px] !bg-str-bgGray focus:ring-0',
                  padding: {
                    sm: 'p-4'
                  }
                }"
              />
            </UFormGroup>
          </UForm>
          <div class="mt-1 flex justify-end text-xs text-gray-500">
            {{ noteContent.length }}/{{ NOTE_MAX_LENGTH }}
          </div>
          <div
            v-if="noteContent.trim().length > 0"
            data-testid="note-actions"
            class="mt-3 flex justify-end gap-3"
          >
            <UButton
              data-testid="discard-note-btn"
              class="px-4"
              variant="ghost"
              color="primary"
              @click="handleDiscardNote"
            >
              {{ t('btn.discardChanges') }}
            </UButton>
            <UButton
              data-testid="save-note-btn"
              class="px-7 py-2"
              color="primary"
              @click="handleSaveNote"
            >
              {{ t('btn.save') }}
            </UButton>
          </div>
        </div>

        <!-- Right side: scrollable note list -->
        <div class="h-[290px] overflow-auto pr-2">
          <template
            v-for="note in notes"
            :key="note.id"
          >
            <div class="mb-4 text-sm">
              <div class="flex gap-3 text-[#495057]">
                <span>{{ note.timestamp }}</span>
                <span class="font-bold">{{ note.username }}</span>
              </div>
              <div class="mt-1 whitespace-pre-line text-str-textGray">
                {{ note.text }}
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
