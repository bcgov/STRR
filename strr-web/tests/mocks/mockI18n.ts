import { createI18n } from 'vue-i18n'
import en from '@/lang/en.json'

export const mockI18n = createI18n({
  locale: 'en',
  messages: { en }
})
