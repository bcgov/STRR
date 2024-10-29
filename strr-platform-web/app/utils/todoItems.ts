// TODO: investigate why t must be passed in here (causing failure even though this is only called within a setup fn)
export const getTodoApplication = (t: any) => {
  const { activeApplicationInfo } = useStrrPlatformStore()
  return {
    title: t('platform.title.application'),
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
