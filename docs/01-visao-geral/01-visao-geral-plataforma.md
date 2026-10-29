# Tomadix — Visão Geral da Plataforma e Arquitetura

O **Tomadix** é uma plataforma SaaS profissional para diretores cinematográficos, filmmakers, criadores de conteúdo e agências audiovisuais, desenvolvida para transformar ideias conceituais em prompts cinematográficos de alta precisão para os principais motores de inteligência artificial generativa de vídeo e imagem (Google Flow, Midjourney v6, Runway Gen-3, Flux Pro, Luma Dream Machine e Sora).

---

## 1. Arquitetura Modular

A plataforma está organizada em dois grandes ecossistemas:

1. **Estúdio Criativo (Frontend do Usuário):**
   - **Workspaces & Equipes:** Multi-inquilino (multi-tenant) com controle de acesso baseado em papéis (RBAC).
   - **Projetos:** Bíblia visual do projeto, formato de tela (16:9, 9:16, 2.39:1 Anamórfico), pacing, paleta e tom.
   - **Personagens & Ambientes:** Consistência estética e atributos decupados.
   - **Cenas & Decupagem:** Planos, ângulos, movimentos de câmera, continuidade visual e sonoplastia.
   - **Parâmetros Cinematográficos Dinâmicos:** Controle refinado de lentes, aberturas, granulação, iluminação e LUTs.
   - **Estúdio Multimodal & Análise Cinematográfica:** Visão computacional com inteligência artificial para decompor referências visuais em parâmetros técnicos.

2. **Console Administrativo (Backoffice de Gestão):**
   - **Gestão Operacional:** Usuários, permissões, estúdios, transferência de projetos e auditoria.
   - **Central Comercial:** Catálogo de planos (Free, Pro, Team, Enterprise), regras de precificação, gateways de pagamento (Mercado Pago, Stripe, Sandbox) e controle de créditos de IA.
   - **Personalização da Plataforma:** Identidade visual, logotipo, paleta de cores dinâmica e temas injetados em tempo real.
   - **Configurações Gerais & Limpeza:** Flags de recursos, modo de manutenção e ferramenta de limpeza segura de dados de teste de desenvolvimento.
   - **Gestão de Banco de Dados & Setup:** Teste de conexão em tempo real, suporte nativo a PostgreSQL e Supabase, troca segura de conexão e assistente de inicialização guiada (Wizard).

---

## 2. Stack Tecnológica

- **Framework Web:** Next.js 15 (App Router, Server Components e Server Actions).
- **Linguagem:** TypeScript 5.9 com validação estrita.
- **Estilização & Design System:** Tailwind CSS v4 com variáveis CSS dinâmicas (`--brand-*` e `--color-*`).
- **ORM & Banco de Dados:** Prisma Client v6 com banco de dados relacional PostgreSQL (compatível com Supabase Transaction/Session Pooler e instâncias dedicadas).
- **Inteligência Artificial:** Integração multimodal com Google Gemini API (`@google/genai`).
- **Autenticação & Segurança:** Autenticação por sessões seguras em banco com hashing `bcryptjs`, proteção contra CSRF e controle RBAC (`USER`, `ADMIN`, `SUPER_ADMIN`).
- **Suíte de Testes:** Vitest para testes unitários, testes de integração e verificações de idempotência.

