# syntax=docker/dockerfile:1
# API (NestJS). Kontekst: root repo. Opis: docs/architecture/infrastructure.md#kontenery
#   runtime – obraz usługi `api` (tylko zależności produkcyjne, użytkownik non-root)
#   tools   – migracje i seed (usługa `migrate`; CLI Prismy i tsx są w devDependencies)

FROM node:24-alpine AS base
# openssl: wykrywanie platformy przez silnik migracji Prismy.
RUN apk add --no-cache openssl && corepack enable
WORKDIR /repo

# --- build: pełna instalacja (postinstall generuje klienta Prismy) i `nest build` ---
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @klucznik/api
COPY apps/api apps/api
RUN pnpm --filter @klucznik/api build

# --- tools: migracje (`prisma migrate deploy`) i seed (`pnpm prisma:seed`) ---
FROM build AS tools
WORKDIR /repo/apps/api
CMD ["pnpm", "prisma:deploy"]

# --- prod-deps: same zależności produkcyjne API ---
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
# --ignore-scripts: `postinstall` (prisma generate) wymaga CLI z devDependencies; klient jest w dist.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm --filter @klucznik/api deploy --prod --legacy --ignore-scripts /prod/api

# --- runtime ---
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps --chown=node:node /prod/api/package.json ./
COPY --from=prod-deps --chown=node:node /prod/api/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
# Katalog zdjęć (wolumen `uploads`) zapisywalny dla użytkownika `node`.
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
    CMD wget -qO- http://localhost:3000/api/v1/health || exit 1
CMD ["node", "dist/main.js"]
