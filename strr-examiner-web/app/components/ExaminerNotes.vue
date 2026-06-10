<script lang="ts" setup>
import { useTimeoutFn } from '@vueuse/core'
import orderBy from 'lodash/orderBy'
const { t } = useNuxtApp().$i18n
const { noteContent, withNoteCheck } = useExaminerNotes()

const {
  getApplicationNotes,
  getRegistrationNotes,
  createApplicationNote,
  createRegistrationNote,
  getRegistrationFilingHistory
} = useExaminerStore()
const { isApplication, activeRecord, activeHeader } = storeToRefs(useExaminerStore())

defineProps<{
  isReadonly?: boolean
}>()

// the notes list also displays the "Registration created" filing history event inline, sorted by date
type ExaminerNoteListItem = ExaminerNote | { eventName: FilingHistoryEventName, createdAt: string }

const notesContainer = ref<HTMLElement>()
const showHighlight = ref(false)

const NOTE_ANIMATION_DURATION = 3000 // new note background highlight in ms
const NOTE_MAX_LENGTH = 1000
const showSaveError = ref(false)

const {
  data: notes,
  status,
  error: notesFetchError
} = useLazyAsyncData<ExaminerNoteListItem[]>('examiner-notes', async () => {
  if (isApplication.value) {
    const applicationNotes = await getApplicationNotes(activeHeader.value!.applicationNumber)
    return orderBy(applicationNotes, n => new Date(n.createdAt).getTime(), 'desc')
  }

  // for Registrations, show notes from both the initial application and the registration itself
  const registration = activeRecord.value as HousRegistrationResponse

  const initialApplicationNumber = registration.header.applications
    ?.find(application => application.applicationType === 'registration')
    ?.applicationNumber

  const [applicationNotes, registrationNotes, filingHistory] = await Promise.all([
    initialApplicationNumber
      ? getApplicationNotes(initialApplicationNumber)
      : Promise.resolve([]),
    getRegistrationNotes(registration.id),
    getRegistrationFilingHistory(registration.id)
  ])

  const allNotes: ExaminerNoteListItem[] = [...applicationNotes, ...registrationNotes]

  // include "Registration created" event in the notes
  const regCreated = filingHistory.find(event => event.eventName === FilingHistoryEventName.REGISTRATION_CREATED)
  if (regCreated) {
    allNotes.push({ eventName: regCreated.eventName, createdAt: regCreated.createdDate })
  }

  // sort notes by date
  return orderBy(allNotes, n => new Date(n.createdAt).getTime(), 'desc')
}, { default: () => [] })

watch(noteContent, () => {
  // clear error alert when note content is updated
  showSaveError.value = false
})

const notesCount = computed(() => notes.value
  .filter(n => !('eventName' in n)).length) // filter out event type entries from the notes

const { start: highlightNewNote } = useTimeoutFn(() => {
  showHighlight.value = false
}, NOTE_ANIMATION_DURATION)

const handleSaveNote = async () => {
  try {
    const text = noteContent.value.trim()
    const newNote = isApplication.value
      ? await createApplicationNote(activeHeader.value!.applicationNumber, text)
      : await createRegistrationNote((activeRecord.value as HousRegistrationResponse).id, text)

    notes.value = [newNote, ...notes.value]
    noteContent.value = ''
    showSaveError.value = false
    showHighlight.value = true

    notesContainer.value!.scrollTop = 0
    highlightNewNote()
  } catch {
    showSaveError.value = true
  }
}

const formatAuthorUsername = (username: string) => username.replace('@idir', '').replace('idir\\', '')

const handleDiscardNote = () => {
  withNoteCheck(() => {})
}

</script>

<template>
  <div class="app-inner-container mb-4">
    <!-- Header -->
    <div class="flex items-center justify-between rounded-t-lg bg-str-lightGray px-6 py-4">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-mdi-message-text-outline"
          class="size-6 text-str-blue"
        />
        <h3 class="text-lg text-str-textGray">
          {{ t('label.examinerNotes') }} ({{ notesCount }})
        </h3>
      </div>
    </div>

    <div class="bg-white">
      <div :class="isReadonly ? 'grid grid-cols-1 p-6' : 'grid grid-cols-2 gap-x-4 p-6'">
        <!-- Left side: textarea, character counter, Discard and Save buttons -->
        <div v-if="!isReadonly">
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
          <div class="ml-3 mt-1 text-xs text-str-darkGray">
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
              wrapper: 'border border-str-red',
              inner: 'pt-0 text-str-darkGray',
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
          :class="isReadonly ? (notesCount > 0 && 'max-h-[313px] overflow-auto') : 'h-[313px] overflow-auto pr-2'"
        >
          <div
            v-if="status === 'pending'"
            class="flex justify-center py-4"
          >
            <UIcon
              name="i-mdi-loading"
              class="size-6 shrink-0 animate-spin"
            />
          </div>
          <UAlert
            v-else-if="notesFetchError"
            color="red"
            icon="i-mdi-alert-circle-outline"
            variant="subtle"
            :close-button="null"
            :description="t('error.fetchNotes')"
            :ui="{
              wrapper: 'border border-str-red',
              inner: 'pt-0 text-str-darkGray',
              description: 'text-base',
              padding: 'px-6 py-4',
              icon: {
                base: 'flex-shrink-0 w-5 h-5 self-start'
              }
            }"
          />
          <template v-else>
            <p
              v-if="notes.length === 0"
              class="text-sm text-str-textGray"
              data-testid="no-notes-available"
            >
              {{ t('label.noNotesAvailable') }}
            </p>
            <div
              v-for="(note, index) in notes"
              :key="'eventName' in note ? `${note.eventName}-${note.createdAt}` : note.id"
            >
              <div
                v-if="'eventName' in note"
                class="my-3 flex items-center gap-4 text-sm text-str-darkGray"
              >
                <div class="h-px flex-1 bg-gray-300" />
                <span class="font-bold">{{ t(`filingHistoryEvents.${note.eventName}`) }}</span>
                {{ dateToString(note.createdAt, 'MMM d, y a', true) }}
                <div class="h-px flex-1 bg-gray-300" />
              </div>
              <div
                v-else
                class="rounded p-3 text-sm transition-colors duration-300"
                :class="{ 'bg-str-lightBlue' : index === 0 && showHighlight }"
              >
                <div class="flex gap-3 text-str-darkGray">
                  <span>{{ dateToString(note.createdAt, 'MMM d, y a', true) }}</span>
                  <span class="font-bold">{{ formatAuthorUsername(note.authorUsername) }}</span>
                </div>
                <div class="mt-1 whitespace-pre-line text-str-textGray">
                  {{ note.text }}
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
