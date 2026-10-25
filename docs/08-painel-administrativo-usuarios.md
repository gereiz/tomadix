# 08 — Painel Administrativo da Plataforma e Gestão Completa de Usuários

O **Painel de Administração Global** (`/admin`) permite que operadores autorizados supervisionem o ecossistema SaaS do CinePrompt Studio AI (Tomadix). Ele é estritamente desacoplado dos papéis de workspace (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`), operando no nível da plataforma (`PlatformRole`).

---

## 1. Arquitetura de Autorização e Segurança Administrativa

- **Camada de Autorização**: O campo `platformRole` (`SUPER_ADMIN`, `ADMIN`, `USER`) no modelo `User` define os privilégios globais.
- **Segurança no Servidor**: A autorização é verificada exclusivamente no servidor via `requirePlatformAdmin()` em cada rota de API e Server Action administrativa, rejeitando parâmetros enviados pelo cliente.
- **Proteção contra Auto-Elevação de Papel**: Um administrador regular ou super administrador não pode alterar o próprio papel administrativo para evitar abusos de privilégio.
- **Proteção do Último Super Administrador**: A plataforma impede o rebaixamento ou exclusão do último `SUPER_ADMIN` ativo, exigindo a transferência prévia de responsabilidade.
- **Matriz de Permissões Granulares**: Além do papel base, operadores possuem suporte a permissões específicas armazenadas em `user.preferences.adminPermissions` (ex: `users:manage`, `projects:manage`, `plans:manage`, `credits:manage`, `audit:read`).
- **Auditoria Imutável de Operações**: Todas as ações executadas por operadores administrativos são registradas em `PlatformAuditLog` com IP, User-Agent, entidade afetada, valores anteriores/posteriores e justificativa formal obrigatória.

---

## 2. Gestão Completa de Usuários e Prontuário Individual (`/admin/users/[id]`)

O painel dispõe de listagem com pesquisa textual, filtros por papel, status de suspensão e paginação, além de uma **página individual de detalhes (Prontuário 360°)** acessível em `/admin/users/[id]`:

### 2.1. Métricas do Prontuário
- **Identificação Cadastral**: ID do usuário, nome de exibição, e-mail com indicador visual de verificação, data de cadastro, último acesso registrado e status da conta (`ATIVO` / `SUSPENSO`).
- **Métricas Criativas em Tempo Real**: Total de projetos, personagens, ambientes, cenas e prompts cinematográficos gerados pelo usuário.
- **Métricas Financeiras de Créditos**: Saldo atual disponível, total de créditos concedidos (recargas/bônus), consumidos em gerações de IA e ajustados manualmente.

### 2.2. Seções e Abas do Prontuário
1. **Perfil & Permissões**:
   - Edição de nome de exibição e e-mail cadastral permitido.
   - Alteração do papel de plataforma (`PlatformRole`) com validação de hierarquia.
   - Modal interativo para concessão ou remoção de permissões granulares.
2. **Plano & Concessões Administrativas**:
   - Visualização do plano efetivo, status contratual e vigência.
   - Concessões temporárias de planos superiores (`UserEntitlementOverride`) com data limite de expiração e auditoria.
3. **Extrato & Ledger de Créditos**:
   - Histórico contábil completo de adições, deduções e estornos com antes/depois, identificador de correlação e justificativa.
4. **Projetos Vinculados**:
   - Listagem dos projetos pertencentes ao usuário, com atalho direto para transferência de titularidade.
5. **Sessões Conectadas**:
   - Consulta de tokens de sessão ativos com endereço IP, navegador (User-Agent), data de expiração e ação para revogação pontual ou em massa.
6. **Trilha de Auditoria**:
   - Linha do tempo de todas as ações que envolveram a conta do usuário.

---

## 3. Ações Administrativas Disponíveis

### 3.1. Confirmação Manual de E-mail
- **Finalidade**: Atender usuários com dificuldades de recebimento de mensagens de confirmação do provedor de e-mail.
- **Segurança**: Modal com confirmação explícita e exigência de justificativa (mínimo de 5 caracteres).
- **Rastreabilidade**: Registra em `PlatformAuditLog` o evento `USER_EMAIL_MANUAL_CONFIRM` deixando explícito que a confirmação foi efetuada manualmente por um operador, sem substituir a comprovação criptográfica do provedor de autenticação.

### 3.2. Suspensão e Reativação de Contas
- **Suspensão (`POST /api/admin/users/[id]/suspend`)**: Bloqueio imediato do acesso de conta por violação de termos de uso, com encerramento forçado de todas as sessões ativas e motivo registrado no banco.
- **Reativação (`POST /api/admin/users/[id]/reactivate`)**: Restauração controlada do acesso com justificativa auditável.

### 3.3. Adição e Retirada de Créditos com Travas de Segurança
- **Adição**: Permite creditar bônus promocionais, de compensação ou cortesia.
- **Retirada**: Valida rigorosamente o saldo disponível no workspace. Tentativas de retirar mais créditos do que o saldo atual são bloqueadas no servidor com erro explícito (`Saldo insuficiente para realizar a retirada solicitada`).
- **Imutabilidade**: Nenhum registro histórico é alterado ou excluído. Toda correção gera uma nova entrada compensatória no `CreditLedger`.

### 3.4. Concessão Temporária de Plano (`UserEntitlementOverride`)
- Permite conceder acesso promocional ou de avaliação a planos avançados (ex: `ENTERPRISE`) por prazo determinado.
- Ao atingir a data de expiração (`expiresAt`), o sistema restaura automaticamente o plano contratado do usuário.

---

## 4. Endpoints da API de Usuários (`/api/admin/users`)

| Método | Rota | Descrição | Permissão Requerida |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/users` | Listagem paginada de usuários com busca e filtros | `users:manage` |
| `GET` | `/api/admin/users/[id]` | Prontuário detalhado com métricas, sessões e ledger | `users:manage` |
| `PATCH` | `/api/admin/users/[id]` | Edição de nome, e-mail e papel de plataforma | `users:manage` |
| `POST` | `/api/admin/users/[id]/confirm-email` | Confirmação manual de e-mail com justificativa | `users:manage` |
| `POST` | `/api/admin/users/[id]/suspend` | Suspensão da conta e encerramento de sessões | `users:manage` |
| `POST` | `/api/admin/users/[id]/reactivate` | Reativação da conta com justificativa | `users:manage` |
| `POST` | `/api/admin/users/[id]/revoke-sessions`| Revogação remota de sessões ativas | `users:manage` |
| `PATCH` | `/api/admin/users/[id]/permissions` | Configuração de permissões granulares | `SUPER_ADMIN` |
| `POST` | `/api/admin/users/[id]/entitlements` | Criação de concessão temporária de plano | `plans:manage` |
| `DELETE` | `/api/admin/users/[id]/entitlements` | Revogação de concessão temporária | `plans:manage` |
| `POST` | `/api/admin/users/credits/adjust` | Adição ou retirada de créditos no estúdio | `credits:manage` |

---

## 5. Manual de Operação Passo a Passo

### Como Confirmar Manualmente o E-mail de um Usuário
1. Acesse o menu **Usuários** em `/admin/users`.
2. Localize o usuário desejado pela busca de e-mail ou nome.
3. Clique em **"Prontuário ➔"** para abrir a tela `/admin/users/[id]`.
4. No card superior de identificação, ao lado do badge de "E-mail Pendente", clique no botão **"Confirmar E-mail Manualmente"**.
5. Insira a justificativa formal (ex: *Confirmação solicitada via chamado de suporte #1042*).
6. Confirme a operação. O status será atualizado imediatamente e o registro de auditoria gerado.

### Como Adicionar ou Retirar Créditos de um Usuário
1. Na página `/admin/users/[id]`, localize o card **Saldo Disponível** e clique em **"Ajustar Créditos"**.
2. Selecione a operação: **Adicionar Créditos (+)** ou **Retirar Créditos (-)**.
3. Informe a quantidade numérica inteira.
4. Digite a justificativa obrigatória (ex: *Compensação por lentidão temporária na API* ou *Estorno acordado formalmente*).
5. Clique em **"Confirmar Ajuste"**. O saldo será recalculado e a nova entrada registrada no extrato.
