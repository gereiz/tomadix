# Manual Operacional de Produção e Deploy (Production Runbook)
## Tomadix

Este documento estabelece as diretrizes técnicas e operacionais para publicação, manutenção e confiabilidade do SaaS Tomadix em ambiente de produção.

---

## 1. Arquitetura de Hospedagem Recomendada

### Camada Web / Frontend & API (Next.js)
- **Provedor Principal:** Vercel (Next.js Edge / Serverless Runtime) ou Container Docker em Google Cloud Run / AWS ECS.
- **Configuração de Runtime:** Rotas de geração de prompts via Gemini API utilizam Node.js Runtime com `maxDuration = 60s` para acomodar tempos de inferência de roteiros complexos.
- **HTTPS e Domínio:** Terminação TLS 1.3 obrigatória, com certificados gerenciados automaticamente (Let's Encrypt / Vercel SSL) e cabeçalho HSTS ativo (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`).

### Camada de Banco de Dados (Supabase PostgreSQL)
- **Pooling (Porta 6543):** Utilizado para todas as queries de execução do Next.js via PgBouncer em modo `Transaction`. Limite de conexões parametrizado para `connection_limit=10` por instância.
- **Conexão Direta (Porta 5432):** Exclusiva para execução de migrações (`prisma migrate deploy`) em modo `Session`.

---

## 2. Processo de Build e Migrações

### Pipeline de CI/CD (GitHub Actions / GitLab CI)

1. **Lint e Tipagem:**
   ```bash
   npm run lint
   npm run typecheck
   ```
2. **Execução de Testes Automatizados:**
   ```bash
   npm run test
   ```
3. **Migrações de Banco de Dados:**
   - **REGRA CRÍTICA:** NUNCA execute `prisma migrate reset` ou comandos destrutivos no pipeline de produção.
   - Aplicação exclusiva via:
     ```bash
     npx prisma migrate deploy
     ```
   - **Atenção:** a pasta de migrations não cobre todas as tabelas do schema (41 vieram de `prisma db push`); num banco vazio use o `prisma/schema.sql` (Admin > Banco de Dados > "Criar tabelas no banco novo", ou `psql -f prisma/schema.sql`).
   - O comando `migrate deploy` aplica apenas migrações pendentes sem alterar dados existentes.
4. **Compilação da Aplicação:**
   ```bash
   npm run build
   ```

---

## 3. Segurança em Produção

### Rate Limiting e Prevenção contra Abusos
- **Autenticação (`/api/auth/login`, `/api/auth/register`):** Máximo de 10 tentativas por minuto por endereço IP. Excedido o limite, a API retorna `HTTP 429 Too Many Requests` com cabeçalho `Retry-After`.
- **Geração de Prompts (`/api/prompt-engine/generate`):** 30 requisições por minuto por workspace.
- **Cabeçalhos de Segurança HTTP:**
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Webhooks de Pagamento e Idempotência
- Validação criptográfica de assinatura via HMAC-SHA256 (`Stripe-Signature` ou token do Mercado Pago).
- Tabela `ProcessedWebhookEvent` garante que eventos duplicados sejam rejeitados sem duplicar concessão de créditos ou transições de plano.

---

## 4. Observabilidade e Monitoramento

### Health Check de Produção
- Endpoint: `GET /api/health`
- Checagem ativa de conectividade com o banco de dados (`SELECT 1`), tempo de latência em milissegundos e status da chave da Gemini API.
- Monitoramento externo (BetterStack, UptimeRobot ou Datadog) configurado com verificação a cada 60 segundos.

### Logs Estruturados e Correlação
- Toda requisição recebe um identificador único `X-Correlation-ID`.
- Logs são gerados em formato JSON estruturado contendo:
  - `timestamp`, `level`, `message`, `correlationId`, `context`.
  - Higienização automática: senhas, hashes, tokens, cookies e chaves de API são automaticamente mascarados como `[REDACTED]`.

### Alertas Operacionais
1. **Jobs de Geração Travados:** Alerta quando houver jobs em `PENDING` ou `RUNNING` há mais de 15 minutos (acessível no console `/admin/usage`).
2. **Falhas Recorrentes de Pagamento:** Alerta em faturas com status `payment_failed` para acompanhamento do time de suporte.
3. **Esgotamento de Quota Gemini API:** Monitoramento de respostas com código 429 da Google Cloud.

---

## 5. Rotinas de Manutenção Periódica

| Frequência | Ação de Manutenção |
| :--- | :--- |
| **A cada 24h** | Varredura e expiração de convites de equipe (`expiresAt < NOW()`). |
| **A cada 24h** | Remoção de sessões de usuário expiradas (`expiresAt < NOW()`). |
| **Semanal** | Análise de faturas não pagas (`PAST_DUE`) com disparo de notificação. |
| **Mensal** | Revisão de logs de auditoria e métricas de conversão e churn. |

---

## Build do Docker/Easypanel mais rápido

Medido em uma máquina de desenvolvimento, a frio:

| Build | Tempo |
|---|---|
| webpack + checagem de tipos (antes) | 251 s |
| Turbopack + checagem de tipos | 153 s |
| Turbopack sem checagem de tipos (o que o Docker faz) | 119 s |

O que foi feito: `npm run build` usa `next build --turbopack` (`build:webpack` volta ao webpack se algo quebrar); `serverExternalPackages` deixa `imapflow`, `mailparser`, `nodemailer`, `@google/genai` e `bcryptjs` fora do bundle; `typescript.ignoreBuildErrors` só com `SKIP_TYPECHECK=1` (definido no `Dockerfile`; o build local continua checando tipos); `.dockerignore` (sem `node_modules`, `tests`, `docs`, etc.); Tailwind varre só `src/`; `NODE_OPTIONS=--max-old-space-size=3072` para servidor de 4 GB; cache do npm com BuildKit (`# syntax=docker/dockerfile:1`).

Observações:
- O cache do Next (`.next/cache`) **não ajuda** com Turbopack nesta versão (15.5): o segundo build leva o mesmo tempo. Por isso o Dockerfile não monta esse cache.
- Se o Easypanel não usar BuildKit, o `RUN --mount` do `npm ci` falha com erro de sintaxe: remova o `--mount` (o build fica correto, só mais lento).
- O Tailwind deixou de gerar cerca de 240 classes que só existiam em arquivos fora de `src/` (docs, testes, HTML de referência); nenhuma é usada pelos componentes.
- Se o build continuar lento no servidor, o gargalo é CPU/RAM: aumente a RAM ou crie swap só para o build.
