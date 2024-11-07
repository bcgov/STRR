export const getTodoApplication = (applicationPath: string, applicationInfo?: ApplicationHeader) => {
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  return {
    title: t('strr.title.application'),
    // NOTE: currently this status could only ever be DRAFT as there is no review process for platforms
    subtitle: applicationInfo ? applicationInfo.status : undefined,
    button: {
      label: applicationInfo ? t('btn.resumeApplication') : t('btn.beginApplication'),
      action: () => {
        if (applicationInfo) {
          // pass application number so that the application form can load in the saved data
          useRouter().push({
            path: useLocalePath()(applicationPath),
            query: { applicationId: applicationInfo.applicationNumber }
          })
        } else {
          useRouter().push({ path: useLocalePath()(applicationPath) })
        }
      }
    }
  }
}
