import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockHostOwner } from '../mocks/mockedData'
import Owners from '~/components/summary/Owners.vue'

enableAutoUnmount(afterEach)
let pinia: ReturnType<typeof createPinia>
beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  useHostOwnerStore().hostOwners = [structuredClone(mockHostOwner)]
})

const OwnerInput = {
  emits: ['cancel'],
  template: '<div data-testid="owner-input"><button @click="$emit(\'cancel\')">Cancel edit</button></div>'
}

async function mountOwners (editable: boolean) {
  return await mountSuspended(Owners, {
    props: { editable },
    global: { plugins: [pinia], stubs: { FormAddOwnersInput: OwnerInput } }
  })
}

describe('owner summary expansion controls', () => {
  it.each([false, true])('hides the default row toggle (editable: %s)', async (editable) => {
    const wrapper = await mountOwners(editable)
    const expansionCell = wrapper.get('tbody tr td')
    expect(expansionCell.findAll('button').filter(button => !button.classes().includes('hidden'))).toHaveLength(0)
    expect(wrapper.find('[data-testid="owner-input"]').exists()).toBe(false)
  })

  it('opens and cancels the owner form through the visible edit action', async () => {
    const wrapper = await mountOwners(true)
    await wrapper.get('[data-testid="edit-owner-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="owner-input"]').exists()).toBe(true)
    await wrapper.get('[data-testid="owner-input"] button').trigger('click')
    expect(wrapper.find('[data-testid="owner-input"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="edit-owner-btn"]').attributes('disabled')).toBeUndefined()
  })
})
