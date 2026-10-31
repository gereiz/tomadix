# Entrega Técnica: Reordenação da Ordem de Exibição dos Planos na Vitrine

**Data:** 31 de Outubro de 2026  
**Responsável:** Antigravity Full-Stack Agent  
**Módulos Envolvidos:** Console Administrativo (`/admin/billing`), Catálogo Comercial (`BillingService`, `AdminBillingService`), Vitrine Pública de Planos (`/pricing`)

---

## 1. Contexto e Necessidade

Na Central de Gestão Comercial e Planos, os planos eram listados sem uma forma interativa e visual de reordenar a sequência de exibição na página de planos dos usuários (`/pricing`). Isso fazia com que planos ficassem dispostos em ordem arbitrária na vitrine.

O objetivo desta implementação foi disponibilizar na Central de Planos uma interface intuitiva para alterar a ordem de exibição dos planos, com persistência transacional no banco de dados e sincronização imediata na vitrine dos usuários.

---

## 2. Arquitetura da Solução

### 2.1 Backend e Banco de Dados
* **Persistência do Campo `displayOrder`:** O modelo `Plan` do Prisma já possuía o campo `displayOrder Int @default(0)`.
* **Serviço Administrativo (`AdminBillingService.reorderPlans`):**
  - Recebe a lista ordenada de planos (`orderedTiers`).
  - Executa uma transação atômica (`db.$transaction`) atualizando `displayOrder = index + 1` para cada plano.
  - Registra evento de auditoria (`AdminAuditService.logAction`) sob a ação `PLAN_REORDER`.
* **Preservação em Edições Individuais (`AdminBillingService.upsertPlan`):**
  - Ajustado para aceitar `displayOrder` explicitamente no formulário de edição e preservar o valor existente quando o campo não for alterado, evitando resets acidentais para zero.
* **Consulta da Vitrine Pública (`BillingService.listPlans`):**
  - Garante a ordenação determinística por `displayOrder ASC, priceMonthly ASC`.

### 2.2 Endpoints de API
* **`PUT /api/admin/billing/plans/reorder`:** Endpoint autenticado para administradores (`plans:manage`), aceitando a nova lista ordenada de planos e retornando o catálogo reordenado.
* **`export const dynamic = "force-dynamic"`:** Adicionado nas rotas de catálogo de planos para garantir que qualquer reordenação seja entregue sem cache estático em rotas públicas ou administrativas.

### 2.3 Interface no Console Administrativo (`/admin/billing` - Aba "Planos & Preços")
* **Barra Informativa Superior:** Orienta o administrador sobre como a posição nesta tela espelha a vitrine pública (`/pricing`).
* **Botão "Ordem Padrão (Free → Pro → Team → Enterprise)":** Atalho com 1 clique para restabelecer a sequência recomendada.
* **Badge de Posição em Cada Card:** Exibe `Posição #X na Vitrine` no topo do card.
* **Botões de Troca de Posição (◀ e ▶):** Permitem mover o plano para a esquerda ou direita com atualização otimista na tela e feedback visual imediato.
* **Edição Numérica de Ordem:** No modal "Editar Plano", um campo dedicado permite digitar diretamente a posição desejada.

---

## 3. Validação e Testes Automatizados

Criada a suíte [`tests/plan-display-order.test.ts`](file:///c:/CURSOS/tomadix/tests/plan-display-order.test.ts) com 4 testes automatizados em Vitest:
* `deve reordenar os planos para a ordem convencional (FREE -> PRO -> TEAM -> ENTERPRISE)`: **Aprovado**.
* `deve permitir inverter ou personalizar a ordem da vitrine para destacar planos pagos primeiro`: **Aprovado**.
* `deve preservar o displayOrder ao salvar edição de plano via upsertPlan`: **Aprovado**.
* `deve atualizar displayOrder quando fornecido explicitamente no upsertPlan`: **Aprovado**.
* **TypeScript Check (`tsc --noEmit`):** 0 erros.

