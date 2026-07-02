# Contributing to STRR Host & Property Manager UI

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How To Contribute](#how-to-contribute)
- [Engineering Governance and Engagement](#engineering-governance-and-engagement)
- [The Standard GitHub Workflow](#the-standard-github-workflow)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)
- [Code Style and Standards](#code-style-and-standards)
- [Internationalization](#internationalization)
- [Accessibility](#accessibility)
- [Responsive Design](#responsive-design)

## Code of Conduct

This project and everyone participating in it is governed by the
[Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js ≥ 24
- pnpm
- `gh` CLI, for the fork workflow described below

### Target Stack

STRR Host & Property Manager UI follows the [bcgov/connect](https://github.com/bcgov/connect/blob/main/CONTRIBUTING.md) web front-end stack:

- pnpm
- Nuxt 3
- Tailwind CSS
- The shared `strr-base-web` layer (see [below](#the-strr-base-web-layer))
- i18n and accessibility (axe-core in Playwright e2e), inherited from the shared layer

Changes or additions to this stack should go through the [RFC process](https://github.com/bcgov/connect/discussions/categories/rfcs); smaller changes can go through a lighter-weight team decision.

Unlike some other STRR/bcgov services, this repo doesn't use a Devcontainer — see Local Setup below.

### Local Setup

```bash
cd strr-host-pm-web
pnpm install
cp .env.example .env   # fill in API URLs + Keycloak config
pnpm dev                # http://localhost:3000
```

`.env` variable categories: API endpoints (`NUXT_STRR_API_URL`, `NUXT_PAY_API_URL`, `NUXT_AUTH_API_URL`, `NUXT_LEGAL_API_URL`), app base url (`NUXT_BASE_URL`), Keycloak auth config, session inactivity timeouts, playwright login, etc.

### The `strr-base-web` layer

This app `extends` the shared `strr-base-web` Nuxt layer straight from GitHub by default:

```ts
// nuxt.config.ts
extends: [
  ['github:bcgov/STRR/strr-base-web', { install: true }],
  // '../strr-base-web', // dev only
  '@daxiom/nuxt-core-layer-test' // extend again, this prevents the payApi plugin error
],
```

If you're also making changes in `strr-base-web`, comment out the `github:` line and uncomment the local path line, then restart the dev server to pick up local layer changes.

Two things to keep in mind when changing the base layer:

- The `github:` reference resolves the layer from the `main` branch of `bcgov/STRR`, so base-layer changes aren't picked up by CI or deploys — even on your own branch — until they're merged.
- `strr-base-web` is shared with the other STRR UIs (`strr-examiner-web`, `strr-platform-web`, `strr-strata-web`), so changes there ripple into those apps too.

### Testing & Linting

Run these locally before opening a PR — [`strr-host-pm-ui-ci.yaml`](../.github/workflows/strr-host-pm-ui-ci.yaml) runs the same checks automatically:

```bash
pnpm lint
pnpm lint:fix            # auto-fix

pnpm test                 # Vitest, watch mode with coverage (copies clover.xml on exit)
pnpm test:unit            # Vitest, watch mode
pnpm test:unit:cov        # Vitest, single run with coverage

pnpm test:e2e              # Playwright, headless
pnpm test:e2e:ui           # Playwright, UI mode
```

Playwright notes:

- Unlike some of the other STRR UIs, this app's `playwright.config.ts` has no active `webServer` block — start the app yourself (`pnpm dev`) before running e2e tests, and make sure `NUXT_BASE_URL` in `.env` points at it (e.g. `http://localhost:3000/`).
- Fill in `.env` first, including the `PLAYWRIGHT_TEST_BCSC_*` and `PLAYWRIGHT_TEST_BCEID_*` credentials (BCeID logins also need `PLAYWRIGHT_TEST_BCEID_OTP_SECRET` for one-time passwords) — missing values cause silent failures. A global setup logs in with those credentials once and saves the session as a `storageState` under `tests/e2e/.auth/`, so tests start pre-authenticated instead of logging in every run.
- The e2e suite is a set of smoke-test scenarios under `tests/e2e/smoke-tests/`, currently run against Desktop Chrome (other browsers and mobile viewports are stubbed out in `playwright.config.ts`).

## How to Contribute

Government employees, public and members of the private sector are all encouraged to contribute. All contributors retain the original copyright to their contributions, but by contributing you grant a world-wide, royalty-free, perpetual, irrevocable, non-exclusive, transferable license to all users **under the terms of the license under which this project is distributed**.

### Engineering Governance and Engagement

1. **Check for an existing issue** in the [STRR issue tracker](https://github.com/bcgov/STRR/issues) before starting work, to make sure it isn't already reported or in progress.
2. **Open an issue** if one doesn't exist. Describe the problem, the proposed solution, and any architectural impact.
3. **Wait for approval.** Don't start writing code yet — a core committer or Product Owner reviews the issue against the roadmap first. Once it's approved and assigned, you're clear to begin development.

### The Standard GitHub Workflow

We use **Fork → Clone → Branch → PR**. Direct commits to `main` are restricted.

#### 1. Fork, clone, and branch

Manual:

```bash
git clone https://github.com/<your-personal-account>/STRR.git
cd STRR
git remote add upstream https://github.com/bcgov/STRR.git
git checkout -b feat/issue#-your-feature-name
```

Or with the [`gh` CLI](https://cli.github.com/):

```bash
git config --global push.autoSetupRemote true   # one-time
gh repo set-default bcgov/STRR                  # one-time, per clone
gh repo fork bcgov/STRR
gh issue develop <issue-number> --checkout      # for issues tracked in bcgov/STRR
```

Use a descriptive branch name, e.g. `feat/issue#-add-x` or `fix/issue#-fix-y`.

#### 2. Make your changes

Follow the project's [style](#code-style-and-standards), [internationalization](#internationalization), [accessibility](#accessibility), and [responsive design](#responsive-design) conventions. Before committing, run through [Testing & Linting](#testing--linting) above — all submissions need accompanying tests and must pass lint.

#### 3. Commit

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) — this is enforced by CI for changelog generation and semantic versioning:

```bash
git commit -m "<type>(scope): <description>"
```

e.g. `feat(ui): add host email edit`, `fix(ui): reset edit email status`.

#### 4. Rebase on the latest `main`

Before opening the PR — and again whenever `main` moves while your PR is open — rebase your branch on the latest upstream `main`. We use rebase rather than merge commits to keep history linear:

```bash
git fetch upstream main
git rebase upstream/main
```

Resolve any conflicts and re-run [Testing & Linting](#testing--linting). If the branch was already pushed, update it with:

```bash
git push --force
```

#### 5. Open the pull request

```bash
git push
gh pr create --title "fix(ui): ..." --body "Closes #123"
```

Or via the web UI: complete the PR template in its entirety, explicitly linking the approved issue. Then:

- Describe the changes you made and why they're necessary, including any breaking changes.
- Ensure all automated CI checks (tests, linting, commit formats) pass.
- Address review feedback and be responsive to comments.

### Reporting Bugs

> You must never report security related issues, vulnerabilities or bugs including sensitive information to the issue tracker, or elsewhere in public. Bug reports must not include any sensitive information or personally identifiable information (PII), such as names, email addresses, phone numbers, home addresses, or account credentials.

We track bugs as [GitHub issues](https://github.com/bcgov/STRR/issues/new). A good bug report shouldn't leave others needing to chase you up for more information, so before opening one:

- Check the [bug tracker](https://github.com/bcgov/STRR/issues?q=label%3Abug) first — the bug may already be reported, and possibly fixed.
- If it happened during local development, rule out a local setup issue first: dependencies installed (`pnpm install`), `.env` filled in correctly, and Node/pnpm versions matching the [prerequisites](#prerequisites).

Then include in the report:

- Which environment: local dev, Dev, Test, or Prod
- Browser and version, OS, and device (the app is used on mobile and tablet as well as desktop — include screen size/orientation for layout issues)
- Login method (BC Services Card or BCeID) and account type, and the Application or Registration number involved — but never the credentials themselves
- Browser console and network errors (DevTools), if any
- The *reproduction steps* someone else can follow to recreate the issue (actual vs expected results)
- Whether you can reliably reproduce it

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for STRR Host & Property Manager UI, **including completely new features and minor improvements to existing functionality**. Following these guidelines will help maintainers and the community to understand your suggestion and find related suggestions.

#### Before Submitting an Enhancement

- Make sure that you are using the latest version.
- Read the [readme](./README.md) carefully and find out if the functionality is already covered, maybe by an individual configuration.
- Perform a [search](https://github.com/bcgov/STRR/issues) to see if the enhancement has already been suggested. If it has, add a comment to the existing issue instead of opening a new one.

#### How Do I Submit a Good Enhancement Suggestion?

Enhancement suggestions are tracked as [GitHub issues](https://github.com/bcgov/STRR/issues).

- Use a **clear and descriptive title** for the issue to identify the suggestion.
- Provide a **step-by-step description of the suggested enhancement** in as many details as possible.
- **Describe the current behavior** and **explain which behavior you expected to see instead** and why. At this point you can also tell which alternatives do not work for you.
- **Explain why this enhancement would be useful** to STRR Host & Property Manager UI users. You may also want to point out the other projects that solved it better and which could serve as inspiration.

### Code Style and Standards

- All code should be written in Vue 3 using the [composition API](https://vuejs.org/guide/extras/composition-api-faq.html), adhering to best practices and naming conventions.
- Ensure all components, composables, utilities, and other code are written in TypeScript.
- Follow the recommended [file structure](https://nuxt.com/docs/guide/directory-structure/nuxt) for Nuxt 3 projects.
- Use ESLint to enforce code style and formatting.
- Write unit tests for all components, composables, stores, utilities, etc using [Vitest](https://vitest.dev/) and [Nuxt Test Utils](https://nuxt.com/docs/getting-started/testing?utm_source=nuxt.com&utm_medium=aside-module&utm_campaign=nuxt.com), supplemented with [@testing-library/vue](https://testing-library.com/docs/vue-testing-library/intro/) and aim for high test coverage.
- Document all composables, and utilities with JSDoc comments.
- Use [Tailwind CSS](https://tailwindcss.com/) for styling, and follow the project's established design system and utility classes.
- Prefer using [Nuxt Modules](https://nuxt.com/modules) for adding functionality and integrations, and avoid custom implementations unless necessary.
- Use environment variables for configuration settings, and never hard-code sensitive information or credentials in the codebase.
- Regularly update dependencies to their latest versions to ensure security and stability.

### Internationalization

- Ensure all text content is translated using the i18n framework to manage translations.
- Use the `$t` function for translation strings within your components.
- Add new translation keys to the appropriate language files in the locales directory.
- Follow the established patterns for structuring and naming translation keys.

### Accessibility

- Follow accessibility best practices to ensure that the application is usable by people with disabilities.
- Use semantic HTML elements and attributes correctly.
- Ensure that all interactive elements are keyboard accessible.
- Provide appropriate ARIA roles, states, and properties where necessary.
- Use color contrast checkers to ensure that text meets WCAG AA guidelines for contrast.
- Test your changes with screen readers and other assistive technologies.

### Responsive Design

The Host & Property Manager UI is a public-facing app used by hosts and property managers on phones and tablets as well as desktops — responsiveness is a requirement, not a nice-to-have.

- Design and implement components with a mobile-first approach.
- All styling is done with Tailwind utility classes — don't add hand-written CSS or `@media` queries. Adapt layouts with Tailwind responsive variants (`sm:`, `md:`, `lg:`) as done in existing components.
- Ensure that components are flexible and can resize appropriately based on their container size, using relative units (e.g., %, em, rem) rather than fixed pixel values where sizing is needed.
- Test your changes on various devices and screen sizes — at minimum a phone-sized viewport, a tablet, and desktop — to ensure a consistent and functional user experience.
