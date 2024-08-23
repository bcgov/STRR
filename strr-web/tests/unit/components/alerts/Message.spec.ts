// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'

import { BcrosAlertsMessage } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount AlertsMessage component', async () => {
  const alert = await mountSuspended(BcrosAlertsMessage,
    { global: { plugins: [i18n] }, props: { flavour: AlertsFlavourE.ALERT } })
  expect(alert.find('[data-test-id="alertsMessage:alert"]').exists()).toBe(true)
  const success = await mountSuspended(BcrosAlertsMessage,
    { global: { plugins: [i18n] }, props: { flavour: AlertsFlavourE.SUCCESS } })
  expect(success.find('[data-test-id="alertsMessage:success"]').exists()).toBe(true)
  const warning = await mountSuspended(BcrosAlertsMessage,
    { global: { plugins: [i18n] }, props: { flavour: AlertsFlavourE.WARNING } })
  expect(warning.find('[data-test-id="alertsMessage:warning"]').exists()).toBe(true)
  const message = await mountSuspended(BcrosAlertsMessage,
    { global: { plugins: [i18n] }, props: { flavour: AlertsFlavourE.MESSAGE } })
  expect(message.find('[data-test-id="alertsMessage:message"]').exists()).toBe(true)
  const info = await mountSuspended(BcrosAlertsMessage,
    { global: { plugins: [i18n] }, props: { flavour: AlertsFlavourE.INFO } })
  expect(info.find('[data-test-id="alertsMessage:info"]').exists()).toBe(true)
})
