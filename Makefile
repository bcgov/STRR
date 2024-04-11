.PHONY: docker
.PHONY: migrate

#################################################################################
# COMMANDS - CI                                                                 #
#################################################################################
docker: ## Run entire environment locally using docker-compose
	docker compose up --build

migrate: ## Update postgres db with migration changes
	cd str-api && dotenv -f .env.local run flask db upgrade
#################################################################################
# Self Documenting Commands                                                     #
#################################################################################
.PHONY: help

.DEFAULT_GOAL := help

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'