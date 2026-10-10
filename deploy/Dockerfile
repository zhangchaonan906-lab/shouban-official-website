FROM node:24-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS builder
WORKDIR /app
ARG NEXT_PUBLIC_SITE_URL
ARG BUILD_SHA=unknown
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN test -n "$NEXT_PUBLIC_SITE_URL"
RUN npm run build
RUN node scripts/deployment/write-built-site-origin.mjs "$NEXT_PUBLIC_SITE_URL" .next/standalone-site-origin.txt

FROM node:24-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NODE_OPTIONS=--max-old-space-size=1024
LABEL org.opencontainers.image.source="https://github.com/zhangchaonan906-lab/shouban-official-website"
ARG BUILD_SHA=unknown
LABEL org.opencontainers.image.revision=$BUILD_SHA

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone-site-origin.txt ./.next/standalone-site-origin.txt
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/scripts/privacy-release-check.mjs ./scripts/privacy-release-check.mjs
COPY --from=builder --chown=node:node /app/lib/privacy-readiness.mjs ./lib/privacy-readiness.mjs
COPY --from=builder --chown=node:node /app/lib/privacy-policy.mjs ./lib/privacy-policy.mjs
COPY --from=builder --chown=node:node /app/scripts/deployment ./scripts/deployment

RUN install -d -o node -g node /app/.next/cache
USER node:node
ENTRYPOINT ["node", "/app/scripts/deployment/start-standalone.mjs"]
