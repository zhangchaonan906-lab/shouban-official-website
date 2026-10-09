FROM node:24-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN test -n "$NEXT_PUBLIC_SITE_URL" \
  && npm run build \
  && printf '%s' "$NEXT_PUBLIC_SITE_URL" > .next/standalone/.build-site-origin

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/scripts/container-entrypoint.mjs ./scripts/container-entrypoint.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/privacy-release-check.mjs ./scripts/privacy-release-check.mjs
COPY --from=builder --chown=nextjs:nodejs /app/lib/privacy-readiness.mjs ./lib/privacy-readiness.mjs
COPY --from=builder --chown=nextjs:nodejs /app/lib/privacy-policy.mjs ./lib/privacy-policy.mjs

USER nextjs
EXPOSE 3000
ENTRYPOINT ["node", "./scripts/container-entrypoint.mjs"]
