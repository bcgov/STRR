# Using Python 3.14 (Bookworm is the 2026 stable Debian base)
FROM python:3.14-bookworm

USER root

# Build Metadata
ARG VCS_REF="missing"
ARG BUILD_DATE="missing"
ENV VCS_REF=${VCS_REF} \
    BUILD_DATE=${BUILD_DATE} \
    PORT=8080 \
    # Python & Pip configurations
    PYTHONFAULTHANDLER=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_ROOT_USER_ACTION=ignore \
    # Poetry 2.x configurations
    POETRY_VERSION=2.3.2 \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_CACHE_DIR='/var/cache/pypoetry' \
    POETRY_HOME='/usr/local'

LABEL org.label-schema.vcs-ref=${VCS_REF} \
      org.label-schema.build-date=${BUILD_DATE} \
      maintainer="bcros" \
      vendor="BCROS"

SHELL ["/bin/bash", "-eo", "pipefail", "-c"]

# Install system dependencies and latest Poetry
RUN apt-get update && apt-get upgrade -y \
    && apt-get install --no-install-recommends -y \
       bash brotli build-essential curl gettext git libpq-dev wait-for-it \
    && curl -sSL https://install.python-poetry.org | python3 - --version ${POETRY_VERSION} \
    && apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

WORKDIR /code

# Create non-root user
RUN groupadd -g 1000 -r web \
    && useradd -d '/code' -g web -l -r -u 1000 web \
    && chown web:web -R '/code'

# Copy dependency files first for layer caching
COPY --chown=web:web ./poetry.lock ./pyproject.toml /code/

# Install production dependencies only
# In Poetry 2.x, '--only main' remains the standard for production
RUN --mount=type=cache,target="$POETRY_CACHE_DIR" \
    poetry config virtualenvs.create false \
    && poetry install --only main --no-interaction --no-ansi --no-root

# Copy project source
COPY --chown=web:web . /code
RUN poetry install --only main

# Switch to non-root user
USER web

CMD [ "python", "-m", "auto_approval" ]
