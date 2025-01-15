export default defineAppConfig({
  connect: {
    core: {
      login: {
        redirectPath: '',
        idps: () => []
      },
      header: {
        options: {
          localeSelect: false,
          unauthenticated: {
            whatsNew: false,
            loginMenu: false,
            createAccount: false
          },
          authenticated: {
            notifications: true,
            accountOptionsMenu: true
          }
        }
      },
      plugin: {
        authApi: {
          errorRedirect: {
            401: '/auth/login'
          }
        },
        payApi: {
          errorRedirect: {
            401: '/auth/login'
          }
        }
      }
    }
  },
  strrBaseLayer: {
    page: {
      login: {
        redirectPath: '/auth/account/choose-existing',
        options: {
          createAccount: false,
          idps: () => ['bcsc', 'bceid'], // function required to overwrite default value, will merge if no function
          bceidSubtext: 'text.bceidSubtext'
        }
      }
    },
    feeWidget: {
      itemLabelTooltip: () => ({
        HOSTREG_1: {
          i18nkey: 'link.viewFeeSchedule',
          hrefRtcKey: 'hostFeesUrl'
        },
        HOSTREG_2: {
          i18nkey: 'link.viewFeeSchedule',
          hrefRtcKey: 'hostFeesUrl'
        }
      })
    },
    sbcWebMsg: {
      enable: true
    }
  },
  ui: {}
})
