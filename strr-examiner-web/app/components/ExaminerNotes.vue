<script lang="ts" setup>
import { useTimeoutFn } from '@vueuse/core'
const { t } = useNuxtApp().$i18n
const { kcUser } = useKeycloak()
const { noteContent, withNoteCheck } = useExaminerNotes()

defineProps<{
  isReadonly?: boolean
}>()

const notes = ref<ExaminerNote[]>([])
const notesContainer = ref<HTMLElement>()
const showHighlight = ref(false)

const NOTE_ANIMATION_DURATION = 3000 // new note background highlight in ms
const NOTE_MAX_LENGTH = 1000
const showSaveError = ref(false)

watch(noteContent, () => {
  // clear error alert when note content is updated
  showSaveError.value = false
})

const { start: highlightNewNote } = useTimeoutFn(() => {
  showHighlight.value = false
}, NOTE_ANIMATION_DURATION)

const handleSaveNote = () => {
  try {
    // implement actual save when api is ready
    const newNote: ExaminerNote = {
      id: Math.random(), // NOSONAR
      createdAt: new Date().toISOString(),
      username: kcUser.value.userName,
      text: noteContent.value.trim()
    }
    notes.value.unshift(newNote)
    noteContent.value = ''
    showSaveError.value = false
    showHighlight.value = true

    notesContainer.value!.scrollTop = 0
    highlightNewNote()
  } catch {
    showSaveError.value = true
  }
}

const handleDiscardNote = () => {
  withNoteCheck(() => {})
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

    <div class="bg-white">
      <div :class="isReadonly ? 'grid grid-cols-1' : 'grid grid-cols-2 gap-x-4 p-6'">
        <!-- Left side: textarea, character counter, Discard and Save buttons -->
        <div v-if="!isReadonly">
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
                  base: 'h-[241px] !bg-str-bgGray focus:ring-0',
                  padding: {
                    sm: 'p-4'
                  }
                }"
                data-testid="note-textarea"
              />
            </UFormGroup>
          </UForm>
          <div class="ml-3 mt-1 text-xs text-[#495057]">
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
          <UAlert
            v-if="showSaveError"
            class="mt-3"
            color="red"
            icon="i-mdi-alert-circle-outline"
            variant="subtle"
            data-testid="save-note-error"
            :close-button="null"
            :description="t('error.saveNote')"
            :ui="{
              wrapper: 'border border-[#D3272C]',
              inner: 'pt-0 text-[#495057] ',
              description: 'text-base',
              padding: 'px-6 py-4',
              icon: {
                base: 'flex-shrink-0 w-5 h-5 self-start'
              },
            }"
          />
        </div>

        <!-- Right side: scrollable note list -->
        <div
          ref="notesContainer"
          :class="notes.length > 0 ? 'h-[313px] overflow-auto pr-2' : ''"
        >
          <p
            v-if="notes.length === 0"
            class="text-sm text-str-textGray"
            data-testid="no-notes-available"
          >
            {{ t('label.noNotesAvailable') }}
          </p>
          <div
            v-for="(note, index) in notes"
            :key="note.id"
            class="rounded p-3 text-sm transition-colors duration-300"
            :class="{ 'bg-[#F0F9FF]' : index === 0 && showHighlight }"
          >
            <div class="flex gap-3 text-[#495057]">
              <span>{{ dateToString(note.createdAt, 'MMM d, y a', true) }}</span>
              <span class="font-bold">{{ note.username }}</span>
            </div>
            <div class="mt-1 whitespace-pre-line text-str-textGray">
              {{ note.text }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
