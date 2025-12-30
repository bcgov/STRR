import { createI18n } from 'vue-i18n'
import baseEn from '../../../strr-base-web/i18n/locales/en-CA'
import baseFr from '../../../strr-base-web/i18n/locales/fr-CA'
import en from '~~/i18n/locales/en-CA'
import fr from '~~/i18n/locales/fr-CA'

export const enI18n = createI18n({
  legacy: false,
  locale: 'en-CA',
  messages: {
    'en-CA': en,
    'fr-CA': fr
  }
})

export const baseEnI18n = createI18n({
  legacy: false,
  locale: 'en-CA',
  messages: {
    'en-CA': { ...baseEn, ...en },
    'fr-CA': fr
  }
})

export const frI18n = createI18n({
  legacy: false,
  locale: 'fr-CA',
  messages: {
    'en-CA': en,
    'fr-CA': fr
  }
})

export const baseFrI18n = createI18n({
  legacy: false,
  locale: 'en-CA',
  messages: {
    'en-CA': en,
    'fr-CA': { ...baseFr, ...fr }
  }
})
