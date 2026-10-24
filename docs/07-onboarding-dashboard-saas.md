# 07 — Onboarding Guiado, Dashboard SaaS e Configurações da Conta

O módulo de **Experiência SaaS** transforma o Tomadix em uma plataforma comercial intuitiva, recepcionando novos clientes através de um onboarding fluido em 7 etapas, dashboard em tempo real e gestão completa de perfil e sessões.

---

## 1. Fluxo de Onboarding Guiado (7 Etapas)

O fluxo de boas-vindas orienta o usuário passo a passo:
1. **Confirmação da Conta**: Verificação inicial do e-mail e ativação de credenciais.
2. **Apresentação do Tomadix**: Visão geral do propósito do estúdio e motor de IA.
3. **Workspace Inicial**: Seleção ou configuração do nome do estúdio principal.
4. **Organização Cinematográfica**: Explicação prática sobre como projetos, personagens, ambientes e cenas se articulam.
5. **Criação do Primeiro Projeto**: Formulário simplificado para o primeiro projeto cinematográfico ou carregamento de demo.
6. **Apresentação do Motor de Prompts**: Demonstração interativa dos templates cinematográficos.
7. **Limites e Recursos do Plano**: Apresentação clara das cotas contratadas (créditos de IA, projetos ativos e membros).

*O onboarding pode ser retomado ou ignorado a qualquer momento sem travar a navegação (`/api/onboarding/skip`).*

---

## 2. Dashboard Personalizado em Tempo Real

A rota `/dashboard` e a API `/api/dashboard` consolidam métricas reais da conta e do workspace ativo:
- **Projetos Recentes**: Lista dos últimos projetos atualizados com atalhos de edição rápida.
- **Últimas Gerações de Prompts**: Histórico recente de renderizações com visualização de parâmetros.
- **Consumo de Créditos**: Gráficos e indicadores de créditos restantes vs. cota mensal.
- **Situação da Assinatura**: Status da assinatura (`ACTIVE`, `PAST_DUE`, `CANCELING`), plano contratado e data de renovação.
- **Alertas de Capacidade**: Banners preventivos quando o limite de projetos ou membros está próximo do teto.

---

## 3. Gestão da Conta, Perfil e Sessões Ativas

- **Perfil do Usuário**: Atualização de nome de exibição, avatar e preferências estéticas.
- **Segurança de Senha**: Alteração de senha com exigência de senha anterior e encerramento de outras sessões.
- **Gerenciador de Sessões**: Lista todas as sessões ativas com IP, user-agent, localização estimada e botão de revogação remota (`/api/users/sessions/revoke-others`).

---

## 4. Endpoints da API de Onboarding e Dashboard

- `GET /api/dashboard`: Métricas consolidadas em tempo real do workspace ativo.
- `GET /api/onboarding`: Status da etapa atual de onboarding do usuário.
- `POST /api/onboarding/step`: Avança ou atualiza a etapa de onboarding.
- `POST /api/onboarding/skip`: Marca o onboarding como concluído/ignorado.
- `GET /api/users/profile`: Consulta os dados do perfil do usuário autenticado.
- `PUT /api/users/profile`: Atualiza dados cadastrais e preferências.
- `GET /api/users/sessions`: Lista sessões ativas do usuário.
- `POST /api/users/sessions/revoke-others`: Revoga remotamente todas as outras sessões ativas.
