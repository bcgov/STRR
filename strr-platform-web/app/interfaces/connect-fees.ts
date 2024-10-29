export interface ConnectTax {
  gst: number,
  pst: number
}

export interface ConnectFeeItem {
  filingFees: number,
  filingType: string,
  filingTypeCode: ConnectFeeCode,
  futureEffectiveFees: number,
  priorityFees: number,
  processingFees: number,
  serviceFees: number,
  tax: ConnectTax,
  total: number,
  quantity?: number,
  isPlaceholder?: boolean,
  waived?: boolean
}

export interface ConnectFees { // this could have multiple mapped feeItems
  [key: string]: ConnectFeeItem
}
