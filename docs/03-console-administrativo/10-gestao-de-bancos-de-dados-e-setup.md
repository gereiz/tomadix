# Console Administrativo: Gestão de Banco de Dados e Setup da Plataforma

A área de **Gestão de Banco de Dados** (`/admin/settings/database` e na aba *Banco de Dados & Infra* de `/admin/settings`) permite testar conectividade e latência, alterar o ambiente de banco de dados utilizado pela aplicação e inicializar uma nova instalação do Tomadix de forma totalmente automatizada e idempotente.

---

## 1. Conexão Ativa & Métricas em Tempo Real

A interface apresenta o estado real da instância conectada sem expor senhas ou tokens sensíveis:

- **Status Operacional:** Indicador pulsante em tempo real (*Conectado*, *Falha de Autenticação*, *Inacessível*, *Timeout*).
- **Latência Round-Trip & Query:** Medição em milissegundos do tempo de ida e volta da rede e tempo de execução da consulta `SELECT 1`.
- **Tabelas Ativas:** Contagem de tabelas em `information_schema.tables WHERE table_schema = 'public'`.
- **Ambiente Detectado:** Identifica se o banco é uma instância Supabase (com detecção de PgBouncer Pooler na porta `6543`), PostgreSQL Remoto ou PostgreSQL Local (`localhost:5432`).
- **Parâmetros Técnicos Seguros:** Host mascarado (ex: `aws-0-***.pooler.supabase.com`), porta, nome do banco, usuário mascarado e versão do motor (`PostgreSQL 15+`).
- **Botão de Teste Rápido:** Executa a verificação em tempo real a qualquer momento.

---

## 2. Testar ou Alterar Conexão com o Banco de Dados

Permite que o administrador aponte a aplicação para um novo banco de dados (local, nuvem ou Supabase):

### 2.1. Tipos de Conexão Suportados
1. **Supabase Hospedado:** Suporte a Transaction Pooler na porta `6543` (`DATABASE_URL`) com configuração opcional de `DIRECT_URL` na porta `5432` para migrations.
2. **PostgreSQL Remoto:** AWS RDS, Neon, Google Cloud SQL, Railway, Render.
3. **PostgreSQL Local:** `localhost:5432` com SSL desativado por padrão.
4. **String / URL Direta:** Campo para inserção de string de conexão completa `postgresql://...`.

### 2.2. Regras Rígidas de Segurança
- **Teste Prévio Obrigatório:** Antes de salvar, o sistema estabelece uma conexão temporária isolada. Se o teste falhar (por exemplo, senha incorreta ou host inacessível), a conexão ativa é mantida intacta e a substituição é bloqueada.
- **Backup Automático do `.env`:** Antes de sobrescrever o arquivo de configuração, o servidor gera automaticamente um backup timestamped (ex: `.env.backup.<timestamp>`).
- **Auditoria Administrativa:** Toda troca de banco é registrada em `PlatformAuditLog` sob a ação `DATABASE_CONNECTION_CHANGED` com dados mascarados.

---

## 3. Assistente de Inicialização da Plataforma (Setup Wizard)

O Setup Wizard prepara um banco de dados novo ou existente para o funcionamento completo do Tomadix em 4 etapas visuais:

### Etapa 1: Diagnóstico do Schema
- Compara a base com os **35 modelos essenciais** do schema Prisma do Tomadix (`User`, `Workspace`, `Project`, `Scene`, `Character`, `Plan`, `ParameterDefinition`, `CommercialPolicy`, etc.).
- Informa se o banco está *Vazio*, *Parcialmente Inicializado* ou *Pronto*.
- Verifica se já existe uma conta de Super Administrador.

### Etapa 2: Provisionamento do Administrador Inicial
- **Se já existir administrador:** O assistente detecta e preserva a conta existente, garantindo que senhas e dados não sejam alterados.
- **Se o banco for novo:** Solicita Nome, E-mail corporativo, Senha (mínimo 8 dígitos) e Confirmação, criando o usuário com papel `SUPER_ADMIN` e gerando o seu *"Estúdio Principal"*.

### Etapa 3: Plano de Execução & Confirmação
Apresenta o resumo de todas as ações idempotentes que serão executadas:
- Sincronização do schema Prisma (criação apenas de tabelas ausentes).
- Cadastro/atualização dos 4 planos oficiais (`FREE`, `PRO`, `TEAM`, `ENTERPRISE`).
- Sincronização de todo o catálogo de parâmetros cinematográficos (lentes, câmeras, granulação, iluminação).
- Cadastro de políticas comerciais de créditos, regras de renovação e gateways de pagamento.
- Opção para criar o projeto de demonstração tutorial: *"O Brasil em VHS • Cinema Noir"* com o personagem *"Detetive Moura"*, ambiente e cena estruturados.

### Etapa 4: Conclusão & Relatório Final
- Exibe o tempo total decorrido em milissegundos e a quantidade exata de tabelas, planos e parâmetros verificados.
- Registra o evento na trilha de auditoria sob `DATABASE_INITIALIZATION_EXECUTED`.

