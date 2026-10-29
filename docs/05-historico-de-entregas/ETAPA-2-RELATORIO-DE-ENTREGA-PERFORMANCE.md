# TOMADIX — RELATÓRIO DE ENTREGA: ETAPA 2 (PERFORMANCE DO BANCO DE DADOS)

**Data de Conclusão:** 27 de Outubro de 2026  
**Status da Etapa:** 100% Concluída e Homologada  
**Ambiente de Execução:** Local Windows (Brasil) conectado ao PostgreSQL Gerenciado (Supabase) via PgBouncer Pooler (`aws-0-us-east-2.pooler.supabase.com:6543`)

---

## 1. SUMÁRIO EXECUTIVO

A Etapa 2 foi dedicada a diagnosticar de forma científica, reproduzível e com dados reais a causa da lentidão percebida na aplicação, eliminar os gargalos estruturais identificados no banco de dados e quantificar objetivamente os ganhos obtidos sem qualquer suposição ou estimativa empírica.

### Principais Resultados Obtidos:
- **Redução de Latência no Feed Principal do Estúdio (`/api/studio/feed`):** De **~5.426 ms (5,42 s)** para **~2.105 ms (2,10 s)** — **Ganho de 61,2% de velocidade**, economizando **3,32 segundos por requisição**.
- **Identificação da Causa Raiz da Lentidão:** Descoberta de **Waterfalls de Latência em Rede Transcontinental (WAN)**: cada round-trip TCP/TLS entre o Brasil e o datacenter da AWS em Ohio (`us-east-2`) consome uma base física de **~780ms a 830ms**. Consultas encadeadas em série multiplicavam essa latência linearmente (5 queries sequenciais = ~5,3 segundos).
- **Eliminação de Over-fetching de Dados Pesados:** Remoção do tráfego desnecessário de colunas de JSON maciço (`inputSnapshot` e `outputJson` em `PromptVersion`, `visualBible` em `Project`) no feed da galeria, transferindo apenas metadados essenciais.
- **Cache em Memória de Verificação de Parâmetros Padrão:** Eliminação do `COUNT(*)` redundante de parâmetros executado a cada consulta (`ParameterService.ensureDefaultParameters`), economizando **~780ms por ciclo**.
- **Criação de 6 Índices Estruturais no PostgreSQL:** Adicionados índices compostos e reversos para foreign keys órfãs em tabelas de relacionamento n:m (`SceneCharacter`, `SceneEnvironment`) e ordenações com filtros combinados (`Scene`, `Character`, `Environment`, `PromptVersion`).

---

## 2. METODOLOGIA CIENTÍFICA DE DIAGNÓSTICO

Para garantir medições confiáveis, desenvolveu-se a ferramenta reproduzível [`scripts/db-performance-diagnostic.ts`](file:///c:/CURSOS/tomadix/scripts/db-performance-diagnostic.ts), executada diretamente contra a instância real do Supabase em Ohio.

### Parâmetros de Teste:
- **Amostragem:** Medição de Inicialização a Frio (*Cold start*) + 5 iterações aquecidas (*Warm runs*).
- **Métricas Estatísticas:** Frio (ms), Mediana / p50 (ms), Percentil 95 / p95 (ms), Média Aritmética (ms), Mínimo e Máximo.
- **Massa de Dados Real:** Testado no workspace real `IbitWeb Studio` com 4 projetos, personagens, ambientes, decupagens de cenas e prompts cinematográficos persistidos.

---

## 3. TABELA COMPARATIVA DE MÉTRICAS (BEFORE vs AFTER)

### Tabela 1: Linha de Base das Consultas Centrais do Sistema

| Operação | Categoria | Frio (ms) | p50 (ms) | p95 (ms) | Média (ms) | Diagnóstico Estrutural |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Ping de Conexão (`SELECT 1`)** | Network / RTT | **2.202,58** | **787,29** | **792,63** | **786,83** | **Piso físico da rede WAN** (PgBouncer em Ohio ↔ Brasil). |
| **Busca de Usuário + Workspaces** | Auth | **1.434,21** | **1.438,98** | **1.502,90** | **1.445,62** | 2 queries internas do Prisma (`User` + `Memberships` + `Workspace`). |
| **Listagem de Projetos + `_count`** | Projects | **796,64** | **804,05** | **951,45** | **832,69** | Query única agregada com `_count`. Performance excelente (1 RTT). |
| **Count de Parâmetros do Workspace** | Parameters | **795,78** | **786,69** | **792,85** | **787,37** | Executado repetidamente antes da otimização. |
| **Catálogo de Parâmetros** | Parameters | **1.304,64** | **845,93** | **892,45** | **848,94** | 71 definições ativas (globais e do workspace). |
| **Cenas com Decupagem e Prompts** | Scenes | **2.380,84** | **2.410,19** | **2.744,98** | **2.467,43** | Joins aninhados com `SceneCharacter` e `SceneEnvironment`. |

---

### Tabela 2: O Gargalo Crítico — Feed do Estúdio (`/api/studio/feed`)

| Estratégia de Execução | Frio (ms) | p50 (ms) | p95 (ms) | Média (ms) | Ganho Absoluto | Ganho % |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Cascata Sequencial (ANTERIOR)** | 5.531,13 | 5.443,90 | 5.726,40 | 5.426,26 | *Baseline* | *Baseline* |
| **Paralelizado + Projeção Enxuta (ATUAL)** | 4.022,13 | 2.086,13 | 2.241,86 | 2.105,88 | **-3.320,38 ms** | **+61,2% mais rápido** |

---

## 4. GARGALOS IDENTIFICADOS E RESOLVIDOS

### Gargalo 1: Efeito Cascata Sequencial (*Waterfall Latency*)
- **Problema:** A rota `GET /api/studio/feed` executava sucessivamente:
  1. `db.project.findMany` (disponíveis)
  2. `db.project.findMany` (feed)
  3. `db.character.findMany`
  4. `db.environment.findMany`
  5. `db.scene.findMany`
  6. `db.promptVersion.findMany`
  Como a latência de rede entre a máquina local e Ohio é de ~800ms por round-trip, o tempo total acumulado nunca era inferior a 5 segundos.
- **Solução Implementada:** 
  - Paralelização simultânea das 5 consultas através de `Promise.all` em [`src/app/api/studio/feed/route.ts`](file:///c:/CURSOS/tomadix/src/app/api/studio/feed/route.ts).
  - Todas as consultas utilizam o pool do PgBouncer em paralelo, retornando no mesmo tempo de 1 ou 2 round-trips.

### Gargalo 2: *Over-fetching* de Dados Pesados (Blobs de JSON)
- **Problema:** `PromptVersion` trazia colunas inteiras de `inputSnapshot` e `outputJson`, que podiam conter centenas de kilobytes de JSON e base64 por registro, saturando o enlace WAN e atrasando o parsing.
- **Solução Implementada:**
  - Aplicação de cláusulas `select` rigorosas no feed, trazendo apenas identificadores, títulos, metadados resumidos e datas.

### Gargalo 3: Verificação Redundante de Parâmetros Padrão
- **Problema:** Em [`src/modules/parameters/parameter.service.ts`](file:///c:/CURSOS/tomadix/src/modules/parameters/parameter.service.ts), `ensureDefaultParameters` executava `db.parameterDefinition.count({ where: { workspaceId } })` sempre que o cache expirava, custando **~787ms**.
- **Solução Implementada:**
  - Adicionado o registrador em memória `defaultParametersCheckedWorkspaces: Set<string>`.
  - Se o workspace já foi verificado na sessão da aplicação, o método retorna em **0 ms**, dispensando ida ao banco.

### Gargalo 4: Paralelização em `ProjectParameterConfigService`
- **Problema:** Ao carregar a tela de configuração de parâmetros cinematográficos por projeto ([`src/modules/projects/project-parameter-config.service.ts`](file:///c:/CURSOS/tomadix/src/modules/projects/project-parameter-config.service.ts)), o serviço executava em série: `ensureCinematicParameters` -> `project.findFirst` -> `listParameters` -> `parameterValue.findMany` (4 round-trips = ~3,2s).
- **Solução Implementada:**
  - `ensureCinematicParameters` memoriza o workspace verificado via `cinematicParametersEnsuredWorkspaces: Set<string>`.
  - `project.findFirst`, `listParameters` e `parameterValue.findMany` passaram a ser carregados concorrentemente com `Promise.all`.

---

## 5. ÍNDICES DE ALTA PERFORMANCE APLICADOS NO POSTGRESQL

Foram identificadas 6 ausências críticas de índices no banco de dados, aplicadas via script idempotente [`scripts/apply-performance-indexes.ts`](file:///c:/CURSOS/tomadix/scripts/apply-performance-indexes.ts) e incorporadas no schema declarativo do Prisma ([`prisma/schema.prisma`](file:///c:/CURSOS/tomadix/prisma/schema.prisma)):

1. **`idx_scene_character_character_id`** em `SceneCharacter ("characterId")`:
   - Elimina o *sequential scan* no cálculo de `character._count.sceneLinks`.
2. **`idx_scene_environment_environment_id`** em `SceneEnvironment ("environmentId")`:
   - Elimina o *sequential scan* no cálculo de `environment._count.sceneLinks`.
3. **`idx_scene_project_updated_at`** em `Scene ("projectId", "updatedAt" DESC)`:
   - Acelera a ordenação das tomadas decupadas no feed e nos roteiros.
4. **`idx_character_project_archived_updated`** em `Character ("projectId", "isArchived", "updatedAt" DESC)`:
   - Acelera listagem e busca de personagens ativos.
5. **`idx_environment_project_archived_updated`** em `Environment ("projectId", "isArchived", "updatedAt" DESC)`:
   - Acelera listagem e busca de cenários/ambientes ativos.
6. **`idx_prompt_version_project_created_desc`** em `PromptVersion ("projectId", "createdAt" DESC)`:
   - Otimiza a ordenação cronológica do histórico e galeria de prompts.

---

## 6. HOMOLOGAÇÃO E TESTES DE REGRESSÃO

Todos os testes automatizados da aplicação foram executados após as otimizações para garantir zero regressão funcional:

1. **Testes de Segurança e Permissões Administrativas ([`tests/auth-parameters-security.test.ts`](file:///c:/CURSOS/tomadix/tests/auth-parameters-security.test.ts)):**
   - **11/11 testes aprovados (100%)**
2. **Testes de Configuração Cinematográfica por Projeto ([`tests/project-parameter-config.test.ts`](file:///c:/CURSOS/tomadix/tests/project-parameter-config.test.ts)):**
   - **4/4 testes aprovados (100%)**
3. **Validação de Tipagem TypeScript:**
   - `npm run typecheck` executou com **0 erros** (`tsc --noEmit`).
4. **Build de Produção:**
   - `npm run build` gerou com sucesso todas as 93 rotas da aplicação (código de saída 0).
5. **Servidor de Desenvolvimento:**
   - Ativo em background no endereço `http://localhost:3000`.

---

## 7. CONCLUSÃO E PRÓXIMA ETAPA

Com os gargalos eliminados, índices operacionais e latência reduzida em mais de 61%, o banco de dados está plenamente estabilizado e otimizado.

Estamos prontos para prosseguir para a **Etapa 3: Módulo de Análise Cinematográfica e Engenharia Reversa Multimodal com Gemini API (4 modos de análise: Técnica, Engenharia Reversa, Continuidade Visual e Reprodução de Referências)**.
