# Tomadix - Plano de Backup, Continuidade e Recuperação de Desastres (DRP)

Este documento estabelece a política operacional, cronograma, responsabilidades e procedimentos de contingência e restauração do banco de dados e estado da aplicação para o ambiente de produção do **Tomadix**.

---

## 1. Objetivos de Recuperação (SLAs de Continuidade)

| Métrica | Meta Operacional | Descrição |
| :--- | :--- | :--- |
| **RPO (Recovery Point Objective)** | **≤ 5 minutos** | Tolerância máxima de perda de dados em caso de falha catastrófica. Viabilizado por gravação contínua de Write-Ahead Logging (WAL) via Supabase PITR. |
| **RTO (Recovery Time Objective)** | **≤ 30 minutos** | Tempo máximo tolerável para restauração completa dos serviços e reconexão das aplicações em um novo banco ou ponto recuperado. |
| **Retenção Ativa de Backups** | **30 dias** | Janela contínua de Point-in-Time Recovery (PITR) segundo a segundo. |
| **Retenção de Arquivo Frio** | **5 anos** | Dumps mensais criptografados mantidos em Cloud Storage com retenção imutável para conformidade fiscal (Art. 173 CTN). |

---

## 2. Estratégia e Frequência de Backups

### 2.1 Backups Contínuos (PITR - Point-in-Time Recovery)
- **Mecanismo:** PostgreSQL Write-Ahead Logs (WAL) com arquivamento contínuo para bucket criptografado em repouso (AES-256).
- **Provedor:** Supabase Enterprise / Pro com PITR ativado.
- **Granularidade:** Restauração granular para qualquer segundo dentro da janela de 30 dias.
- **Escopo:** Todas as tabelas relacionais, índices, sequências, dados de auditoria (`PlatformAuditLog`), transações financeiras (`Invoice`, `PaymentWebhookEvent`), projetos, roteiros e dados de privacidade (`ConsentRecord`, `DataSubjectRequest`).

### 2.2 Snapshots Lógicos Diários e Pré-Deploy
- **Mecanismo:** Backup lógico completo utilizando `pg_dump` com compressão e criptografia.
- **Periodicidade:**
  - **Diário:** Executado automaticamente às 03:00 UTC (horário de menor tráfego).
  - **Ad-hoc (Pré-Deploy):** Obrigatório antes de qualquer execução de `prisma migrate deploy` contendo alterações estruturais DDL.

---

## 3. Matriz de Responsabilidades (RACI)

| Papel | Responsável Primário | Atribuições |
| :--- | :--- | :--- |
| **SRE / DevOps Lead** | Engenheiro de Infraestrutura | Configuração do PITR, monitoramento de integridade dos backups, execução de simulações periódicas. |
| **Database Administrator (DBA)** | Engenheiro de Dados / Backend | Validação de migrações, scripts de restauração e integridade de integridade referencial pós-recuperação. |
| **Security & Privacy Officer** | Encarregado de Proteção (DPO) | Garantir que dados restaurados mantenham o estado de exclusão e revogação exigidos por solicitações de DSR (LGPD). |

---

## 4. Procedimentos de Restauração (Runbook Passo a Passo)

> **Regra de Ouro:** *Nenhum backup é considerado válido sem que a capacidade de restauração tenha sido verificada e testada periodicamente.*

### 4.1 Cenário A: Restauração Via Point-in-Time Recovery (Supabase Console)
Utilizado para erros operacionais (ex: drop acidental de dados, corrupção lógica de schema):

1. **Acessar o Painel do Supabase:**
   Navegue até `Database` > `Backups` > `Point in Time Recovery`.
2. **Definir o Ponto de Restauração:**
   Selecione a data e hora exata (em UTC) imediatamente anterior ao incidente identificado nos logs de auditoria (`PlatformAuditLog`).
3. **Instanciar Novo Projeto / Fork:**
   O Supabase provisionará uma nova instância de banco de dados restaurada no segundo especificado.
4. **Verificação de Integridade Pós-Restore:**
   Conecte-se à nova instância e execute a query de verificação:
   ```sql
   SELECT count(*) FROM "User";
   SELECT count(*) FROM "Project";
   SELECT count(*) FROM "Invoice";
   SELECT count(*) FROM "ConsentRecord";
   ```
5. **Comutação de Tráfego:**
   Atualize as variáveis de ambiente `DATABASE_URL` e `DIRECT_URL` na plataforma de hospedagem (Vercel) e execute um redeploy atômico.

### 4.2 Cenário B: Restauração Manual via pg_dump / pg_restore (Linha de Comando)
Utilizado em caso de migração de emergência entre provedores ou restore em ambiente de homologação:

1. **Gerar Snapshot Lógico (Backup):**
   ```bash
   pg_dump -h db.YOUR_REF.supabase.co -U postgres -d postgres -F c -b -v -f tomadix_prod_backup.dump
   ```
2. **Criar Banco Alvo Limpo:**
   ```sql
   CREATE DATABASE tomadix_recovery;
   ```
3. **Executar Restauração:**
   ```bash
   pg_restore -h db.YOUR_TARGET.supabase.co -U postgres -d tomadix_recovery -v --clean --no-owner --no-privileges tomadix_prod_backup.dump
   ```
4. **Alinhar Migrações Prisma:**
   ```bash
   npx prisma migrate resolve --applied <ULTIMA_MIGRATION>
   ```

---

## 5. Testes e Validação Periódica da Capacidade de Restauração

- **Frequência dos Testes:** Mensal (primeira terça-feira de cada mês).
- **Ambiente de Teste:** Projeto isolado de `Staging / Test-Restore` (nunca no banco de produção ativo).
- **Critérios de Sucesso do Teste:**
  1. Restauração concluída em tempo inferior a 30 minutos (RTO cumprido).
  2. Execução da suite de testes automatizados (`npm test`) contra o banco restaurado com 100% de aprovação.
  3. Divergência de integridade de dados igual a zero nas tabelas críticas (`User`, `CreditReservation`, `Invoice`, `ConsentRecord`).
  4. Registro formal do relatório de teste assinado pelo SRE e DBA no repositório de conformidade.

---

## 6. Recuperação de Jobs Interrompidos e Falhas Concorrentes

No Tomadix, gerações de prompts e roteiros com IA dependem de serviços externos (Google Gemini API) que podem sofrer oscilações de rede ou falhas transitórias.

### 6.1 Mecanismo de Recuperação de Jobs Travados
- **Identificação:** A rotina `AdminSystemService.resolveStuckJobs()` e o script de manutenção varrem periodicamente a tabela `GenerationJob` por registros com status `PROCESSING` cujo `createdAt` ou `updatedAt` seja superior ao tempo limite estipulado (ex: 15 minutos).
- **Tratamento:**
  - O status do job é atualizado para `TIMEOUT` ou `FAILED`.
  - O erro é gravado no campo `errorMessage` estruturado.
  - A reserva de créditos correspondente (`CreditReservation`) é estornada para o usuário afetado, restaurando o saldo do workspace (`reconcileBalances`).
  - O incidente é registrado no `PlatformAuditLog` com severidade `HIGH`.
- **Prevenção de Jobs Órfãos em Reinicializações:**
  Ao iniciar o servidor ou worker assíncrono, uma rotina de boot consulta se há jobs pendentes atribuídos à instância anterior e agenda sua reavaliação ou cancelamento gracioso.

---

## 7. Riscos Identificados e Medidas Mitigadoras

| Risco | Severidade | Mitigação Implementada |
| :--- | :--- | :--- |
| **Falha de data center na região primária (ex: sa-east-1)** | Alta | O banco de dados Supabase utiliza instâncias multizona com failover automatizado. Snapshots lógicos diários são replicados para bucket em região secundária. |
| **Corrupção por migração DDL mal-sucedida** | Alta | Processo estrito de deploy: proibição de migrações automáticas destrutivas (`prisma db push` bloqueado em prod); obrigatoriedade de `prisma migrate deploy` com backup prévio. |
| **Exclusão de registros com obrigatoriedade fiscal** | Média | A exclusão de contas LGPD preserva faturas fiscais (`Invoice`) e registros de log de plataforma (`PlatformAuditLog`) com anonimização de identificadores diretos, conforme Art. 16, I da LGPD e Art. 173 do CTN. |
| **Exaustão de conexões durante failover** | Média | Conexões de produção passam obrigatoriamente pelo Supabase Supavisor Connection Pooler (porta 6543, modo transação), prevenindo saturação de sockets no reinício do banco. |
