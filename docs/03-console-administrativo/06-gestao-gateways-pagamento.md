# 11 — Administração e Gestão de Gateways de Pagamento

O módulo de **Administração de Gateways** desacopla o Tomadix de provedores financeiros específicos, permitindo configurar, testar, ativar e monitorar gateways de pagamento (Stripe, Mercado Pago e Sandbox) por interface administrativa.

---

## 1. Arquitetura Multiprovedor Desacoplada

A interface `PaymentGatewayProvider` padroniza todos os comportamentos de gateway:
- **`createCheckout(params)`**: Criação de sessão de checkout no provedor.
- **`validateWebhook(rawBody, headers)`**: Validação de assinatura criptográfica e normalização do payload.
- **`cancelSubscription(subscriptionId, atPeriodEnd)`**: Cancelamento de recorrência no gateway.
- **`testConnection()`**: Teste de conectividade sem risco operacional ou cobranças reais.
- **`listExternalProductsPrices()`**: Consulta do catálogo externo de preços e produtos.

---

## 2. Segurança de Credenciais e Criptografia AES-256-GCM

- **Criptografia Autenticada**: Credenciais como chaves de API e segredos de webhook são armazenadas em `encryptedCredentials` com criptografia simétrica AES-256-GCM, com vetor de inicialização (IV) e tag de autenticação por registro.
- **Mascaramento no Servidor**: Endpoints administrativos nunca retornam credenciais em texto puro para o navegador. Chaves são mascaradas com marcadores (ex: `sk_live_••••••••1234`).
- **Preservação de Segredos**: Ao salvar o formulário no navegador com valores mascarados não alterados, o backend detecta a máscara e preserva o segredo criptografado original intacto.

---

## 3. Seleção Inteligente de Gateway no Servidor (`GatewayManagerService`)

O navegador nunca escolhe diretamente o gateway de cobrança. O método `resolveCheckoutGateway`:
1. Filtra gateways com status `ACTIVE` no ambiente solicitado (`SANDBOX` ou `PRODUCTION`).
2. Avalia suporte a moeda (`currency`), país do comprador (`country`) e método de pagamento.
3. Desconsidera gateways marcados com status de conexão `FAILED`.
4. Respeita ordenação por prioridade (`priorityOrder`) e gateway padrão (`isCheckoutDefault`).

---

## 4. Webhooks: Idempotência, Rastreamento e Reprocessamento

- **Rastreamento Universal (`PaymentWebhookEvent`)**: Todos os webhooks recebidos são gravados com status `RECEIVED`, payload bruto e identificador de evento único.
- **Idempotência Estrita**: Webhooks com identificadores já processados retornam `{ processed: true, duplicate: true }` imediatamente, impedindo duplicação de créditos ou estados.
- **Reprocessamento Seguro**: O administrador pode solicitar o reprocessamento de webhooks que falharam por indisponibilidade transitória via `POST /api/admin/billing/webhooks/[id]/reprocess`, preservando a rastreabilidade e incrementando a contagem de tentativas.

---

## 5. Endpoints da API de Gateways (`/api/admin/billing/gateways`)

- `GET /api/admin/billing/gateways`: Lista configurações de gateways com credenciais mascaradas (requer `gateways:manage`).
- `POST /api/admin/billing/gateways`: Criação ou atualização com criptografia (requer `credentials:manage` se houver credenciais novas).
- `POST /api/admin/billing/gateways/[id]/toggle`: Ativação ou desativação segura com alerta de assinaturas existentes.
- `POST /api/admin/billing/gateways/[id]/test`: Teste de conexão seguro sem risco financeiro.
- `GET /api/admin/billing/gateways/mappings`: Consulta mapeamentos entre planos e Price IDs externos (requer `prices:manage`).
- `POST /api/admin/billing/gateways/mappings`: Atualiza mapeamento de preços.
- `GET /api/admin/billing/webhooks`: Histórico de webhooks recebidos e processados (requer `webhooks:reprocess`).
- `POST /api/admin/billing/webhooks/[id]/reprocess`: Reprocessamento manual de webhook com falha.
