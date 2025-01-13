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
          idps: () => ['bcsc', 'bceid'] // function required to overwrite default value, will merge if no function
        }
      }
    },
    sbcWebMsg: {
      enable: true,
      allowedRoutes: ['application', 'dashboard']
    }
  },
  ui: {}
})
