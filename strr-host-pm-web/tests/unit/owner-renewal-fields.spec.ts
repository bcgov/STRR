import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockHostOwner } from '../mocks/mockedData'
import Person from '~/components/form/AddOwners/input/Person.vue'

const isRegistrationRenewal = ref(false)
const activeOwnerEditIndex = ref(-1)
const isCraNumberOptional = ref(false)

vi.mock('@/stores/hostPermit', () => ({
  useHostPermitStore: () => ({ isRegistrationRenewal })
}))
vi.mock('@/stores/hostOwner', () => ({
  useHostOwnerStore: () => ({ activeOwnerEditIndex, isCraNumberOptional, SetOwnerNameWithUserCreds: vi.fn() })
}))
mockNuxtImport('useKeycloak', () => () => ({ kcUser: ref({ loginSource: LoginSource.BCEID }) }))
mockNuxtImport('useCanadaPostAddress', () => () => ({ address: ref(undefined), enableAddressComplete: vi.fn() }))

enableAutoUnmount(afterEach)

beforeEach(() => {
  isRegistrationRenewal.value = false
  activeOwnerEditIndex.value = -1
  isCraNumberOptional.value = false
})

describe('owner renewal field restrictions', () => {
  it.each([
    { renewal: false, editing: true, disabled: false },
    { renewal: true, editing: false, disabled: false },
    { renewal: true, editing: true, disabled: true }
  ])('renewal=$renewal, editing=$editing', async ({ renewal, editing, disabled }) => {
    isRegistrationRenewal.value = renewal
    activeOwnerEditIndex.value = editing ? 0 : -1
    const owner = structuredClone(mockHostOwner)
    owner.isCompParty = false
    const wrapper = await mountSuspended(Person, {
      props: { owner, ownerFormRef: { clear: vi.fn() }, showErrors: false }
    })

    const restrictedIds = [
      'host-owner-first-name', 'host-owner-middle-name', 'host-owner-last-name', 'host-owner-taxNumber'
    ]
    for (const id of restrictedIds) {
      expect(wrapper.get<HTMLInputElement>(`input#${id}`).element.disabled, id).toBe(disabled)
    }
    const address = wrapper.get('#connect-form-address')
    const fields = address.findAll('input, textarea, button')
    expect(fields.length).toBeGreaterThanOrEqual(7)
    for (const field of fields) {
      expect((field.element as HTMLInputElement).disabled, field.html()).toBe(disabled)
    }
    expect(wrapper.get<HTMLInputElement>('input#host-owner-email').element.disabled).toBe(false)
    expect(wrapper.get<HTMLInputElement>('input#host-owner-preferred-name').element.disabled).toBe(false)
  })
})
