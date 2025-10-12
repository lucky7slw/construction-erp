.PHONY: help setup start stop restart logs status build clean backup

help: ## Show this help message
	@echo "HHHomes ERP - Docker Commands"
	@echo "=============================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup: ## Run initial setup (first time only)
	@chmod +x setup.sh
	@./setup.sh

start: ## Start all services
	@echo "Starting all services..."
	@docker-compose up -d
	@echo "✓ Services started"
	@make status

stop: ## Stop all services
	@echo "Stopping all services..."
	@docker-compose down
	@echo "✓ Services stopped"

restart: ## Restart all services
	@echo "Restarting all services..."
	@docker-compose restart
	@echo "✓ Services restarted"

logs: ## View logs (Ctrl+C to exit)
	@docker-compose logs -f

logs-api: ## View API logs only
	@docker-compose logs -f api

logs-web: ## View Web logs only
	@docker-compose logs -f web

logs-db: ## View Database logs only
	@docker-compose logs -f postgres

status: ## Show status of all services
	@docker-compose ps

build: ## Rebuild all containers
	@echo "Rebuilding containers..."
	@docker-compose build
	@echo "✓ Build complete"

update: ## Pull latest code and rebuild
	@echo "Pulling latest code..."
	@git pull
	@echo "Rebuilding containers..."
	@docker-compose down
	@docker-compose build
	@docker-compose up -d
	@echo "✓ Update complete"

clean: ## Remove all containers and volumes (DANGER!)
	@echo "⚠️  This will delete all data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "✓ Cleaned"; \
	fi

backup: ## Backup database
	@mkdir -p backups
	@docker-compose exec -T postgres pg_dump -U erpuser erp_production > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✓ Backup created in backups/"

restore: ## Restore database from backup (specify FILE=backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make restore FILE=backups/backup_20231012.sql"; \
		exit 1; \
	fi
	@docker-compose exec -T postgres psql -U erpuser -d erp_production < $(FILE)
	@echo "✓ Database restored from $(FILE)"

shell-api: ## Open shell in API container
	@docker-compose exec api sh

shell-web: ## Open shell in Web container
	@docker-compose exec web sh

shell-db: ## Open PostgreSQL shell
	@docker-compose exec postgres psql -U erpuser -d erp_production

ssl-renew: ## Manually renew SSL certificates
	@docker-compose run --rm certbot renew
	@docker-compose restart nginx
	@echo "✓ SSL certificates renewed"

stats: ## Show resource usage
	@docker stats --no-stream

prune: ## Clean up unused Docker resources
	@docker system prune -f
	@echo "✓ Cleaned up unused resources"
