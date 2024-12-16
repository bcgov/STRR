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
    }
  },
  ui: {}
})
