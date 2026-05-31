# =============================================================================
# CloudLab Platform — Makefile
# =============================================================================

.PHONY: help setup dev stop logs migrate seed test lint build push

DOCKER_COMPOSE = docker-compose
BACKEND = $(DOCKER_COMPOSE) exec backend
DC_FILE = docker-compose.yml

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Local Dev ─────────────────────────────────────────────────────────────────

setup: ## One-time local setup: copy .env, build images, run migrations, seed data
	@cp -n .env.example .env || true
	$(DOCKER_COMPOSE) build
	$(DOCKER_COMPOSE) up -d postgres redis
	@sleep 5
	$(MAKE) migrate
	$(MAKE) seed
	@echo "\n✅  Setup complete! Run 'make dev' to start."

dev: ## Start the full local dev stack
	$(DOCKER_COMPOSE) up

dev-bg: ## Start the full local dev stack in background
	$(DOCKER_COMPOSE) up -d

stop: ## Stop all services
	$(DOCKER_COMPOSE) down

clean: ## Stop all services and remove volumes (WARNING: deletes DB data)
	$(DOCKER_COMPOSE) down -v --remove-orphans

logs: ## Tail logs for all services
	$(DOCKER_COMPOSE) logs -f

logs-backend: ## Tail backend logs
	$(DOCKER_COMPOSE) logs -f backend

logs-celery: ## Tail celery logs
	$(DOCKER_COMPOSE) logs -f celery

# ── Django ────────────────────────────────────────────────────────────────────

migrate: ## Run Django migrations
	$(BACKEND) python manage.py migrate

makemigrations: ## Create Django migrations
	$(BACKEND) python manage.py makemigrations

seed: ## Seed the database with sample lab data
	$(BACKEND) python manage.py seed_labs

createsuperuser: ## Create a Django admin superuser
	$(BACKEND) python manage.py createsuperuser

shell: ## Open a Django shell
	$(BACKEND) python manage.py shell_plus

collectstatic: ## Collect static files
	$(BACKEND) python manage.py collectstatic --noinput

# ── Testing ───────────────────────────────────────────────────────────────────

test: ## Run backend tests with coverage
	$(BACKEND) pytest --cov=. --cov-report=term-missing -v

test-frontend: ## Run frontend tests
	$(DOCKER_COMPOSE) exec frontend npm run test

lint: ## Run backend linters (flake8 + black check)
	$(BACKEND) flake8 .
	$(BACKEND) black --check .

lint-frontend: ## Run frontend linters (ESLint + Prettier)
	$(DOCKER_COMPOSE) exec frontend npm run lint

format: ## Auto-format backend code
	$(BACKEND) black .
	$(BACKEND) isort .

# ── Build & Deploy ────────────────────────────────────────────────────────────

build: ## Build Docker images
	$(DOCKER_COMPOSE) build

build-prod: ## Build production Docker images
	docker build -f infrastructure/docker/backend/Dockerfile.prod -t cloudlab-backend:latest ./backend
	docker build -f infrastructure/docker/frontend/Dockerfile.prod -t cloudlab-frontend:latest ./frontend

# ── Kubernetes ────────────────────────────────────────────────────────────────

k8s-apply-dev: ## Apply K8s manifests for dev environment
	kubectl apply -k infrastructure/kubernetes/overlays/dev/

k8s-apply-prod: ## Apply K8s manifests for production
	kubectl apply -k infrastructure/kubernetes/overlays/prod/

helm-install-dev: ## Install/upgrade Helm chart for dev
	helm upgrade --install cloudlab infrastructure/helm/cloudlab/ \
		-f infrastructure/helm/cloudlab/values.dev.yaml \
		--namespace cloudlab --create-namespace

helm-install-prod: ## Install/upgrade Helm chart for production
	helm upgrade --install cloudlab infrastructure/helm/cloudlab/ \
		-f infrastructure/helm/cloudlab/values.prod.yaml \
		--namespace cloudlab --create-namespace

# ── Utilities ─────────────────────────────────────────────────────────────────

psql: ## Open a PostgreSQL shell
	$(DOCKER_COMPOSE) exec postgres psql -U cloudlab -d cloudlab

redis-cli: ## Open a Redis CLI
	$(DOCKER_COMPOSE) exec redis redis-cli

cleanup-sessions: ## Run the cleanup expired sessions management command
	$(BACKEND) python manage.py cleanup_sessions
