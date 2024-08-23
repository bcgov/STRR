<template>
  <div
    class="flex py-[22px] px-[30px] mobile:px-[8px] mobile:py-[22px] flex-row"
    :class="flavourContainerClass"
    :role="flavourRole"
    :data-test-id="'alertsMessage:' + flavour"
  >
    <div class="flex">
      <div class="mobile:hidden">
        <slot name="icon">
          <UIcon
            v-if="flavourIcon"
            :class="flavourIconClass"
            class="h-[20px] w-[20px]"
            :name="flavourIcon"
          />
        </slot>
      </div>
      <div class="text-[14px] leading-[22px] ml-[12px] mt-[-5px]">
        <slot name="default" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Ref } from 'vue'
import { AlertsFlavourE } from '~/enums/alerts-e'

const props = defineProps<{
  flavour: AlertsFlavourE
}>()

const flavourIcon: Ref<string | null> = ref(null)
const flavourContainerClass = ref('')
const flavourIconClass = ref('')
const flavourRole = ref('none')

switch (props.flavour) {
  case AlertsFlavourE.ALERT:
    flavourIcon.value = 'i-mdi-alert'
    flavourIconClass.value = 'text-red-500'
    flavourContainerClass.value = 'border border-red-500 bg-red-100'
    flavourRole.value = 'alert'
    break
  case AlertsFlavourE.SUCCESS:
    flavourIcon.value = 'i-mdi-success-circle'
    flavourContainerClass.value = 'border border-green-500 bg-green-100'
    flavourRole.value = 'alert'
    break
  case AlertsFlavourE.WARNING:
    flavourIcon.value = 'i-mdi-alert'
    flavourIconClass.value = 'text-orange-500'
    flavourContainerClass.value = 'border border-orange-500 bg-orange-100'
    flavourRole.value = 'alert'
    break
  case AlertsFlavourE.INFO:
    flavourIcon.value = 'i-mdi-alert'
    flavourIconClass.value = 'text-orange-500'
    flavourContainerClass.value = 'border border-yellow-500 bg-yellow-50'
    flavourRole.value = 'note'
    break
  case AlertsFlavourE.MESSAGE:
    flavourIcon.value = null
    flavourContainerClass.value = 'border-2 border-solid border-black'
    break
}

</script>
