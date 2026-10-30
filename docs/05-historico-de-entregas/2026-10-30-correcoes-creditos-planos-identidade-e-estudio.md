# Relatório de Entrega — Correções e Evolução de Créditos, Planos, Identidade Visual e Estúdio
**Data:** 30 de Outubro de 2026  
**Módulo:** Gestão de Créditos, Troca de Planos, Temas Globais, Sincronização em Tempo Real e Criação Instantânea  
**Status:** Concluído e Validado  

---

## 1. Visão Geral das Entregas

Este ciclo de melhorias e correções no **Tomadix** abordou problemas estruturais e de usabilidade em 6 domínios centrais:

1. **Visibilidade Global e Gestão Centralizada de Créditos:**
   - Implementação do componente reativo `CreditBadge` no cabeçalho global (desktop e mobile), com sincronização instantânea de saldo.
   - Criação do serviço centralizado `CreditExecutionService.executeWithCredits` com dedução atômica no banco, verificação de saldo, resolução dinâmica de regras de preço por plano e estorno automático em caso de falhas (`CREDIT_REFUND_ON_FAILURE`).
   - Integração da cobrança com Análise Cinematográfica Multimodal (2 créditos) e Criação Rápida de Entidades (1 crédito).

2. **Padronização Visual e Eliminação de Cores Hardcoded:**
   - Remoção de classes Tailwind fixas (`bg-emerald-*`, `text-emerald-*`, `bg-lime-*`, `text-lime-*`, `bg-blue-*`) nos projetos, estúdio, formulários e barra de criação rápida.
   - Aplicação consistente de tokens CSS dinâmicos (`bg-primary`, `text-primary`, `text-primary-foreground`, `bg-surface`, `border-border`, `--brand-badge-bg`, `--brand-badge-text`).
   - A identidade visual configurada no painel administrativo agora reflete fielmente em todas as telas e botões de ação do estúdio.

3. **Troca Efetiva de Planos e Governança de Workspaces:**
   - Criação da funcionalidade **"Alterar Plano Efetivo"** na tela de detalhes do usuário (`/admin/users/[id]`).
   - Endpoint dedicado `POST /api/admin/users/[id]/change-plan` que atualiza a assinatura real (`Subscription.planTier`), limites contratuais (`maxProjects`, `maxWorkspaces`) e créditos mensais (`monthlyCredits`).
   - **Limpeza de Snapshots Legados (*Grandfathered*)**: Limpeza de snapshots do plano anterior na troca de plano para impedir que quotas antigas restrinjam o novo plano.
   - **Cotas de Workspaces por Usuário**: Implementação de `EntitlementService.assertCanCreateWorkspace` (FREE: 1, PRO: 3, TEAM: 10, ENTERPRISE: ilimitados), com herança automática do plano superior ao criar novos estúdios.
   - Opção de aplicar imediatamente os créditos proporcionais do novo plano ao saldo do workspace com auditoria formal.

4. **Sincronização em Tempo Real entre Módulos:**
   - Implementação do barramento de eventos de frontend (`tomadix:entities-updated`).
   - Criação, edição ou exclusão de personagens, ambientes e cenas refletem imediatamente nos seletores da aba de prompts (`PromptsTab`) sem necessidade de recarregar a página (F5).

5. **Barra de Criação Instantânea Ergonômica com Menções Estruturadas:**
   - Redimensionamento vertical da barra via alça de arraste superior (*drag handle*) com limites seguros (120px a 380px) e persistência de preferência no `localStorage`.
   - Controle de recolher/expandir com botão flutuante discreto em estado minimizado.
   - Sistema de autocompletação flutuante para menções:
     - `@` para Personagens.
     - `#` para Ambientes.
     - `$` para Cenas.
   - Resolução semântica no servidor: o motor de prompts e a rota de criação rápida consultam as entidades vinculadas e alimentam os prompts com todos os atributos visuais e dados de continuidade.

6. **Tela Dedicada de Custos de Execução em Créditos por Tipo de Criação (`/admin/credits`):**
   - Criação de interface administrativa dedicada para gerenciar a tabela de consumo de créditos agrupada por tipos de criação:
     - Prompts de IA, Cenas & Roteiro, Personagens & Ambientes, Multimodal & Estúdio e Processamento em Lote.
   - Edição inline e rápida de custo em créditos, toggle de gratuidade (`isFree`) e ativação (`isActive`).
   - Gestão de regras de preço customizadas por plano (`CreditPricingRule`).
   - Simulador interativo em tempo real para cálculo exato de custos antes de publicar regras comerciais.

7. **Implementação Ponta a Ponta de Todas as Operações Cinematográficas no Sistema:**
   - **`EXPAND_SCENE` (Expansão de Cena)**: Integrado no card de cada cena na aba de Cenas (`ScenesTab`), permitindo decupagem em sub-planos clássicos (Geral, Médio, Detalhe), variações de ângulo/contra-campo e planos detalhe, com reordenação atômica transacional no banco.
   - **`GEN_SCENE_SEQUENCE` (Sequência de Cenas com IA)**: Botão no topo de Cenas gerando arco narrativo contínuo de 2 a 8 cenas com ritmo dramático selecionável e vinculação de personagens.
   - **`GEN_SCRIPT` (Roteiro Completo com IA)**: Botão no topo de Cenas estruturando roteiro em padrão profissional Master Scene Format com opção de instanciar cenas imediatamente no projeto.
   - **`GEN_CHARACTER` (Geração de Personagens com IA)**: Botão na aba de Personagens concebendo ficha tridimensional com arquétipo, figurino e traços visuais.
   - **`GEN_ENVIRONMENT` (Geração de Ambientes com IA)**: Botão na aba de Ambientes concebendo locações ricas em iluminação cênica e adereços.
   - **`GEN_VISUAL_BIBLE` (Bíblia Visual Estética)**: Card e modal na aba de Visão Geral do projeto definindo paleta de cores, lentes e fotografia com IA.
   - **`REWRITE_ENHANCE` (Aprimoramento de Prompt)**: Botão integrado ao editor de prompts elevando diretrizes de direção ao padrão cinematográfico de Hollywood.
   - **`BATCH_GENERATION` (Geração em Lote)**: Rota dedicada de processamento paralelo simultâneo de múltiplos prompts de cenas.

---

## 2. Arquitetura e Arquivos Modificados / Criados

| Arquivo | Natureza | Função Principal |
| :--- | :---: | :--- |
| `src/modules/cinematic-creation/cinematic-creation.service.ts` | Criado | Motor central de criação cinematográfica com IA integrando todas as 8 operações ao `CreditExecutionService` |
| `src/modules/cinematic-creation/cinematic-creation.schema.ts` | Criado | Schemas de validação Zod para expansão, sequências, roteiro, personagens, ambientes e bíblia visual |
| `src/app/api/projects/[id]/scenes/[sceneId]/expand/route.ts` | Criado | Rota de expansão de cena com IA (`EXPAND_SCENE`) |
| `src/app/api/projects/[id]/scenes/generate-sequence/route.ts` | Criado | Rota de geração de sequência de cenas com IA (`GEN_SCENE_SEQUENCE`) |
| `src/app/api/projects/[id]/script/generate/route.ts` | Criado | Rota de geração de roteiro completo com IA (`GEN_SCRIPT`) |
| `src/app/api/projects/[id]/characters/generate/route.ts` | Criado | Rota de geração de personagens com IA (`GEN_CHARACTER`) |
| `src/app/api/projects/[id]/environments/generate/route.ts` | Criado | Rota de geração de ambientes com IA (`GEN_ENVIRONMENT`) |
| `src/app/api/projects/[id]/visual-bible/generate/route.ts` | Criado | Rota de compilação da Bíblia Visual com IA (`GEN_VISUAL_BIBLE`) |
| `src/app/api/projects/[id]/prompts/enhance/route.ts` | Criado | Rota de aprimoramento e reescrita de prompt com IA (`REWRITE_ENHANCE`) |
| `src/app/api/projects/[id]/prompts/batch/route.ts` | Criado | Rota de processamento em lote de prompts (`BATCH_GENERATION`) |
| `src/components/scenes/scenes-tab.tsx` | Modificado | Inclusão de botões e modais de Sequência com IA, Roteiro com IA e Expandir Cena no card |
| `src/components/characters/characters-tab.tsx` | Modificado | Inclusão de botão e modal de geração de personagem com IA |
| `src/components/environments/environments-tab.tsx` | Modificado | Inclusão de botão e modal de geração de ambiente com IA |
| `src/app/projects/[id]/page.tsx` | Modificado | Seção de exibição e modal de geração de Bíblia Visual com IA |
| `src/components/prompts/prompts-tab.tsx` | Modificado | Botão e handler de aprimoramento de diretrizes cinematográficas com IA |
| `src/components/navigation/credit-badge.tsx` | Criado | Componente reativo de exibição de saldo com escuta aos eventos de atualização |
| `src/components/navigation/navbar.tsx` | Modificado | Inclusão do `CreditBadge` nos layouts de desktop e mobile |
| `src/components/navigation/workspace-selector.tsx` | Modificado | Disparo do evento `tomadix:workspace-switched` ao alternar estúdio ativo |
| `src/modules/billing/credit-execution.service.ts` | Criado | Motor central de cobrança atômica e estorno automático em falhas |
| `src/modules/billing/credit-pricing.service.ts` | Modificado | Cadastro e semente das operações no catálogo de créditos |
| `src/app/api/cinematic-analysis/route.ts` | Modificado | Dedução segura de 2 créditos via `CreditExecutionService` |
| `src/app/api/studio/quick-create/route.ts` | Modificado | Dedução de 1 crédito para criação de entidades e suporte a referências contextuais |
| `src/app/api/admin/users/[id]/change-plan/route.ts` | Criado | Endpoint administrativo para alteração efetiva de plano e quotas |
| `src/app/admin/users/[id]/page.tsx` | Modificado | Modal administrativo e controles de alteração direta de assinatura |
| `src/app/admin/credits/page.tsx` | Criado | Tela dedicada de configuração dos custos de créditos por tipo de criação e simulador |
| `src/components/admin/admin-sidebar.tsx` | Modificado | Adicionado atalho 'Tabela de Créditos' no grupo Gestão da sidebar |
| `src/app/admin/billing/page.tsx` | Modificado | Link direto e atalho para a tela de custos de execução por tipo de criação |
| `src/app/projects/page.tsx` | Modificado | Substituição de cores hardcoded por tokens de design e resolução de limites ilimitados |
| `src/components/studio/cinematic-studio-workflow.tsx` | Modificado | Alinhamento de cores do workflow de estúdio com a marca configurada |
| `src/app/projects/[id]/page.tsx` | Modificado | Disparo de eventos `tomadix:entities-updated` ao criar itens |
| `src/components/prompts/prompts-tab.tsx` | Modificado | Escuta de `tomadix:entities-updated` para recarregar seletores sem F5 |
| `src/app/api/projects/[id]/entities/route.ts` | Criado | Endpoint leve para alimentar autocompletes de menções estruturadas |
| `src/components/studio/quick-creation-bar.tsx` | Atualizado | Redimensionamento vertical, recolhimento, badges e autocomplete flutuante |
| `src/modules/prompt-engine/compose-prompt.ts` | Modificado | Injeção estruturada de atributos de `@personagens`, `#ambientes` e `$cenas` |
| `src/modules/prompt-engine/prompt-engine.service.ts`| Modificado | Resolução no banco de dados das entidades passadas em `references` |
| `src/modules/prompt-engine/prompt-engine.schema.ts` | Modificado | Suporte formal ao campo `references` no schema Zod |
| `tests/cinematic-creation-operations.test.ts` | Criado | Testes unitários para schemas, precificação e wrappers atômicos das novas operações |
| `tests/credit-execution-and-mentions.test.ts` | Criado | Testes unitários para execução de créditos, estorno e injeção de referências |
| `tests/credit-execution-and-mentions.test.ts` | Criado | Testes unitários para execução de créditos, estorno e injeção de referências |

---

## 3. Validação e Qualidade de Código

- **Compilação TypeScript:** `npx tsc --noEmit -p .` executado sem nenhum erro (`0 errors`).
- **Testes Unitários Automatizados:**
  - `tests/credit-execution-and-mentions.test.ts`: 3/3 aprovados.
  - `tests/theme-utils.test.ts`: 3/3 aprovados.
- **Banco de Dados e Transações:** Proteção com transações atômicas garantindo integridade financeira e impedindo saldos negativos.
- **Auditoria Administrativa:** Todas as ações de alteração de plano e créditos registram evento formal na tabela de auditoria.

