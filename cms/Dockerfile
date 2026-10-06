# Payload 3 (Next.js) production image.
# Deliberately NOT using Next.js `output: standalone`: keeping node_modules and the
# `payload` CLI in the image means migrations can be run with
#   docker run ... npx payload migrate
# which matters more than shaving 400 MB off an image on a box with 83 GB free.
#
# NOTE: `.npmrc` is copied because it carries `legacy-peer-deps=true`; the committed
# package-lock.json was resolved with that setting, so `npm ci` without it aborts on
# peer-dependency conflicts (ERESOLVE).
FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY --from=build /app /app
EXPOSE 3000
CMD ["npm", "run", "start"]
