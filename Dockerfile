# syntax=docker/dockerfile:1
FROM node:22-alpine AS base

# Dependências do sistema para compatibilidade nativa no Alpine (Prisma, Sharp, etc.)
RUN apk add --no-cache libc6-compat

# -----------------------------
# Dependências
# -----------------------------
FROM base AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Cache do npm entre deploys (BuildKit). Sem BuildKit no builder, remova o --mount.
RUN --mount=type=cache,target=/root/.npm npm ci --prefer-offline --no-audit --no-fund


# -----------------------------
# Build
# -----------------------------
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# O typecheck roda localmente antes do push (npm run typecheck); aqui o build não gasta tempo com ele.
ENV SKIP_TYPECHECK=1
# Servidor de build de 4 GB: limita o heap do Node para não entrar em swap.
ENV NODE_OPTIONS=--max-old-space-size=3072

# Turbopack (next build --turbopack): sem cache persistente no build, então não há .next/cache para reaproveitar.
RUN npx prisma generate && npm run build


# -----------------------------
# Produção
# -----------------------------
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV STORAGE_DIR=/app/uploads

# pg_dump (Admin > Banco de Dados > Backup e Migração): dump completo estrutura + dados em SQL
RUN apk add --no-cache postgresql-client

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Criação das pastas de persistência de uploads e permissões para o usuário nextjs
RUN mkdir -p /app/uploads /app/public/generated-images \
    && chown -R nextjs:nodejs /app/uploads /app/public \
    && chmod -R 775 /app/uploads

# Copiar arquivos públicos e build estático
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# prisma/schema.sql: usado por "Criar tabelas no banco novo" (Admin > Banco de Dados)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Garantir permissão de escrita pós-cópia para o usuário da aplicação
RUN chown -R nextjs:nodejs /app/uploads /app/public/generated-images \
    && chmod -R 775 /app/uploads /app/public/generated-images

# Ponto de montagem persistente para Docker / Easypanel
VOLUME ["/app/uploads"]

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
