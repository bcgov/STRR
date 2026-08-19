# STRR Workspace Rules

## 🛠 Tool & Environment Paths
- **Atlassian CLI (`acli`)**: Always use the full path `/opt/homebrew/bin/acli` for Jira interactions.
- **Node & pnpm**: Use `/Users/jimmy/.nvm/versions/node/v24.14.1/bin` and `/opt/homebrew/bin` in the `PATH` environment variable when running Node/pnpm commands (`export PATH="/Users/jimmy/.nvm/versions/node/v24.14.1/bin:/opt/homebrew/bin:$PATH"`).
- **Poetry**: Always use `/opt/homebrew/bin/poetry` for Python virtual environment and dependency commands.

## 🌿 Git & Branching Strategy
- Always branch off `main` before starting work on a feature or ticket.
- Update `main` from upstream (`git checkout main && git pull upstream main`) before creating a new feature branch.
- Name feature branches after Jira tickets or descriptive feature names (e.g. `REGBACKLOG-71` or `feature/REGBACKLOG-71`).

## 🧪 Testing Guidelines
- **`strr-api`**: Run backend unit tests using `poetry run pytest` (or `poetry run pytest <test_file>`).
- **Frontend apps** (`strr-examiner-web`, `strr-base-web`, etc.): Run frontend unit tests using `pnpm test`.

## 🗄️ Database Guidelines
- **Docker Hosting**: The local STRR PostgreSQL database is hosted inside a Docker container.
- **Credentials & Environment Variables**: Database credentials and connection parameters (`DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_HOST`, `DATABASE_PORT`) can be found in `strr-api/.env` (or `.env.sample`).
- **Connecting via `psql`**:
  - Connect directly using environment variables from `strr-api/.env`:
    ```bash
    PGPASSWORD=<DATABASE_PASSWORD> psql -h <DATABASE_HOST> -p <DATABASE_PORT> -U <DATABASE_USERNAME> -d <DATABASE_NAME>
    ```
  - Or connect directly inside the running Docker container:
    ```bash
    docker exec -it <container_name_or_id> psql -U postgres -d postgres
    ```

## 📂 Repository Structure
- **`strr-api`**: Flask Python backend service managing applications, registrations, billing, and document attachments.
- **`strr-examiner-web`**: Nuxt 3 frontend application used by internal examiners to review STRR applications and manage registrations.
- **`strr-base-web`**: Shared Nuxt 3 components and composables used across frontends.
- **`strr-platform-web`**, **`strr-strata-web`**, **`strr-host-pm-web`**: Web portals for platforms, strata hotels, and host property managers.
