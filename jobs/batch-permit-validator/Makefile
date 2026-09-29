# Get name from pyproject.toml
DOCKER_NAME := $(shell grep -m 1 '^name = ' pyproject.toml | cut -d '"' -f 2)
VCS_REF     := $(shell git rev-parse --short HEAD)
BUILD_DATE  := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

.PHONY: help install fmt lint test build benchmark clean

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies using Poetry
	poetry install

fmt: ## Format code using black and isort
	poetry run isort .
	poetry run black .

lint: ## Check imports and formatting without making changes
	poetry run isort . --check -v
	poetry run black . --check
# 	poetry run flake8 .

test: ## Run pytest suite
	poetry run pytest

build: ## Build the multi-stage docker container
	@echo "Building Docker image: $(DOCKER_NAME)"
	docker build . -t $(DOCKER_NAME) \
		--platform linux/amd64 \
		--build-arg VCS_REF=$(VCS_REF) \
		--build-arg BUILD_DATE=$(BUILD_DATE)

clean: ## Remove build artifacts and pyc files
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache .venv .benchmarks
