FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm -F @servy/landing build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/landing/next.config.js ./apps/landing/
COPY --from=builder /app/apps/landing/public ./apps/landing/public
COPY --from=builder /app/apps/landing/.next ./apps/landing/.next
COPY --from=builder /app/apps/landing/package.json ./apps/landing/

RUN pnpm install --prod --frozen-lockfile

EXPOSE 3000
CMD ["pnpm", "-F", "@servy/landing", "start"]
