.PHONY: help install up down test lint secure clean worker-install worker-run

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

install: ## Install dependencies
	pnpm install

up: ## Start development environment
	docker-compose up -d
	@echo "✅ Backend running at http://localhost:3001"
	@echo "✅ Worker running as docker service 'monorepo-worker'"
	@echo "✅ Frontend: Run 'pnpm --filter web dev' (will be at http://localhost:3000)"

down: ## Stop development environment
	docker-compose down

test: ## Run all tests
	pnpm run test

worker-install: ## Install Python worker in editable mode
	python -m pip install -e ./apps/workflow-runtime-python[dev]

worker-run: ## Run Python worker locally
	python -m worker.main

lint: ## Run linters
	pnpm run lint

secure: ## Run security checks
	@echo "Running secret scan..."
	docker run --rm -v "$(PWD):/src" trufflesecurity/trufflehog:latest filesystem /src
	@echo "Running dependency audit..."
	pnpm audit --audit-level=moderate

clean: ## Clean up
	docker-compose down -v
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	rm -rf apps/*/.next apps/*/dist
