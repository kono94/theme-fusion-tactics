#!/bin/bash
# =============================================================================
# TFT Deploy Script
# =============================================================================
# Called by GitOps trigger after git checkout
# Requires: initial-setup.sh to have been run first (creates .env)
# =============================================================================

set -e

PROJECT_DIR="/opt/tft"
cd "$PROJECT_DIR"

echo "[$(date)] Deploying TFT..."

# Check if initialized
if [ ! -f ".env" ]; then
    echo "❌ Server not initialized! Run: sudo bash deployment/initial-setup.sh"
    exit 1
fi

if [ ! -f "deployment/nginx/prod.conf.template" ]; then
    echo "❌ nginx/prod.conf.template is missing."
    exit 1
fi

if ! grep -Eq '^DOMAIN=.+' .env; then
    echo "❌ DOMAIN is missing from .env."
    exit 1
fi

for required_key in GRAFANA_ROOT_URL GRAFANA_ADMIN_PASSWORD GRAFANA_SECRET_KEY; do
    if ! grep -Eq "^${required_key}=.+" .env; then
        echo "❌ ${required_key} is missing from .env. Add the 2.4.5 observability secrets before deploying."
        exit 1
    fi
done

DOMAIN=$(grep -m 1 '^DOMAIN=' .env | cut -d '=' -f 2-)
export DOMAIN
NGINX_CONFIG_TEMP=$(mktemp deployment/nginx/prod.conf.XXXXXX)
trap 'rm -f "$NGINX_CONFIG_TEMP"' EXIT
envsubst '${DOMAIN}' < deployment/nginx/prod.conf.template > "$NGINX_CONFIG_TEMP"
chmod 0644 "$NGINX_CONFIG_TEMP"
mv "$NGINX_CONFIG_TEMP" deployment/nginx/prod.conf
trap - EXIT

# Get git version info
GIT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "dev")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
MIMIR_CONFIG_SHA256=$(sha256sum deployment/observability/mimir/config.yaml | cut -d ' ' -f 1)
NGINX_CONFIG_SHA256=$(sha256sum deployment/nginx/prod.conf | cut -d ' ' -f 1)
export APP_GIT_TAG="$GIT_TAG"
export APP_GIT_COMMIT="$GIT_COMMIT"
export APP_BUILD_TIME="$BUILD_TIME"
export MIMIR_CONFIG_SHA256
export NGINX_CONFIG_SHA256
export SPRING_PROFILES_ACTIVE=prod

# Deploy with prod profile
echo "[$(date)] Building with version: $GIT_TAG ($GIT_COMMIT)"
docker compose --profile prod build \
  --build-arg APP_GIT_TAG="$GIT_TAG" \
  --build-arg APP_GIT_COMMIT="$GIT_COMMIT" \
  --build-arg APP_BUILD_TIME="$BUILD_TIME" \
  --build-arg VITE_GIT_TAG="$GIT_TAG" \
  --build-arg VITE_GIT_COMMIT="$GIT_COMMIT" \
  --build-arg VITE_BUILD_TIME="$BUILD_TIME"

docker compose --profile prod up -d

docker exec tft-nginx nginx -t
docker exec tft-nginx nginx -s reload

echo "[$(date)] ✅ Deployed to https://$DOMAIN"
