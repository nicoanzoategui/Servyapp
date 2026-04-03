FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apt-get update -y && apt-get install -y openssl

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @servy/db exec prisma generate
RUN pnpm -F @servy/db run build
RUN pnpm -F @servy/api build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app .
RUN pnpm install --prod --frozen-lockfile

EXPOSE 3000
CMD ["pnpm", "-F", "@servy/api", "start"]
