.PHONY: lint
.PHONY: build
.PHONY: test
.PHONY: fmt
.PHONY: fmt-check
.PHONY: run
.PHONY: start-emulator
.PHONY: run-with-emulator

MKFILE_PATH:=$(abspath $(lastword $(MAKEFILE_LIST)))
CURRENT_ABS_DIR:=$(patsubst %/,%,$(dir $(MKFILE_PATH)))

PROJECT_NAME:=strr_email
DOCKER_NAME:=strr-email
PORT?=8081

#################################################################################
# COMMANDS -- Setup                                                             #
#################################################################################

#################################################################################
# COMMANDS - CI                                                                 #
#################################################################################
fmt: ## Format code with isort and black
	poetry run isort .
	poetry run black .

fmt-check: ## Check isort and black without changing files
	poetry run isort . --check
	poetry run black . --check

pylint: ## Linting with pylint
	poetry run pylint --rcfile=setup.cfg src/$(PROJECT_NAME)

flake8: ## Linting with flake8 ## tests
	poetry run flake8 src/$(PROJECT_NAME)

lint: fmt-check pylint flake8 ## isort/black check, pylint, and flake8

test: ## Unit testing
	poetry run pytest

build: ## Build the docker container
	@set -eu; build_context=$$(mktemp -d); \
	trap 'rm -rf "$$build_context"' EXIT; \
	python3 ../../scripts/prepare-python-build-context.py . "$$build_context"; \
	docker build "$$build_context" -t $(DOCKER_NAME) \
	    --platform linux/amd64 \
	    --build-arg VCS_REF=$(shell git rev-parse --short HEAD) \
	    --build-arg BUILD_DATE=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

build-nc: ## Build the docker container without caching
	@set -eu; build_context=$$(mktemp -d); \
	trap 'rm -rf "$$build_context"' EXIT; \
	python3 ../../scripts/prepare-python-build-context.py . "$$build_context"; \
	docker build --no-cache -t $(DOCKER_NAME) "$$build_context"

#################################################################################
# COMMANDS - Local                                                              #
#################################################################################

run: ## Start the email queue listener locally (PORT=8081)
	PORT=$(PORT) poetry run flask --app wsgi:app run --host 0.0.0.0 --port $(PORT) --no-reload

start-emulator: ## Start Pub/Sub emulator (port 8085) and configure topic & push subscription
	@if ! nc -z 127.0.0.1 8085 2>/dev/null; then \
		echo "Starting Pub/Sub emulator on port 8085..."; \
		gcloud beta emulators pubsub start --host-port=0.0.0.0:8085 & \
		while ! nc -z 127.0.0.1 8085 2>/dev/null; do sleep 0.5; done; \
	fi
	@curl -s -X PUT http://localhost:8085/v1/projects/local-dev/topics/strr-email-topic > /dev/null
	@curl -s -X PUT http://localhost:8085/v1/projects/local-dev/subscriptions/strr-email-sub \
		-H "Content-Type: application/json" \
		-d '{"topic":"projects/local-dev/topics/strr-email-topic","pushConfig":{"pushEndpoint":"http://127.0.0.1:$(PORT)/"}}' > /dev/null
	@echo "✅ Pub/Sub emulator ready (topic: strr-email-topic -> pushEndpoint: http://127.0.0.1:$(PORT)/)"

run-with-emulator: start-emulator run ## Start emulator, configure topic/sub, and run email listener

#################################################################################
# Self Documenting Commands                                                     #
#################################################################################
.PHONY: help

.DEFAULT_GOAL := help

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
