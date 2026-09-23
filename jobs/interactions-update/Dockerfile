FROM python:3.14-slim-bookworm AS builder_base

USER root

# Metadata labels
ARG VCS_REF="missing"
ARG BUILD_DATE="missing"
LABEL org.label-schema.vcs-ref=${VCS_REF} \
      org.label-schema.build-date=${BUILD_DATE} \
      maintainer="bcrds" \
      vendor="BCRDS"

ENV PYTHONFAULTHANDLER=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=100 \
    PIP_ROOT_USER_ACTION=ignore \
    # Poetry configuration:
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_CACHE_DIR='/var/cache/pypoetry' \
    POETRY_HOME='/usr/local'

SHELL ["/bin/bash", "-eo", "pipefail", "-c"]

# Install build dependencies
RUN apt-get update && apt-get upgrade -y \
    && apt-get install --no-install-recommends -y \
       curl \
       build-essential \
       libpq-dev \
    # Install latest Poetry
    && curl -sSL https://install.python-poetry.org | python3 - \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

WORKDIR /code

# Copy dependency files
COPY ./poetry.lock ./pyproject.toml /code/

# Install dependencies into .venv inside /code
RUN --mount=type=cache,target="$POETRY_CACHE_DIR" \
    poetry install --only main --no-root --no-interaction --no-ansi

# --- Final Runner Stage ---
FROM python:3.14-slim-bookworm AS runner

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH="/code/src" \
    PATH="/code/.venv/bin:$PATH" \
    UID=1000 \
    GID=1000

RUN apt-get update && apt-get install --no-install-recommends -y \
    libpq5 \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    bash \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

WORKDIR /code

# Create non-root user
RUN groupadd -g "${GID}" -r web \
    && useradd -d '/code' -g web -l -r -u "${UID}" web

# Copy virtual environment and app code from builder
COPY --from=builder_base --chown=web:web /code/.venv /code/.venv
COPY --chown=web:web . /code

USER web

CMD [ "python", "-m", "interactions_update" ]
