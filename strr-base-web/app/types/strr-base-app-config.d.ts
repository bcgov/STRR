declare module 'nuxt/schema' {
  interface AppConfigInput {
    strrBaseLayer: {
      page: {
        login: {
          redirectPath: string,
          options: {
            createAccount: boolean,
            idps: Array<'bcsc' | 'bceid' | 'idir'>,
            bcscSubtext: string | undefined,
            bceidSubtext: string | undefined,
            idirSubtext: string | undefined
          }
        }
      },
      feeWidget?: {
        itemLabelTooltip: Record<string, { i18nkey: string, hrefRtcKey?: keyof PublicRuntimeConfig }> // typeCode
      }
    }
  }
}

declare module 'nuxt/schema' {
  interface AppConfig {
    strrBaseLayer: {
      page: {
        login: {
          redirectPath: string,
          options: {
            createAccount: boolean,
            idps: Array<'bcsc' | 'bceid' | 'idir'>,
            bcscSubtext: string | undefined,
            bceidSubtext: string | undefined,
            idirSubtext: string | undefined
          }
        }
      },
      feeWidget?: {
        itemLabelTooltip: Record<string, { i18nkey: string, hrefRtcKey?: keyof PublicRuntimeConfig }> // typeCode
      }
    }
  }
}

export {}