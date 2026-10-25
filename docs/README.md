# Documentação Técnica e Arquitetural — Tomadix

Este diretório reúne a documentação de engenharia de software, modelos de dados, segurança e manuais de operação da plataforma **CinePrompt Studio AI (Tomadix)**, organizada em **ordem cronológica e conceitual numerada** para facilitar a leitura, o onboarding de novos desenvolvedores, auditorias de conformidade e o trabalho diário dos operadores administrativos.

---

## Índice Geral das Implementações e Módulos

| # | Módulo Documentado | Principais Tópicos Cobertos | Arquivo de Leitura |
| :---: | :--- | :--- | :--- |
| **01** | **Autenticação, Multiusuário e Segurança** | Cookies HttpOnly seguros, tokens SHA-256, RBAC de workspace (Owner, Admin, Member, Viewer), rate limiting, trilhas de auditoria. | [01-autenticacao-e-seguranca.md](./01-autenticacao-e-seguranca.md) |
| **02** | **Parâmetros Dinâmicos e Motor de Resolução** | Tipos de parâmetros, validações, escopos (Global, Character, Environment, Scene, Output), herança hierárquica e motor de resolução. | [02-parametros-dinamicos.md](./02-parametros-dinamicos.md) |
| **03** | **Projetos, Bíblia Visual, Personagens e Ambientes** | Modelos de projetos, bíblia visual cinematográfica, consistência facial/estética de personagens e cenários, prevenção de deriva visual (*visual drift*). | [03-projetos-personagens-ambientes.md](./03-projetos-personagens-ambientes.md) |
| **04** | **Cenas, Decupagem Técnica e Continuidade** | Linha do tempo sequencial, decupagem de planos, vínculos pontuais de personagens, motor de análise automática de continuidade dramática. | [04-cenas-continuidade-decupagem.md](./04-cenas-continuidade-decupagem.md) |
| **05** | **Motor de Prompts e Integração Gemini AI** | Templates cinematográficos, pipeline determinístico de compilação, jobs assíncronos, SDK Google Gen AI, cobrança e estorno de créditos. | [05-motor-prompts-ia-gemini.md](./05-motor-prompts-ia-gemini.md) |
| **06** | **Workspaces, Equipes e Colaboração** | Suporte multi-tenant nativo, workspaces pessoais vs. equipe, convites criptográficos (tokens seguros), alternância de contexto e isolamento. | [06-workspaces-equipes-colaboracao.md](./06-workspaces-equipes-colaboracao.md) |
| **07** | **Onboarding SaaS, Dashboard e Gestão da Conta** | Fluxo de boas-vindas em 7 etapas, dashboard com dados em tempo real, gestão de perfil, controle de sessões ativas e revogação remota. | [07-onboarding-dashboard-saas.md](./07-onboarding-dashboard-saas.md) |
| **08** | **Painel Administrativo e Gestão de Usuários** | Prontuário 360° (`/admin/users/[id]`), confirmação manual de e-mail auditada, proteção contra auto-elevação, revogação de sessões e ajuste de créditos com travas. | [08-painel-administrativo-usuarios.md](./08-painel-administrativo-usuarios.md) |
| **09** | **Segurança para Produção, LGPD e Privacidade** | Conformidade LGPD (Lei 13.709/2018), DSR (exportação e exclusão de dados), gestão de consentimentos, hardening de infraestrutura e RLS. | [09-seguranca-producao-lgpd-privacidade.md](./09-seguranca-producao-lgpd-privacidade.md) |
| **10** | **Central Comercial, Planos e Políticas Declarativas** | Gestão de planos com versionamento, políticas de créditos e prazos de carência, imutabilidade contratual e grandfathering de assinantes ativos. | [10-central-comercial-planos-politicas.md](./10-central-comercial-planos-politicas.md) |
| **11** | **Administração de Gateways de Pagamento** | Abstração multiprovedor (Stripe, Mercado Pago, Sandbox), criptografia AES-256-GCM com mascaramento, teste de conexão sem cobrança e webhooks. | [11-gestao-gateways-pagamento.md](./11-gestao-gateways-pagamento.md) |
| **12** | **Integração Comercial, Checkout e Auditoria** | Fonte única da verdade no servidor, consistência de checkout, matriz de permissões granulares administrativas e trilhas de auditoria. | [12-integracao-comercial-checkout-auditoria.md](./12-integracao-comercial-checkout-auditoria.md) |
| **13** | **Transferência e Administração de Projetos** | Transferência individual e em lote sem perda de dependências (cenas/personagens), validação de cotas com exceção auditada e restauração de titularidade. | [13-transferencia-administracao-projetos.md](./13-transferencia-administracao-projetos.md) |
| **14** | **Central de Custos em Créditos e Renovação** | Catálogo de 10 operações de IA, regras de desconto por plano, resolução hierárquica em 4 níveis (`resolveCost`), simulador e job de renovação idempotente. | [14-central-custos-renovacao-creditos.md](./14-central-custos-renovacao-creditos.md) |
| **15** | **Manual Geral de Operação do Administrador** | Guia prático passo a passo de todas as telas administrativas, fluxos de suporte, segurança, FAQ e resolução de problemas operacionais. | [15-manual-do-administrador.md](./15-manual-do-administrador.md) |

---

## Documentos Complementares de Operação e Governança

- [15-manual-do-administrador.md](./15-manual-do-administrador.md): Manual de uso passo a passo para administradores e operadores da plataforma.
- [PRODUCTION_RUNBOOK.md](./PRODUCTION_RUNBOOK.md): Guia de ativação, monitoramento, rotação de segredos e operação em produção.
- [LGPD_AND_PRIVACY_COMPLIANCE.md](./LGPD_AND_PRIVACY_COMPLIANCE.md): Manual detalhado de compliance, bases legais e atendimento aos direitos dos titulares.
- [BACKUP_AND_DISASTER_RECOVERY.md](./BACKUP_AND_DISASTER_RECOVERY.md): Políticas de retenção, backup contínuo (WAL) e recuperação de desastres (RPO / RTO).
