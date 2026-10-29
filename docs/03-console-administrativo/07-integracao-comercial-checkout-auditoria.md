# 12 — Integração da Central Comercial, Checkout e Auditoria

Este documento formaliza a integração final de ponta a ponta entre a gestão de planos, as configurações comerciais declarativas, os gateways de pagamento e a auditoria operacional do **Tomadix**.

---

## 1. Fonte Única da Verdade Comercial

Para eliminar duplicações de regras de negócio e divergências entre o catálogo público e a cobrança:
- O catálogo público (`/pricing` e `GET /api/billing/plans`), o checkout (`/api/billing/checkout`), a verificação de direitos de uso (`EntitlementService`) e o livro-razão de créditos (`CreditLedger`) consultam exatamente os mesmos serviços de domínio.
- **Valores monetários enviados pelo cliente são rejeitados**. O servidor calcula o preço autorizado através de `PricingService.calculatePlanPricing(plan, interval)` e a moeda oficial antes de autorizar qualquer sessão de pagamento.

---

## 2. Consistência e Validações do Checkout

Antes de gerar a sessão de checkout, o servidor valida rigorosamente:
1. **Identidade Autenticada**: Sessão válida e usuário ativo (não suspenso).
2. **Permissão no Workspace**: Papel de `OWNER` ou `ADMIN` no estúdio contratante.
3. **Plano Publicado**: Plano ativo, público e em status comercial `ACTIVE` (não rascunho nem arquivado).
4. **Preço e Moeda Vigentes**: Preço calculado pelo servidor com aplicação de regras promocionais ativas.
5. **Gateway Ativo**: Gateway selecionado em status `ACTIVE` e com teste de conectividade operacional (`CONNECTED`).
6. **Mapeamento de Preço Externo**: Validação de Price ID correspondente para o ciclo escolhido em gateways externos (evitando erro `PRICE_NOT_MAPPED`).
7. **Prevenção de Assinatura Redundante**: Bloqueio com `ALREADY_SUBSCRIBED` se o workspace já possui assinatura ativa para a mesma modalidade e periodicidade.
8. **Compatibilidade com Política de Downgrade**: Verificação de `ALLOW_DIRECT_DOWNGRADE` antes de autorizar alteração para plano inferior.

---

## 3. Gestão de Contratos e Imutabilidade (Grandfathering)

- **Snapshot Contratual no Checkout**: Ao processar `checkout.completed`, o servidor grava um registro na tabela `CommercialSnapshot`, perpetuando os preços, periodicidade e limites contratados pelo cliente.
- **Isolamento de Impacto**:
  - Desativar um gateway no painel administrativo **nunca cancela nem apaga assinaturas existentes**.
  - Arquivar um plano no catálogo **preserva o histórico de assinantes e faturas anteriores**.
  - Aumentar preços ou reduzir limites do catálogo **não afeta retroativamente clientes com contratos ativos**.
- **Rollback Atômico na Falha de Créditos**: A concessão de créditos, a atualização da assinatura e o registro do snapshot ocorrem em uma transação Prisma `$transaction` única. Qualquer falha no livro-razão desfaz integralmente as alterações e marca o webhook como `FAILED`.

---

## 4. Matriz de Permissões Granulares Administrativas

As rotas administrativas segregam estritamente as responsabilidades dos operadores:

| Privilégio | Escopo de Controle | Rotas Protegidas |
| :--- | :--- | :--- |
| **`plans:manage`** | Criar, duplicar, ativar e arquivar planos | `/api/admin/billing/plans/*`, `/subscriptions` |
| **`prices:manage`** | Alterar preços e mapeamento externo com gateways | `/api/admin/billing/gateways/mappings` |
| **`policies:manage`** | Alterar políticas comerciais declarativas | `/api/admin/billing/policies` |
| **`credits:manage`** | Concessão e ajuste manual de créditos | `/api/admin/users/credits/adjust` |
| **`gateways:manage`** | Ativar, desativar e testar conexão de gateways | `/api/admin/billing/gateways/*` |
| **`credentials:manage`**| Inserir ou atualizar segredos criptografados | `POST /api/admin/billing/gateways` |
| **`webhooks:reprocess`**| Reprocessar e inspecionar webhooks recebidos | `/api/admin/billing/webhooks/*` |
| **`audit:read`** | Consultar trilha de auditoria e snapshots | `/api/admin/audit`, `/snapshots` |

---

## 5. Suíte de Testes Integrados (15 Cenários Cobertos)

Os 15 cenários de integração foram automatizados no arquivo [`tests/commercial-gateway-integration.test.ts`](file:///c:/CURSOS/cineprompt/tests/commercial-gateway-integration.test.ts) com 100% de aprovação (usando mocks e ambiente sandbox seguro):

1. **Plano publicado com preço válido**: Checkout bem-sucedido com cálculo no servidor.
2. **Plano desativado**: Rejeição de checkout para plano arquivado (`PLAN_NOT_AVAILABLE`).
3. **Preço sem associação ao gateway**: Bloqueio por ausência de Price ID externo (`PRICE_NOT_MAPPED`).
4. **Gateway inativo**: Rejeição caso todos os gateways do ambiente estejam inativos (`GATEWAY_INACTIVE`).
5. **Credenciais inválidas**: Teste de conexão registra falha (`FAILED`) sem gerar cobranças.
6. **Evento de pagamento duplicado**: Idempotência garantida sem duplicidade de créditos no `CreditLedger`.
7. **Evento de pagamento inválido**: Rejeição segura de assinatura adulterada ou payload malformado.
8. **Assinatura existente após alteração de preço**: Grandfathering contratual mantido intacto.
9. **Alteração de limites durante uma assinatura**: Manutenção dos limites contratuais originais do cliente.
10. **Cancelamento de assinatura**: Atualização de estado para `CANCELED` ou `CANCELING` com auditoria.
11. **Pagamento atrasado**: Webhook de inadimplência transiciona assinatura para `PAST_DUE`.
12. **Reprocessamento de webhook**: Recuperação de evento previamente falho com incremento de tentativas.
13. **Falha na concessão de créditos**: Transação atômica revertida sem corrupção de estado.
14. **Usuário sem permissão administrativa**: Bloqueio de acesso para usuários comuns e administradores de workspace.
15. **Tentativa de acesso cruzado entre workspaces**: Bloqueio de checkout e cancelamento entre estúdios distintos.
