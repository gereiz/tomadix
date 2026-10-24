# Documentação Técnica e Arquitetural — Tomadix

Este diretório reúne a documentação de engenharia de software e arquitetura do **Tomadix** (anteriormente Tomadix), organizada em **ordem cronológica e conceitual numerada** para facilitar a leitura, o onboarding de novos desenvolvedores e auditorias de conformidade.

---

## Índice Geral das Implementações

| # | Módulo Documentado | Principais Tópicos Cobertos | Arquivo de Leitura |
| :---: | :--- | :--- | :--- |
| **01** | **Autenticação, Multiusuário e Segurança** | Cookies HttpOnly seguros, tokens SHA-256, RBAC de workspace (Owner, Admin, Member, Viewer), rate limiting, trilhas de auditoria. | [01-autenticacao-e-seguranca.md](file:///c:/CURSOS/cineprompt/docs/01-autenticacao-e-seguranca.md) |
| **02** | **Parâmetros Dinâmicos e Motor de Resolução** | Tipos de parâmetros, validações, escopos (Global, Character, Environment, Scene, Output), herança hierárquica e motor de resolução. | [02-parametros-dinamicos.md](file:///c:/CURSOS/cineprompt/docs/02-parametros-dinamicos.md) |
| **03** | **Projetos, Bíblia Visual, Personagens e Ambientes** | Modelos de projetos, bíblia visual cinematográfica, consistência facial/estética de personagens e cenários, prevenção de deriva visual (*visual drift*). | [03-projetos-personagens-ambientes.md](file:///c:/CURSOS/cineprompt/docs/03-projetos-personagens-ambientes.md) |
| **04** | **Cenas, Decupagem Técnica e Continuidade** | Linha do tempo sequencial, decupagem de planos, vínculos pontuais de personagens, motor de análise automática de continuidade dramática. | [04-cenas-continuidade-decupagem.md](file:///c:/CURSOS/cineprompt/docs/04-cenas-continuidade-decupagem.md) |
| **05** | **Motor de Prompts e Integração Gemini AI** | 7 templates cinematográficos, pipeline determinístico de compilação, jobs assíncronos, SDK Google Gen AI, estorno automático de créditos. | [05-motor-prompts-ia-gemini.md](file:///c:/CURSOS/cineprompt/docs/05-motor-prompts-ia-gemini.md) |
| **06** | **Workspaces, Equipes e Colaboração** | Suporte multi-tenant nativo, workspaces pessoais vs. equipe, convites criptográficos (tokens seguros), alternância de contexto e isolamento. | [06-workspaces-equipes-colaboracao.md](file:///c:/CURSOS/cineprompt/docs/06-workspaces-equipes-colaboracao.md) |
| **07** | **Onboarding SaaS, Dashboard e Gestão da Conta** | Fluxo de boas-vindas em 7 etapas, dashboard com dados em tempo real, gestão de perfil, controle de sessões ativas e revogação remota. | [07-onboarding-dashboard-saas.md](file:///c:/CURSOS/cineprompt/docs/07-onboarding-dashboard-saas.md) |
| **08** | **Painel Administrativo da Plataforma e Usuários** | Painel global (`/admin`), autorização via `PlatformRole`, pesquisa de contas, suspensão/reativação imediata e ajuste manual de créditos. | [08-painel-administrativo-usuarios.md](file:///c:/CURSOS/cineprompt/docs/08-painel-administrativo-usuarios.md) |
| **09** | **Segurança para Produção, LGPD e Privacidade** | Conformidade LGPD (Lei 13.709/2018), DSR (exportação e exclusão de dados), gestão de consentimentos, hardening de infraestrutura e RLS. | [09-seguranca-producao-lgpd-privacidade.md](file:///c:/CURSOS/cineprompt/docs/09-seguranca-producao-lgpd-privacidade.md) |
| **10** | **Central Comercial, Planos e Políticas Declarativas** | Gestão de planos com versionamento, políticas de créditos e prazos de carência, imutabilidade contratual e grandfathering de assinantes ativos. | [10-central-comercial-planos-politicas.md](file:///c:/CURSOS/cineprompt/docs/10-central-comercial-planos-politicas.md) |
| **11** | **Administração de Gateways de Pagamento** | Abstração multiprovedor (Stripe, Mercado Pago, Sandbox), criptografia AES-256-GCM com mascaramento, teste de conexão sem cobrança e webhooks. | [11-gestao-gateways-pagamento.md](file:///c:/CURSOS/cineprompt/docs/11-gestao-gateways-pagamento.md) |
| **12** | **Integração Comercial, Checkout e Auditoria** | Fonte única da verdade no servidor, consistência de checkout, matriz de permissões granulares administrativas e suíte de 15 testes integrados. | [12-integracao-comercial-checkout-auditoria.md](file:///c:/CURSOS/cineprompt/docs/12-integracao-comercial-checkout-auditoria.md) |

---

## Documentos Complementares de Operação

- [PRODUCTION_RUNBOOK.md](file:///c:/CURSOS/cineprompt/docs/PRODUCTION_RUNBOOK.md): Guia de ativação, monitoramento, rotação de segredos e operação em produção.
- [LGPD_AND_PRIVACY_COMPLIANCE.md](file:///c:/CURSOS/cineprompt/docs/LGPD_AND_PRIVACY_COMPLIANCE.md): Manual detalhado de compliance, bases legais e atendimento aos direitos dos titulares.
- [BACKUP_AND_DISASTER_RECOVERY.md](file:///c:/CURSOS/cineprompt/docs/BACKUP_AND_DISASTER_RECOVERY.md): Políticas de retenção, backup contínuo (WAL) e recuperação de desastres (RPO / RTO).
