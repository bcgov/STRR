<script setup lang="ts">
import countryList from 'country-codes-list'
import type { ConnectPhoneCountry } from '#imports'

const countryCallingCode = defineModel<string | undefined>('countryCallingCode', { required: false })
watch(countryCallingCode, (val) => {
  // this is needed for when something outside this component changes the callingCode model value
  if (!val) {
    countryIso2.value = undefined
  } else if (selectedCountry.value?.callingCode !== val) {
    countryIso2.value = search(val)[0]?.iso2
  }
})

const countryIso2 = defineModel<string | undefined>('countryIso2', { required: false })
watch(countryIso2, (val) => {
  if (!val) {
    selectedCountry.value = undefined
  } else if (val && selectedCountry.value?.iso2 !== val) {
    selectCountry(val)
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

const _countryListOptions = countryList.customList(
  // @ts-ignore
  'countryCode', '{countryCallingCode},{countryNameEn},{countryNameLocal}')

const manualInput = (event: any) => {
  selectedCountry.value = {
    callingCode: event.target.value
  }
}

const countryListOptions: Array<ConnectPhoneCountry> = Object.keys(_countryListOptions).map((key) => {
  // @ts-ignore
  const [callingCode, nameEn, nameLocal] = _countryListOptions[key].split(',')
  return {
    iso2: key,
    callingCode,
    label: `+${callingCode}`,
    nameLocal,
    nameEn
  }
}).sort((a, b) => a.callingCode.localeCompare(b.callingCode))

const search = (q: string) => countryListOptions.filter((lo) => {
  return lo.callingCode.includes(q) ||
    lo.iso2?.includes(q) ||
    lo.nameLocal?.includes(q) ||
    lo.nameEn?.includes(q) ||
    lo.label?.includes(q)
})

const selectCountry = (iso2: string) => {
  selectedCountry.value = countryListOptions.find(item => item.iso2 === iso2)
}

onMounted(() => {
  if (countryIso2.value !== undefined) {
    selectCountry(countryIso2.value)
  } else if (countryCallingCode.value) {
    selectedCountry.value = {
      callingCode: `+${countryCallingCode.value}`
    }
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
    </template>
  </UInputMenu>
</template>
