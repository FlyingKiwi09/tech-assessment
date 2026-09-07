# Playwright runner for the QA homework.
#
# The official Playwright image ships the browsers; the test runner itself is a
# project dependency, so we bake `npm ci` into the image. That keeps `make test`
# offline and reproducible after the first build — the candidate never needs a
# local Node install.
#
# Rebuild after changing homework/starter-playwright/package.json:
#   docker compose build playwright
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /e2e

COPY homework/starter-playwright/package.json homework/starter-playwright/package-lock.json ./
RUN npm ci --no-audit --no-fund

# ENTRYPOINT, not CMD: `docker compose run --rm playwright --grep booking`
# appends its arguments here, which is how `make test ARGS=...` works.
ENTRYPOINT ["npx", "playwright", "test"]
