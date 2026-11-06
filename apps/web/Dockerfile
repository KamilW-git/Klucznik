# syntax=docker/dockerfile:1
# Web (React + Vite) serwowany przez nginx. Kontekst: root repo.
# Opis: docs/architecture/infrastructure.md#kontenery

FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/api-client/package.json packages/api-client/
# `@klucznik/web...`: web i pakiety workspace, od których zależy (api-client).
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @klucznik/web...
COPY packages/api-client packages/api-client
COPY apps/web apps/web
# Ścieżka API wkompilowana w bundle; nginx przekazuje ją do usługi `api` (ten sam origin).
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm --filter @klucznik/web build

FROM nginx:1.29-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
    CMD wget -qO- http://localhost/ > /dev/null || exit 1
