# 10 — Central Comercial, Gestão de Planos e Políticas Declarativas

A **Central de Gestão Comercial** do painel administrativo (`/admin/billing`) permite que operadores autorizados controlem planos, limites, cotas de créditos, preços e políticas comerciais do CinePrompt Studio AI (Tomadix) sem necessidade de alterar o código-fonte da aplicação.

---

## 1. Modelo de Planos e Catálogo Dinâmico (`Plan`)

Diferente de implementações estáticas em código, os planos são persistidos no banco de dados com versionamento e controle de estado:
- **`commercialStatus`**: `ACTIVE`, `DRAFT`, `ARCHIVED`. Planos em rascunho ou arquivados não aparecem no catálogo público e não aceitam novos checkouts.
- **Preços em Centavos**: `priceMonthly` e `priceYearly` armazenados como números inteiros em centavos, prevenindo discrepâncias por ponto flutuante.
- **Limites e Cotas por Plano**:
  - `maxProjects`: Teto de projetos cinematográficos (-1 para ilimitado).
  - `maxMembers`: Teto de colaboradores no estúdio (-1 para ilimitado).
  - `maxCharacters` / `maxEnvironments` / `maxScenes`: Limites de entidades criativas.
  - `maxConcurrentJobs`: Número de gerações simultâneas de IA permitidas (ex: 1x, 3x, 5x).
  - `rateLimitPerMin`: Taxa máxima de requisições por minuto ao motor de IA.
  - `hasPremiumTemplates`: Liberação de templates avançados de direção de fotografia.
  - `monthlyCredits`: Créditos de IA renovados a cada ciclo de faturamento.

---

## 2. Gestão de Assinaturas e Ciclo de Vida Contratual

A aba **"3. Assinaturas Ativas"** permite a supervisão integral dos contratos:
- **Estados Reais da Assinatura**: `ACTIVE`, `TRIALING`, `PAST_DUE`, `CANCELING`, `CANCELED`, `UNPAID`.
- **Ações de Suporte ao Contrato**:
  - Conceder período de teste estendido ou cortesia com prazo determinado.
  - Corrigir dados de status respeitando o contrato real do gateway de pagamento.
  - Cancelar assinatura com opção de efeito imediato ou ao término do período vigente.
  - Visualizar o próximo ciclo de cobrança e histórico financeiro.

---

## 3. Preservação de Contratos Existentes (Grandfathering & `CommercialSnapshot`)

Quando um administrador edita o preço ou reduz os limites de um plano no catálogo:
1. O sistema detecta a alteração de termos (`isTermsChanged`).
2. Se `preserveExistingContracts === true`, gera registros formais na tabela `CommercialSnapshot` para cada assinante ativo do plano.
3. As condições originais contratadas pelo cliente permanecem congeladas e vinculadas à sua assinatura.
4. Novos clientes que assinarem a partir daquele momento contratam as novas condições vigentes.

---

## 4. Integração com a Central de Custos e Renovação de Créditos

A aba **"4. Limites, Recursos & Custos"** unifica:
- A matriz comparativa de limites e direitos de cada plano.
- O catálogo dinâmico de operações cobráveis em créditos (`CreditOperation`).
- As regras de desconto e gratuidade específicas por plano (`CreditPricingRule`).
- O sistema autônomo e idempotente de renovação periódica de créditos (`CreditRenewalPolicy`).

*(Para documentação aprofundada sobre custos e renovações, consulte o documento [14-central-custos-renovacao-creditos.md](file:///c:/CURSOS/tomadix/docs/14-central-custos-renovacao-creditos.md)).*

---

## 5. Endpoints da API de Planos e Políticas

- `GET /api/admin/billing/plans`: Lista completa de planos para administradores (requer `plans:manage`).
- `POST /api/admin/billing/plans`: Criação ou atualização de plano com preservação contratual.
- `POST /api/admin/billing/plans/[tier]/archive`: Arquivamento controlado de plano comercial.
- `POST /api/admin/billing/plans/[tier]/toggle`: Ativação ou desativação de plano.
- `POST /api/admin/billing/plans/[tier]/duplicate`: Duplicação de plano existente em estado Rascunho.
- `GET /api/admin/billing/policies`: Consulta de todas as políticas comerciais (requer `policies:manage`).
- `PATCH /api/admin/billing/policies`: Atualização de política declarativa com justificativa auditável.
- `GET /api/admin/billing/snapshots`: Histórico de snapshots contratuais vigentes (requer `audit:read`).
