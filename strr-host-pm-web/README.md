[![License](https://img.shields.io/badge/License-BSD%203%20Clause-blue.svg)](LICENSE)

# Short Term Rental Registry - Host & Property Manager UI

## Development & Contributing

Create a fork and local copy of this repo. Answer _Y_ to create a local clone.
```bash
gh repo fork bcgov/STRR
```

Change into the directory and install the packages.
```bash
cd STRR/strr-host-pm-web
pnpm install
```

Startup the development environment.
```bash
pnpm run dev
```

## E2E Testing

To run Playwright in the terminal:
```bash
pnpm test:e2e
```

To run Playwright in ui mode:
```bash
pnpm test:e2e:ui
```

### Playwright Config

The globalSetup option will create and save an auth user state which can then be used inside other tests:
```js
  globalSetup: './tests/e2e/test-utils/global-setup',
```

To run tests in headless mode, set the headless property in the Playwright config:
```js
  use: {
    headless: true
  }
```

### Environment Variables Setup

Before running any e2e tests, ensure the `.env` file has the correct values. Missing or incorrect values will lead to test failures. Below are the required environment variables:

```
# Configures the login steps, anything other than 'Development' will try to login using the prod steps.
NUXT_ENVIRONMENT_HEADER="Development"

# playwright login, account name and BCEID secret
PLAYWRIGHT_TEST_BCSC_USERNAME=""
PLAYWRIGHT_TEST_BCSC_PASSWORD=""
PLAYWRIGHT_TEST_BCSC_PREMIUM_ACCOUNT_NAME=""
PLAYWRIGHT_TEST_BCEID_USERNAME=""
PLAYWRIGHT_TEST_BCEID_PASSWORD=""
PLAYWRIGHT_TEST_BCEID_PREMIUM_ACCOUNT_NAME=""
PLAYWRIGHT_TEST_BCEID_OTP_SECRET=""

# The full url the tests will run against (local/dev/test/sandbox)
NUXT_BASE_URL=""
```

#### Important

Sbc Web Messenger (Genesys) interferes with the test environment by causing extra network traffic (preventing `waitUntil: 'networkidle'` from being met) and in some cases, blocks the submit/next-step buttons during an application. 

Please set the following environment variables to be an **empty** string while running any e2e tests, doing so will prevent the messenger from mounting.

```
NUXT_GENESYS_URL=""
NUXT_GENESYS_ENVIRONMENT_KEY=""
NUXT_GENESYS_DEPLOYMENT_KEY=""
```

### Authentication

The test runner creates a saved authentication state (storageState) stored in JSON files located at tests/e2e/.auth/. This state is used by the current smoke tests (as of 2025/01/10) to maintain the authenticated session without re-entering credentials or OTPs repeatedly.

To use this auth state in other tests:
```js
  test.describe('Describe Block', () => {
    test.use({ storageState: `tests/e2e/.auth/${loginMethod.toLowerCase()}-user.json` })

    test('My Test', async ({ page }) => {
      // stuff
    })
  })
```

### Playwright Quirks

- Tests using BCEID login that rely on a OTP (test/prod environments) should use the saved auth user state. Generating a new OTP for each test on login can cause the tests to fail.
- A maximum of 4 workers seems to be the sweet spot for tests to pass without colliding with each other.
- Setting to 1 worker will fully disable running tests in parallel.
- Using the Playwright extension/testing tab does not execute the global setup and save the auth state. You must run `pnpm:e2e` to at least create the auth files before running tests with the extension.