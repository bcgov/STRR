/**
 * A composable for translation that provides a single instance of the
 * i18n translation function throughout the application.
 *
 * @returns object with a translation function `t`, which takes a key string
 *          as an argument and returns the corresponding translated string
 */
export function useTranslation () {
  const { $i18n } = useNuxtApp()
  const translate = computed(() => $i18n.t)

  return {
    t: (key: string) => translate.value(key)
  }
}
