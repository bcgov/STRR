import { createI18n } from 'vue-i18n'
import baseEn from '../../../strr-base-web/i18n/locales/en-CA'
import en from '~~/i18n/locales/en-CA'
import fr from '~~/i18n/locales/fr-CA'

export const enI18n = createI18n({
  legacy: false,
  locale: 'en-CA',
  messages: {
    'en-CA': en
  }
})

export const baseEnI18n = createI18n({
  legacy: false,
  locale: 'en-CA',
  messages: {
    'en-CA': baseEn
  }
})

export const frI18n = createI18n({
  legacy: false,
  locale: 'fr-CA',
  messages: {
    'fr-CA': fr
  }
})

export const randomI18n = createI18n({
  legacy: false,
  locale: 'ja',
  messages: {
    ja: en
  }
})
