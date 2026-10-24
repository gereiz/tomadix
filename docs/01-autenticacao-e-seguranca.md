# 01 — Autenticação, Multiusuário e Segurança

Fundação de autenticação robusta, autorização baseada em papéis (RBAC) e isolamento multitenant no servidor para o **Tomadix**.

---

## 1. Arquitetura e Decisões de Design

- **PostgreSQL / Supabase**: Persistência no PostgreSQL hospedado no Supabase via Prisma ORM, mantendo integridade referencial com migrações incrementais sem perda de dados existentes.
- **Sessões HTTP-Only Seguras**: Cookies com atributos `HttpOnly`, `SameSite=Lax`, `Secure` (em produção) e validade de 7 dias, associados a tokens criptograficamente seguros (256 bits de entropia) com hash SHA-256 no banco de dados.
- **Criptografia de Senhas**: `bcryptjs` configurado com fator de custo 12. Senhas em texto puro nunca são persistidas ou logadas.
- **Proteção contra Enumeração de Contas**: Rotas sensíveis (como `/api/auth/forgot-password`) retornam respostas padronizadas e idênticas para contas existentes e inexistentes.
- **Rate Limiting**: Janela deslizante em memória com bloqueio temporário após exceder limites para endpoints sensíveis (login, cadastro, recuperação e redefinição de senha).
- **Trilha de Auditoria**: Registro em `AuditLog` para ações administrativas e sensíveis (`USER_REGISTER`, `USER_LOGIN`, `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_COMPLETED`, `MEMBER_ADDED`, `MEMBER_ROLE_UPDATED`, `MEMBER_REMOVED`, `WORKSPACE_CREATED`).

---

## 2. Matriz Centralizada de Permissões RBAC de Workspace

Os papéis suportados dentro de cada estúdio/workspace são:

| Permissão | OWNER | ADMIN | MEMBER | VIEWER |
|---|:---:|:---:|:---:|:---:|
| `workspace:read` | ✓ | ✓ | ✓ | ✓ |
| `workspace:update` | ✓ | ✓ | ✗ | ✗ |
| `workspace:delete` | ✓ | ✗ | ✗ | ✗ |
| `members:read` | ✓ | ✓ | ✓ | ✓ |
| `members:manage` | ✓ | ✓ | ✗ | ✗ |
| `projects:read` | ✓ | ✓ | ✓ | ✓ |
| `projects:create` | ✓ | ✓ | ✓ | ✗ |
| `projects:update` | ✓ | ✓ | ✓ | ✗ |
| `projects:delete` | ✓ | ✓ | ✗ | ✗ |
| `parameters:read` | ✓ | ✓ | ✓ | ✓ |
| `parameters:manage` | ✓ | ✓ | ✗ | ✗ |
| `characters:read` | ✓ | ✓ | ✓ | ✓ |
| `characters:manage` | ✓ | ✓ | ✓ | ✗ |
| `environments:read` | ✓ | ✓ | ✓ | ✓ |
| `environments:manage` | ✓ | ✓ | ✓ | ✗ |
| `scenes:read` | ✓ | ✓ | ✓ | ✓ |
| `scenes:manage` | ✓ | ✓ | ✓ | ✗ |
| `prompts:read` | ✓ | ✓ | ✓ | ✓ |
| `prompts:generate` | ✓ | ✓ | ✓ | ✗ |
| `audit:read` | ✓ | ✓ | ✗ | ✗ |

### Regras Críticas de Proteção ao Proprietário (OWNER)
1. **Proteção contra ausência de responsável**: Um workspace nunca pode ficar sem um proprietário ativo.
2. **Proteção de autoridade**: Membros com papel `ADMIN` não podem remover nem alterar o papel de um `OWNER`.
3. **Invalidação global**: A troca ou redefinição de senha encerra imediatamente todas as sessões anteriores em todos os dispositivos.

---

## 3. Endpoints da API de Autenticação (`/api/auth`)

- `POST /api/auth/register`: Cadastro de usuário com criação de workspace pessoal padrão.
- `POST /api/auth/login`: Autenticação e emissão de sessão HTTP-only.
- `POST /api/auth/logout`: Revogação da sessão atual e limpeza de cookies.
- `GET /api/auth/me`: Consulta de dados da conta e estúdios associados.
- `POST /api/auth/forgot-password`: Solicitação de redefinição anti-enumeração de contas.
- `POST /api/auth/reset-password`: Redefinição de senha com invalidação de sessões ativas.
