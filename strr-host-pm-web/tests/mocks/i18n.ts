import { createI18n } from 'vue-i18n'
import merge from 'lodash'
import baseEn from '../../../strr-base-web/i18n/locales/en-CA'
import baseFr from '../../../strr-base-web/i18n/locales/fr-CA'
import en from '~~/app/locales/en-CA'
import fr from '~~/app/locales/fr-CA'

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
    'en-CA': merge({}, baseEn, en)
  }
})

export const frI18n = createI18n({
  legacy: false,
  locale: 'fr-CA',
  messages: {
    'fr-CA': fr
  }
})

export const baseFrI18n = createI18n({
  legacy: false,
  locale: 'en-CA',
  messages: {
    'fr-CA': merge({}, baseFr, fr)
  }
})

export const randomI18n = createI18n({
  legacy: false,
  locale: 'ja',
  messages: {
    ja: en
  }
})
