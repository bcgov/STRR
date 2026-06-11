// Module-level singleton so noteContent is shared between ExaminerNotes.vue and any
// component/page that needs to guard against navigating away with unsaved content.
const noteContent = ref('')

export const useExaminerNotes = () => {
  const { openConfirmActionModal, close } = useStrrModals()
  const { t } = useNuxtApp().$i18n

  const hasUnsavedNote = computed(() => noteContent.value.trim().length > 0)

  /**
   * Wraps a major action (approve, reject, cancel, navigate, etc.) with an
   * unsaved-note check. If the examiner has typed but not yet saved a note,
   * the Discard Note modal appears before the action runs.
   * If there is no unsaved content the action executes immediately.
   */
  const withNoteCheck = (action: () => void) => {
    if (!hasUnsavedNote.value) {
      action()
      return
    }
    openConfirmActionModal(
      t('modal.discardNote.title'),
      t('modal.discardNote.message'),
      t('modal.discardNote.confirmBtn'),
      () => {
        noteContent.value = ''
        close()
        action()
        return Promise.resolve()
      },
      t('modal.discardNote.keepEditing')
    )
  }

  /**
   * Registers a Vue Router leave guard on the calling page component.
   * When the examiner tries to navigate away with unsaved note content the
   * Discard Note modal is shown. Confirming clears the note and completes
   * the original navigation; cancelling keeps them on the current page.
   *
   * Must be called at the top level of a component's setup() (same rules as
   * all Vue lifecycle hooks).
   */
  const useNoteLeaveGuard = () => {
    // In-app navigation guard - shows the custom Discard Note modal.
    onBeforeRouteLeave((to, _from, next) => {
      if (!hasUnsavedNote.value) {
        next()
        return
      }

      // Cancel navigation first; we will trigger it manually after confirmation.
      next(false)

      openConfirmActionModal(
        t('modal.discardNote.title'),
        t('modal.discardNote.message'),
        t('modal.discardNote.confirmBtn'),
        async () => {
          noteContent.value = ''
          close()
          await navigateTo(to.fullPath)
        },
        t('modal.discardNote.keepEditing')
      )
    })

    // Browser tab close / refresh / external navigation guard.
    // Browsers only allow their native "Leave site?" dialog here
    // custom modals are not permitted in this case.
    useEventListener(globalThis, 'beforeunload', (event: BeforeUnloadEvent) => {
      if (!hasUnsavedNote.value) { return }
      event.preventDefault()
    })
  }

  return {
    noteContent,
    hasUnsavedNote,
    withNoteCheck,
    useNoteLeaveGuard
  }
}
