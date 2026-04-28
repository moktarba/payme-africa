.PHONY: help setup start stop restart logs test clean seed status

# ============================================================
# PayMe Africa - Makefile
# ============================================================

help: ## Afficher l'aide
	@echo ""
	@echo "  💚 PayMe Africa — Commandes disponibles"
	@echo "  ========================================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ============================================================
# SETUP
# ============================================================

setup: ## Installation complète du projet
	@echo "⚙️  Configuration du projet..."
	@cp -n .env.example .env 2>/dev/null || true
	@echo "✅ Fichier .env créé (vérifiez les variables)"
	@cd backend && npm install
	@echo "✅ Dépendances backend installées"
	@cd mobile && npm install
	@echo "✅ Dépendances mobile installées"
	@echo ""
	@echo "🚀 Prêt ! Lancez: make start"

setup-backend: ## Installer seulement le backend
	@cd backend && npm install

# ============================================================
# DOCKER / BACKEND
# ============================================================

start: ## Démarrer tous les services (Docker)
	@echo "🚀 Démarrage de PayMe Africa..."
	@docker compose up -d
	@echo ""
	@echo "  ✅ PostgreSQL  → localhost:5432"
	@echo "  ✅ Redis       → localhost:6379"
	@echo "  ✅ API Backend → http://localhost:4000"
	@echo ""
	@echo "  📱 Pour l'app mobile: make mobile"
	@echo "  🔍 Health:  curl http://localhost:4000/health"

start-dev: ## Démarrer DB + Redis en Docker, backend en local
	@echo "🚀 Démarrage DB + Redis..."
	@docker compose up -d postgres redis
	@sleep 2
	@echo "🚀 Démarrage backend en mode dev..."
	@cd backend && npm run dev

stop: ## Arrêter tous les services
	@docker compose down
	@echo "✅ Services arrêtés"

stop-clean: ## Arrêter et supprimer les volumes
	@docker compose down -v
	@echo "✅ Services arrêtés + données supprimées"

restart: ## Redémarrer les services
	@docker compose restart

logs: ## Voir les logs de tous les services
	@docker compose logs -f

logs-api: ## Logs du backend uniquement
	@docker compose logs -f backend

logs-db: ## Logs PostgreSQL
	@docker compose logs -f postgres

status: ## Statut des services
	@docker compose ps

# ============================================================
# MOBILE
# ============================================================

mobile: ## Démarrer l'application mobile Expo
	@echo "📱 Démarrage Expo..."
	@cd mobile && npx expo start

mobile-android: ## Démarrer sur Android
	@cd mobile && npx expo start --android

mobile-ios: ## Démarrer sur iOS
	@cd mobile && npx expo start --ios

mobile-web: ## Démarrer en mode web
	@cd mobile && npx expo start --web

# ============================================================
# BASE DE DONNÉES
# ============================================================

db-shell: ## Ouvrir un shell PostgreSQL
	@docker compose exec postgres psql -U payme -d payme_db

db-reset: ## Réinitialiser la base de données
	@echo "⚠️  Suppression et recréation de la base..."
	@docker compose down -v
	@docker compose up -d postgres redis
	@echo "✅ Base réinitialisée avec les données de seed"

seed: ## Injecter les données de test
	@docker compose exec postgres psql -U payme -d payme_db -f /docker-entrypoint-initdb.d/001_initial_schema.sql
	@echo "✅ Données de seed injectées"

# ============================================================
# TESTS
# ============================================================

test: ## Lancer tous les tests backend
	@echo "🧪 Lancement des tests..."
	@cd backend && npm test

test-watch: ## Tests en mode watch
	@cd backend && npm run test:watch

test-coverage: ## Tests avec couverture
	@cd backend && npm run test:coverage

# ============================================================
# QUALITÉ
# ============================================================

lint: ## Linter le code
	@cd backend && npm run lint
	@echo "✅ Lint OK"

# ============================================================
# UTILITAIRES
# ============================================================

health: ## Vérifier l'état de l'API
	@curl -s http://localhost:4000/health | python3 -m json.tool 2>/dev/null || \
		echo "❌ API non disponible"

test-register: ## Tester l'inscription (compte de démo)
	@curl -s -X POST http://localhost:4000/auth/register \
		-H "Content-Type: application/json" \
		-d '{"phone":"+221777777777","businessName":"Test Commerce","city":"Dakar","activityType":"boutique"}' \
		| python3 -m json.tool

test-otp: ## Demander un OTP (numéro de démo)
	@curl -s -X POST http://localhost:4000/auth/send-otp \
		-H "Content-Type: application/json" \
		-d '{"phone":"+221771234567"}' \
		| python3 -m json.tool

clean: ## Nettoyer les fichiers temporaires
	@find . -name "*.log" -delete
	@find . -name ".DS_Store" -delete
	@echo "✅ Nettoyage effectué"

# ── PRODUCTION ───────────────────────────────────────────────

prod-start: ## Démarrer en production
	@docker compose -f docker-compose.prod.yml up -d
	@echo "✅ Production démarrée"

prod-stop: ## Arrêter la production
	@docker compose -f docker-compose.prod.yml down

prod-logs: ## Logs production
	@docker compose -f docker-compose.prod.yml logs -f

prod-deploy: ## Déployer (pull + restart)
	@bash scripts/deploy.sh

backup: ## Lancer un backup manuel
	@docker compose -f docker-compose.prod.yml exec backup sh /backup.sh

ssl-init: ## Initialiser Let's Encrypt SSL
	@echo "⚠️  Remplacez DOMAIN par votre domaine"
	@docker run --rm \
		-v $(PWD)/nginx/certbot/conf:/etc/letsencrypt \
		-v $(PWD)/nginx/certbot/www:/var/www/certbot \
		certbot/certbot certonly --webroot \
		-w /var/www/certbot \
		-d api.paymeafrica.sn \
		--email contact@paymeafrica.sn \
		--agree-tos --no-eff-email

test-all: ## Tous les tests avec couverture
	@cd backend && NODE_ENV=test npm run test:coverage

test-employees: ## Tests employés uniquement
	@cd backend && NODE_ENV=test npx jest tests/employees.test.js --forceExit

test-notifications: ## Tests notifications uniquement
	@cd backend && NODE_ENV=test npx jest tests/notifications.test.js --forceExit

test-catalog: ## Tests catalogue uniquement
	@cd backend && NODE_ENV=test npx jest tests/catalog.test.js --forceExit
