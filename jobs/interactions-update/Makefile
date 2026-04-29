# Get name from pyproject.toml
DOCKER_NAME := $(shell grep -m 1 '^name = ' pyproject.toml | cut -d '"' -f 2)
VCS_REF     := $(shell git rev-parse --short HEAD)
BUILD_DATE  := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

.PHONY: help install fmt lint test test-unit build benchmark clean

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
# 	poetry run flake8 .

test: ## Run full pytest suite (includes integration; needs Docker)
	poetry run pytest

test-unit: ## Run unit tests only (no Docker / integration / load / benchmark)
	poetry run pytest -m "not integration and not load and not benchmark"

benchmark: ## Run performance benchmarks comparing 1 vs 10 workers
	@echo "Running Sequential Benchmark (1 worker)..."
	MAX_WORKERS=1 poetry run pytest tests/load/test_job_benchmarks.py --benchmark-autosave --benchmark-group-by=group
	@echo "\nRunning Parallel Benchmark (10 workers)..."
	MAX_WORKERS=10 poetry run pytest tests/load/test_job_benchmarks.py --benchmark-compare --benchmark-group-by=group

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
