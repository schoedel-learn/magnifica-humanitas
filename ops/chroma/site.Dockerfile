# Builds the Astro site and publishes it to Cloudflare Pages.
#
# One-shot container: no long-lived process, no exposed port. Invoked by
# ops/chroma/publish-worker.sh from cron on chroma-server (which has no Node on the host,
# so every build runs in a container).
FROM node:24-bookworm-slim
WORKDIR /app
ENV ASTRO_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .

# Media is bind-mounted read-only at /media by the worker and copied into the build so the
# published site is self-contained and never hotlinks the CMS host. The `|| true` matters:
# on a run with no media yet, `cp` exits non-zero and would otherwise fail the deploy.
#
# wrangler is pinned in package.json and installed by `npm ci`, so this does not reach the
# network to fetch a CLI at deploy time.
CMD ["sh", "-c", "mkdir -p public/media && cp -r /media/. public/media/ 2>/dev/null || true; npm run build && npx wrangler pages deploy dist --project-name=magnifica-humanitas --branch=main --commit-dirty=true"]
