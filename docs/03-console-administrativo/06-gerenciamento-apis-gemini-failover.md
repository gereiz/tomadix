# 14 — Gerenciamento de APIs Gemini & Failover Automático Multi-Chaves

O módulo de **Gerenciamento de APIs Gemini** (`/admin/settings/gemini` ou `/admin/gemini-keys`) permite que administradores cadastrem e gerenciem múltiplas API Keys do Google Gemini simultaneamente, fornecendo contingência automática, Circuit Breaker e tolerância a falhas sem interrupções para os usuários.

---

## 1. Contexto e Problema Resolvido

Anteriormente, o Tomadix dependia exclusivamente de uma única chave de API (`GEMINI_API_KEY`). Quando essa chave atingia o teto temporário de requisições por minuto (RPM) ou cota (TPM/RPD) retornando erro HTTP 429 (`RESOURCE_EXHAUSTED`), ou quando os servidores do Google enfrentavam picos de sobrecarga (HTTP 503), todas as operações de IA eram interrompidas, gerando falhas nos estúdios.

Com o novo sistema:
1. O backend consulta as chaves ativas e elegíveis no banco de dados.
2. Seleciona a chave de maior prioridade disponível.
3. Se ocorrer um erro recuperável (429, 503, timeout, etc.), aciona automaticamente a próxima chave elegível na fila.
4. O usuário recebe o resultado normalmente, sem precisar repetir a ação.
5. Os créditos são debitados exatamente uma única vez, apenas após a conclusão bem-sucedida da operação.

---

## 2. Modelagem no Banco de Dados

### 2.1 Tabela `GeminiApiKey`
- **`name`**: Nome identificador legível da chave (ex: "Chave Principal GCP Prod", "Chave Contingência 1").
- **`apiKey`**: Chave de API completa, criptografada em repouso no banco via AES-256-GCM.
- **`maskedKey`**: Versão mascarada para exibição no frontend (ex: `AIzaSy...X9kP`). A chave completa nunca é enviada ao navegador.
- **`priority`**: Prioridade numérica (1 = maior prioridade).
- **`status`**: Status operacional (`HEALTHY`, `DEGRADED`, `RATE_LIMITED`, `SUSPENDED`, `INVALID`).
- **`requestsCount`**, **`successCount`**, **`failuresCount`**, **`consecutiveFailures`**: Métricas de confiabilidade e volume.
- **`cooldownUntil`**: Timestamp de expiração do bloqueio temporário do Circuit Breaker / Rate Limit.
- **`allowedModels`**: Lista de modelos compatíveis ou vazio para todos.

### 2.2 Tabela `GeminiSettings`
- **`selectionStrategy`**:
  - `SEQUENTIAL_PRIORITY`: Usa preferencialmente a chave prioritária e só aciona contingência em caso de falha.
  - `BALANCED`: Distribui requisições em round-robin entre chaves de mesma prioridade.
  - `LEAST_USED`: Prioriza chaves com menor volume acumulado de requisições.
- **`maxConsecutiveFailures`**: Número de falhas consecutivas para acionar o Circuit Breaker (padrão: 3).
- **`cooldownSeconds`**: Tempo de espera em suspensão antes de retestar a chave (padrão: 300s = 5 min).
- **`requestTimeoutMs`**: Limite de tempo por tentativa (padrão: 45.000ms = 45s).
- **`maxAttemptsPerOperation`**: Máximo de chaves alternativas tentadas antes de falhar a operação (padrão: 3).
- **`envKeyFallbackAllowed`**: Permite contingência na variável `process.env.GEMINI_API_KEY` do servidor.

### 2.3 Tabelas `GeminiOperationLog` e `GeminiOperationAttempt`
- Registro imutável de todas as chamadas com rastreabilidade de:
  - `operationId`: Chave de idempotência da solicitação.
  - `feature`: Funcionalidade de origem (`CHARACTER_GENERATION`, `CINEMATIC_ANALYSIS`, etc.).
  - `model`: Modelo utilizado.
  - `primaryKeyName` e `finalKeyName`: Chave inicial e chave conclusiva.
  - `usedFallback`: Flag booleano indicando se a operação foi resgatada por failover.
  - `durationMs`, tokens de entrada e saída.
  - Detalhamento de cada tentativa individual no `GeminiOperationAttempt`.

---

## 3. Classificação Inteligente de Erros

O serviço [`GeminiErrorClassifier`](file:///c:/CURSOS/tomadix/src/modules/ai/gemini-error-classifier.ts) categoriza cada falha antes de decidir o fluxo:

| Código HTTP | Erro Detectado | Recuperável? | Ação do Motor de Failover |
| :--- | :--- | :---: | :--- |
| **429** | `QUOTA_EXCEEDED` / Rate Limit | **Sim** | Aplica cooldown com base no `Retry-After`, registra falha na chave e chama a próxima. |
| **503** | `SERVICE_UNAVAILABLE` / Overload | **Sim** | Registra falha temporária e chama imediatamente a próxima chave. |
| **504 / Timeout** | `TIMEOUT` / Conexão caída | **Sim** | Chama a próxima chave elegível. |
| **401 / 403** | `AUTH_ERROR` / Key Revogada | **Sim** | Marca a chave imediatamente como `INVALID`, desativa-a e chama a próxima chave. |
| **400** | `INVALID_ARGUMENT` / Prompt Ruim | **Não** | Interrompe imediatamente. Não queima outras chaves com requisição inválida. |
| **422** | `SCHEMA_VALIDATION_ERROR` | **Não** | Resposta do modelo divergiu do contrato; interrompe a operação. |
| **Safety Block** | `CONTENT_POLICY_BLOCKED` | **Não** | Conteúdo bloqueado por filtros de segurança; interrompe a operação. |

---

## 4. Circuit Breaker e Recuperação Automática

1. **Suspensão Temporária**: Quando uma chave acumula falhas consecutivas iguais a `maxConsecutiveFailures`, seu status muda para `SUSPENDED` e recebe um `cooldownUntil = now + cooldownSeconds`.
2. **Isolamento da Fila**: Enquanto estiver em cooldown, a chave é excluída da lista de candidatas elegíveis (`getEligibleKeys`), evitando novas interrupções.
3. **Recuperação Gradual (Half-Open)**: Ao término do prazo de cooldown (`cooldownUntil <= now`), a chave volta a ser elegível. Se a nova tentativa for bem-sucedida, o status é restaurado para `HEALTHY` e as falhas consecutivas são zeradas.

---

## 5. Garantia Financeira & Cobrança Única de Créditos

O failover opera internamente na camada de execução de IA do [`GeminiMultiProvider`](file:///c:/CURSOS/tomadix/src/modules/ai/gemini-multi-provider.ts).
- As tentativas de contingência ocorrem **dentro** do bloco de execução.
- O [`CreditExecutionService`](file:///c:/CURSOS/tomadix/src/modules/billing/credit-execution.service.ts) somente debita os créditos uma única vez após o retorno válido.
- Se todas as chaves falharem, os créditos são integralmente estornados aos lotes de origem (`refundDeductedLots`) com registro formal no ledger.

---

## 6. Endpoints da API Administrativa

- `GET /api/admin/gemini-keys`: Lista de chaves cadastradas e configurações globais.
- `POST /api/admin/gemini-keys`: Cadastro de nova chave com criptografia e mascaramento.
- `PUT /api/admin/gemini-keys/[id]`: Atualização de configurações, status ativo e prioridade.
- `DELETE /api/admin/gemini-keys/[id]`: Exclusão de chave.
- `POST /api/admin/gemini-keys/[id]/test`: Teste de conectividade ao vivo no Google Gemini.
- `PUT /api/admin/gemini-keys/priorities`: Reordenação em lote da ordem de prioridades.
- `GET /api/admin/gemini-keys/settings`: Consulta de parâmetros do Circuit Breaker.
- `PUT /api/admin/gemini-keys/settings`: Atualização de parâmetros de failover.
- `GET /api/admin/gemini-keys/logs`: Consulta de métricas globais e histórico detalhado de operações.

