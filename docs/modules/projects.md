# Módulo: Gerenciamento de Projetos Cinematográficos

O módulo de **Projetos** é o contêiner central do Tomadix. Ele organiza todo o universo ficcional e técnico de uma produção audiovisual, servindo como o agrupador raiz para parâmetros dinâmicos, personagens recorrentes, ambientes, cenas e versões de prompts gerados por inteligência artificial.

---

## 1. Responsabilidades e Funcionalidades

- **Criação e Configuração de Projetos**: Definição de títulos, descrições conceituais, gêneros cinematográficos, idiomas, durações e especificações técnicas de destino.
- **Configurações Técnicas de Destino**: Suporte a ferramentas de geração de imagem e vídeo como **Google Flow**, **Nano Banana**, **Midjourney v6**, **Runway Gen-3**, **OpenAI Sora** e **Kling AI**, além de proporções de tela (*Aspect Ratio*: `16:9`, `9:16`, `2.39:1`, `4:3`, `1:1`), *color grading* e ritmo (*pacing*).
- **Listagem e Busca Inteligente**:
  - Busca textual em tempo real no nome e na descrição do projeto.
  - Filtro por estado: **Ativos**, **Arquivados** e **Todos**.
  - Ordenação por atualização mais recente, mais antiga, título (A-Z / Z-A) e data de criação.
- **Alternância de Visualização**: Exibição em **Cards Cinematográficos** com contadores dos submódulos ou em **Tabela Detalhada**.
- **Duplicação Profunda e Atômica**: Permite clonar um projeto inteiro através de uma transação Prisma (`$transaction`), duplicando automaticamente parâmetros, personagens, ambientes e cenas, remontando os vínculos relacionais (`SceneCharacter` e `SceneEnvironment`) com novos identificadores únicos.
- **Arquivamento e Restauração**: Possibilidade de arquivar projetos concluídos ou pausados sem perda de dados, com restauração em um clique.
- **Exclusão Segura**: Modal com confirmação explícita avisando sobre o impacto em cascata nos submódulos dependentes.
- **Segurança Multitenant**: Isolamento estrito por Workspace e validação via `Membership`, impedindo que qualquer usuário consulte ou modifique projetos de terceiros.

---

## 2. Modelo de Dados (Prisma Schema)

```prisma
model Project {
  id              String           @id @default(cuid())
  workspaceId     String
  title           String
  description     String           @default("")
  genre           String?
  language        String           @default("pt-BR")
  durationSeconds Int?
  configuration   Json             @default("{}")
  visualBible     Json?
  isArchived      Boolean          @default(false)
  archivedAt      DateTime?
  workspace       Workspace        @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  parameterValues ParameterValue[]
  characters      Character[]
  environments    Environment[]
  scenes          Scene[]
  generations     GenerationJob[]
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([workspaceId, updatedAt])
  @@index([workspaceId, isArchived])
}
```

---

## 3. Estrutura de Arquivos do Módulo

```text
src/
├── app/
│   ├── api/
│   │   └── projects/
│   │       ├── route.ts                 # GET (listar) e POST (criar)
│   │       └── [id]/
│   │           ├── route.ts             # GET (detalhes), PATCH (atualizar), DELETE (excluir)
│   │           ├── duplicate/route.ts   # POST (duplicação transacional)
│   │           ├── archive/route.ts     # POST (arquivar)
│   │           └── restore/route.ts     # POST (restaurar)
│   └── projects/
│       ├── page.tsx                     # Listagem, filtros, modais e ações
│       └── [id]/page.tsx                # Visão detalhada e navegação entre submódulos
├── lib/
│   ├── auth.ts                          # Resolução de usuário/workspace e autorização
│   └── schemas/
│       └── project.ts                   # Schemas Zod de validação
├── modules/
│   └── projects/
│       └── project.service.ts           # Regras de negócio e operações no banco
└── tests/
    └── project.service.test.ts          # Testes automatizados de integração
```

---

## 4. Exemplos Práticos de Uso da API

### 4.1. Criar um Projeto

**Requisição:**
`POST /api/projects`

```json
{
  "title": "Neo-Sertão 2099",
  "description": "Ficção científica distópica no semiárido nordestino com estética cyberpunk e luz solar dura.",
  "genre": "Cyberpunk",
  "language": "pt-BR",
  "durationSeconds": 120,
  "configuration": {
    "targetPlatform": "Google Flow",
    "aspectRatio": "2.39:1",
    "colorGrade": "Teal & Orange saturado com poeira dourada",
    "pacing": "Dinâmico com cortes secos"
  }
}
```

**Resposta (`201 Created`):**
```json
{
  "message": "Projeto criado com sucesso.",
  "data": {
    "id": "cm7abc1230001xyz",
    "workspaceId": "cm7ws0001abc",
    "title": "Neo-Sertão 2099",
    "description": "Ficção científica distópica no semiárido nordestino...",
    "genre": "Cyberpunk",
    "language": "pt-BR",
    "durationSeconds": 120,
    "configuration": {
      "targetPlatform": "Google Flow",
      "aspectRatio": "2.39:1",
      "colorGrade": "Teal & Orange saturado com poeira dourada",
      "pacing": "Dinâmico com cortes secos"
    },
    "isArchived": false,
    "archivedAt": null,
    "createdAt": "2026-10-21T22:15:00.000Z",
    "updatedAt": "2026-10-21T22:15:00.000Z",
    "_count": {
      "characters": 0,
      "environments": 0,
      "scenes": 0,
      "parameterValues": 0,
      "generations": 0
    }
  }
}
```

---

### 4.2. Listar Projetos com Filtros e Busca

**Requisição:**
`GET /api/projects?search=Sertão&status=active&sort=updatedAt_desc`

**Resposta (`200 OK`):**
```json
{
  "data": [
    {
      "id": "cm7abc1230001xyz",
      "title": "Neo-Sertão 2099",
      "genre": "Cyberpunk",
      "isArchived": false,
      "_count": {
        "characters": 3,
        "environments": 2,
        "scenes": 5,
        "parameterValues": 8,
        "generations": 12
      }
    }
  ],
  "total": 1
}
```

---

### 4.3. Duplicar um Projeto com Elementos Filhos

**Requisição:**
`POST /api/projects/cm7abc1230001xyz/duplicate`

```json
{
  "title": "Neo-Sertão 2099 - Versão do Diretor"
}
```

**Resposta (`201 Created`):**
```json
{
  "message": "Projeto duplicado com sucesso.",
  "data": {
    "id": "cm7dup9990002xyz",
    "title": "Neo-Sertão 2099 - Versão do Diretor",
    "_count": {
      "characters": 3,
      "environments": 2,
      "scenes": 5,
      "parameterValues": 8,
      "generations": 0
    }
  }
}
```

---

### 4.4. Arquivar e Restaurar

- **Arquivar:** `POST /api/projects/:id/archive` -> Define `isArchived = true` e preenche `archivedAt`.
- **Restaurar:** `POST /api/projects/:id/restore` -> Define `isArchived = false` e limpa `archivedAt`.

---

### 4.5. Excluir Permanentemente

**Requisição:**
`DELETE /api/projects/cm7abc1230001xyz`

**Resposta (`200 OK`):**
```json
{
  "message": "Projeto excluído com sucesso."
}
```

---

## 5. Interface e Navegação

- **Rota `/projects`**: Painel principal com busca, filtros de estado (*Ativos*, *Arquivados*, *Todos*), alternador de visualização (*Cards* / *Tabela*), modais de criação/edição e confirmação de exclusão.
- **Rota `/projects/[id]`**: Painel do projeto com visão técnica e abas de navegação para os submódulos:
  - **Visão Geral**: Ficha técnica, formatos, durações e metadados.
  - **Personagens**: Consistência de elenco e figurinos.
  - **Ambientes**: Cenários e paletas de iluminação.
  - **Cenas**: Decupagem e roteiro visual.
  - **Parâmetros Dinâmicos**: Injeções de variáveis para prompts.
  - **Motor de Prompts**: Histórico de versões e gerações em JSON.

---

## 6. Testes Automatizados

O módulo possui testes de integração cobrindo todas as operações em [tests/project.service.test.ts](file:///c:/CURSOS/cineprompt/tests/project.service.test.ts):
Para executar a suíte de testes:

```bash
npm test
```
