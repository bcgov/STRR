import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosFormSectionPropertyManagerBusinessDetails } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})
let wrapper: any

it('can mount Business Details component', async () => {
  wrapper = await mountSuspended(BcrosFormSectionPropertyManagerBusinessDetails,
    {
      global: { plugins: [i18n] }
    })
  expect(wrapper.findTestId('property-manager-business-details').exists()).toBe(true)
  expect(wrapper.findTestId('property-manager-business-name-input').exists()).toBe(true)
  expect(wrapper.findTestId('property-manager-business-number-input').exists()).toBe(true)
})

it('has correct input placeholders', async () => {
  const { t } = useTranslation()
  wrapper = await mountSuspended(BcrosFormSectionPropertyManagerBusinessDetails,
    {
      global: { plugins: [i18n] }
    })
  const businessNameInput = wrapper.findTestId('property-manager-business-name-input')
  const businessNumberInput = wrapper.findTestId('property-manager-business-number-input')

  expect(businessNameInput.attributes('placeholder')).toBe(t('createAccount.propertyManagerForm.businessName'))
  expect(businessNumberInput.attributes('placeholder')).toBe(t('createAccount.propertyManagerForm.businessNumber'))
})

it('uses defineModel for businessName and businessNumber', async () => {
  wrapper = await mountSuspended(BcrosFormSectionPropertyManagerBusinessDetails, {
    global: { plugins: [i18n] },
    props: {
      businessName: 'Test Business',
      businessNumber: '123456'
    }
  })

  const businessNameInput = wrapper.findTestId('property-manager-business-name-input')
  const businessNumberInput = wrapper.findTestId('property-manager-business-number-input')

  expect((businessNameInput.element as HTMLInputElement).value).toBe('Test Business')
  expect((businessNumberInput.element as HTMLInputElement).value).toBe('123456')
})
