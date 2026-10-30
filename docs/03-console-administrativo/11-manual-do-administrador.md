# 15 — Manual Geral de Operação do Administrador da Plataforma

Este manual serve como guia de referência rápida e operacional para operadores e super administradores do **CinePrompt Studio AI (Tomadix)**.

---

## 1. Visão Geral e Estrutura de Papéis Administrativos

O acesso ao painel administrativo (`/admin`) é restrito a contas que possuam `platformRole` superior a `USER`:

| Papel | Nível de Acesso | Responsabilidades Principais |
| :--- | :---: | :--- |
| **`SUPER_ADMIN`** | Nível Máximo | Gestão de administradores, concessão de permissões granulares, exclusão definitiva de projetos e configurações de infraestrutura. |
| **`ADMIN`** | Operacional | Suporte a usuários, confirmação de e-mails, suspensão/reativação, ajuste de créditos, transferência de projetos e gestão comercial. |
| **`USER`** | Usuário Final | Sem acesso ao painel `/admin`. Acesso restrito aos estúdios/workspaces aos quais pertence. |

> [!IMPORTANT]
> **Regra de Segurança Inegociável:**
> 1. Um administrador não pode elevar seu próprio papel nem alterar suas próprias permissões.
> 2. O último `SUPER_ADMIN` da plataforma não pode ser rebaixado nem excluído.
> 3. Toda ação administrativa exige justificativa formal e é registrada na trilha imutável de auditoria.

---

## 2. Guia de Operação: Gestão de Usuários (`/admin/users`)

### 2.1. Localização e Filtros de Contas
- Acesse `/admin/users`.
- Utilize a barra de pesquisa para buscar por nome ou e-mail.
- Filtre por papel (`SUPER_ADMIN`, `ADMIN`, `USER`) ou status (`TODOS`, `ATIVOS`, `SUSPENSOS`).
- Clique no nome do usuário ou no botão **"Prontuário ➔"** para abrir o dossiê individual do cliente (`/admin/users/[id]`).

### 2.2. Confirmação Manual de E-mail
- **Quando usar**: Quando o cliente entrar em contato com o suporte informando que não recebeu o link de verificação.
- **Passo a passo**:
  1. No prontuário do usuário, clique em **"Confirmar E-mail Manualmente"**.
  2. Insira o motivo formal (ex: *Confirmação solicitada via ticket #8041 com validação de identidade*).
  3. Confirme. O e-mail passará ao status confirmado e o evento será gravado na auditoria com o carimbo do operador.

### 2.3. Adição ou Retirada de Créditos
- **Quando usar**: Bônus promocionais, compensação por instabilidade temporária ou estornos acordados.
- **Passo a passo**:
  1. No prontuário do usuário, clique em **"Ajustar Créditos"**.
  2. Escolha **"Adicionar Créditos (+)"** ou **"Retirar Créditos (-)"**.
  3. Informe o valor inteiro.
  4. Preencha a justificativa obrigatória.
  5. Confirme. *(O sistema valida o saldo disponível e bloqueia retiradas que deixariam o saldo negativo)*.

### 2.4. Concessão Temporária de Plano (Entitlement Override)
- **Quando usar**: Conceder acesso temporário de cortesia a um plano superior (ex: `ENTERPRISE` por 7 ou 14 dias para um diretor ou cliente VIP).
- **Passo a passo**:
  1. Na aba *Plano & Concessões*, clique em **"Nova Concessão de Plano"**.
  2. Selecione o plano concedido e defina a data de expiração.
  3. Insira o motivo formal e confirme. Ao expirar o prazo, o sistema reverterá automaticamente o acesso ao plano contratado.

### 2.5. Alteração Efetiva de Plano do Estúdio (Definitivo)
- **Quando usar**: Upgrade ou downgrade comercial de longo prazo acordado com o cliente, sem necessidade de depender de concessões temporárias com data de expiração.
- **Passo a passo**:
  1. No prontuário do usuário (`/admin/users/[id]`), acesse a aba **"Plano & Concessões"**.
  2. Clique no botão **"Alterar Plano Efetivo"**.
  3. Selecione o novo plano pretendido (`FREE`, `PRO`, `TEAM` ou `ENTERPRISE`).
  4. Marque a opção de **conceder os créditos mensais do novo plano imediatamente** caso acordado comercialmente.
  5. Insira a justificativa formal obrigatória e confirme.
  6. O sistema limpa automaticamente qualquer snapshot restritivo anterior (*grandfathered contract*), libera as quotas do novo plano (inclusive quotas ilimitadas de projetos e membros) e atualiza a assinatura real.

### 2.6. Suspensão e Desconexão Forçada de Conta
- **Quando usar**: Violação grave dos termos de serviço, fraude ou requisições maliciosas.
- **Passo a passo**:
  1. Clique em **"Suspender Conta"**.
  2. Insira a justificativa formal detalhada.
  3. Ao confirmar, a conta é marcada como `SUSPENSA` e **todas as sessões ativas do usuário são imediatamente revogadas**, impedindo qualquer chamada à API.

---

## 3. Guia de Operação: Transferência de Projetos (`/admin/projects`)

### 3.1. Transferência Individual de Titularidade
1. Acesse `/admin/projects`.
2. Localize o projeto cinematográfico e clique em **"Transferir"**.
3. Selecione o workspace de destino e digite a justificativa formal.
4. Caso o destinatário esteja no limite de projetos do plano, você pode autorizar a exceção marcando a opção auditada.
5. Confirme. Todas as cenas, personagens, ambientes e parâmetros serão preservados intactos.

### 3.2. Transferência em Lote de Acervo
1. Na lista de projetos, selecione múltiplos projetos pelas caixas de seleção.
2. Clique no botão de ação em massa **"Transferir Selecionados"**.
3. Indique o workspace destinatário e o motivo. A operação será processada em uma transação atômica única.

### 3.3. Restauração de Propriedade
1. Clique na aba **"Histórico de Transferências"**.
2. Localize a transferência anterior e clique em **"Restaurar Propriedade"**.
3. O projeto retornará ao workspace de origem de forma auditada.

---

## 4. Guia de Operação: Limites, Custos e Renovação de Créditos (`/admin/credits` e `/admin/billing`)

### 4.1. Configuração de Custos por Tipo de Criação (`/admin/credits`)
1. Acesse o menu lateral na seção **Gestão** e clique em **"Tabela de Créditos"** (`/admin/credits`).
2. Utilize os filtros de categoria para navegar entre:
   - `Prompts de IA` (imagens, vídeos, bíblia visual e aprimoramento).
   - `Cenas & Roteiro` (decupagens, roteiros e expansões).
   - `Personagens & Ambientes` (perfis dramáticos e locações).
   - `Multimodal & Estúdio` (análise cinematográfica computacional e barra de criação rápida).
   - `Processamento & Lote` (gerações simultâneas).
3. Para cada operação:
   - Clique em **"Editar Custo"** para alterar o valor padrão em créditos consumido pelo estúdio.
   - Ative a opção **"Operação Gratuita"** para isentar todos os usuários daquela cobrança.
   - Clique em **"Regras por Plano"** para definir valores específicos ou gratuidades para assinantes `FREE`, `PRO`, `TEAM` ou `ENTERPRISE`.
4. Salve as alterações. O motor de execução em créditos passa a cobrar o novo valor imediatamente.

### 4.2. Simulador de Custos em Tempo Real
- Na parte inferior de `/admin/credits` ou em `/admin/billing`, utilize o simulador interativo para testar o custo final de qualquer operação antes de confirmar alterações comerciais.

### 4.3. Criação de Políticas de Renovação Automática
1. Na seção *Sistema Configurável de Renovação de Créditos*, clique em **"+ Nova Política"**.
2. Defina:
   - **Plano Alvo**: `FREE`, `PRO`, `TEAM` ou `ENTERPRISE`.
   - **Periodicidade**: Diária, Semanal, Mensal, Anual ou Única.
   - **Quantidade de Créditos**: Volume a ser creditado em cada ciclo.
   - **Acúmulo**: Se o saldo acumula com o mês anterior ou se substitui o saldo remanescente.
3. Salve a política.

### 4.4. Disparo Manual do Ciclo de Renovação
- Clique no botão **"⚡ Executar Ciclo de Renovação"** para forçar o processamento de recargas. A rotina possui **chave de idempotência temporal**, garantindo que nenhum usuário receba créditos em duplicidade no mesmo período.

---

## 5. Perguntas Frequentes e Resolução de Problemas (FAQ)

### O usuário informa que não consegue gerar prompts por "Saldo Insuficiente", mas seu plano prevê renovação mensal. O que verificar?
1. Abra o prontuário do usuário em `/admin/users/[id]`.
2. Verifique o status da assinatura na aba *Plano & Concessões*: se a assinatura estiver com status `PAST_DUE` (pagamento pendente), o sistema bloqueia renovações automáticas até a regularização pelo gateway.
3. Na aba *Extrato & Ledger*, consulte o histórico de transações para verificar o último ciclo de recarga ou consumo recente.

### Como garantir que um projeto transferido não perca personagens e cenas?
- O modelo relacional do Tomadix vincula cenas, personagens e ambientes diretamente ao `projectId`. A transferência altera apenas o `workspaceId` mantenedor do projeto em transação atômica. Nenhuma entidade filha é excluída ou desconectada.

### Um administrador pode excluir logs de auditoria para limpar o histórico?
- **Não.** A tabela `PlatformAuditLog` é estritamente imutável (append-only). Não existem endpoints de exclusão ou edição de logs de auditoria na API da plataforma, assegurando conformidade jurídica e rastreabilidade total perante a LGPD.
