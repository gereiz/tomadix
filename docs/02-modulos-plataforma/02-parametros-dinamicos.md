# 02 — Sistema de Parâmetros Dinâmicos e Motor de Resolução

O módulo de **Parâmetros Dinâmicos** permite que diretores e produtores audiovisuais configurem variáveis estéticas, técnicas e narrativas sem alterar o código-fonte da aplicação a cada nova câmera, estilo de lente, iluminação ou regra de consistência.

---

## 1. Tipos de Parâmetros Suportados

Cada tipo possui validação estrita no servidor e renderização visual especializada:

| Tipo | Descrição | Validações Específicas |
| :--- | :--- | :--- |
| **`TEXT`** | Texto curto de linha única | `minLength`, `maxLength`, regex |
| **`TEXTAREA`** | Texto descritivo multilinha | `minLength`, `maxLength` |
| **`NUMBER`** | Valor numérico | `min`, `max`, `isInteger`, `step` |
| **`BOOLEAN`** | Interruptor booleano | `true` ou `false` |
| **`SELECT`** | Seleção única em lista fechada | Pertinência na lista de `options` |
| **`MULTISELECT`** | Múltipla seleção de opções | Array com valores permitidos |
| **`RANGE`** | Slider numérico contínuo | `min`, `max`, `step` |
| **`DURATION`** | Duração temporal em segundos | Número positivo `>= 0` |
| **`DATE`** | Data cinematográfica de produção | Data ISO válida (`YYYY-MM-DD`) |
| **`JSON`** | Estrutura de dados complexa | Validação sintática e de schema |

---

## 2. Escopos de Parâmetros e Regras de Isolamento

1. **`GLOBAL`**: Configurações gerais da produção (ex: formato de sensor 35mm, estilo primário de iluminação). Herdadas por cenas e elementos filhos caso não sejam sobrescritas.
2. **`CHARACTER`**: Atributos específicos e exclusivos de personagens (ex: consistência facial, figurino, adereços). **Valores do Personagem A nunca vazam para o Personagem B**.
3. **`ENVIRONMENT`**: Atributos de cenários, arquitetura, clima e temperatura de cor.
4. **`SCENE`**: Atributos dinâmicos por take/cena (ex: tipo de enquadramento, movimento de câmera, iluminação pontual). **Valores da Cena 1 nunca vazam para a Cena 2**.
5. **`OUTPUT`**: Diretrizes de pós-processamento e saída do prompt (ex: granulação de película analógica, prompt negativo).

---

## 3. Motor de Resolução Hierárquica (`ParameterResolver`)

O motor de resolução avalia os parâmetros aplicáveis para um contexto específico determinando o valor final com a seguinte ordem de precedência:

```text
[1. Valor Explícito no Alvo da Cena/Personagem/Ambiente]
       │ (se ausente)
       ▼
[2. Valor Herdado do Escopo GLOBAL da Produção]
       │ (se ausente)
       ▼
[3. Valor Padrão (defaultValue) da Definição do Parâmetro]
       │ (se ausente)
       ▼
[4. Ausente (Fallback Neutro no Prompt)]
```

---

## 4. Endpoints da API de Parâmetros (`/api/parameters`)

- `GET /api/parameters`: Lista parâmetros do workspace com suporte a filtros por escopo e versão.
- `POST /api/parameters`: Criação de nova definição de parâmetro com validação de tipo.
- `PUT /api/parameters/[id]`: Edição com versionamento automático para preservar histórico.
- `POST /api/parameters/[id]/toggle`: Ativação ou desativação de parâmetro.
- `POST /api/parameters/reorder`: Reordenação visual da lista de parâmetros.

---

## 5. Seleção e Restrição de Parâmetros por Projeto Cinematográfico

Ao criar um novo projeto (ou editar as configurações de um projeto existente), a aplicação apresenta um seletor visual com **todos os parâmetros disponíveis no estúdio**.

O diretor ou produtor seleciona expressamente quais parâmetros poderão ser utilizados naquele universo narrativo:
1. **Gravação no Projeto**: Os identificadores dos parâmetros habilitados são salvos em `project.configuration.parameterSettings.enabledParameterKeys`.
2. **Isolamento Estrito**: As rotas de resolução (`/api/projects/[id]/parameters`) e os componentes de criação de entidades (`EntityParametersSection`) filtram as definições para disponibilizar **exclusivamente os parâmetros selecionados**.
3. **Prevenção de Poluição de Contexto**: Nenhum parâmetro desmarcado pelo usuário aparece nos formulários de criação de Personagens, Ambientes ou Cenas do projeto, otimizando o foco da equipe e o consumo de tokens nas IAs generativas.
