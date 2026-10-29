# 14 — Central de Custos em Créditos e Políticas de Renovação

Este documento estabelece as especificações arquiteturais, os modelos de dados, o fluxo de cobrança de IA e o manual de operação para a **Central de Limites, Recursos, Custos e Renovação de Créditos** (`/admin/billing` — Aba *4. Limites, Recursos & Custos*) do CinePrompt Studio AI (Tomadix).

Nenhum valor comercial ou custo de operação fica disperso em constantes estáticas ou arquivos de configuração que exijam novos deploys de código. Todas as regras são gerenciadas dinamicamente via banco de dados e aplicadas estritamente no servidor.

---

## 1. Catálogo Dinâmico de Operações Cobradas (`CreditOperation`)

Cada operação de inteligência artificial ou geração cinematográfica possui um código único, estável e auditado:

```prisma
model CreditOperation {
  id                String              @id @default(cuid())
  code              String              @unique
  name              String
  description       String?
  category          String
  defaultCreditCost Int
  isFree            Boolean             @default(false)
  isActive          Boolean             @default(true)
  version           Int                 @default(1)
  pricingRules      CreditPricingRule[]
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
}
```

### Operações Padrão Pré-Carregadas (Seed)

| Código da Operação | Nome de Apresentação | Categoria | Custo Padrão | Descrição |
| :--- | :--- | :--- | :---: | :--- |
| `GEN_CHARACTER` | Geração de Personagem | `CHARACTERS` | 5 cr | Criação de ficha e perfil cinematográfico de atuação |
| `GEN_ENVIRONMENT` | Geração de Ambiente | `ENVIRONMENTS` | 3 cr | Concepção de iluminação visual e espaço cênico |
| `GEN_VISUAL_BIBLE` | Geração de Bíblia Visual | `PREMIUM` | 10 cr | Compilação estética completa com direção de arte |
| `GEN_IMAGE_PROMPT` | Geração de Prompt de Imagem | `PROMPTS` | 2 cr | Prompt estruturado para Midjourney, Flux, SD |
| `GEN_VIDEO_PROMPT` | Geração de Prompt de Vídeo | `PROMPTS` | 8 cr | Instruções para Runway Gen-3, Kling, Sora, Luma |
| `GEN_SCENE_SEQUENCE` | Geração de Sequência de Cenas| `SCENES` | 12 cr | Estruturação seriada de cenas e enquadramentos contínuos |
| `GEN_SCRIPT` | Geração de Roteiro Completo | `SCENES` | 15 cr | Roteiro técnico com diálogos e rubricas de direção |
| `REWRITE_ENHANCE` | Aprimoramento de Prompt | `EXPANSIONS` | 2 cr | Otimização de lente, iluminação e atmosfera |
| `EXPAND_SCENE` | Expansão de Cena | `EXPANSIONS` | 4 cr | Desdobramento de sub-planos e variação de ângulo |
| `BATCH_GENERATION` | Geração em Lote | `BATCH` | 20 cr | Processamento paralelo simultâneo de múltiplos prompts |

Novas operações podem ser cadastradas a qualquer momento diretamente pelo painel administrativo.

---

## 2. Regras Específicas por Plano (`CreditPricingRule`)

O administrador pode definir descontos ou gratuidades condicionadas ao plano do assinante:

```prisma
model CreditPricingRule {
  id             String          @id @default(cuid())
  operationId    String
  operation      CreditOperation @relation(fields: [operationId], references: [id], onDelete: Cascade)
  planTier       PlanTier?       // FREE, PRO, TEAM, ENTERPRISE
  creditCost     Int
  isFree         Boolean         @default(false)
  effectiveFrom  DateTime        @default(now())
  effectiveUntil DateTime?
  priority       Int             @default(1)
  isActive       Boolean         @default(true)
  version        Int             @default(1)
  createdAt      DateTime        @default(now())
}
```

*Exemplo:* A operação `GEN_CHARACTER` custa 5 créditos no plano `FREE`, mas pode ser configurada para custar 2 créditos no plano `PRO` e ser gratuita (`isFree: true`, 0 créditos) no plano `ENTERPRISE`.

---

## 3. Resolução Hierárquica Determinística de Custo (`resolveCost`)

O serviço `CreditPricingService.resolveCost(operationCode, planTier)` resolve o valor cobrado com base na seguinte precedência rigorosa:

```mermaid
flowchart TD
    Req([Requisição de IA no Servidor]) --> OpCheck{Operação existe no catálogo?}
    OpCheck -- Não --> Fallback[Regra de Fallback Seguro: 1 crédito / SYSTEM_FALLBACK]
    OpCheck -- Sim --> ActiveCheck{Operação está Ativa?}
    ActiveCheck -- Não --> Block[Bloquear Operação com Erro Explícito]
    ActiveCheck -- Sim --> PlanRule{Existe regra específica para o Plano do Usuário?}
    PlanRule -- Sim --> ApplyPlan[Aplicar Custo da Regra por Plano / PLAN_SPECIFIC]
    PlanRule -- Não --> DefaultRule[Aplicar Custo Padrão da Operação / OPERATION_DEFAULT]
    ApplyPlan --> Ledger[(Registrar Débito no CreditLedger com Versão)]
    DefaultRule --> Ledger
    Fallback --> Ledger
```

**Garantias de Segurança:**
1. **Sem Gratuidade Silenciosa**: Se uma operação não estiver cadastrada ou uma regra falhar, ela nunca é tratada como gratuita por engano.
2. **Imutabilidade Histórica**: Alterações de preço futuras não alteram o histórico de débitos passados no ledger.
3. **Validação Server-Side**: O custo é sempre recalculado no servidor; valores enviados pelo frontend são completamente ignorados.

---

## 4. Simulador de Custos em Tempo Real

Disponível no painel administrativo (`CreditPricingTab`), o simulador permite que o operador selecione qualquer combinação de Operação e Plano de Assinatura para visualizar:
- Custo efetivo resolvido em créditos.
- Regra aplicada (`PLAN_SPECIFIC`, `OPERATION_DEFAULT`, `SYSTEM_FALLBACK`).
- Versão ativa da regra.
- Indicação visual se a operação é tarifada ou gratuita.

---

## 5. Sistema Configurável de Renovação de Créditos (`CreditRenewalPolicy`)

O sistema permite configurar concessões periódicas automatizadas e idempotentes de créditos:

```prisma
model CreditRenewalPolicy {
  id             String    @id @default(cuid())
  name           String
  description    String?
  planTier       PlanTier? // FREE, PRO, TEAM, ENTERPRISE
  creditsAmount  Int
  frequency      String    // DAILY, WEEKLY, MONTHLY, YEARLY, ONCE
  moment         String    @default("CYCLE_RENEWAL")
  accumulate     Boolean   @default(false)
  maxAccumulated Int?
  expirationDays Int?
  priority       Int       @default(1)
  isActive       Boolean   @default(true)
  startsAt       DateTime  @default(now())
  endsAt         DateTime?
  createdAt      DateTime  @default(now())
}
```

### 5.1. Periodicidades Suportadas
- **`DAILY`**: Concessão diária (ex: 5 créditos/dia para o plano `FREE`).
- **`WEEKLY`**: Concessão semanal.
- **`MONTHLY`**: Recarga mensal (ex: 100 créditos/mês para o plano `PRO`).
- **`YEARLY`**: Cota anual de créditos.
- **`ONCE`**: Concessão única promocional ou de onboarding.

### 5.2. Chave de Idempotência e Concorrência Segura
O método `CreditRenewalService.executeRenewalJob()` cria uma chave de idempotência exclusiva para cada workspace e ciclo temporal:

$$\text{idempotencyKey} = \text{"renewal\_"} + \text{policyId} + \text{"\_"} + \text{workspaceId} + \text{"\_"} + \text{cycleMarker}$$

* Se o job for executado repetidas vezes no mesmo dia ou mês, o sistema identifica a concessão já registrada no `CreditLedger` e ignora o workspace (`skippedCount++`), **impedindo duplicidade de créditos**.
* Se a assinatura estiver com status `PAST_DUE`, `UNPAID` ou `CANCELED`, o estúdio é ignorado até que a regularização financeira seja confirmada pelo gateway de pagamento.

### 5.3. Política de Acúmulo de Saldo (`accumulate`)
- **`accumulate: true`**: Os novos créditos são somados ao saldo remanescente. Opcionalmente, pode ser definido um teto máximo (`maxAccumulated`).
- **`accumulate: false`**: O saldo anterior é substituído pela nova cota caso o saldo atual seja inferior à cota da política.

---

## 6. Endpoints da API (`/api/admin/billing`)

| Método | Rota | Descrição | Permissão |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/billing/credit-operations` | Lista catálogo de operações cobradas | `plans:manage` |
| `POST` | `/api/admin/billing/credit-operations` | Cadastra nova operação no catálogo | `plans:manage` |
| `POST` | `/api/admin/billing/credit-operations/[id]/rules` | Cria regra de preço para plano específico | `plans:manage` |
| `DELETE`| `/api/admin/billing/credit-operations/[id]/rules` | Remove regra de preço específica | `plans:manage` |
| `POST` | `/api/admin/billing/credit-operations/simulate` | Simula a resolução de custo em tempo real | `plans:manage` |
| `GET` | `/api/admin/billing/credit-renewal` | Lista políticas de renovação de créditos | `plans:manage` |
| `POST` | `/api/admin/billing/credit-renewal` | Cria nova política de renovação de créditos | `plans:manage` |
| `PATCH` | `/api/admin/billing/credit-renewal/[id]` | Atualiza política de renovação existente | `plans:manage` |
| `DELETE`| `/api/admin/billing/credit-renewal/[id]` | Remove política de renovação | `plans:manage` |
| `POST` | `/api/admin/billing/credit-renewal/run-job` | Dispara o job de renovação em lote | `plans:manage` |

---

## 7. Manual Prático de Operação para Administradores

### Como Definir que uma Operação seja Gratuita para o Plano PRO
1. Acesse `/admin/billing` e clique na aba **"4. Limites, Recursos & Custos"**.
2. Na tabela *Catálogo de Custos em Créditos por Operação*, localize a operação desejada (ex: `Geração de Prompt de Imagem`).
3. Clique no botão **"+ Regra por Plano"**.
4. No modal:
   - Selecione o plano: `PRO`.
   - Marque a caixa de seleção: **"Operação gratuita neste plano"**.
5. Clique em **"Salvar Regra"**.
6. No *Simulador de Custo*, selecione a operação e o plano `PRO` para confirmar que o custo efetivo passou a ser `0 Créditos (Gratuito)`.

### Como Disparar o Ciclo de Renovação Manualmente
1. Na mesma aba, role até a seção *Sistema Configurável de Renovação de Créditos*.
2. Clique no botão **"⚡ Executar Ciclo de Renovação"**.
3. Confirme a execução no diálogo de confirmação.
4. O sistema exibirá o resumo instantâneo: total de estúdios analisados, total renovado com sucesso e total ignorado por já ter sido renovado no período.
