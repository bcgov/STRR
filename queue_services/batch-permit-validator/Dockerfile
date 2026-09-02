FROM python:3.12.2-bullseye AS development_build

USER root

ARG VCS_REF="missing"
ARG BUILD_DATE="missing"

ENV VCS_REF=${VCS_REF}
ENV BUILD_DATE=${BUILD_DATE}
ENV PORT=8080

LABEL org.label-schema.vcs-ref=${VCS_REF} \
    org.label-schema.build-date=${BUILD_DATE}

LABEL vendor="BCROS"

ARG APP_ENV \
  # Needed for fixing permissions of files created by Docker:
  UID=1000 \
  GID=1000

ENV APP_ENV=${APP_ENV} \
  # python:
  PYTHONFAULTHANDLER=1 \
  PYTHONUNBUFFERED=1 \
  PYTHONHASHSEED=random \
  PYTHONDONTWRITEBYTECODE=1 \
  # pip:
  PIP_NO_CACHE_DIR=1 \
  PIP_DISABLE_PIP_VERSION_CHECK=1 \
  PIP_DEFAULT_TIMEOUT=100 \
  PIP_ROOT_USER_ACTION=ignore \
  # poetry:
  POETRY_VERSION=1.8.2 \
  POETRY_NO_INTERACTION=1 \
  POETRY_VIRTUALENVS_CREATE=false \
  POETRY_CACHE_DIR='/var/cache/pypoetry' \
  POETRY_HOME='/usr/local' \
  POETRY_INSTALLER_PARALLEL=false \
  POETRY_INSTALLER_MODERN-INSTALLATION=false

SHELL ["/bin/bash", "-eo", "pipefail", "-c"]

RUN apt-get update && apt-get upgrade -y \
  && apt-get install --no-install-recommends -y \
    bash \
    brotli \
    build-essential \
    curl \
    gettext \
    git \
    libpq-dev \
    wait-for-it \
  && curl --proto '=https' --proto-redir '=https' --tlsv1.2 -fsSLo /tmp/install-poetry.py \
    'https://raw.githubusercontent.com/python-poetry/install.python-poetry.org/d7fd0502ef807e711f65204b1ab39c1a1e23c69c/install-poetry.py' \
  && echo '75745ca71373a7b22fa150953543f03d826a52f8e4bc4350328a33bddd668026  /tmp/install-poetry.py' | sha256sum --check --status \
  && python /tmp/install-poetry.py --version ${POETRY_VERSION} \
  && rm /tmp/install-poetry.py \
  && poetry --version \
  # Cleaning cache:
  && apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false \
  && apt-get clean -y && rm -rf /var/lib/apt/lists/*

WORKDIR /code

RUN groupadd -g "${GID}" -r web \
  && useradd -d '/code' -g web -l -r -u "${UID}" web \
  && chown web:web -R '/code'

# Copy only requirements, to cache them in docker layer
COPY --chown=web:web ./poetry.lock ./pyproject.toml /code/

COPY --chown=web:web ./src /code/src
COPY --chown=web:web ./README.md /code

# Project initialization (runtime only: dev deps e.g. strr-test-utils use repo paths absent here):
RUN --mount=type=cache,target="$POETRY_CACHE_DIR" \
  echo "$APP_ENV" \
  && poetry version \
  && poetry run pip install -U pip \
  && poetry install --only main \
    --no-interaction --no-ansi

# Running as non-root user:
USER web

# The following stage is only for production:
FROM development_build AS production_build
COPY --chown=web:web . /code

# ENV PYTHONPATH=/opt/app-root/src

CMD gunicorn --bind 0.0.0.0:${PORT} --config /code/gunicorn_config.py wsgi:app
