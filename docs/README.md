# Documentação Técnica e Arquitetural — Tomadix

Este repositório reúne toda a documentação de engenharia de software, modelos de dados, segurança, manuais de operação e relatórios de implantação da plataforma **Tomadix (CinePrompt Studio AI)**.

Toda a documentação está organizada em **subpastas temáticas** para facilitar a navegação, onboarding de desenvolvedores, auditorias de conformidade e operação administrativa diária.

---

## Estrutura de Diretórios da Documentação

```
docs/
├── 01-visao-geral/                      # Visão do produto, arquitetura e stack tecnológica
├── 02-modulos-plataforma/               # Módulos funcionais do Estúdio e IA Multimodal
│   └── detalhes-tecnicos/               # Documentações técnicas e aprofundadas dos serviços
├── 03-console-administrativo/           # Painel de gestão, faturamento, branding e banco de dados
├── 04-operacoes-seguranca-e-compliance/ # Runbook, backup, disaster recovery e LGPD
└── 05-historico-de-entregas/            # Relatórios cronológicos de entregas e implantações
```

---

## 1. Visão Geral & Arquitetura (`docs/01-visao-geral/`)

| Documento | Descrição |
| :--- | :--- |
| [**01-visao-geral-plataforma.md**](./01-visao-geral/01-visao-geral-plataforma.md) | Visão executiva da plataforma, ecossistema do estúdio criativo, console administrativo e stack tecnológica (Next.js 15, Prisma 6, PostgreSQL, Tailwind v4, Gemini AI). |

---

## 2. Módulos da Plataforma & Estúdio (`docs/02-modulos-plataforma/`)

| Documento | Descrição |
| :--- | :--- |
| [**01-autenticacao-e-seguranca.md**](./02-modulos-plataforma/01-autenticacao-e-seguranca.md) | Sessões seguras HttpOnly, tokens criptográficos SHA-256, RBAC de workspace e rate limiting. |
| [**02-workspaces-equipes-colaboracao.md**](./02-modulos-plataforma/06-workspaces-equipes-colaboracao.md) | Multi-tenancy nativo, workspaces pessoais vs. equipe e isolamento de dados. |
| [**03-projetos-personagens-ambientes.md**](./02-modulos-plataforma/03-projetos-personagens-ambientes.md) | Modelagem de projetos, bíblia visual e prevenção de deriva estética (*visual drift*). |
| [**04-cenas-continuidade-decupagem.md**](./02-modulos-plataforma/04-cenas-continuidade-decupagem.md) | Decupagem de planos, vínculos pontuais e motor de continuidade dramática. |
| [**05-parametros-dinamicos.md**](./02-modulos-plataforma/02-parametros-dinamicos.md) | Tipos de parâmetros técnicos, escopos hierárquicos e motor de resolução. |
| [**06-motor-prompts-ia-gemini.md**](./02-modulos-plataforma/05-motor-prompts-ia-gemini.md) | Templates determinísticos, SDK Google Gen AI, cobrança e estorno de créditos. |
| [**07-onboarding-dashboard-saas.md**](./02-modulos-plataforma/07-onboarding-dashboard-saas.md) | Fluxo de onboarding, dashboard em tempo real, perfil e controle de sessões. |
| [**08-estudio-e-analise-cinematografica.md**](./02-modulos-plataforma/08-estudio-e-analise-cinematografica.md) | Análise multimodal com upload múltiplo de imagens, definição de imagem Principal e atributos secundários, histórico com cards dinâmicos e pré-seleção de projetos. |
| [**09-geracao-direta-imagens-ia.md**](./02-modulos-plataforma/09-geracao-direta-imagens-ia.md) ⭐ **Novo** | Geração direta de imagens com IA (Pollinations.ai / Flux), alternância entre modalidades (Prompt vs Imagem), ação "Gerar imagem com este prompt", lightbox e galeria de assets. |

### Detalhes Técnicos de Implementação (`detalhes-tecnicos/`)
- [auth-security.md](./02-modulos-plataforma/detalhes-tecnicos/auth-security.md): Mecanismos internos de criptografia e auditoria de autenticação.
- [projects.md](./02-modulos-plataforma/detalhes-tecnicos/projects.md): Serviços e regras de negócio de projetos.
- [characters-environments.md](./02-modulos-plataforma/detalhes-tecnicos/characters-environments.md): Gestão de personas e cenários.
- [scenes-continuity.md](./02-modulos-plataforma/detalhes-tecnicos/scenes-continuity.md): Validação de continuidade e ordenação de cenas.
- [parameters.md](./02-modulos-plataforma/detalhes-tecnicos/parameters.md): Resolução e validação de parâmetros cinematográficos.
- [prompt-engine.md](./02-modulos-plataforma/detalhes-tecnicos/prompt-engine.md): Compilação de prompts para IA.
- [prompt-history-export.md](./02-modulos-plataforma/detalhes-tecnicos/prompt-history-export.md): Exportação e histórico de prompts.

---

## 3. Console Administrativo (`docs/03-console-administrativo/`)

| Documento | Descrição |
| :--- | :--- |
| [**01-visao-geral-e-sidebar.md**](./03-console-administrativo/01-visao-geral-e-sidebar.md) ⭐ **Novo** | Redesign do console, sidebar retrátil com persistência no navegador, atalhos de teclado e grupos funcionais. |
| [**02-gestao-de-usuarios-e-permissoes.md**](./03-console-administrativo/02-gestao-de-usuarios-e-permissoes.md) | Prontuário 360°, suspensão/reativação, papéis (`USER`, `ADMIN`, `SUPER_ADMIN`) e ajuste de créditos. |
| [**03-transferencia-administracao-projetos.md**](./03-console-administrativo/03-transferencia-administracao-projetos.md) | Transferência individual e em lote de projetos entre usuários sem quebra de integridade. |
| [**04-central-comercial-planos-politicas.md**](./03-console-administrativo/04-central-comercial-planos-politicas.md) | Gestão de planos com versionamento, prazos de carência e grandfathering de assinantes. |
| [**05-central-custos-renovacao-creditos.md**](./03-console-administrativo/05-central-custos-renovacao-creditos.md) | Catálogo e tela dedicada de custos de criação em créditos (`/admin/credits`), regras por plano, simulador em tempo real e job de renovação periódica. |
| [**06-gestao-gateways-pagamento.md**](./03-console-administrativo/06-gestao-gateways-pagamento.md) | Abstração multiprovedor (Stripe, Mercado Pago, Sandbox) e testes de conectividade. |
| [**07-integracao-comercial-checkout-auditoria.md**](./03-console-administrativo/07-integracao-comercial-checkout-auditoria.md) | Checkout seguro no servidor, integridade referencial e auditoria de compras. |
| [**08-personalizacao-visual-e-temas.md**](./03-console-administrativo/08-personalizacao-visual-e-temas.md) ⭐ **Novo** | Gestão de marca, logotipo, paleta de cores dinâmica, controle dedicado de cores dos Badges/Selos (`badgeTextColor` e `badgeBgColor`), live preview e injeção de CSS em tempo real. |
| [**09-configuracoes-gerais-e-limpeza-de-testes.md**](./03-console-administrativo/09-configuracoes-gerais-e-limpeza-de-testes.md) ⭐ **Novo** | Modo de manutenção, comunicados, feature flags globais e ferramenta de auditoria e limpeza cirúrgica de dados de teste de desenvolvimento. |
| [**10-gestao-de-bancos-de-dados-e-setup.md**](./03-console-administrativo/10-gestao-de-bancos-de-dados-e-setup.md) ⭐ **Novo** | Teste de conexão ativa em tempo real (latência, versão PostgreSQL, contagem de tabelas), troca segura de banco (PostgreSQL/Supabase) com backup do `.env` e assistente guiado de inicialização (Setup Wizard com 35 tabelas, admin inicial e projeto tutorial). |
| [**11-manual-do-administrador.md**](./03-console-administrativo/11-manual-do-administrador.md) | Manual prático de operação e FAQ para administradores e operadores da plataforma. |
| [**12-integracoes-apis-imagem-pollinations.md**](./03-console-administrativo/12-integracoes-apis-imagem-pollinations.md) ⭐ **Novo** | Gestão de APIs de geração de imagens, provedor Pollinations.ai, credenciais seguras mascaradas, catálogo dinâmico de modelos, teste de conexão em tempo real e limites por plano. |

---

## 4. Operações, Segurança & Compliance (`docs/04-operacoes-seguranca-e-compliance/`)

| Documento | Descrição |
| :--- | :--- |
| [**01-production-runbook.md**](./04-operacoes-seguranca-e-compliance/01-production-runbook.md) | Guia de deploy, monitoramento, rotação de chaves e variáveis de ambiente em produção. |
| [**02-backup-and-disaster-recovery.md**](./04-operacoes-seguranca-e-compliance/02-backup-and-disaster-recovery.md) | Políticas de backup contínuo (WAL), retenção e metas de recuperação (RPO / RTO). |
| [**03-seguranca-producao-lgpd-privacidade.md**](./04-operacoes-seguranca-e-compliance/03-seguranca-producao-lgpd-privacidade.md) | Políticas de hardening, conformidade com a LGPD e gestão de consentimentos. |
| [**04-lgpd-and-privacy-compliance.md**](./04-operacoes-seguranca-e-compliance/04-lgpd-and-privacy-compliance.md) | Atendimento a solicitações de titulares (DSR: acesso, retificação, revogação e exclusão). |

---

## 5. Histórico de Entregas & Versões (`docs/05-historico-de-entregas/`)

| Documento | Etapa / Versão |
| :--- | :--- |
| [**2026-10-30-correcoes-creditos-planos-identidade-e-estudio.md**](./05-historico-de-entregas/2026-10-30-correcoes-creditos-planos-identidade-e-estudio.md) ⭐ **Novo** | Relatório de entrega: Exibição de Créditos no Header, Dedução Atômica Centralizada com Estorno em Falhas, Troca Efetiva de Planos pelo Admin, Sincronização em Tempo Real de Entidades sem F5 e Barra de Criação Instantânea com Menções Estruturadas (@, #, $) e Redimensionamento. |
| [**2026-10-29-implantacoes-estudio-admin-database.md**](./05-historico-de-entregas/2026-10-29-implantacoes-estudio-admin-database.md) | Relatório de implantação: Estúdio Multimodal, Personalização Visual, Badges Legíveis, Limpeza Segura de Testes e Gestão Completa de Banco de Dados. |
| [**ETAPA-0 a ETAPA-7**](./05-historico-de-entregas/) | Relatórios de auditoria, correções de segurança, performance e entregas anteriores do projeto. |
