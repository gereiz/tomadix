# 10 — Central Comercial, Gestão de Planos e Políticas Declarativas

A **Central de Gestão Comercial** do painel administrativo (`/admin/billing`) permite que operadores autorizados controlem planos, limites, cotas de créditos, preços e políticas comerciais do CinePrompt Studio AI (Tomadix) sem necessidade de alterar o código-fonte da aplicação.

---

## 1. Modelo de Planos e Catálogo Dinâmico (`Plan`)

Diferente de implementações estáticas em código, os planos são persistidos no banco de dados com versionamento e controle de estado:
- **`commercialStatus`**: `ACTIVE`, `DRAFT`, `ARCHIVED`. Planos em rascunho ou arquivados não aparecem no catálogo público e não aceitam novos checkouts.
- **Preços em Centavos**: `priceMonthly` e `priceYearly` armazenados como números inteiros em centavos, prevenindo discrepâncias por ponto flutuante. O preço mensal independe da quantidade de créditos concedidos.
- **Estrutura e Concessão de Créditos**:
  - `adhesionCredits`: Créditos de adesão (boas-vindas) creditados **uma única vez** no momento da primeira contratação ou upgrade para o plano.
  - `monthlyCredits`: Créditos de ciclo renovados a cada período de faturamento mensal.
  - `dailyCredits`: Cota de créditos concedida diariamente aos assinantes ativos.
  - `dailyCreditsAccumulative`: Booleano que define se a cota diária acumula indefinidamente ou se expira no final do dia (23:59:59.999).
  - `isFreePlan`: Identificador do plano gratuito padrão da plataforma.
- **Simulação Dinâmica de Capacidade de Utilização ("O que você pode criar com este plano?")**:
  - Exibição de tabela interativa no modal administrativo e na página pública de planos calculando a capacidade máxima por divisão inteira (`Math.floor(créditos / custo_unitário)`), consultando exclusivamente as regras oficiais de `CreditOperation` e `CreditPricingRule`.
- **Limites e Cotas por Plano**:
  - `maxProjects`: Teto de projetos cinematográficos (-1 para ilimitado).
  - `maxMembers`: Teto de colaboradores no estúdio (-1 para ilimitado).
  - `maxCharacters` / `maxEnvironments` / `maxScenes`: Limites de entidades criativas.
  - `maxConcurrentJobs`: Número de gerações simultâneas de IA permitidas (ex: 1x, 3x, 5x).
  - `rateLimitPerMin`: Taxa máxima de requisições por minuto ao motor de IA.
  - `hasPremiumTemplates`: Liberação de templates avançados de direção de fotografia.

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

---

## 5. Controle da Ordem de Exibição na Vitrine de Planos (`displayOrder`)

A aba **"2. Planos & Preços"** permite que o administrador organize a ordem em que os planos aparecem para os usuários na página pública de planos (`/pricing`), sem necessidade de alterar código ou banco de dados manualmente:

1. **Reordenação Visual Rápida (Botões ◀ e ▶)**:
   - Cada card de plano na Central Comercial exibe um badge identificando sua posição atual na vitrine (ex: `Posição #1 na Vitrine`, `Posição #2 na Vitrine`).
   - Botões de ação rápida `◀` (mover para a esquerda) e `▶` (mover para a direita) realizam a troca de posição imediata com o plano adjacente.
   - A alteração é refletida em tempo real na tela através de atualização otimista e sincronizada no backend via endpoint `PUT /api/admin/billing/plans/reorder`.
2. **Definição Numérica via Edição de Plano**:
   - Ao abrir o formulário **"Editar"** de qualquer plano, o campo **"Ordem de Exibição na Vitrine"** permite definir diretamente a posição numérica desejada (`displayOrder`). Valores menores aparecem primeiro (à esquerda na página pública).
3. **Atalho de Ordem Convencional**:
   - O botão **"Ordem Padrão (Free → Pro → Team → Enterprise)"** permite restaurar em um clique a sequência clássica e comprovada de conversão SaaS.
4. **Sincronização com a Página do Usuário (`/pricing`)**:
   - A consulta pública de planos (`BillingService.listPlans()`) ordena deterministicamente por `displayOrder ASC, priceMonthly ASC`. A vitrine pública dos usuários reflete instantaneamente a ordem configurada.


---

## 5. Endpoints da API de Planos e Políticas

- `GET /api/admin/billing/plans`: Lista completa de planos para administradores (requer `plans:manage`).
- `POST /api/admin/billing/plans`: Criação ou atualização de plano com preservação contratual.
- `POST /api/admin/billing/subscriptions/[id]`: Atualização administrativa de assinatura (`status`, `planTier`, etc.).
- `POST /api/admin/users/[id]/change-plan`: Alteração efetiva de plano e quotas do usuário/workspace diretamente pela ficha de detalhes do usuário, sincronizando a assinatura (`Subscription`), créditos mensais (`monthlyCredits`) e limites de workspaces/projetos sem depender exclusivamente de overrides temporários.

---

## 7. Seção 12: Ordem Global de Consumo de Créditos (`CreditConsumptionOrderService`)

A aba **"12. Ordem de Consumo"** permite que operadores configurem a ordem em que diferentes categorias de créditos são consumidas:
- **Hierarquia de Prioridades**:
  1. `DAILY_NON_ACCUMULATIVE`: Créditos diários que expiram no fim do dia (consumidos primeiro para evitar perdas do cliente).
  2. `PROMOTIONAL`: Bônus promocionais com prazo determinado.
  3. `DAILY_ACCUMULATIVE`: Cotas diárias acumulativas.
  4. `MONTHLY_RENEWAL`: Créditos de renovação mensal do plano.
  5. `ADHESION`: Créditos de boas-vindas concedidos na entrada.
  6. `PURCHASED`: Pacotes avulsos comprados pelo usuário.
  7. `ADMIN_OVERRIDE`: Cortesias e créditos manuais.
  8. `REFUND`: Estornos concedidos.
  9. `LEGACY`: Saldos migrados pré-existentes.
- **Critério FEFO (First Expired, First Out)**: Dentro da mesma categoria, lotes com validade mais próxima de expirar são liquidados primeiro.
- **Categorias Protegidas**: Opção de travar categorias para que não sejam debitadas automaticamente.
- **Versionamento**: Toda alteração incrementa a versão da configuração com histórico de autoria.

---

## 8. Seção 13: Lotes & Conciliação Financeira (`CreditLotService`)

A aba **"13. Lotes & Conciliação"** fornece visibilidade e integridade total:
- **Listagem de Lotes**: Consulta de todos os lotes concedidos com saldo inicial, saldo disponível, saldo consumido, status e motivo.
- **Diagnóstico em Tempo Real**: Compara o saldo em cache do workspace (`creditsBalance`) com o somatório dos lotes ativos e o saldo líquido do livro-razão (`CreditLedger`), alertando sobre discrepâncias.
- **Migração de Legado**: Rotina de um clique que converte saldos pré-existentes sem lote em lotes `LEGACY` auditáveis com registro no ledger.
- **Manutenção Diária**: Disparo manual ou automatizado via cron (`/api/cron/credits-maintenance`) que concede cotas diárias com chave de idempotência (`daily_${workspaceId}_${yyyy-mm-dd}`) e expira lotes vencidos.
