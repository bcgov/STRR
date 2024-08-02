// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosFormSectionReviewSubsection } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount form subsection component', async () => {
  const contactState: PrimaryContactInformationI = {
    preferredName: 'preferredName',
    phoneNumber: 'phoneNumber',
    extension: 'extension',
    faxNumber: 'faxNumber',
    emailAddress: 'emailAddress',
    address: 'address',
    country: 'CA',
    addressLineTwo: 'addressLineTwo',
    city: 'city',
    province: 'province',
    postalCode: 'postalCode',
    birthDay: 'birthDay',
    birthMonth: 'birthMonth',
    birthYear: 'birthYear',
    businessNumber: 'businessNumber',
    socialInsuranceNumber: 'socialInsuranceNumber'
  }

  const addressSection = await mountSuspended(BcrosFormSectionReviewSubsection,
    {
      global: { plugins: [i18n] },
      props: {
        state: contactState,
        primary: true
      }
    })
  expect(addressSection.find('[data-cy="form-subsection"]').exists()).toBe(true)
})
