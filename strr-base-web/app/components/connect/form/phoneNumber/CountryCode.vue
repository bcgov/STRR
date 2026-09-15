<script setup lang="ts">
import { all } from 'country-codes-list'
import type { ConnectPhoneCountry } from '#imports'

defineProps<{
  isInvalid: boolean | undefined
}>()

const countryCallingCode = defineModel<string | undefined>('countryCallingCode', { required: false })
watch(countryCallingCode, (val) => {
  // this is needed for when something outside this component changes the callingCode model value
  if (!val) {
    selectedCountry.value = undefined
  } else if (selectedCountry.value?.callingCode !== val) {
    selectedCountry.value = getCountryForCallingCode(val)
  }
})

const countryIso2 = defineModel<string | undefined>('countryIso2', { required: false })
watch(countryIso2, (val) => {
  if (selectedCountry.value?.iso2 !== val) {
    if (val) {
      selectCountry(val)
    } else {
      selectedCountry.value = undefined
    }
  }
})

const selectedCountry = ref<ConnectPhoneCountry | undefined>(undefined)
watch(selectedCountry, (newVal) => {
  if (newVal?.callingCode !== countryCallingCode.value) {
    countryCallingCode.value = newVal?.callingCode
  }
  if (newVal?.iso2 !== countryIso2.value) {
    countryIso2.value = newVal?.iso2
  }
})

const manualInput = (event: any) => {
  selectedCountry.value = {
    callingCode: event.target.value
  }
}

const countriesByIso2 = new Map(all().map(country => [country.countryCode, country]))
const countryListOptions: Array<ConnectPhoneCountry> = Array.from(countriesByIso2.values(), country => ({
  iso2: country.countryCode,
  callingCode: country.countryCallingCode,
  label: `+${country.countryCallingCode}`,
  nameLocal: country.countryNameLocal,
  nameEn: country.countryNameEn
})).sort((a, b) => a.callingCode.localeCompare(b.callingCode))

const search = (q: string) => {
  const query = q.toLowerCase()
  return countryListOptions.filter((lo) => {
    return lo.callingCode.includes(query) ||
      lo.iso2?.toLowerCase().includes(query) ||
      lo.nameLocal?.toLowerCase().includes(query) ||
      lo.nameEn?.toLowerCase().includes(query) ||
      lo.label?.includes(query)
  })
}

const getCountryForCallingCode = (callingCode: string): ConnectPhoneCountry => {
  return countryListOptions.find(country => country.callingCode === callingCode) ||
    { callingCode, label: `+${callingCode}` }
}

const selectCountry = (iso2: string) => {
  selectedCountry.value = countryListOptions.find(item => item.iso2 === iso2)
}

onMounted(() => {
  if (countryIso2.value !== undefined) {
    selectCountry(countryIso2.value)
  } else if (countryCallingCode.value) {
    selectedCountry.value = getCountryForCallingCode(countryCallingCode.value)
  }
})
</script>

<template>
  <UInputMenu
    v-model="selectedCountry"
    :options="countryListOptions"
    size="lg"
    :color="selectedCountry?.callingCode ? 'primary' : 'gray'"
    :search="search"
    :trailing-icon="'i-mdi-chevron-down'"
    option-attribute="label"
    :aria-required="true"
    :aria-invalid="isInvalid"
    :ui="{
      padding: {
        'lg': selectedCountry?.callingCode ? 'pl-[50px]' : 'pl-3',
      }
    }"
    @input="manualInput($event)"
  >
    <template v-if="!!selectedCountry?.iso2" #leading>
      <div class="mt-1">
        <ConnectCountryFlag
          :tooltip-text="selectedCountry?.nameEn"
          :country-code-iso2letter="selectedCountry?.iso2"
        />
      </div>
    </template>

    <template #option="{ option }">
      <ConnectCountryFlag
        :tooltip-text="option.nameLocal"
        :country-code-iso2letter="option.iso2"
      />
      <span class="mt-1 h-5 truncate">{{ option.label }}</span>
      <span class="sr-only">{{ option.nameLocal }}</span>
    </template>
  </UInputMenu>
</template>
