# 10 — Central Comercial, Gestão de Planos e Políticas Declarativas

A **Central de Gestão Comercial** do painel administrativo (`/admin/billing`) permite que operadores autorizados controlem planos, limites, cotas de créditos, preços e políticas comerciais do Tomadix sem necessidade de alterar o código-fonte da aplicação.

---

## 1. Modelo de Planos e Catálogo Dinâmico (`Plan`)

Diferente de implementações estáticas, os planos são persistidos no banco de dados com versionamento e controle de estado:
- **`commercialStatus`**: `ACTIVE`, `DRAFT`, `ARCHIVED`. Planos em rascunho ou arquivados não aparecem no catálogo público e não aceitam novos checkouts.
- **Preços em Centavos**: `priceMonthly` e `priceYearly` armazenados como números inteiros em centavos, prevenindo discrepâncias por ponto flutuante.
- **Limites e Cotas**:
  - `maxProjects`: Teto de projetos cinematográficos (-1 para ilimitado).
  - `maxMembers`: Teto de colaboradores no estúdio (-1 para ilimitado).
  - `monthlyCredits`: Créditos de IA renovados a cada ciclo de faturamento.
  - `features`: Matriz de recursos habilitados (acesso a bíblia avançada, decupagem anamórfica, exportação em lote).

---

## 2. Políticas Comerciais Declarativas (`CommercialPolicy`)

O serviço `BillingPolicyService` gerencia configurações de negócio via banco de dados com cache em memória (TTL de 60s):
- **Políticas de Créditos**:
  - `CREDIT_MONTHLY_RESET_MODE`: Expiração no fim do ciclo (`ROLLOVER_NEVER`) ou acúmulo de saldo.
  - `CREDIT_REFUND_ON_FAILURE`: Estorno automático de créditos em caso de falha da IA.
  - `CREDIT_ADMIN_MAX_GRANT`: Limite máximo de créditos que um operador admin pode conceder manualmente.
- **Políticas de Assinatura**:
  - `SUB_CANCEL_EFFECT`: Efeito do cancelamento no fim do período pago (`PERIOD_END`) ou imediato.
  - `SUB_GRACE_PERIOD_DAYS`: Dias de carência e tolerância em caso de inadimplência (padrão: 3 dias).
  - `SUB_GRANDFATHERING_DEFAULT`: Preservação automática de termos para clientes existentes.
  - `ALLOW_DIRECT_DOWNGRADE`: Se assinantes podem solicitar downgrade diretamente pelo checkout.

---

## 3. Preservação de Contratos Existentes (Grandfathering & `CommercialSnapshot`)

Quando um administrador edita o preço ou reduz os limites de um plano no catálogo:
1. O sistema detecta a alteração de termos (`isTermsChanged`).
2. Se `preserveExistingContracts === true`, gera registros formais na tabela `CommercialSnapshot` para cada assinante ativo do plano.
3. As condições originais contratadas pelo cliente permanecem congeladas e vinculadas à sua assinatura.
4. Novos clientes que assinarem a partir daquele momento contratam as novas condições vigentes.

---

## 4. Endpoints da API de Planos e Políticas

- `GET /api/admin/billing/plans`: Lista completa de planos para administradores (requer `plans:manage`).
- `POST /api/admin/billing/plans`: Criação ou atualização de plano com preservação contratual.
- `POST /api/admin/billing/plans/[tier]/archive`: Arquivamento controlado de plano comercial.
- `POST /api/admin/billing/plans/[tier]/toggle`: Ativação ou desativação de plano.
- `POST /api/admin/billing/plans/[tier]/duplicate`: Duplicação de plano existente em estado Rascunho.
- `GET /api/admin/billing/policies`: Consulta de todas as políticas comerciais (requer `policies:manage`).
- `PATCH /api/admin/billing/policies`: Atualização de política declarativa com justificativa auditável.
- `GET /api/admin/billing/snapshots`: Histórico de snapshots contratuais vigentes (requer `audit:read`).
