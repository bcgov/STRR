# STRR — Short-Term Rental Registry

[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](LICENSE)

STRR is a full-stack application built for the Province of British Columbia to manage short-term rental registrations. It's a polyglot monorepo made up of:

- **5x Nuxt 3 / TypeScript web apps**, one of which (`strr-base-web`) is a shared base layer consumed by the other four
- **Flask/Python REST API** (`strr-api`) backed by PostgreSQL
- **3x event-driven queue services** that consume CloudEvents/Pub-Sub messages (payments, email, batch permit validation)
- **8x scheduled Cloud Run jobs** (auto-approval, renewals, expiry checks, etc.)

Everything deploys to GCP Cloud Run via reusable GitHub Actions workflows from [`bcgov/bcregistry-sre`](https://github.com/bcgov/bcregistry-sre).

## Repo map

Each project below is independent. `cd` into it before running any command.

| Path | What it is | Stack |
| --- | --- | --- |
| [`strr-base-web/`](strr-base-web/) | Shared Nuxt layer — components/composables/config consumed by the other web apps via `extends:` in `nuxt.config.ts` | Nuxt 3, TypeScript |
| [`strr-host-pm-web/`](strr-host-pm-web/) | Host / Property Manager registration UI | Nuxt 3, TypeScript |
| [`strr-platform-web/`](strr-platform-web/) | Platform admin UI | Nuxt 3, TypeScript |
| [`strr-examiner-web/`](strr-examiner-web/) | Examiner review UI | Nuxt 3, TypeScript |
| [`strr-strata-web/`](strr-strata-web/) | Strata Hotel management UI | Nuxt 3, TypeScript |
| [`strr-api/`](strr-api/) | Core REST API | Flask, SQLAlchemy, Alembic, Python |
| [`queue_services/`](queue_services/) | Event-driven CloudEvent consumers (Pub/Sub) — `strr-pay`, `strr-email`, `batch-permit-validator` | Flask, Python |
| [`jobs/`](jobs/) | Scheduled Cloud Run Jobs — `auto-approval`, `renewal-reminders`, `registration_expiry`, `noc_expiry`, `provisional-approval`, `interactions-update`, `strr-backfiller`, `batch-permit-validator` | Flask, Python |
| [`tests/python-test-utils/`](tests/python-test-utils/) | Shared pytest fixtures/utilities used by `strr-api` | Python |
| [`docs/runbooks/`](docs/runbooks/) | **Operational** runbooks — health endpoints, GCP log queries, SQL investigation snippets, incident response | Markdown |
| [`docs/oas/`](docs/oas/) | OpenAPI spec (`platform.yaml`) | — |
| [`rfcs/`](rfcs/) | Design RFCs / architecture history | Markdown |

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | ≥ 24 | required by every web app's `engines.node`; no `.nvmrc` is checked in, use nvm/mise/volta |
| pnpm | pinned per app via the `packageManager` field | package manager for all web apps |
| Python | `^3.12.2` per `pyproject.toml`; `strr-api/.python-version` pins `3.13.1` | for `strr-api`, `queue_services/`, `jobs/` |
| Poetry | latest | Python dependency management |
| PostgreSQL | 13+ (PostGIS extension used) | for `strr-api`; not provisioned by the repo — install locally or run a `postgis/postgis` container |
| Docker | latest | for building service images (`Dockerfile` per app); there is no one-command full-stack launcher |
| `gh` CLI | latest | used by the fork-based contribution workflow |

## Getting started

Setup instructions live with each project:

- **Web apps** — see the `CONTRIBUTING.md` in each app (e.g. [`strr-examiner-web/CONTRIBUTING.md`](strr-examiner-web/CONTRIBUTING.md)): `pnpm install`, copy `.env.example` to `.env`, `pnpm dev`.
- **API** — see [`strr-api/README.md`](strr-api/README.md): Poetry-based setup with a PostgreSQL instance and Alembic migrations.
- **Queue services & jobs** — follow the same Poetry-based setup as `strr-api` (`poetry install`, copy `.env.sample`, `sh run.sh`). These consume Pub/Sub events or run on a schedule in production; see [`docs/runbooks/queue-services-and-jobs.md`](docs/runbooks/queue-services-and-jobs.md) for how they behave end-to-end.

## Contributing

We use a fork → branch → PR workflow against `main`; direct commits to `main` are restricted. Check the [issue tracker](https://github.com/bcgov/STRR/issues) for an existing issue (or open one) before starting work, and follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

The full workflow, code style, i18n, and accessibility standards are documented per app — start with the `CONTRIBUTING.md` of the app you're changing (e.g. [`strr-examiner-web/CONTRIBUTING.md`](strr-examiner-web/CONTRIBUTING.md)). Reviewers are defined in [`.github/CODEOWNERS`](.github/CODEOWNERS).

## CI/CD

Each component has its own CI and CD GitHub Actions workflow under [`.github/workflows/`](.github/workflows/), built on reusable templates from [`bcgov/bcregistry-sre`](https://github.com/bcgov/bcregistry-sre):

- `*-ci.yaml` — runs on PRs, path-filtered to the relevant directory. `strr-api-ci.yaml` enforces an 80% test coverage gate.
- `*-cd.yaml` — runs on push to `main`/`feature`/`hotfix`/`release` branches, with a manual deploy-target input (dev/test/prod).
- `e2e.yml` — a manually-dispatched Cypress smoke-test workflow, separate from the per-app Playwright e2e suites.

## Documentation

- **Operational runbooks** — [`docs/runbooks/`](docs/runbooks/): health endpoints, GCP Cloud Logging queries, SQL investigation snippets for production debugging.
- **API spec** — [`docs/oas/platform.yaml`](docs/oas/platform.yaml).
- **Design history** — [`rfcs/`](rfcs/).
