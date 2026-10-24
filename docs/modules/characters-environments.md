# Módulo: Biblioteca de Personagens e Ambientes Cinematográficos

A **Biblioteca de Personagens e Ambientes** do Tomadix é o pilar de consistência visual para projetos audiovisuais produzidos com Inteligência Artificial. Ela permite cadastrar, gerenciar, versionar e compilar as diretrizes físicas, estéticas e arquiteturais de elementos que se repetem ao longo de múltiplas cenas e tomadas.

---

## 1. Princípios de Consistência Visual

Em produções cinematográficas assistidas por IA, o maior desafio é a deriva de estilo (*visual drift*), onde um personagem muda de rosto ou figurino a cada frame, ou um ambiente perde suas características espaciais.

Para resolver isso, o Tomadix adota uma separação rigorosa de escopos:

1. **Atributos Permanentes (Biblioteca do Personagem / Ambiente)**:
   - Traços imutáveis gravados no perfil: fisiologia, formato facial, idade aparente, corte/cor de cabelo, figurino-base, paleta cromática, arquitetura, props recorrentes e iluminação mestra.
   - Restrições explícitas de representação (*negative guidelines*).
2. **Condições Momentâneas da Cena (Escopo da Cena - `SceneCharacter` / `SceneEnvironment`)**:
   - Ação pontual executada pelo personagem na tomada.
   - Mudança temporária de vestimenta (ex: "molhado pela chuva", "sem casaco").
   - Emoção momentânea, direção de olhar ou posicionamento espacial no plano.

---

## 2. Modelo de Dados (Prisma Schema)

```prisma
model Character {
  id          String           @id @default(cuid())
  projectId   String
  name        String
  description String           @default("")
  attributes  Json             @default("{}")
  isArchived  Boolean          @default(false)
  archivedAt  DateTime?
  project     Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sceneLinks  SceneCharacter[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@index([projectId, updatedAt])
  @@index([projectId, isArchived])
}

model Environment {
  id          String             @id @default(cuid())
  projectId   String
  name        String
  description String             @default("")
  attributes  Json               @default("{}")
  isArchived  Boolean            @default(false)
  archivedAt  DateTime?
  project     Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sceneLinks  SceneEnvironment[]
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  @@index([projectId, updatedAt])
  @@index([projectId, isArchived])
}

model SceneCharacter {
  id            String    @id @default(cuid())
  sceneId       String
  characterId   String
  configuration Json      @default("{}") // Sobrescritas temporárias da cena
  scene         Scene     @relation(fields: [sceneId], references: [id], onDelete: Cascade)
  character     Character @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@unique([sceneId, characterId])
}

model SceneEnvironment {
  id            String      @id @default(cuid())
  sceneId       String
  environmentId String
  configuration Json        @default("{}") // Sobrescritas temporárias da cena
  scene         Scene       @relation(fields: [sceneId], references: [id], onDelete: Cascade)
  environment   Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)

  @@unique([sceneId, environmentId])
}
```

---

## 3. Atributos Estruturados

### Personagens (`CharacterAttributes`)
- **`apparentAge`**: Idade aparente (ex: `34 anos`).
- **`visualIdentity`**: Identidade visual e estilo (ex: `Estilo Neo-noir, iluminação lateral de alto contraste`).
- **`physicalCharacteristics`**: Altura, compleição e traços distintivos (ex: `1.80m, atlético, cicatriz no queixo`).
- **`hairAndFace`**: Cabelo, barba, olhos e formato facial (ex: `Cabelo castanho curto, barba por fazer`).
- **`costumeAndAccessories`**: Figurino e adereços característicos (ex: `Sobretudo de couro escuro, relógio analógico`).
- **`personalityAndBehavior`**: Postura e linguagem corporal (ex: `Postura calculista, olhar compenetrado`).
- **`voiceAndLanguage`**: Tom vocal e idioma (ex: `Tom grave, português com sotaque urbano`).
- **`restrictions`**: O que NUNCA gerar (ex: `Sem sorrisos exagerados, sem armas modernas`).
- **`basePrompt`**: Prompt customizado pré-otimizado para motores de difusão/vídeo.

### Ambientes (`EnvironmentAttributes`)
- **`locationContext`**: Contexto geográfico ou ficcional (ex: `Setor 4, Subsolo da Metrópole`).
- **`architecture`**: Estrutura física e materiais (ex: `Concreto aparente brutalista, tubulações industriais expostas`).
- **`propsAndElements`**: Objetos e elementos de cena (ex: `Painéis analógicos piscando, mesas metálicas`).
- **`lighting`**: Esquema de luz mestre (ex: `Chiaroscuro, luz volumétrica âmbar entrando por claraboias`).
- **`colorPalette`**: Paleta de cores dominante (ex: `Tons frios ciano com realces âmbar e sombras carvão`).
- **`weatherAndAtmosphere`**: Clima e condições ambientais (ex: `Névoa densa com partículas em suspensão`).
- **`historicalEra`**: Época histórica ou futurista (ex: `Ano 2088 pós-singularidade`).
- **`visualStyle`**: Linguagem de câmera e ótica (ex: `Lentes anamórficas 35mm, proporção 2.39:1`).
- **`basePrompt`**: Prompt mestre do ambiente.

---

## 4. Endpoints da API REST

### Personagens
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/projects/[id]/characters` | Listar personagens com busca (`?search=`) e filtro (`?status=active\|archived\|all`) |
| `POST` | `/api/projects/[id]/characters` | Cadastrar novo personagem |
| `GET` | `/api/projects/[id]/characters/[characterId]` | Obter detalhes de um personagem |
| `PATCH` | `/api/projects/[id]/characters/[characterId]` | Atualizar atributos de um personagem |
| `DELETE` | `/api/projects/[id]/characters/[characterId]` | Excluir personagem e desvincular de cenas |
| `POST` | `/api/projects/[id]/characters/[characterId]/duplicate` | Duplicar personagem com novos identificadores |
| `POST` | `/api/projects/[id]/characters/[characterId]/archive` | Arquivar personagem |
| `POST` | `/api/projects/[id]/characters/[characterId]/restore` | Restaurar personagem arquivado |
| `GET` | `/api/projects/[id]/characters/[characterId]/prompt` | Gerar prompt-base estruturado em JSON com 1 clique |

### Ambientes
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/projects/[id]/environments` | Listar ambientes com busca e filtros |
| `POST` | `/api/projects/[id]/environments` | Cadastrar novo ambiente |
| `GET` | `/api/projects/[id]/environments/[environmentId]` | Obter detalhes do ambiente |
| `PATCH` | `/api/projects/[id]/environments/[environmentId]` | Atualizar atributos do ambiente |
| `DELETE` | `/api/projects/[id]/environments/[environmentId]` | Excluir ambiente |
| `POST` | `/api/projects/[id]/environments/[environmentId]/duplicate` | Duplicar ambiente |
| `POST` | `/api/projects/[id]/environments/[environmentId]/archive` | Arquivar ambiente |
| `POST` | `/api/projects/[id]/environments/[environmentId]/restore` | Restaurar ambiente |
| `GET` | `/api/projects/[id]/environments/[environmentId]/prompt` | Gerar prompt-base estruturado em JSON |

---

## 5. Exemplo de Saída Estruturada em JSON

### Prompt Estruturado do Personagem (`GET .../characters/[id]/prompt`)

```json
{
  "schemaVersion": "1.0",
  "type": "character_prompt",
  "characterId": "cuid_kaelen_voss_123",
  "name": "Kaelen Voss",
  "visualSummary": "Ex-detetive cibernético em busca de redenção.",
  "permanentFeatures": {
    "identity": "Detetive cyberpunk melancólico, iluminação de neon lateral",
    "physical": "1.85m, porte atlético, cicatriz no queixo, idade aparente: 38 anos",
    "hairAndFace": "Cabelo preto raspado nas laterais, barba cerrada por fazer",
    "costume": "Sobretudo cinza escuro impermeável com gola alta e relógio analógico",
    "personality": "Expressão reservada, olhar atento e postura rígida",
    "restrictions": [
      "Nunca sorrir abertamente",
      "Sem armas de fogo convencionais modernas"
    ]
  },
  "compiledPromptText": "cinematic raw photograph of Kaelen Voss, sharp facial features, dramatic rim lighting, Detetive cyberpunk melancólico, iluminação de neon lateral, 1.85m, porte atlético, cicatriz no queixo, idade aparente: 38 anos, Cabelo preto raspado nas laterais, barba cerrada por fazer, Sobretudo cinza escuro impermeável com gola alta e relógio analógico, Expressão reservada, olhar atento e postura rígida. Negative prompt / restrictions: Nunca sorrir abertamente, Sem armas de fogo convencionais modernas"
}
```

### Prompt Estruturado do Ambiente (`GET .../environments/[id]/prompt`)

```json
{
  "schemaVersion": "1.0",
  "type": "environment_prompt",
  "environmentId": "cuid_beco_neon_456",
  "name": "Beco das Sombras Neon",
  "summary": "Beco estreito entre arranha-céus com vapor saindo de bueiros.",
  "permanentFeatures": {
    "location": "Distrito Baixo de Neo-Tóquio",
    "architecture": "Arranha-céus de concreto e vidro com fiação exposta e passarelas metálicas suspensas",
    "props": "Placas holográficas em japonês, poças de água reflexivas, latões de lixo de aço",
    "lighting": "Contraste forte com iluminação prática de letreiros neon magenta e ciano refletindo no asfalto molhado",
    "palette": "Azul petróleo profundo, magenta elétrico e preto asfalto",
    "atmosphere": "Chuva torrencial fina, garoa incessante e névoa densa",
    "era": "Século XXII pós-singularidade",
    "style": "Estética Blade Runner 2049, lentes Master Prime anamórficas"
  },
  "compiledPromptText": "cinematic ultra wide establishing shot of a wet cybernetic alley, neon reflections on asphalt, Distrito Baixo de Neo-Tóquio, Arranha-céus de concreto e vidro com fiação exposta e passarelas metálicas suspensas, Placas holográficas em japonês, poças de água reflexivas, latões de lixo de aço, Contraste forte com iluminação prática de letreiros neon magenta e ciano refletindo no asfalto molhado, Tons: Azul petróleo profundo, magenta elétrico e preto asfalto, Atmosfera: Chuva torrencial fina, garoa incessante e névoa densa, Época: Século XXII pós-singularidade, Estilo: Estética Blade Runner 2049, lentes Master Prime anamórficas"
}
```

---

## 6. Interface de Usuário

1. **Abas no Detalhe do Projeto (`/projects/[id]`)**:
   - Aba **Personagens**: exibe contador dinâmico, barra de busca textual, filtro de estado (*Ativos*, *Arquivados*, *Todos*), e cards estilizados com badges de características visuais e contagem de cenas vinculadas.
   - Aba **Ambientes**: exibe dados arquiteturais, iluminação e clima com filtros equivalentes.
2. **Modais de Edição e Criação**:
   - Organizados em grupos temáticos: *Fisiologia*, *Figurino*, *Comportamento*, *Restrições* e *Prompt Base*.
   - Nenhum campo é bloqueante além do nome, permitindo rascunhos rápidos.
3. **Modal de Prompt JSON com 1-Clique**:
   - Permite visualizar o JSON formatado e copiar diretamente para a área de transferência para colagem rápida em ferramentas como Google Flow e Nano Banana.
