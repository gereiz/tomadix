# TOMADIX V1 — ETAPA 0: AUDITORIA TÉCNICA, DIAGNÓSTICO DE PERFORMANCE E PLANO INCREMENTAL

**Data:** 27 de Outubro de 2026  
**Ambiente:** Windows Local / Next.js 15.5.28 / React 19 / Supabase PostgreSQL / Gemini API  
**Status da Etapa:** Concluída com sucesso

---

## 1. AUDITORIA DA ARQUITETURA ATUAL

### 1.1. Tecnologias e Versões Utilizadas
- **Framework Web:** Next.js `15.5.28` (App Router, Standalone build).
- **Biblioteca de Interface:** React `19.0.0` / React DOM `19.0.0`.
- **Linguagem & Tipagem:** TypeScript `5.7.0` (Typecheck estrito via `tsc --noEmit` validado: 0 erros).
- **Banco de Dados & ORM:** Supabase PostgreSQL com Prisma ORM `6.0.0` (Connection pooling com `DATABASE_URL` e `DIRECT_URL`).
- **Validação de Dados:** Zod `3.24.0` (Schemas de entrada e contratos de saída de IA).
- **Inteligência Artificial:** `@google/genai` `1.0.0` (Google Gen AI SDK oficial).
- **Estilização:** Tailwind CSS `v4.3.3` com `@tailwindcss/postcss`.
- **Segurança & Criptografia:** `bcryptjs` `3.0.3`, cookies HttpOnly, rate limiting em memória por IP, correlation IDs.
- **Suíte de Testes:** Vitest `5.0.5` (18 arquivos de teste de integração cobrindo auth, workspaces, projetos, parâmetros, scenes, faturamento).

---

### 1.2. Estrutura de Diretórios e Módulos
```
tomadix/
├── prisma/
│   └── schema.prisma          # 763 linhas: modelos relacionais completos (Auth, Workspaces, Projetos, Parâmetros, Faturamento)
├── src/
│   ├── app/                   # App Router (87 rotas estáticas e dinâmicas geradas no build)
│   │   ├── (auth)/            # login, register, forgot-password, reset-password, confirm-email
│   │   ├── admin/             # Painel administrativo da plataforma
│   │   ├── dashboard/         # Dashboard geral
│   │   ├── projects/          # Página de projetos (monolítico client-side, 63KB)
│   │   │   └── [id]/          # Detalhes do projeto com abas
│   │   ├── parameters/        # Gerenciamento de parâmetros do workspace
│   │   └── api/               # 64 rotas de API REST
│   ├── components/            # Componentes reutilizáveis por domínio (characters, environments, scenes, prompts, etc.)
│   ├── lib/                   # auth.ts, db.ts, session.ts, permissions.ts, rate-limiter.ts
│   └── modules/               # Camada de serviços e regras de negócio:
│       ├── ai/                # gemini-provider.ts (fallback de modelos, timeouts, validação Zod)
│       ├── auth/              # auth.service.ts
│       ├── billing/           # entitlement.service.ts, gateways de pagamento
│       ├── parameters/        # parameter.service.ts, parameter-resolver.service.ts
│       ├── projects/          # project.service.ts
│       ├── prompt-engine/     # compose-prompt.ts, prompt-engine.service.ts, prompt-template.catalog.ts
│       ├── visual-library/    # visual-reference.catalog.ts (143KB), visual-reference.service.ts
│       └── ...
```

---

### 1.3. Classificação dos Módulos para a V1

| Módulo / Funcionalidade | Status Real | Classificação V1 | Ação Técnica Necessária |
| :--- | :--- | :--- | :--- |
| **Autenticação & Sessões** | Funcional | Existente e funcional | Preservar. Isolamento por Cookie e Bearer Token. |
| **Multi-Tenancy & Workspaces** | Funcional | Existente e funcional | Preservar. Validação estrita no banco via `getCurrentWorkspace`. |
| **Integração Gemini API** | Funcional | Existente e funcional | Preservar. Resiliente com fallback de modelos e validação Zod. |
| **Catálogo de Parâmetros Globais** | Funcional | Existente, necessita ajuste | Reduzir payload retornado na listagem; adicionar cache em memória. |
| **Configuração Cinematográfica por Projeto** | Inexistente no banco | **Inexistente e necessária** | Criar modelo relacional de ativação granular de parâmetros por projeto. |
| **Galeria de Conteúdo Visual** | Inexistente (lista cards genéricos) | **Inexistente e necessária** | Construir o Estúdio Visual com visual dark/limão, filtros e busca. |
| **Barra de Criação Rápida** | Inexistente | **Inexistente e necessária** | Implementar criação rápida com linguagem natural e seleção de tipo. |
| **Listagem de Projetos (`projects/page.tsx`)** | Lenta / Monolítica | Existente, necessita correção | Dividir modais, implementar paginação no servidor, otimizar bundle. |
| **Detalhes de Projeto (`projects/[id]`)** | Waterfalls de dados | Existente, necessita correção | Eliminar chamadas redundantes em cascata (`/api/auth/me`, re-fetches). |
| **Painel Administrativo** | Funcional | Existente e funcional | Integrar gestão de parâmetros globais sem duplicação. |

---

## 2. DIAGNÓSTICO DE LENTIDÃO E LINHA DE BASE DE DESEMPENHO

### 2.1. Métricas Medidas (Linha de Base Real do MVP)
- **Latência de conexão inicial Supabase (Cold Start / TLS):** ~2.216 ms.
- **Query de Parâmetros (`findMany` sem cache):** ~855 ms (Payload bruto com todas as opções: > 140 KB).
- **Query de Projetos (`findMany` com `_count` de 5 tabelas):** ~864 ms.
- **Tamanho do Bundle de `/projects`:** 11.2 kB página / **117 kB** First Load JS.
- **Tamanho do Bundle de `/projects/[id]`:** 28.2 kB página / **171 kB** First Load JS.
- **Resolução de Parâmetros em memória (`ParameterResolver`):** **< 1 ms** (a lógica em memória é extremamente rápida; o gargalo está nas viagens de rede e payloads).

### 2.2. Gargalos Estruturais Identificados

1. **Requisições em Cascata (Waterfalls) no Cliente:**
   - Na página `/projects`: são disparadas 3 requisições assíncronas separadas (`/api/billing/subscription`, `/api/parameters?scope=GLOBAL`, `/api/projects`).
   - Na página `/projects/[id]`: a página carrega dados do projeto, mas ao abrir abas ou formulários de personagens/ambientes/cenas, o componente `EntityParametersSection` dispara uma requisição para `/api/auth/me` e outra para `/api/projects/[id]/parameters`.
2. **Payload Gigante de Parâmetros Sem Projeção:**
   - O arquivo `visual-reference.catalog.ts` possui 143 KB de texto com centenas de opções e descrições detalhadas.
   - Quando o endpoint `/api/parameters` é chamado para preencher seletores, ele envia todo o payload de descrições, histórico e notas comparativas, pesando na banda de rede e na hidratação.
3. **Ausência de Paginação no Servidor:**
   - O endpoint `/api/projects` busca e traz **todos** os projetos do workspace de uma vez com `include: { _count: ... }`. Conforme o número de projetos cresce, o tempo de resposta e consumo de memória aumentam linearmente.
4. **Mistura entre Parâmetros Globais e Parâmetros de Projeto:**
   - Atualmente, o sistema assume que todos os parâmetros do workspace com `enabled: true` aparecem em todos os projetos. Não há separação formal de quais parâmetros o usuário escolheu habilitar para aquele filme/projeto específico.
5. **Componentes Monolíticos e Re-renderizações Excessivas:**
   - `src/app/projects/page.tsx` possui 1.390 linhas de código com dezenas de modais montados simultaneamente, centenas de ícones SVG inlined e estados locais acoplados.

---

## 3. PLANO TÉCNICO INCREMENTAL DE EXECUÇÃO

### Etapa 1 — Correções Estruturais e Fundação de Performance
- Implementar paginação e projeção enxuta de campos em `/api/projects`.
- Adicionar cache com invalidação no servidor para definições estáveis de parâmetros (`ParameterService.listParameters`).
- Eliminar chamadas redundantes a `/api/auth/me` em componentes filhos.
- Modularizar `src/app/projects/page.tsx` extraindo modais e componentes pesados.

### Etapa 2 — Novo Estúdio Visual (ABRAhub Inspired)
- Implementar navegação superior contextual (Estúdio, Projetos, Storyboard, Configurações).
- Construir a **Galeria Principal** com grid responsivo, cartões modernos (fundo escuro grafite, bordas sutis, acentos verde-limão `#A3E635` / `#84CC16`), busca e filtros contextuais.
- Criar a **Barra de Criação Rápida** integrada inferior (tipo de elemento, descrição em linguagem natural, geração ágil de prompt).

### Etapa 3 — Configuração de Parâmetros por Projeto
- Criar modelo relacional / schema de persistência para **parâmetros habilitados por projeto** (`ProjectParameterSetting` ou campo estruturado de ativação indexado).
- Implementar fluxo de criação de projeto com etapa dedicada de **Configuração Visual e Cinematográfica** organizada por categorias colapsáveis (Câmera, Lentes, Enquadramento, Movimento, Iluminação, Estética, Arte, Áudio, Continuidade).
- Implementar regras de herança estrita: Valor explícito > Valor padrão do projeto > Valor padrão global.

### Etapa 4 — Integração dos Formulários e Elementos
- Adaptar formulários de Personagens, Ambientes, Cenas e Sequências para exibir **apenas** os parâmetros que o projeto habilitou e que são aplicáveis ao escopo do elemento.
- Renderização condicional e lazy de seletores visuais.

### Etapa 5 — Geração Contextual de Prompts com Gemini API
- Resolver os valores efetivos respeitando os parâmetros habilitados do projeto.
- Conectar criação rápida e criação estruturada ao `composePrompt` e `gemini-provider`.
- Garantir saída em JSON válido e histórico com versionamento intacto.

### Etapa 6 — Painel Administrativo e Extensibilidade
- Garantir gerenciamento de categorias, opções e exemplos visuais globais para administradores sem afetar integridade de projetos existentes.

### Etapa 7 — Estabilização, Testes Finais e Validação de Métricas
- Executar suíte completa de testes de regressão e typecheck.
- Medição comparativa com a linha de base estabelecida.

---

## 4. CRITÉRIOS DE ACEITAÇÃO DA ETAPA 0
- [x] Repositório inspecionado e código real utilizado como fonte de verdade.
- [x] Nenhuma reescrita cega ou quebra de dados/banco realizada.
- [x] Gargalos de desempenho identificados e documentados com medições reais.
- [x] Linha de base de performance estabelecida.
- [x] Plano técnico e sequência de implementação detalhados e alinhados à especificação mestra.
