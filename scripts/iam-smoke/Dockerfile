FROM python:3.12-slim-bookworm@sha256:392307d22300de8b5986851a12d9176dfc0fc073e65bf6523ebd7dcbeb23564e

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_INSTALLER_ONLY_BINARY=:all:

RUN python -m pip install --no-cache-dir --only-binary=:all: poetry==2.3.2

WORKDIR /strr/shared/python/cloud-sql-connector
COPY shared/python/cloud-sql-connector/pyproject.toml \
    shared/python/cloud-sql-connector/poetry.lock \
    shared/python/cloud-sql-connector/README.md \
    shared/python/cloud-sql-connector/LICENSE \
    shared/python/cloud-sql-connector/LICENSE-APACHE ./
COPY shared/python/cloud-sql-connector/src ./src
RUN poetry install --only main --no-ansi

COPY scripts/verify-cloud-sql-iam.py /strr/scripts/verify-cloud-sql-iam.py
WORKDIR /strr
USER 65532:65532

ENTRYPOINT ["python", "/strr/scripts/verify-cloud-sql-iam.py"]
CMD ["--require-writes"]
