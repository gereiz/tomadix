# 06 — Workspaces, Equipes e Colaboração Multiusuário

O módulo de **Workspaces e Colaboração** do Tomadix implementa o suporte multi-tenant nativo, permitindo que produtoras, estúdios independentes e criadores individuais organizem projetos em workspaces isolados, compartilhem recursos e colaborem em equipe de acordo com o plano contratado.

---

## 1. Arquitetura Multitenant e Isolamento

- **Workspace Pessoal vs. Equipe**: Todo usuário possui um workspace pessoal criado automaticamente no cadastro. O usuário pode criar novos workspaces de equipe ou ingressar em workspaces existentes como colaborador.
- **Isolamento de Dados**: Todas as entidades de produção (`Project`, `Character`, `Environment`, `Scene`, `ParameterDefinition`, `GenerationJob`) possuem chave estrangeira mandatória `workspaceId`.
- **Prevenção de Acesso Cruzado**: O servidor valida em todas as rotas a existência de um vínculo `Membership` entre o usuário autenticado e o `workspaceId` solicitado. Tentativas de acesso a workspaces de terceiros são barradas com `UNAUTHORIZED` (401) ou `FORBIDDEN` (403).

---

## 2. Sistema de Convites Criptográficos (`WorkspaceInvite`)

O fluxo de convite por e-mail garante segurança e rastreabilidade:
- **Tokens Aleatórios de Alta Entropia**: Geração de tokens criptográficos via `crypto.randomBytes(32).toString("hex")`.
- **Expiração Automática**: Validade padrão de 7 dias a partir do envio.
- **Validação de Limites de Membros**: Antes de emitir o convite e no aceite, o sistema verifica se o workspace não atingiu o limite de colaboradores do plano (`assertCanAddMember`).
- **Estados de Convite**: `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`.
- **Auditoria de Convites**: Registro de quem convidou, e-mail de destino, papel atribuído e timestamps.

---

## 3. Gestão de Membros e Transferência de Propriedade

- **Papéis no Workspace**:
  - `OWNER`: Controle total do workspace, faturamento e exclusão.
  - `ADMIN`: Gestão de membros, projetos e parâmetros (sem direito de excluir o workspace nem remover o OWNER).
  - `MEMBER`: Criação e edição de projetos, personagens, cenas e geração de prompts.
  - `VIEWER`: Apenas leitura de projetos e roteiros gerados.
- **Transferência Controlada de Titularidade**: Rota `/api/workspaces/[id]/transfer-ownership` permite que o proprietário atual transfira a titularidade para um membro administrador, tornando-se membro e garantindo que o workspace nunca fique órfão.

---

## 4. Endpoints da API de Workspaces (`/api/workspaces`)

- `GET /api/workspaces`: Lista todos os workspaces aos quais o usuário tem acesso.
- `POST /api/workspaces`: Criação de novo workspace de equipe.
- `GET /api/workspaces/[id]`: Consulta detalhes do workspace e contagem de recursos.
- `PUT /api/workspaces/[id]`: Atualização de nome e slug do workspace.
- `POST /api/workspaces/switch`: Alternância segura do workspace ativo na sessão.
- `GET /api/workspaces/[id]/members`: Lista colaboradores com seus respectivos papéis.
- `POST /api/workspaces/[id]/members`: Adiciona ou altera papel de um colaborador.
- `DELETE /api/workspaces/[id]/members/[memberId]`: Remove membro do estúdio.
- `POST /api/workspaces/[id]/invites`: Cria e envia convite criptográfico por e-mail.
- `POST /api/invites/[token]/accept`: Aceite de convite e criação da membership.
- `POST /api/invites/[token]/decline`: Recusa formal do convite.
- `POST /api/workspaces/[id]/transfer-ownership`: Transferência formal da titularidade.
