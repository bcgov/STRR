export const getTodoApplication = () => {
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  const { activeApplicationInfo } = useStrrPlatformStore()
  return {
    title: t('strr.title.application'),
    // NOTE: currently this status could only ever be DRAFT as there is no review process for platforms
    subtitle: activeApplicationInfo ? activeApplicationInfo.status : undefined,
    button: {
      label: activeApplicationInfo ? t('btn.resumeApplication') : t('btn.beginApplication'),
      action: () => {
        if (activeApplicationInfo) {
          // pass application number so that the application form can load in the saved data
          useRouter().push({
            path: useLocalePath()('/platform/application'),
            query: { applicationId: activeApplicationInfo.applicationNumber }
          })
        } else {
          useRouter().push({ path: useLocalePath()('/platform/application') })
        }
      }
    }
  }
}
