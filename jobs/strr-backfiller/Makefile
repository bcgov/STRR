# Get name from pyproject.toml
DOCKER_NAME := $(shell grep -m 1 '^name = ' pyproject.toml | cut -d '"' -f 2)
VCS_REF     := $(shell git rev-parse --short HEAD)
BUILD_DATE  := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

.PHONY: help install fmt lint test test-unit build clean run

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies (Poetry, incl. dev & test groups)
	poetry install --with dev,test

fmt: ## Format code using black and isort
	poetry run isort .
	poetry run black .

lint: ## Check imports and formatting without making changes
	poetry run isort . --check -v
	poetry run black . --check

test: ## Run full pytest suite (includes integration tests; needs Docker)
	PYTHONPATH=src:../../strr-api/src poetry run pytest

test-unit: ## Run unit tests only (no Docker / Testcontainers)
	PYTHONPATH=src:../../strr-api/src poetry run pytest -m "not integration"

run: ## Run the backfiller job locally
	@if [ ! -f .env ]; then \
		echo "Notice: .env file not found, using default local environment variables..."; \
		DATABASE_USERNAME=$${DATABASE_USERNAME:-postgres} \
		DATABASE_PASSWORD=$${DATABASE_PASSWORD:-postgres} \
		DATABASE_NAME=$${DATABASE_NAME:-postgres} \
		DATABASE_HOST=$${DATABASE_HOST:-localhost} \
		DATABASE_PORT=$${DATABASE_PORT:-5432} \
		FLASK_ENV=$${FLASK_ENV:-development} \
		BACKFILL_INTERACTION_RECIPIENTS=$${BACKFILL_INTERACTION_RECIPIENTS:-true} \
		PYTHONPATH=src:../../strr-api/src poetry run python -m backfiller; \
	else \
		PYTHONPATH=src:../../strr-api/src poetry run python -m backfiller; \
	fi

build: ## Build the docker container
	@echo "Building Docker image: $(DOCKER_NAME)"
	docker build . -t $(DOCKER_NAME) \
		--platform linux/amd64 \
		--build-arg VCS_REF=$(VCS_REF) \
		--build-arg BUILD_DATE=$(BUILD_DATE)

clean: ## Remove build artifacts and pyc files
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache htmlcov .coverage coverage.xml
