[![License](https://img.shields.io/badge/License-BSD%203%20Clause-blue.svg)](LICENSE)

# Short Term Rental Registry - Property Manager UI

## Development & Contributing

Create a fork and local copy of this repo. Answer _Y_ to create a local clone.
```bash
gh repo fork bcgov/STRR
```

Change into the directory and install the packages.
```bash
cd STRR/strr-platform-web
pnpm install
```

Startup the development environment.
```bash
pnpm run dev
```

## Testing

Run Vitest in watch mode for unit tests
```bash
pnpm test
or
pnpm test:unit
```

Run Vitest Coverage
```bash
pnpm test:unit:cov
```

Run Playwright e2e tests in headless mode
```bash
pnpm test:e2e
```

Run Playwright e2e tests in Playwright UI
```bash
pnpm test:e2e:ui
```
