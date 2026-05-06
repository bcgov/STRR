.PHONY: lint
.PHONY: build

MKFILE_PATH:=$(abspath $(lastword $(MAKEFILE_LIST)))
CURRENT_ABS_DIR:=$(patsubst %/,%,$(dir $(MKFILE_PATH)))

PROJECT_NAME:=strr_api
DOCKER_NAME:=strr-api

#################################################################################
# COMMANDS -- Setup                                                             #
#################################################################################

clean-pyc: ## Clean cache files
	find . -name '*.pyc' -exec rm -f {} +
	find . -name '*.pyo' -exec rm -f {} +
	find . -name '*~' -exec rm -f {} +
	find . -name '__pycache__' -exec rm -fr {} +

#################################################################################
# COMMANDS - CI                                                                 #
#################################################################################
pisort:
	poetry run isort . --check -v

pblack:
	poetry run black . --check

pylint: ## Linting with pylint
	pylint --rcfile=setup.cfg src/$(PROJECT_NAME)

flake8: ## Linting with flake8 ## tests
	flake8 src/$(PROJECT_NAME)

lint: fmt-check pylint flake8 ## run all lint type scripts

fmt: ## Format code with isort and black
	poetry run isort .
	poetry run black .

fmt-check: ## Check isort and black without changing files
	poetry run isort . --check
	poetry run black . --check

test: ## Run full test suite (same as ``pytest`` / CI default)
	poetry run pytest

test-unit: ## Run unit tests only (``tests/unit``; no coverage gate)
	poetry run pytest tests/unit

test-integration: ## Run integration tests only (``tests/integration``; no coverage)
	poetry run pytest tests/integration --no-cov

build: ## Build the docker container
	docker build . -t $(DOCKER_NAME) \
	    --platform linux/amd64 \
	    --build-arg VCS_REF=$(shell git rev-parse --short HEAD) \
	    --build-arg BUILD_DATE=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

build-nc: ## Build the docker container without caching
	docker build --no-cache -t $(DOCKER_NAME) .

#################################################################################
# COMMANDS - Local                                                              #
#################################################################################

#################################################################################
# Self Documenting Commands                                                     #
#################################################################################
.PHONY: help

.DEFAULT_GOAL := help

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
