<template>
  <div data-test-id="form-section-contact">
    <BcrosFormSection :title="t('createAccount.contactForm.dateOfBirth')" :optional="!isPrimary">
      <div class="flex m:flex-col gap-4">
        <UFormGroup name="birthDay" class="d:w-1/3" :error="errors.birthDay">
          <UInput
            v-model="day"
            :placeholder="t('createAccount.contactForm.day')"
            aria-label="birth day"
            data-test-id="contact-info-birth-day"
            @input="emit('resetFieldError', 'birthDay')"
            @blur="isPrimary && emit('validateField', 'birthDay')"
            @change="isPrimary && emit('validateField', 'birthDay')"
          />
        </UFormGroup>
        <UFormGroup name="birthMonth" class="d:w-1/3" :error="errors.birthMonth">
          <USelect
            v-model="month"
            :placeholder="t('createAccount.contactForm.month')"
            :options="getMonths()"
            option-attribute="key"
            aria-label="birth month"
            data-test-id="contact-info-birth-month"
            style="color: #1a202c; /* text-gray-900 */"
            @input="emit('resetFieldError', 'birthMonth')"
            @blur="isPrimary && emit('validateField', 'birthMonth')"
          />
        </UFormGroup>
        <UFormGroup name="birthYear" class="d:w-1/3" :error="errors.birthYear">
          <UInput
            v-model="year"
            :placeholder="t('createAccount.contactForm.year')"
            aria-label="birth year"
            data-test-id="contact-info-birth-year"
            @input="emit('resetFieldError', 'birthYear')"
            @blur="isPrimary && emit('validateField', 'birthYear')"
            @change="isPrimary && emit('validateField', 'birthYear')"
          />
        </UFormGroup>
      </div>
    </BcrosFormSection>
  </div>
</template>

<script setup lang="ts">
const { t } = useTranslation()

const {
  isPrimary,
  errors = {}
} = defineProps<{
  isPrimary?: boolean
  errors: Record<string, string>
}>()

const emit = defineEmits<{
  validateField: [field: string]
  resetFieldError: [field: keyof typeof errors]
}>()

const day = defineModel<string>('day')
const month = defineModel<string>('month')
const year = defineModel<string>('year')

const months: string[] = [
  t('general.january'),
  t('general.february'),
  t('general.march'),
  t('general.april'),
  t('general.may'),
  t('general.june'),
  t('general.july'),
  t('general.august'),
  t('general.september'),
  t('general.october'),
  t('general.november'),
  t('general.december')
]

const getMonths = (): { key: string, value: string }[] => months.map((month: string, index: number) => ({
  value: (index + 1).toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false }),
  key: month
}))

</script>
