// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { mockApplicationApproved } from '~/tests/mocks/mockApplication'
import { BcrosStatusCard } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

let wrapper: any

it('can mount status card component', async () => {
  const applicationHeader: ApplicationHeaderI = mockApplicationApproved.header

  wrapper = await mountSuspended(BcrosStatusCard,
    {
      global: { plugins: [i18n] },
      props: {
        isSingle: true,
        applicationHeader
      }
    })
  expect(wrapper.findTestId('status-card').exists()).toBe(true)
  expect(wrapper.classes()).toContain('flex-1')
  expect(wrapper.text()).toContain(applicationHeader.registrationNumber)
})

it('can mount one of many status card components', async () => {
  const applicationHeader: ApplicationHeaderI = {
    ...mockApplicationApproved.header,
    paymentStatus: 'COMPLETED'
  }

  wrapper = await mountSuspended(BcrosStatusCard,
    {
      global: { plugins: [i18n] },
      props: {
        isSingle: false,
        applicationHeader
      }
    })
  expect(wrapper.findTestId('status-card').exists()).toBe(true)
  expect(wrapper.classes()).not.toContain('flex-1')
})

it('renders view application and download receipt links for paid applications', async () => {
  const applicationHeader: ApplicationHeaderI = mockApplicationApproved.header

  wrapper = await mountSuspended(BcrosStatusCard, {
    global: { plugins: [i18n] },
    props: {
      isSingle: true,
      applicationHeader
    }
  })

  expect(wrapper.findTestId('view-application-link').exists()).toBe(true)
  expect(wrapper.findTestId('download-receipt-link').exists()).toBe(true)
})
