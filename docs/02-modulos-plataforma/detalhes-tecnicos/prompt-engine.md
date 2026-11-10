# Módulo: Motor de Composição e Geração de Prompts com Gemini

O módulo **Motor de Composição e Geração de Prompts com Gemini** é o núcleo inteligente do **Tomadix**. Ele não opera como uma caixa de texto genérica que envia prompts soltos para um modelo de linguagem; em vez disso, implementa um motor de decupagem, síntese estruturada e geração orientada por contexto, com saída estritamente validada em JSON via Zod e adaptada a perfis de ferramentas de destino como **Google Flow**, **Nano Banana** e **Genérico**.

---

## 1. Princípios Arquiteturais e Diretrizes Fundamentais

1. **Geração de Prompts, Não de Mídia Direta**: O sistema gera especificações textuais e estruturadas em JSON de altíssimo rigor cinematográfico para alimentar geradores de imagem e vídeo de ponta. O Tomadix não gera diretamente arquivos `.mp4` ou `.png`.
2. **Saída JSON Estruturada e Tipada**: Todas as gerações solicitam retorno em `application/json` e são validadas contra schemas Zod específicos de cada template.
3. **Sem Invenção Silenciosa de Dados**: Caso ocorra falha de rede, chave de API ausente, cota excedida, timeout ou JSON inválido retornado pela IA, o sistema captura a exceção, registra o erro no `GenerationJob` com status `FAILED` e nunca devolve dados fictícios como se fossem reais.
4. **Segurança de Credenciais no Servidor**: A chave `GEMINI_API_KEY` é acessada única e exclusivamente no runtime do servidor Next.js. Nenhum segredo ou token confidencial é exposto ao cliente ou registrado em logs públicos.
5. **Preservação de Identidade e Estilo**: O compilador preserva rigorosamente a consistência visual permanente de personagens (rosto, traços fisionômicos, idade aparente, figurino mestre) e ambientes, adaptando a estética do projeto (ex: *VHS dos anos 1990*, *Cyberpunk anamórfico*, *Noir clássico*) nos parâmetros técnicos de fotografia, lentes e pós-processamento sem deformar os traços essenciais dos personagens.

---

## 2. Fluxo de Geração em 14 Etapas

O método `PromptEngineService.generate` orquestra o pipeline completo:

1. **Recepção**: Recebe o ID do projeto, o template solicitado, a ferramenta de destino e o contexto opcional (cena, personagem, ambiente, instruções personalizadas).
2. **Autorização**: Valida se o projeto pertence ao `workspaceId` ativo do usuário (isolamento multitenant estrito).
3. **Carga de Dados**: Recupera o projeto, configurações técnicas e metadados no banco PostgreSQL (Supabase).
4. **Verificação de Requisitos de Entidade**: Valida se o template exige uma entidade específica (ex: `character_definition` requer `characterId`, `environment_definition` requer `environmentId`, `individual_scene` requer `sceneId`).
5. **Resolução de Parâmetros Dinâmicos**: Carrega os parâmetros do projeto com sistema de escopo e herança (`Global` -> `Character`/`Environment` -> `Scene` -> `Output`).
6. **Validação de Parâmetros Obrigatórios**: Identifica se algum parâmetro obrigatório do projeto está ausente ou nulo.
7. **Recuperação de Templates e Perfis**: Carrega a versão mestre do template do catálogo e as regras de formatação do perfil de saída (`Google Flow`, `Nano Banana`, `Genérico`).
8. **Composição Contextual**: Monta o prompt do sistema (`systemInstruction`) e as instruções completas do realizador (`userPrompt`), agregando decupagem, paleta, iluminação, ótica de câmera e notas de continuidade.
9. **Invocação Segura com SDK `@google/genai`**: Envia a requisição à Gemini API (`gemini-3.8-flash`) com timeout de 45s via `Promise.race` e configuração `responseMimeType: "application/json"`.
10. **Sanitização e Validação Zod**: Limpa potenciais delimitadores markdown (` ```json `) e valida a resposta com o schema Zod correspondente ao template.
11. **Extração de Texto Compilado**: Extrai o texto final do prompt para permitir cópia rápida de 1 clique na interface do estúdio.
12. **Registro de Auditoria (`GenerationJob`)**: Atualiza o job de geração com status `SUCCEEDED`, tokens consumidos (`inputTokens`, `outputTokens`) e tempos de início e fim. Em caso de erro, marca como `FAILED` com `errorMessage`.
13. **Histórico Versionado (`PromptVersion`)**: Cria uma nova versão imutável com snapshot das entradas, versão do template, perfil de ferramenta e JSON resultante.
14. **Resposta Estruturada**: Devolve o objeto tipado e pronto para consumo visual pela UI, sem necessidade de parsing manual no frontend.

---

## 3. Catálogo de Templates Suportados (Versionados)

Cada template possui diretrizes cinematográficas específicas e schema Zod dedicado:

| Chave | Nome | Versão | Objetivo | Schema Zod |
|---|---|---|---|---|
| `visual_bible` | Bíblia Visual do Projeto | 1 | Diretrizes mestras: paleta, ótica, filosofia de câmera, continuidade global e regras negativas | `visualBibleOutputSchema` |
| `character_definition` | Definição de Personagem | 1 | Perfil visual persistente para consistência facial, figurino mestre e traços físicos | `characterDefinitionOutputSchema` |
| `environment_definition` | Definição de Ambiente | 1 | Arquitetura, iluminação primária, atmosfera de partículas e plano de estabelecimento | `environmentDefinitionOutputSchema` |
| `image_prompt` | Prompt de Imagem | 1 | Composição fotográfica estática, enquadramento, profundidade de campo e iluminação | `imagePromptOutputSchema` |
| `video_prompt` | Prompt de Vídeo | 1 | Tomada dinâmica com vetores de câmera, ação, som ambiente, restrições e continuidade | `videoPromptOutputSchema` |
| `scene_sequence` | Sequência de Cenas | 1 | Decomposição sequencial de planos, transições e progressão dramática | `sceneSequenceOutputSchema` |
| `individual_scene` | Prompt de Cena Individual | 1 | Decupagem detalhada de uma tomada específica com todos os elementos integrados | `individualSceneOutputSchema` |

---

## 4. Perfis de Ferramentas de Destino

Cada motor de difusão possui características óticas e limitações que o compilador respeita:

### 1. Google Flow (`google_flow`)
- **Foco**: Transições contínuas de vídeo, vetores de movimento de câmera (`Dolly forward`, `Pan horizontal`, `Crane descendente`).
- **Suporte**: Vetores de movimento (`supportsMotionVectors: true`), proporções customizadas e prompts negativos dedicados.
- **Áudio**: Controlado separadamente na plataforma de destino (`supportsAudioTags: false`).
- **Tamanho Máximo**: JSON até 5.000 caracteres; Texto Simples até 2.500.

### 2. Nano Banana (`nano_banana`)
- **Foco**: Sintaxe densa com tags cinematográficas, parâmetros em JSON e iluminação detalhada.
- **Suporte**: Formato estruturado, proporção de aspecto, palavras-chave separadas por vírgula.
- **Tamanho Máximo**: JSON até 5.000 caracteres; Texto Simples até 2.500.

### 3. Seedance (`seedance`)
- **Foco**: Cenas multi-shot com tempo explícito (`Shot 1 (0-3s): ...`), ação em verbos físicos, movimento de câmera direto e áudio nativo.
- **Suporte**: Vetores de movimento e tags de áudio (`supportsAudioTags: true`); restrições breves em vez de negative prompt dedicado.
- **Tamanho Máximo**: JSON até 5.000 caracteres; Texto Simples até 2.500.

### 4. Kling (`kling`)
- **Foco**: Prosa natural fluida (sujeito, ação, cenário, câmera, luz), física realista e um movimento principal de câmera por plano.
- **Suporte**: Negative prompt curto e separado.
- **Tamanho Máximo**: JSON até 5.000 caracteres; Texto Simples até 2.500.

### 5. Genérico (`generic`)
- **Foco**: Compatibilidade universal com ferramentas de difusão de vídeo e imagem (Runway Gen-2/3, Sora, Midjourney, Luma Dream Machine).
- **Suporte**: Linguagem natural descritiva, alta densidade estética e especificações óticas clássicas de 35mm.
- **Tamanho Máximo**: JSON até 5.000 caracteres; Texto Simples até 2.500.

> **Limite de caracteres**: o JSON estruturado (`outputJson`) mantém o conteúdo completo (até `maxPromptCharacters`, 5.000). Apenas o **Texto Simples** (`outputText`, aba, cópia e `.txt`) é limitado a `maxPlainTextCharacters` (2.500) por `plain-text-limit.ts`, que encolhe primeiro o prompt compilado em fim de frase. Na Sequência de Cenas o limite vale por cena.

### Sequência de Cenas
O template `scene_sequence` carrega as cenas reais do projeto (todas, ou as selecionadas), ordenadas por `order`, e as injeta no prompt como fonte de verdade. Após a resposta da IA, `PromptEngineService.reconcileSequence` força `sceneId`, `order`, `title` e duração oficiais, uma tomada por cena; sem cenas o serviço devolve erro e nenhum crédito é cobrado.

---

## 5. Exemplos de Saída Estruturada

### Exemplo: Prompt de Vídeo (`video_prompt` para Google Flow)

```json
{
  "sceneIdentifier": "Cena 01 - Beco Chuvoso da Liberdade",
  "narrativeObjective": "Estabelecer a solidão e o isolamento de Akira em uma megalópole futurista.",
  "characterReferences": ["Akira Tanaka"],
  "environmentReferences": ["Beco Chuvoso da Liberdade"],
  "action": "Akira acende um cigarro holográfico enquanto observa a sombra que foge no final do beco.",
  "visualComposition": "Medium shot clássico com profundidade de campo rasa, reflexos ciano em poças d'água.",
  "camera": "35mm anamórfica, f/1.8, proporção 2.39:1 widescreen",
  "movement": "Travelling frontal lento e suave avançando em direção ao olhar do detetive.",
  "lighting": "Recorte de néon ciano e magenta difuso, asfalto molhado com reflexos volumétricos.",
  "style": "Cinematografia Neo-Noir Cyberpunk com granulação orgânica de película 35mm.",
  "sound": "Chuva fina contínua contra o asfalto e zumbido elétrico de letreiros néon.",
  "dialogue": null,
  "constraints": [
    "Sem iluminação diurna direta",
    "Sem movimentos bruscos de chicote de câmera"
  ],
  "continuityNotes": "Preservar a textura do sobretudo preto e o brilho do implante ocular azul para o corte seguinte.",
  "compiledProductionPrompt": "Cinematic 35mm anamorphic shot, medium framing, 2.39:1. Akira Tanaka wearing a worn black trenchcoat, cybernetic glowing blue eye, lighting a holographic cigarette under fine rain in a narrow neon-lit alleyway. Volumetric cyan and magenta backlight reflecting on wet asphalt. Smooth slow frontal dolly camera movement. Cinematic atmospheric film grain."
}
```

---

## 6. Endpoints da API REST

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/projects/[id]/prompts/generate` | Executa o fluxo de geração completo e persiste versão histórica |
| `GET` | `/api/projects/[id]/prompts/templates` | Lista os 7 templates de sistema e os 3 perfis de ferramentas |
| `GET` | `/api/projects/[id]/prompts/history` | Consulta o histórico de prompts gerados para o projeto |
| `GET` | `/api/projects/[id]/prompts/[versionId]` | Recupera detalhes e payload JSON completo de uma versão específica |

---

## 7. Tratamento de Erros e Exceções

O provedor Gemini (`src/modules/ai/gemini-provider.ts`) encapsula os erros em classes semânticas:

- `GeminiAuthError` (HTTP 401): Chave `GEMINI_API_KEY` ausente ou inválida.
- `GeminiQuotaError` (HTTP 429): Cota por minuto ou limite de requisições excedido.
- `GeminiTimeoutError` (HTTP 504): Esgotamento do timeout de 45 segundos.
- `GeminiInvalidJsonError` (HTTP 502): Modelo não devolveu JSON parseável.
- `GeminiValidationError` (HTTP 422): JSON recebido não atende ao schema Zod do template.

Em todos os casos de erro, o `GenerationJob` associado é atualizado com `status: FAILED` e mensagem explicativa, garantindo rastreabilidade e integridade total.

---

## Estilos de Captura

`captureStyle` (`cinematic` padrão, `amateur_phone`, `selfie_flash`, `lowres_grain`, `lowres_grain_extreme`, `security_cam`, `cctv_lowbit`, `found_footage`) define **como a imagem/vídeo foi gravado**, independente da plataforma. Catálogo em `capture-styles.ts`.

- Nos templates `image_prompt`, `video_prompt`, `individual_scene` e `scene_sequence`, um estilo diferente de `cinematic` adiciona a seção "ESTILO DE CAPTURA OBRIGATÓRIO" ao prompt do Gemini, que substitui jargões cinematográficos (35mm, anamórfico, grão de película, color grading) por câmera de celular, ruído digital, enquadramento casual etc., e acrescenta termos ao negativo.
- O estilo é gravado em `inputSnapshot.captureStyle` e repetido na regeneração.
- Na geração direta de imagem e vídeo (`/api/images/generate`, `/api/videos/generate`), o `CinematicPromptEnricher` troca o enriquecimento cinematográfico pelo sufixo do estilo e mescla os negativos.
- Interface: seletor "Estilo de Captura" no gerador de prompts, no gerador direto de imagem e no modal de vídeo (`components/ui/capture-style-select.tsx`).

### Granulado e baixa resolução
Os estilos amadores pedem grão/ruído digital e baixa resolução (e negativam `sharp 4k`/`ultra HD`). O estilo `lowres_grain` ("Granulado / baixa resolução") é o mais forte. Na **geração direta de imagem**, além do texto, `image-degrade.ts` (`sharp`) aplica degradação real antes de salvar: reduz, desfoca, recomprime em JPEG, reamplia e soma grão. Nível por estilo: `lowres_grain` = heavy; `amateur_phone`, `selfie_flash`, `security_cam` e `found_footage` = medium; `cinematic` não degrada. Os estilos `lowres_grain_extreme` ("Granulado extremo / IA viral") e `cctv_lowbit` ("Câmera de segurança de baixo bitrate") usam descritores concretos (240-360p ampliado, ruído digital de sensor ISO 6400+ de luminância/crominância — "não grão de película" —, macroblocking e mosquito noise de H.264, banding, rolling shutter, nitidez exagerada, auto-exposição oscilando) e têm `suffixFirst`: na geração direta o descritor vai **antes** do prompt do usuário. Mapeiam para o nível `extreme` de degradação (escala 0,22, JPEG q20). Atenção: o Gemini pode reescrever esses descritores no JSON final; vale conferir uma geração real. A caixa "Aplicar granulado e baixa resolução reais" (`degradeImage`) permite desligar. O vídeo depende só do texto do estilo (não há pós-processamento).
