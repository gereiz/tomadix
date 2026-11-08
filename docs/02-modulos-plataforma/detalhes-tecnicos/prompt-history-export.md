# Módulo: Histórico, Versionamento, Exportação e Testes

O módulo de **Histórico, Versionamento, Exportação e Testes** do Tomadix é responsável por garantir a integridade, rastreabilidade, imutabilidade e distribuição dos prompts cinematográficos gerados pela inteligência artificial.

---

## 1. Princípios Arquiteturais e Diretrizes de Imutabilidade

1. **Nunca Sobrescrever Conteúdo Histórico**: Qualquer regeneração ou ajuste solicitado pelo diretor resulta na criação de uma **nova versão** (`v2`, `v3`, etc.) vinculada à anterior via `parentVersionId`. Versões antigas permanecem permanentemente acessíveis e inalteradas.
2. **Reproduzibilidade Total via Snapshots Profundos**: Cada versão gravada armazena um `elementsSnapshot` completo (projeto, cena, personagem, ambiente, decupagem e parâmetros resolvidos) no exato instante da geração. Mesmo que um personagem mude de figurino ou um parâmetro global seja editado no futuro, o prompt histórico reflete com exatidão as condições em que foi concebido.
3. **Auditoria de Erros da IA**: Falhas de comunicação com a Gemini API (estouro de cotas, timeouts, JSON inválido ou credenciais incorretas) são persistidas em `GenerationJob` com status `FAILED` e exibidas de forma transparente no painel de histórico, permitindo inspeção e novas tentativas.
4. **Sanitização Estrita na Exportação**: Arquivos `.json` exportados contêm formatação limpa (2 espaços, UTF-8), omitindo chaves secretas (`GEMINI_API_KEY`), credenciais de banco de dados (`DATABASE_URL`) ou IDs internos desnecessários.
5. **Isolamento Multitenant Rigoroso**: Todas as consultas de histórico, regeneração, comparação de versões e exportação exigem validação de propriedade do workspace.

---

## 2. Funcionalidades Principais

### 1. Listagem e Filtros Multicritério
Permite consultar os prompts gerados filtrando por:
- **Template**: Bíblia Visual, Prompt de Vídeo, Prompt de Imagem, Definição de Personagem, etc.
- **Estado**: Todos (`ALL`), Apenas Sucesso (`SUCCEEDED`) ou Falhas Registradas (`FAILED`).
- **Cena**: Filtragem por tomadas específicas da narrativa.
- **Período**: Filtro por intervalo de datas (`startDate`, `endDate`).

### 2. Comparador de Versões (Diff Lado a Lado)
Compara duas versões arbitrárias do mesmo projeto, identificando:
- Chaves JSON modificadas, adicionadas ou removidas.
- Diferenças entre valores de parâmetros resolvidos.
- Comparação lado a lado do texto compilado do prompt com realce de diferenças.

### 3. Regeneração Guiada por Snapshot
Permite selecionar uma versão prévia e disparar nova geração com instruções adicionais de ajuste (ex: *"Aumentar a velocidade do travelling e intensificar luz de recorte"*).
- Reutiliza os snapshots contextuais originais.
- Gera uma nova versão com número incremental.
- Aponta a versão de origem através de `parentVersionId`.

### 4. Exportação JSON de Versão Individual
Baixa um arquivo `.json` sanitizado contendo:
- Metadados do projeto (título, gênero, idioma).
- Template utilizado e versão do schema.
- Perfil técnico da ferramenta de destino (`google_flow`, `nano_banana`, `seedance`, `kling`, `generic`).
- Payload JSON completo do prompt.
- Texto compilado para produção.
- Snapshot de parâmetros e entidades.
- Metadados técnicos (modelo, tokens consumidos, tempo de execução em milissegundos).

### 5. Exportação da Sequência Completa de Cenas
Gera um manifesto unificado com a sequência dramática do projeto:
- Cenas ordenadas estritamente por `order` ascendente.
- Decupagem técnica de cada cena (ação principal, enquadramento, movimento de câmera, iluminação, profundidade de foco).
- Personagens e ambientes associados a cada tomada.
- Diretrizes de som, diálogo e música.
- Último prompt gerado para cada tomada (caso disponível).
- Transições de continuidade para a tomada seguinte.

---

## 3. Endpoints da API REST

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/projects/[id]/prompts/history` | Lista histórico unificado com suporte a filtros (`templateKey`, `status`, `sceneId`, `startDate`, `endDate`) |
| `GET` | `/api/projects/[id]/prompts/[versionId]` | Recupera detalhes e payload JSON completo de uma versão específica |
| `POST` | `/api/projects/[id]/prompts/[versionId]/regenerate` | Regenera a partir de versão anterior criando nova versão imutável |
| `GET` | `/api/projects/[id]/prompts/[versionId]/export?download=true` | Exporta e baixa o arquivo `.json` formatado da versão |
| `POST` | `/api/projects/[id]/prompts/compare` | Compara duas versões calculando diff de JSON, texto e parâmetros |
| `GET` | `/api/projects/[id]/prompts/export-sequence?download=true` | Exporta a sequência completa de cenas do projeto com decupagem e prompts |
| `GET` | `/api/projects/[id]/prompts/jobs` | Lista falhas e jobs de geração registrados para auditoria |
| `DELETE` | `/api/projects/[id]/prompts/jobs?jobId=xxx` | Exclui um registro específico de erro ou limpa todos os erros do projeto |
| `DELETE` | `/api/projects/[id]/prompts/jobs/[jobId]` | Exclui um registro individual de erro de geração |

---

## 4. Exemplo de Arquivo Exportado

### Prompt de Vídeo (`tomadix-video_prompt-v2-abc123.json`)

```json
{
  "tomadixVersion": "1.0",
  "cinepromptStudioVersion": "1.0",
  "exportTimestamp": "2026-10-21T21:30:00.000Z",
  "project": {
    "id": "cm7...01",
    "title": "O Enigma de Solaris Prime",
    "genre": "Sci-Fi / Mistério",
    "language": "pt-BR"
  },
  "template": {
    "key": "video_prompt",
    "version": 1
  },
  "targetTool": "google_flow",
  "versionNumber": 2,
  "parentVersionId": "cm7...00",
  "compiledPromptText": "Intense cinematic close-up, Dr. Elena Vance trembling hands activating reactor lockdown. Fast frontal dolly zoom, flashing red emergency strobe lights. Claustrophobic atmospheric sci-fi.",
  "promptStructuredJson": {
    "sceneIdentifier": "Cena 01 - Alerta na Ponte (Take 2)",
    "narrativeObjective": "Intensificar o pânico sutil da Dra. Elena com luz estroboscópica.",
    "characterReferences": ["Dra. Elena Vance"],
    "environmentReferences": ["Módulo de Comando da Estação"],
    "action": "Elena aciona o protocolo de isolamento do reator com as mãos trêmulas.",
    "visualComposition": "Close-up tenso nos olhos e reflexos no visor.",
    "camera": "50mm anamorphic, f/1.4",
    "movement": "Dolly in frontal rápido.",
    "lighting": "Flashes rápidos de luz vermelha de emergência e escuridão.",
    "style": "Sci-Fi claustrofóbico 2.39:1 widescreen.",
    "sound": "Alarme ensurdecedor e respiração ofegante pelo comunicador.",
    "dialogue": null,
    "constraints": ["Sem iluminação suave", "Sem corte elíptico"],
    "continuityNotes": "Elena deve manter expressão de choque no corte para cena 2."
  },
  "contextSnapshot": {
    "parameters": {
      "aspect_ratio": "2.39:1",
      "film_grain": "35mm orgânico"
    },
    "directorInstructions": "Aumentar a urgência dramática com plano mais fechado e luz estroboscópica.",
    "sceneTitle": "Alerta na Ponte",
    "characterName": "Dra. Elena Vance",
    "environmentName": "Módulo de Comando da Estação"
  },
  "technicalMetadata": {
    "model": "gemini-3.8-flash",
    "tokens": {
      "inputTokens": 520,
      "outputTokens": 260
    },
    "durationMs": 4120,
    "generatedAt": "2026-10-21T21:29:55.000Z"
  }
}
```
