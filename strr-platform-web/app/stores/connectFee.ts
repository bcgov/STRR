export const useConnectFeeStore = defineStore('connect/fee', () => {
  const { $payApi } = useNuxtApp()

  const feeOptions = ref({
    showFutureEffectiveFees: false,
    showPriorityFees: false,
    showProcessingFees: false,
    showGst: false,
    showPst: false,
    showServiceFees: true
  })

  const fees = ref<ConnectFees>({})
  const placeholderFeeItem = ref<ConnectFeeItem>({
    isPlaceholder: true,
    filingFees: 0,
    filingType: 'placeholder',
    filingTypeCode: ConnectFeeCode.PLACEHOLDER,
    futureEffectiveFees: 0,
    priorityFees: 0,
    processingFees: 0,
    serviceFees: 0,
    tax: {
      gst: 0,
      pst: 0
    },
    total: 0
  })

  const getTotalFromFees = (feeValue: string, isTax = false) => {
    let total = 0
    for (const key of Object.keys(fees.value)) {
      if (fees.value[key]?.waived) {
        // if waived then total value for is 0
        continue
      }
      const quantity = fees.value[key]?.quantity ?? 1
      // @ts-ignore
      if (isTax && fees.value[key].tax[feeValue]) {
        // @ts-ignore
        total += fees.value[key].tax[feeValue] * quantity
      // @ts-ignore
      } else if (fees.value[key][feeValue]) {
        // @ts-ignore
        if (feeValue === 'total') {
          // ignore service fee and processing fee
          // - (otherwise incorrectly adding it for each item instead of once at the end)
          // @ts-ignore
          total += (fees.value[key].total - fees.value[key].serviceFees - fees.value[key].processingFees) * quantity
        } else {
          // @ts-ignore
          total += fees.value[key][feeValue] * quantity
        }
      }
    }
    return total
  }

  const getMaxFromFees = (feeValue: string) => {
    let maxFee = 0
    for (const key of Object.keys(fees.value)) {
      // @ts-ignore
      const itemFee = fees.value[key][feeValue]
      if (itemFee && (itemFee > maxFee)) {
        maxFee = itemFee
      }
    }
    return maxFee
  }

  const totalFutureEffectiveFees = computed(() => getTotalFromFees('futureEffectiveFees'))
  const totalPriorityFees = computed(() => getTotalFromFees('priorityFees'))
  const totalProcessingFees = computed(() => getMaxFromFees('processingFees'))
  const totalServiceFees = computed(() => getMaxFromFees('serviceFees'))
  const totalGst = computed(() => getTotalFromFees('gst', true))
  const totalPst = computed(() => getTotalFromFees('pst', true))
  const total = computed(() => getTotalFromFees('total') + totalServiceFees.value + totalProcessingFees.value)

  /**
   * Fetches the Fee info for the given entity type / fee code combination.
   *
   * @returns {Promise<Fee | undefined>} Fee data or undefined if an error occurs.
   */
  const getFee = async (
    entityType: ConnectFeeEntityType,
    code: ConnectFeeCode
  ): Promise<ConnectFeeItem | undefined> => {
    try {
      return await $payApi<ConnectFeeItem>(`/fees/${entityType}/${code}`)
    } catch (error) {
      console.error('Error fetching Fee: ', error)
    }
  }

  const addReplaceFee = (fee: ConnectFeeItem) => {
    fees.value[fee.filingTypeCode] = fee
  }
  const removeFee = (key: string) => {
    delete fees.value[key]
  }
  const setFeeQuantity = (key: string, quantity: number) => {
    if (fees.value[key]) {
      fees.value[key].quantity = quantity
    }
  }

  const setPlaceholderFilingTypeCode = (code: ConnectFeeCode) => {
    placeholderFeeItem.value.filingTypeCode = code
  }

  const setPlaceholderServiceFee = (fees: number) => {
    placeholderFeeItem.value.serviceFees = fees
  }

  return {
    feeOptions,
    fees,
    placeholderFeeItem,
    totalFutureEffectiveFees,
    totalPriorityFees,
    totalProcessingFees,
    totalGst,
    totalPst,
    totalServiceFees,
    total,
    getFee,
    addReplaceFee,
    removeFee,
    setFeeQuantity,
    setPlaceholderFilingTypeCode,
    setPlaceholderServiceFee
  }
})
