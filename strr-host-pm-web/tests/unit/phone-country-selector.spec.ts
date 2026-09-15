import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { all } from 'country-codes-list'
import CountryCode from '../../../strr-base-web/app/components/connect/form/phoneNumber/CountryCode.vue'
import { UInputMenu } from '#components'

let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined

async function mountSelector (initial: { iso2?: string, callingCode?: string } = {}) {
  const iso2 = ref(initial.iso2)
  const callingCode = ref(initial.callingCode)
  const Parent = defineComponent({
    setup () {
      return () => h(CountryCode, {
        isInvalid: false,
        countryIso2: iso2.value,
        countryCallingCode: callingCode.value,
        'aria-label': 'Country calling code',
        'onUpdate:countryIso2': (value: string | undefined) => { iso2.value = value },
        'onUpdate:countryCallingCode': (value: string | undefined) => { callingCode.value = value }
      })
    }
  })
  wrapper = await mountSuspended(Parent, {
    attachTo: document.body,
    global: { stubs: { ConnectCountryFlag: true, UIcon: true, Teleport: true } }
  })
  await flushPromises()
  return { iso2, callingCode }
}

const menu = () => wrapper!.findComponent(UInputMenu)
const option = (iso2: string) => (menu().props('options') as ConnectPhoneCountry[]).find(item => item.iso2 === iso2)!

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

describe('Phone country selector', () => {
  it.each([
    ['canada', 'CA'], ['CANADA', 'CA'], ['cA', 'CA'], ['deutschland', 'DE']
  ])('finds %s without case sensitivity', async (query, iso2) => {
    await mountSelector()
    expect(menu().props('search')(query)).toEqual(expect.arrayContaining([expect.objectContaining({ iso2 })]))
  })

  it.each([
    ['1', 'CA'], ['+1', 'CA'], ['44', 'GB'], ['+44', 'GB']
  ])('retains calling-code search for %s', async (query, iso2) => {
    await mountSelector()
    expect(menu().props('search')(query)).toEqual(expect.arrayContaining([expect.objectContaining({ iso2 })]))
  })

  it('preserves unique country options and native names containing commas', async () => {
    await mountSelector()
    const afghanistan = all().find(country => country.countryCode === 'AF')!
    expect(option('AF').nameLocal).toBe(afghanistan.countryNameLocal)
    const options = menu().props('options') as ConnectPhoneCountry[]
    expect(new Set(options.map(item => item.iso2)).size).toBe(options.length)
  })

  it('preserves the selected ISO country when several countries share a calling code', async () => {
    const models = await mountSelector({ iso2: 'US', callingCode: '1' })
    expect(models.iso2.value).toBe('US')
    expect(models.callingCode.value).toBe('1')
    expect(menu().props('modelValue')).toMatchObject({ iso2: 'US', callingCode: '1', label: '+1' })
  })

  it('initializes from an exact calling code without replacing it with a partial match', async () => {
    const models = await mountSelector({ callingCode: '44' })
    expect(models.callingCode.value).toBe('44')
    expect(option(models.iso2.value!).callingCode).toBe('44')
    expect(menu().props('modelValue')).toMatchObject({ callingCode: '44', label: '+44' })
  })

  it.each(['44', '9999'])('preserves an external calling-code change to %s', async (code) => {
    const models = await mountSelector({ iso2: 'CA', callingCode: '1' })
    models.callingCode.value = code
    await flushPromises()
    expect(models.callingCode.value).toBe(code)
    if (code === '44') {
      expect(option(models.iso2.value!).callingCode).toBe(code)
    } else {
      expect(models.iso2.value).toBeUndefined()
    }
    expect(menu().props('modelValue')).toMatchObject({ callingCode: code, label: `+${code}` })
  })

  it.each(['iso2', 'callingCode'] as const)('clears the selector when the parent clears %s', async (key) => {
    const models = await mountSelector({ iso2: 'CA', callingCode: '1' })
    models[key].value = undefined
    await flushPromises()
    expect(models.iso2.value).toBeUndefined()
    expect(models.callingCode.value).toBeUndefined()
    expect(menu().find('input').element.value).toBe('')
  })

  it('keeps a manually entered code when replacing a selected country', async () => {
    const models = await mountSelector({ iso2: 'CA', callingCode: '1' })
    await menu().find('input').setValue('44')
    await flushPromises()
    expect(models.callingCode.value).toBe('44')
    expect(models.iso2.value).toBeUndefined()
    expect(menu().find('input').element.value).toBe('44')
  })

  it('lets a user type a lowercase country name and select its calling code', async () => {
    const models = await mountSelector({ iso2: 'US', callingCode: '1' })
    const input = menu().find('input')
    await input.setValue('canada')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await vi.waitFor(() => {
      expect(wrapper!.findAll('[role="option"]').some(item => item.text().includes('Canada'))).toBe(true)
    })
    await wrapper!.findAll('[role="option"]').find(item => item.text().includes('Canada'))!
      .trigger('mousedown', { button: 0 })
    await flushPromises()
    expect(models.iso2.value).toBe('CA')
    expect(models.callingCode.value).toBe('1')
    expect(input.element.value).toBe('+1')
  })

  it('updates both models when a country is selected', async () => {
    const models = await mountSelector({ iso2: 'CA', callingCode: '1' })
    menu().vm.$emit('update:modelValue', option('DE'))
    await flushPromises()
    expect(models.iso2.value).toBe('DE')
    expect(models.callingCode.value).toBe('49')
  })
})
