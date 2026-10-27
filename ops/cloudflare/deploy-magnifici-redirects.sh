#!/usr/bin/env zsh
# Deploy the magnifici-redirects Pages project (301s for the 2026-10-27 cutover).
#
#   CLOUDFLARE_API_TOKEN=<open token> ops/cloudflare/deploy-magnifici-redirects.sh
#
# The token is the account-level "open token" (Pages/Workers/DNS) from
# 80 System/Secrets.md — it is NOT stored in this repo. First run needs
# `project create`; later runs redeploy the worker only.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT="magnifici-redirects"

create() {
  npx --yes wrangler pages project create "$PROJECT" --production-branch=main
}

# Existing project: deploy skips the create. Wrangler 4.x refuses to deploy without one.
npx --yes wrangler pages project list >/dev/null 2>&1 || true

npx --yes wrangler pages deploy "$DIR" --project-name="$PROJECT" \
  --commit-dirty=true --branch=main

echo "deployed. Verify:"
echo "  curl -s -o /dev/null -w '%{http_code} %{redirect_url}\\n' 'https://magnifica.agentesfidei.org/posts/agentes-veritatis/?x=1'"
echo "  curl -s -o /dev/null -w '%{http_code} %{redirect_url}\\n' 'https://agentesfidei.org/'"