export default defineAppConfig({
  strrBaseLayer: {
    page: {
      login: {
        redirectPath: '/auth/account/choose-existing',
        options: {
          createAccount: true,
          idps: () => ['bcsc'] // function required to overwrite default value, will merge if no function
        }
      }
    }
  },
  ui: {}
})
