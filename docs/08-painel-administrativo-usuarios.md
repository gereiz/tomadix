# 08 — Painel Administrativo da Plataforma e Gestão de Usuários

O **Painel de Administração Global** (`/admin`) permite que operadores autorizados supervisionem o SaaS inteiro. Ele é estritamente desacoplado dos papéis de workspace (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`), operando no nível da plataforma (`PlatformRole`).

---

## 1. Autorização Administrativa da Plataforma

- **Camada de Autorização**: O campo `platformRole` (`SUPER_ADMIN`, `ADMIN`, `USER`) no modelo `User` define os privilégios globais.
- **Segurança no Servidor**: A autorização é verificada exclusivamente no servidor via `requirePlatformAdmin()` em cada rota e action administrativa, ignorando qualquer parâmetro enviado pelo cliente.
- **Auditoria de Operações**: Todas as ações executadas por operadores administrativos são registradas em `PlatformAuditLog` com IP, user-agent, alvo e justificativa.

---

## 2. Gestão Global de Usuários e Workspaces

O serviço `AdminUsersService` disponibiliza controles operacionais completos:
- **Pesquisa e Filtragem**: Busca de usuários por nome, e-mail, status (`ACTIVE`, `SUSPENDED`) e data de cadastro.
- **Detalhes da Conta**: Visualização de workspaces associados, plano atual, faturas e consumo histórico de IA.
- **Suspensão e Reativação de Contas**:
  - `POST /api/admin/users/[id]/suspend`: Bloqueio imediato do acesso de um usuário infrator com registro de motivo formal e encerramento de todas as sessões ativas.
  - `POST /api/admin/users/[id]/reactivate`: Restauração controlada do acesso com justificativa auditável.
- **Ajuste Manual de Créditos de Cortesia / Suporte**:
  - `POST /api/admin/users/credits/adjust`: Concessão ou estorno administrativo de créditos com atualização do `CreditLedger` e registro do operador responsável.

---

## 3. Endpoints da API Administrativa de Usuários (`/api/admin/users`)

- `GET /api/admin/users`: Lista paginada de todos os usuários da plataforma com filtros de pesquisa.
- `GET /api/admin/users/[id]`: Visão completa 360° do cliente (workspaces, assinaturas, sessões, consumo).
- `POST /api/admin/users/[id]/suspend`: Suspensão de conta por violação de termos de uso.
- `POST /api/admin/users/[id]/reactivate`: Reativação controlada de conta suspensa.
- `POST /api/admin/users/credits/adjust`: Ajuste manual de saldo de créditos (requer `credits:manage`).
- `GET /api/admin/audit`: Consulta de logs globais de auditoria da plataforma (requer `audit:read`).
