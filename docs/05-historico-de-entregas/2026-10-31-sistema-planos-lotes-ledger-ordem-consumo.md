# Entrega Técnica: Sistema de Planos, Lotes de Crédito, Ledger Imutável e Ordem Global de Consumo

**Data:** 31 de Outubro de 2026  
**Status:** Concluído com Sucesso  
**Escopo:** Implementação Completa das Etapas 1 a 17 da Especificação do Tomadix  

---

## 1. Sumário Executivo

Foi implementado no Tomadix um ecossistema robusto, auditável e financeiramente consistente para gestão de planos comerciais e créditos. A arquitetura substitui o modelo anterior de saldo único por um sistema de **Lotes de Crédito (`CreditLot`)**, **Livro-Razão Imutável (`CreditLedger`)**, **Ordem Global de Consumo Configurável com FEFO**, **Concessões Diárias Idempotentes** e **Simulação Dinâmica de Capacidade de Utilização ("O que você pode criar com este plano?")** calculada por divisão inteira a partir dos custos reais vigentes das funcionalidades.

---

## 2. Componentes e Entidades Implementadas

### 2.1 Modelo de Dados (Prisma & PostgreSQL no Supabase)
- **`CreditLot`**:
  - `origin`: `ADHESION`, `MONTHLY_RENEWAL`, `DAILY_RENEWAL`, `PROMOTIONAL`, `PURCHASED`, `ADMIN_OVERRIDE`, `REFUND`, `LEGACY`.
  - `status`: `ACTIVE`, `EXHAUSTED`, `EXPIRED`, `REVOKED`.
  - `amountGranted`, `amountAvailable`, `amountConsumed`.
  - `isAccumulative`: controle para expiração diária.
  - `validFrom`, `expiresAt`, `eventId` (idempotência), `planTier`, `subscriptionId`, `reason`, `metadata`.
- **`CreditConsumptionConfig`**:
  - `version`: versionamento formal de políticas.
  - `categoryPriorities`: lista ordenada de prioridades de consumo.
  - `protectedCategories`: categorias bloqueadas para consumo automático.
- **`CreditLedger`** (Expandido):
  - Relação estrita com `CreditLot` (`lotId`).
  - Registro de `origin`, `operationCode`, `idempotencyKey`, `balanceAfter`.
- **`Plan`** (Expandido):
  - `adhesionCredits`: créditos concedidos uma única vez na entrada.
  - `dailyCredits`: cota diária de créditos.
  - `dailyCreditsAccumulative`: flag de acúmulo da cota diária.
  - `isFreePlan`: identificação de plano gratuito padrão.

---

## 3. Serviços de Backend

1. **`CreditLotService` (`src/modules/billing/credit-lot.service.ts`)**:
   - `grantLot`: Concessão idempotente por `eventId` e adesão única por plano/workspace.
   - `listWorkspaceLots`: Consulta paginada com filtros por workspace, origem e status.
   - `getEligibleLotsForConsumption`: Consulta de lotes ativos ordenados por vencimento (FEFO).
   - `expireOverdueLots`: Expiração atômica de lotes vencidos e diários não-acumulativos.
   - `migrateLegacyBalances`: Migração automática e idempotente de saldos legados para lotes `LEGACY`.
   - `reconcileWorkspace`: Auditoria em tempo real entre cache, lotes e ledger.

2. **`CreditConsumptionOrderService` (`src/modules/billing/credit-consumption-order.service.ts`)**:
   - Algoritmo de ordenação composta:
     1. Prioridade da categoria definida pelo administrador.
     2. FEFO interno (lote que expira antes é consumido antes).
     3. Lotes com vencimento antes de lotes sem vencimento.
     4. Lote mais antigo de criação primeiro.
     5. Desempate determinístico por ID.
   - Bloqueio imediato de categorias protegidas.

3. **`CreditExecutionService` (`src/modules/billing/credit-execution.service.ts`)**:
   - Dedução atômica multi-lotes (`deductCredits`): Debita créditos consumindo lote por lote segundo a ordem ativa, gerando entradas individuais no `CreditLedger`.
   - Estorno proporcional (`refundCredits`): Devolve créditos aos lotes originais ou gera lote de `REFUND` caso o lote original esteja expirado ou inexistente.

4. **`CreditSimulationService` (`src/modules/billing/credit-simulation.service.ts`)**:
   - Simulação transparente da capacidade de utilização dos planos ("O que você pode criar com este plano?").
   - Utiliza exclusivamente `Math.floor(créditos / custo_unitário)` consultando `CreditPricingService` sem duplicação de cadastros.

5. **`CreditDailyMaintenanceService` (`src/modules/billing/credit-daily-maintenance.service.ts`)**:
   - Concessão diária idempotente (`daily_${workspaceId}_${yyyy-mm-dd}`) no fuso horário `America/Sao_Paulo`.
   - Expiração programada de lotes diários não-acumulativos às 23:59:59.999.

---

## 4. Endpoints de API Criados

- `GET /api/admin/credit-consumption-order`: Consulta a configuração ativa de consumo e metadados.
- `PUT /api/admin/credit-consumption-order`: Atualização da ordem e categorias protegidas.
- `POST /api/admin/credit-consumption-order`: Restauração da ordem padrão oficial (`action: "reset"`).
- `GET /api/admin/credit-lots`: Listagem paginada de lotes com filtros.
- `POST /api/admin/credit-lots`: Concessão manual auditável de lote administrativo.
- `GET /api/admin/credits/reconciliation`: Diagnóstico de consistência de saldos.
- `POST /api/admin/credits/reconciliation`: Gatilho de migração de legados e conciliação individual.
- `GET /api/billing/plans/usage-simulation`: Consulta pública/autenticada das capacidades simuladas dos planos.
- `POST /api/billing/plans/usage-simulation`: Simulação sob demanda para prévias administrativas em tempo real.
- `POST /api/cron/credits-maintenance`: Disparo da rotina diária de manutenção de lotes com suporte a `CRON_SECRET`.

---

## 5. Interfaces de Usuário Atualizadas

1. **Console Administrativo (`/admin/billing`)**:
   - Modal de Edição de Planos reestruturado com inputs de `adhesionCredits`, `dailyCredits`, `dailyCreditsAccumulative`, `isFreePlan`.
   - Tabela interativa em tempo real no modal: **"O que você pode criar com este plano?"**.
   - **Aba "12. Ordem de Consumo"**: Hierarquia reordenável com botões subir/descer, proteção de categorias e restauração do padrão oficial.
   - **Aba "13. Lotes & Conciliação"**: Painel de integridade financeira, conciliação em tempo real, visualização de lotes e migração de saldos legados.

2. **Tela Pública de Planos (`/pricing`)**:
   - Exibição destacada do breakdown de créditos (Adesão, Mensal e Diário com indicação de acúmulo).
   - Gaveta expansível **"O que posso criar com este plano? 🎬"** em cada card de plano.
   - Linhas correspondentes adicionadas à tabela comparativa de recursos.

---

## 6. Verificação e Testes

- **Testes Automatizados:** `tests/credit-lots-and-consumption-order.test.ts` cobrindo 12 cenários críticos com 100% de sucesso.
- **Checagem de Tipos TypeScript:** `npx tsc --noEmit -p .` executado com **0 erros**.
- **Servidor Next.js Dev:** Operacional em background sem regressões.

