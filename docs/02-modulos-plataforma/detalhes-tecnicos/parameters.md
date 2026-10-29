# Módulo: Sistema de Parâmetros Dinâmicos e Motor de Resolução

O módulo de **Parâmetros Dinâmicos** permite que diretores e produtores audiovisuais configurem variáveis e atributos estéticos/técnicos personalizados sem precisar modificar o código-fonte da aplicação a cada nova câmera, estilo de lente, iluminação ou regra de consistência.

---

## 1. Tipos de Parâmetros Suportados

Cada tipo possui renderização própria e validação estrita no servidor:

| Tipo | Descrição | Validações Específicas |
| :--- | :--- | :--- |
| **`TEXT`** | Texto curto de linha única | `minLength`, `maxLength`, regex |
| **`TEXTAREA`** | Texto descritivo multilinha | `minLength`, `maxLength` |
| **`NUMBER`** | Número numérico | `min`, `max`, `isInteger` (inteiro vs decimal), `step` |
| **`BOOLEAN`** | Interruptor booleano | `true` ou `false` |
| **`SELECT`** | Seleção única a partir de lista de opções | Verifica pertinência na lista de `options` |
| **`MULTISELECT`** | Múltipla seleção de opções | Array contendo apenas opções permitidas |
| **`RANGE`** | Slider numérico com intervalo contínuo | `min`, `max`, `step` |
| **`DURATION`** | Duração temporal em segundos | Número positivo `>= 0` |
| **`DATE`** | Data cinematográfica de produção | Data ISO válida (`YYYY-MM-DD`) |
| **`JSON`** | Estrutura de dados complexa | Validação sintática de JSON |

---

## 2. Escopos de Parâmetros e Regras de Isolamento

O escopo define onde a variável pode ser preenchida e como o motor de composição deve interpretá-la:

1. **`GLOBAL`**: Configurações gerais da produção (ex: formato do sensor 35mm, estilo de iluminação primária). Podem ser herdadas por cenas e elementos filhos caso não sejam sobrescritas.
2. **`CHARACTER`**: Atributos específicos e exclusivos de personagens (ex: consistência facial, figurino, adereços). **Valores do Personagem A nunca vazam para o Personagem B**.
3. **`ENVIRONMENT`**: Atributos de cenários, arquitetura, clima e temperatura de cor.
4. **`SCENE`**: Atributos dinâmicos por take/cena (ex: tipo de enquadramento, movimento de câmera, iluminação específica do plano). **Valores da Cena 1 nunca vazam para a Cena 2**.
5. **`OUTPUT`**: Diretrizes de pós-processamento e saída do prompt (ex: granulação de película analógica, prompt negativo).

---

## 3. Motor de Resolução e Ordem de Precedência

O motor de resolução (`ParameterResolver`) avalia os parâmetros aplicáveis para um contexto específico determinando o valor final com a seguinte ordem:

```text
[1. Valor Explícito no Alvo]
       │ (se ausente)
       ▼
[2. Valor Herdado do Escopo GLOBAL] (se o escopo do parâmetro permitir)
       │ (se ausente)
       ▼
[3. Valor Padrão (defaultValue) da Definição]
       │ (se ausente)
       ▼
[4. Ausência de Valor (EMPTY)] (se opcional) ou ERRO (se obrigatório)
```

- **Bloqueio de Parâmetros Obrigatórios**: Se um parâmetro ativo marcado como `required: true` não tiver valor resolvido em nenhuma das etapas acima, a composição é interrompida com uma mensagem de erro clara contendo o nome e a chave do parâmetro faltante.
- **Regras Declarativas de Visibilidade**: Parâmetros podem declarar dependências (`dependsOn`, `operator`: `equals` | `notEquals` | `in` | `contains` | `truthy` | `falsy`, `value`). Se a condição não for satisfeita pelos valores atuais, o parâmetro é automaticamente desconsiderado e **não é cobrado como obrigatório**.
- **Segurança**: Nenhuma expressão JavaScript ou SQL arbitrária é executada no servidor. Todas as regras de visibilidade são declarativas e tipadas.

---

## 4. Endpoints da API REST

### 4.1. Listar Definições de Parâmetros
`GET /api/parameters?scope=GLOBAL&type=SELECT&enabled=true`

### 4.2. Criar Nova Definição de Parâmetro
`POST /api/parameters`

**Exemplo de Payload:**
```json
{
  "key": "distancia_focal_lente",
  "label": "Distância Focal da Lente",
  "description": "Distância focal em milímetros para emular a ótica desejada.",
  "type": "SELECT",
  "scope": "GLOBAL",
  "required": true,
  "defaultValue": "50mm",
  "options": [
    { "value": "24mm", "label": "24mm (Grande Angular)" },
    { "value": "35mm", "label": "35mm (Perspectiva Natural Aberta)" },
    { "value": "50mm", "label": "50mm (Clássica Olho Humano)" },
    { "value": "85mm", "label": "85mm (Retrato / Desfoque de Fundo)" }
  ],
  "promptMapping": {
    "target": "visual_bible",
    "instruction": "Compor a imagem respeitando a distorção ótica da lente especificada."
  },
  "order": 1,
  "enabled": true
}
```

### 4.3. Alternar Ativação (Toggle) em 1 Clique
`POST /api/parameters/:id/toggle`

### 4.4. Reordenar Parâmetros
`POST /api/parameters/reorder`
```json
{
  "orderedIds": ["id_3", "id_1", "id_2"]
}
```

### 4.5. Resolver e Salvar Valores para um Projeto
- **Resolver:** `GET /api/projects/:id/parameters?targetType=PROJECT`
- **Salvar Valores:** `POST /api/projects/:id/parameters`
```json
{
  "values": [
    {
      "parameterDefinitionId": "cm7param123",
      "targetType": "PROJECT",
      "value": "85mm"
    }
  ]
}
```

---

## 5. Interface de Usuário (UI/UX)

1. **Painel de Administração (`/parameters`)**:
   - Navegação por abas de escopo (*Todos*, *Global*, *Personagens*, *Ambientes*, *Cenas*, *Saída*).
   - Filtro por tipo de dado e busca textual.
   - Botões para mover a ordem de exibição para cima/baixo.
   - Ativação instantânea em 1 clique.
   - Modal com **Live Preview Interativo em Tempo Real**: uma coluna lateral renderiza o campo em funcionamento conforme o usuário digita (inputs, selects, sliders de range, checkboxes, datepickers).
2. **Aba de Parâmetros no Projeto (`/projects/[id]`)**:
   - Formulário dinâmico que carrega os parâmetros ativos e exibe os valores com indicação de origem (*Definido no Projeto* vs *Padrão do Sistema*).
   - Botão para salvar alterações diretamente no banco de dados.

---

## 6. Testes Automatizados

A suíte em [tests/parameter-resolver.test.ts](file:///c:/CURSOS/cineprompt/tests/parameter-resolver.test.ts) valida:
- A hierarquia de precedência de valores.
- O isolamento entre instâncias de personagens e cenas.
- O bloqueio por falta de parâmetros obrigatórios.
- A avaliação de visibilidade declarativa.
- Operações de CRUD e persistência real no Supabase.

Execute com:
```bash
npm test
```
