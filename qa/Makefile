SEED      ?= 1000
FRAMEWORK ?=
URL       := http://localhost:4173/index.html?seed=$(SEED)

# Which scaffolds exist in this copy of the bundle?
HAS_CYPRESS    := $(wildcard homework/starter-cypress)
HAS_PLAYWRIGHT := $(wildcard homework/starter-playwright)

# Resolve FRAMEWORK: an explicit value wins; otherwise, if only one scaffold is
# present, use it; if both are, refuse to guess (see framework-check).
ifeq ($(strip $(FRAMEWORK)),)
  ifeq ($(and $(HAS_CYPRESS),$(HAS_PLAYWRIGHT)),)
    RUNNER := $(if $(HAS_CYPRESS),cypress,$(if $(HAS_PLAYWRIGHT),playwright,))
  else
    RUNNER :=
  endif
else
  RUNNER := $(strip $(FRAMEWORK))
endif

.DEFAULT_GOAL := help
.PHONY: help start stop restart logs test test.cypress test.playwright test.open shell clean seed-check framework-check bundle

help: ## Show this help
	@echo ""
	@echo "AceUp QA homework — Docker is the only prerequisite."
	@echo ""
	@grep -E '^[a-z.]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Your seed:      $(SEED)   (override with: make start SEED=1234)"
	@echo "Your framework: $(if $(RUNNER),$(RUNNER),<unset — pass FRAMEWORK=cypress or FRAMEWORK=playwright>)"
	@echo ""

seed-check:
	@if [ "$(SEED)" = "1000" ]; then \
	  printf '\n  ------------------------------------------------------------------\n'; \
	  printf '   !!  You are on the DEFAULT seed (1000).\n'; \
	  printf '\n'; \
	  printf '       Your assignment gives you a build seed. Use it:\n'; \
	  printf '         make start SEED=<your seed>\n'; \
	  printf '\n'; \
	  printf '       If you were not given one, ask us before you start —\n'; \
	  printf '       the default is not the build we grade.\n'; \
	  printf '  ------------------------------------------------------------------\n\n'; \
	fi

framework-check:
	@case "$(RUNNER)" in \
	  cypress|playwright) ;; \
	  "") printf '\n  ------------------------------------------------------------------\n'; \
	      printf '   !!  Both scaffolds are present, so we will not guess which\n'; \
	      printf '       suite to run. Say which framework you used:\n'; \
	      printf '\n'; \
	      printf '         make test FRAMEWORK=cypress    SEED=$(SEED)\n'; \
	      printf '         make test FRAMEWORK=playwright SEED=$(SEED)\n'; \
	      printf '\n'; \
	      printf '       Put the command you chose in your README — it is the\n'; \
	      printf '       one we will run.\n'; \
	      printf '  ------------------------------------------------------------------\n\n'; \
	      exit 1 ;; \
	  *)  printf '\nerror: FRAMEWORK must be cypress or playwright (got "%s")\n\n' "$(RUNNER)"; exit 1 ;; \
	esac

start: seed-check ## Start the app at http://localhost:4173
	@docker compose up -d app
	@echo ""
	@echo "App is running:  $(URL)"
	@echo "Stop it with:    make stop"
	@echo ""

stop: ## Stop the app
	@docker compose down

restart: stop start ## Restart the app

logs: ## Tail the web server logs
	@docker compose logs -f app

test: seed-check framework-check ## Run your suite headlessly in Docker (FRAMEWORK=cypress|playwright)
	@SEED=$(SEED) docker compose run --rm $(RUNNER) $(ARGS)

test.cypress: seed-check ## Run the Cypress suite headlessly in Docker
	@SEED=$(SEED) docker compose run --rm cypress $(ARGS)

test.playwright: seed-check ## Run the Playwright suite headlessly in Docker
	@SEED=$(SEED) docker compose run --rm playwright $(ARGS)

test.open: framework-check ## Run your suite interactively (needs Node 20+ locally, one-time install)
	@echo "Docker cannot open a GUI, so this one runs natively."
	@if [ "$(RUNNER)" = "cypress" ]; then \
	  cd homework/starter-cypress && npm install && SEED=$(SEED) npx cypress open; \
	else \
	  cd homework/starter-playwright && npm install && npx playwright install chromium && SEED=$(SEED) npx playwright test --ui; \
	fi

shell: framework-check ## Open a shell in your test runner container
	@docker compose run --rm --entrypoint sh $(RUNNER)

clean: ## Stop everything and remove test artefacts
	@docker compose down -v --remove-orphans
	@rm -rf homework/starter-cypress/cypress/screenshots homework/starter-cypress/cypress/videos
	@rm -rf homework/starter-playwright/test-results homework/starter-playwright/playwright-report \
	        homework/starter-playwright/blob-report homework/starter-playwright/.last-run.json

# --- internal (not shipped to candidates) -----------------------------------

bundle: ## Build one candidate's zip: make bundle SEED=2417 CANDIDATE=name [FRAMEWORK=both]
	@SEED="$(SEED)" CANDIDATE="$(CANDIDATE)" FRAMEWORK="$(FRAMEWORK)" tools/bundle.sh
