# Base image
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm -F @servy/db exec prisma generate
RUN pnpm -F @servy/db run build
RUN pnpm -F @servy/api build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/package.json .
COPY --from=builder /app/pnpm-lock.yaml .
COPY --from=builder /app/pnpm-workspace.yaml .
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/db ./packages/db

RUN pnpm install --prod --frozen-lockfile

EXPOSE 3000
CMD ["pnpm", "-F", "@servy/api", "start"]
