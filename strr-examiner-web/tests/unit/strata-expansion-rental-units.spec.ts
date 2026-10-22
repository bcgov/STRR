import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enI18n } from '../mocks/i18n'
import { StrataExpansionRentalUnits } from '#components'

const { mockStrataDetails } = vi.hoisted(() => ({ mockStrataDetails: { value: {} as any } }))

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    activeReg: ref({ strataHotelDetails: mockStrataDetails.value })
  })
}))

// Stand-in for the base-web ConnectGroupedItemList, which is tested in strr-base-web.
const groupedItemListStub = {
  props: ['groups', 'countLabel', 'searchPlaceholder', 'emptyText'],
  template: `
    <div data-testid="list-stub" :data-search="searchPlaceholder" :data-empty="emptyText">
      <span data-testid="total">{{ countLabel(groups.reduce((sum, g) => sum + g.items.length, 0)) }}</span>
      <div v-for="group in groups" :key="group.id" :data-testid="'group-' + group.id">
        <slot name="description" :group="group" />
      </div>
    </div>
  `
}

const address = (street: string) => ({
  address: street, addressLineTwo: '', city: 'Victoria', country: 'CA', postalCode: 'V8W 1A1', province: 'BC'
})

const mountPanel = () => mountSuspended(StrataExpansionRentalUnits, {
  global: { plugins: [enI18n], stubs: { ConnectGroupedItemList: groupedItemListStub } }
})

const passedGroups = (wrapper: Awaited<ReturnType<typeof mountPanel>>) =>
  wrapper.findComponent(groupedItemListStub).props('groups') as any[]

describe('Strata Expansion - Rental Units', () => {
  beforeEach(() => {
    mockStrataDetails.value = {
      location: address('1 Primary St'),
      buildings: [address('2 Second Ave'), address('3 Third Ave')],
      unitListings: { primary: '102\n101', additional: ['', '301, 302'] }
    }
  })

  it('passes one group per building with its label, sorted units and own address', async () => {
    const groups = passedGroups(await mountPanel())

    // building 1 has no units so it is skipped, and the next one keeps its real address
    expect(groups.map(({ id, label, items }) => ({ id, label, items }))).toEqual([
      { id: 0, label: 'PRIMARY BUILDING', items: ['101', '102'] },
      { id: 2, label: 'BUILDING 3', items: ['301', '302'] }
    ])
    expect(groups[0].description).toContain('1 Primary St')
    expect(groups[1].description).toContain('3 Third Ave')
  })

  it('renders each group address with a location icon through the description slot', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.findTestId('group-0').text()).toContain('1 Primary St')
    expect(wrapper.findTestId('group-2').text()).toContain('3 Third Ave')
  })

  it('supplies the search and empty-state wording', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.findTestId('list-stub').attributes('data-search')).toBe('Search units')
    expect(wrapper.findTestId('list-stub').attributes('data-empty')).toBe('No units match your search')
  })

  it('formats counts with correct plural wording', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.findTestId('total').text()).toBe('4 units')

    mockStrataDetails.value = { ...mockStrataDetails.value, unitListings: { primary: '101', additional: [] } }
    expect((await mountPanel()).findTestId('total').text()).toBe('1 unit')
  })
})
