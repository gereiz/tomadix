# 13 — Transferência e Administração de Projetos entre Usuários

Este documento especifica a arquitetura técnica, as regras de integridade e o manual de operação para a **Transferência e Gestão Global de Projetos** (`/admin/projects`) do CinePrompt Studio AI (Tomadix).

A funcionalidade permite que administradores transfiram a titularidade de projetos cinematográficos entre estúdios/workspaces de maneira 100% segura, visual e auditada, sem necessidade de manipulação manual de banco de dados.

---

## 1. Arquitetura e Modelo de Dados (`ProjectOwnershipTransfer`)

Para garantir a rastreabilidade e permitir auditorias completas ou restaurações de titularidade, cada transferência gera um registro formal no modelo Prisma:

```prisma
model ProjectOwnershipTransfer {
  id              String    @id @default(cuid())
  projectId       String
  project         Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  fromWorkspaceId String
  fromWorkspace   Workspace @relation("TransfersFrom", fields: [fromWorkspaceId], references: [id], onDelete: Cascade)
  toWorkspaceId   String
  toWorkspace     Workspace @relation("TransfersTo", fields: [toWorkspaceId], references: [id], onDelete: Cascade)
  reason          String
  adminUserId     String
  transferredAt   DateTime  @default(now())
}
```

### Relacionamentos e Integridade
- **Preservação de Dependências**: As cenas (`Scene`), personagens (`Character`), ambientes (`Environment`), parâmetros dinâmicos (`ParameterValue`), bíblia visual e histórico de versões permanecem íntegros e vinculados ao `projectId`. Apenas o `workspaceId` do projeto é reatribuído.
- **Transação Atômica (`$transaction`)**: A atualização da titularidade do projeto e o registro em `ProjectOwnershipTransfer` são executados em uma única transação atômica. Se qualquer etapa falhar, nenhuma alteração persiste.
- **Separação Financeira**: A transferência **não transfere automaticamente créditos, assinaturas ou faturas**. O projeto passa a utilizar os créditos do workspace de destino a partir do momento da transferência.

---

## 2. Regras e Validações de Transferência

Antes de efetuar qualquer transferência, o serviço `AdminProjectsService.transferProject` aplica as seguintes regras:

1. **Validação de Titularidade**: Verifica se o projeto existe e se o workspace de destino é diferente do workspace atual.
2. **Existência do Destinatário**: Confirma que o workspace de destino existe, está ativo e não arquivado.
3. **Verificação de Limites de Cota de Projeto**:
   - O sistema consulta o plano atual do workspace destinatário (`maxProjects`).
   - Se o número atual de projetos mais o(s) novo(s) projeto(s) exceder o limite contratado, a operação é bloqueada com erro descritivo.
4. **Política de Exceção Administrativa Auditada**:
   - O administrador pode marcar a opção `allowLimitOverride: true`.
   - Nesse caso, a transferência é permitida mesmo acima da cota do plano, sendo registrada como exceção com justificativa formal em `PlatformAuditLog`.
5. **Auditoria Obrigatória**: Registra o ID do administrador, nome dos workspaces envolvidos, data/hora, IP e justificativa da transferência.

---

## 3. Operações Suportadas

### 3.1. Transferência Individual
- Permite selecionar um projeto individual e transferi-lo para qualquer estúdio da plataforma.
- Pode ser acionada tanto pela Central de Projetos (`/admin/projects`) quanto diretamente pela aba *Projetos Vinculados* no prontuário do usuário (`/admin/users/[id]`).

### 3.2. Transferência em Lote (`transferProjectsBatch`)
- Permite transferir múltiplos projetos para um mesmo workspace de destino em uma única operação.
- Valida previamente se o conjunto total de projetos cabe na cota de destino antes de processar.

### 3.3. Restauração de Propriedade Anterior (`restorePreviousOwnership`)
- Permite reverter a titularidade de um projeto com base no registro em `ProjectOwnershipTransfer`.
- Devolve o projeto ao `fromWorkspaceId` original, registrando a reversão na auditoria.

### 3.4. Consulta de Histórico de Titularidade
- Visualizador com tabela cronológica de todas as transferências ocorridas na plataforma, com filtros por projeto ou por workspace.

---

## 4. Endpoints da API (`/api/admin/projects`)

| Método | Rota | Descrição | Permissão |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/projects` | Lista todos os projetos globais com filtros e titular | `projects:manage` |
| `POST` | `/api/admin/projects/[id]/transfer` | Transfere um projeto específico para outro workspace | `projects:manage` |
| `POST` | `/api/admin/projects/transfer-batch` | Transfere múltiplos projetos em lote atomicamente | `projects:manage` |
| `GET` | `/api/admin/projects/transfers` | Consulta o histórico auditado de transferências | `projects:manage` |
| `POST` | `/api/admin/projects/transfers/[id]/restore` | Restaura a propriedade anterior de um projeto | `projects:manage` |
| `DELETE` | `/api/admin/projects/[id]` | Exclusão administrativa definitiva de projeto | `SUPER_ADMIN` |

---

## 5. Manual de Uso para Operadores

### Como Transferir um Projeto entre Usuários
1. Acesse o menu **Projetos** em `/admin/projects`.
2. Localize o projeto desejado na barra de pesquisa (por título, gênero ou ID).
3. Na linha do projeto, clique no botão **"Transferir"**.
4. No modal:
   - Selecione o **Workspace de Destino** pelo seletor ou buscando pelo nome do estúdio / e-mail do proprietário.
   - Digite a **Justificativa da Transferência** (ex: *Cessão de direitos autorais solicitada pelo produtor executivo*).
   - Caso o novo proprietário esteja com a cota cheia e você possua autorização superior, marque a opção **"Permitir exceção administrativa de limite de cota"**.
5. Clique em **"Confirmar Transferência"**.
6. O projeto passará instantaneamente para o novo workspace, com todos os seus personagens, ambientes e cenas intactos.

### Como Restaurar a Propriedade de um Projeto
1. Na tela `/admin/projects`, clique na aba **"Histórico de Transferências"** (ou acesse `/api/admin/projects/transfers`).
2. Localize a transferência desejada na lista.
3. Clique em **"Restaurar Propriedade"**.
4. Insira a justificativa formal para a reversão e confirme. O projeto retornará ao workspace de origem.
