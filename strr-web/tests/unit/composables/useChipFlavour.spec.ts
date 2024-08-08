// @vitest-environment nuxt
import { it, expect } from 'vitest'

const { getChipFlavour } = useChipFlavour()
const t = useNuxtApp().$i18n.t
const tRegistryDashboardStatus = (translationKey: string) => t(`registryDashboard.statusChip.${translationKey}`)

it('returns correct value for denied status', () => {
  const flavour = getChipFlavour('DENIED')
  expect(flavour.alert).toEqual(AlertsFlavourE.ALERT)
  expect(flavour.text).toEqual(tRegistryDashboardStatus('denied'))
})

it('returns correct value for approved status', () => {
  const flavour = getChipFlavour('APPROVED')
  expect(flavour.alert).toEqual(AlertsFlavourE.SUCCESS)
  expect(flavour.text).toEqual(tRegistryDashboardStatus('approved'))
})

it('returns correct value for issued status', () => {
  const flavour = getChipFlavour('ISSUED')
  expect(flavour.alert).toEqual(AlertsFlavourE.SUCCESS)
  expect(flavour.text).toEqual(tRegistryDashboardStatus('issued'))
})

it('returns correct value for rejected status', () => {
  const flavour = getChipFlavour('REJECTED')
  expect(flavour.alert).toEqual(AlertsFlavourE.ALERT)
  expect(flavour.text).toEqual(tRegistryDashboardStatus('rejected'))
})

it('returns correct value for pending status', () => {
  const flavour = getChipFlavour('PENDING')
  expect(flavour.alert).toEqual(AlertsFlavourE.WARNING)
  expect(flavour.text).toEqual(tRegistryDashboardStatus('pending'))
})

it('returns correct value for under review status', () => {
  const flavour = getChipFlavour('UNDER_REVIEW')
  expect(flavour.alert).toEqual(AlertsFlavourE.APPLIED)
  expect(flavour.text).toEqual(tRegistryDashboardStatus('underReview'))
})

it('returns correct value for empty status', () => {
  const flavour = getChipFlavour('')
  expect(flavour.alert).toEqual(AlertsFlavourE.MESSAGE)
  expect(flavour.text).toEqual('')
})
