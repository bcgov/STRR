import { expect, describe, test } from 'vitest'
import { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { mockedI18n } from '~/tests/unit/utils/test-utils/mockedi18n'
import app from '~/app.vue'

describe('App level test', () => {
  let wrapper: VueWrapper<any>

  beforeEach(async () => {
    wrapper = await mountSuspended(app, { global: { plugins: [mockedI18n] } })
  })
  afterEach(() => { wrapper.unmount() })

  test('app initializes with layouts and default page', () => {
    expect(wrapper.find('#bcros-main-header').exists()).toBe(true)
    expect(wrapper.find('#bcros-main-footer').exists()).toBe(true)
  })
})
