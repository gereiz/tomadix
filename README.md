# Tomadix

> Plataforma inteligente de criação e organização de prompts para produção audiovisual com IA.  
> *Da ideia à cena.*

## Requisitos

- Node.js 20.9+
- PostgreSQL (ou projeto Supabase)
- Chave da Gemini API para habilitar geração real

## Instalação

```bash
npm install
cp .env.example .env
```

Preencha `DATABASE_URL`, `DIRECT_URL` e `GEMINI_API_KEY`.

Gere o cliente Prisma e aplique a migração inicial:

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Abra `http://localhost:3000`. O endpoint `http://localhost:3000/api/health` verifica a aplicação.

## Documentação e Módulos Implementados

A documentação detalhada da plataforma está organizada em ordem sequencial e numerada na pasta [`docs/`](docs/README.md).

Consulte o [Índice Geral de Documentação](docs/README.md) ou acesse diretamente cada módulo:

1. **[01. Autenticação, Multiusuário e Segurança](docs/01-autenticacao-e-seguranca.md)**
   - Cookies HttpOnly seguros, tokens SHA-256, RBAC de workspace (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`), rate limiting e trilhas de auditoria.
2. **[02. Sistema de Parâmetros Dinâmicos](docs/02-parametros-dinamicos.md)**
   - 10 tipos de dados, 5 escopos contextuais, resolução hierárquica determinística e live preview em tempo real.
3. **[03. Projetos, Bíblia Visual, Personagens e Ambientes](docs/03-projetos-personagens-ambientes.md)**
   - Modelos de projetos cinematográficos, biblioteca de identidade visual e prevenção de deriva estética (*visual drift*).
4. **[04. Cenas, Decupagem Técnica e Continuidade](docs/04-cenas-continuidade-decupagem.md)**
   - Estruturação de tomadas, decupagem de câmera/iluminação, reordenação atômica e motor de análise de continuidade (`ContinuityService`).
5. **[05. Motor de Prompts e Integração Gemini AI](docs/05-motor-prompts-ia-gemini.md)**
   - 7 templates cinematográficos versionados, integração com `@google/genai` (Gemini 3.8 Flash), fila de jobs assíncronos e estorno de créditos.
6. **[06. Workspaces, Equipes e Colaboração](docs/06-workspaces-equipes-colaboracao.md)**
   - Arquitetura multi-tenant completa, workspaces pessoais vs. time, convites criptográficos e transferência de propriedade.
7. **[07. Onboarding SaaS, Dashboard e Gestão da Conta](docs/07-onboarding-dashboard-saas.md)**
   - Fluxo interativo de boas-vindas em 7 etapas, dashboard de métricas em tempo real, gestão de perfil e revogação de sessões ativas.
8. **[08. Painel Administrativo da Plataforma e Usuários](docs/08-painel-administrativo-usuarios.md)**
   - Gestão global do SaaS (`PlatformRole`), pesquisa avançada, suspensão/reativação imediata e ajuste manual de créditos com justificativa auditável.
9. **[09. Segurança para Produção, LGPD e Privacidade](docs/09-seguranca-producao-lgpd-privacidade.md)**
   - Conformidade técnica com a LGPD (Lei 13.709/2018), canais DSR para exportação e anonimização de dados, gestão de consentimentos e hardening RLS.
10. **[10. Central Comercial, Planos e Políticas Declarativas](docs/10-central-comercial-planos-politicas.md)**
    - Catálogo de planos com versionamento, políticas de créditos com expiração/grace period, snapshots imutáveis e proteção contratual (*grandfathering*).
11. **[11. Gestão de Gateways de Pagamento](docs/11-gestao-gateways-pagamento.md)**
    - Arquitetura multiprovedor (Stripe, Mercado Pago e Sandbox), credenciais criptografadas com AES-256-GCM, testes não-transacionais e webhooks idempotentes.
12. **[12. Integração Comercial, Checkout e Auditoria](docs/12-integracao-comercial-checkout-auditoria.md)**
    - Validação de checkout no servidor com fonte única da verdade, matriz de permissões granulares administrativas e suíte de 15 testes de integração automatizados.

### Documentos Operacionais Complementares

- [Manual de Operação em Produção (Runbook)](docs/PRODUCTION_RUNBOOK.md)
- [Diretrizes de Conformidade LGPD e Privacidade](docs/LGPD_AND_PRIVACY_COMPLIANCE.md)
- [Política de Backup e Recuperação de Desastres (DR)](docs/BACKUP_AND_DISASTER_RECOVERY.md)



## O que existe na fundação técnica

- Landing page e painel de projetos em Next.js 15 (App Router).
- Schema Prisma para workspaces, projetos, parâmetros, personagens, ambientes, cenas e versões.
- Validações de entrada com Zod no servidor.
- Resolução determinística de parâmetros por escopo.
- Compositor de instruções e wrapper de geração Gemini.
- Endpoints de health check e APIs REST estruturadas.

## Testes

```bash
npm test
```

## Arquitetura

A aplicação é construída como um monólito modular Next.js. Toda nova funcionalidade deve possuir serviços dedicados em `src/modules/`, validações em `src/lib/schemas/`, rotas REST em `src/app/api/` e documentação técnica detalhada com exemplos em `docs/modules/`.
