# Package / image name matches pyproject.toml [tool.poetry] name
DOCKER_NAME := $(shell grep -m 1 '^name = ' pyproject.toml | cut -d '"' -f 2)
VCS_REF     := $(shell git rev-parse --short HEAD)
BUILD_DATE  := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

PROJECT_NAME := strr_pay

.PHONY: help install fmt fmt-check lint pylint flake8 test test-unit test-integration build build-nc clean

.DEFAULT_GOAL := help

help: ## Show this help message
	@grep -E '^[a-zA-Z][a-zA-Z0-9_-]*:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies using Poetry
	poetry install

fmt: ## Format code using isort and black
	poetry run isort .
	poetry run black .

lint: ## Run import/format checks, flake8, and pylint
	@$(MAKE) fmt-check
	@$(MAKE) flake8
	@$(MAKE) pylint

fmt-check: ## Check isort and black without changing files
	poetry run isort . --check -v
	poetry run black . --check

flake8: ## Lint with flake8
	poetry run flake8 src/$(PROJECT_NAME) tests

pylint: ## Lint with pylint
	poetry run pylint src/$(PROJECT_NAME)

test: ## Run the full pytest suite (includes integration if Docker / DB are available)
	poetry run pytest

test-unit: ## Run unit tests only (excludes @pytest.mark.integration)
	poetry run pytest tests/ -m "not integration"

test-integration: ## Run integration tests only (@pytest.mark.integration; needs Docker Postgres)
	poetry run pytest -m integration
