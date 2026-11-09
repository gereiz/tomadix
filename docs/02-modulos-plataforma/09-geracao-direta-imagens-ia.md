# Módulo da Plataforma: Geração Direta de Imagens com IA (Pollinations.ai)

## 1. Visão Geral

O Tomadix disponibiliza duas modalidades complementares para a concepção visual cinematográfica:

1. **A. Gerar Prompt (Motor de Prompts com Gemini):**
   - Composição de prompts estruturados por templates (Keyframe, Cenas, Bíblia Visual, Personagens).
   - Saída em JSON validado ou Texto Puro formatado para ferramentas externas.
2. **B. Gerar Imagem (Geração Direta com IA):**
   - Envio direto do prompt para o provedor de inferência visual configurado (inicialmente Pollinations.ai / Flux).
   - Renderização visual e persistência definitiva no histórico da plataforma.
   - Visualização com zoom e download em alta qualidade.
   - Ação direta *"Gerar imagem com este prompt"*, permitindo transformar qualquer prompt do Gemini em imagem com 1 clique.

---

## 2. Experiência de Uso

### 2.1 Seleção da Modalidade
Na aba **Prompts** de qualquer projeto ou no Estúdio, o criador tem acesso à barra de modalidade:
- **[ ✨ Gerar Prompt (Gemini) ]**: Modo tradicional de engenharia de prompt.
- **[ 🖼️ Gerar Imagem (IA Direta) ]**: Nova interface de renderização imediata.
- **[ 📸 Galeria de Imagens ]**: Histórico e biblioteca de assets visuais gerados.

### 2.2 Parâmetros de Geração Direta
- **Descrição Cinematográfica (Prompt):** Texto livre ou importado diretamente do Gemini.
- **Modelo de Imagem:** Seleção entre os modelos permitidos para o plano do usuário (ex: *Flux Schnell*, *Flux Realism*, *SDXL Turbo*).
- **Proporções de Tela Suportadas:**
  - `16:9` (1280x720): Widescreen cinematográfico e prévias de vídeo.
  - `1:1` (1024x1024): Quadrado / Perfil de personagem.
  - `9:16` (720x1280): Formato vertical para mobile / reels.
  - `4:3` (1024x768): Proporção clássica.
  - `21:9` (1344x576): Cinemascope ultra-panorâmico.
- **Prompt Negativo:** Campo opcional para excluir artefatos indesejados.

### 2.3 Ação "Gerar Imagem com este Prompt"
Em qualquer prompt gerado pelo Gemini (seja na visualização atual ou no histórico de versões), o botão **Gerar Imagem** copia o texto integral do prompt cinematográfico para o gerador de imagem, permitindo ajustes antes da execução sem modificar silenciosamente o prompt original.

---

## 3. Fluxo Transacional Seguro de Créditos (Ledger & Estorno)

1. **Validação Prévia:** O backend valida permissões do plano, modelos permitidos e limite diário/mensal antes de qualquer requisição externa.
2. **Débito Atômico:** O custo em créditos é deduzido através do `CreditExecutionService`, respeitando a ordem global de consumo e os lotes com expiração mais próxima (FEFO).
3. **Chamada Externa Segura:** O provedor de imagem é acionado no backend. A chave de API nunca é exposta no navegador.
4. **Armazenamento Seguro:** A imagem recebida (em Base64 ou URL) é gravada de forma persistente em storage (`public/generated-images/`), prevenindo perda de arquivos decorrente de URLs temporárias externas.
5. **Estorno Automático:** Se ocorrer timeout, erro no provedor ou resposta inválida, o sistema executa o estorno compensatório automático integral dos créditos consumidos, garantindo integridade financeira ao usuário.


## Chave global do administrador (ligar/desligar)

A geração direta de **imagens e vídeos** é controlada por uma chave global, **desligada por padrão**: `Configurações Gerais > Módulos Opcionais > Geração de Imagens e Vídeos por IA` (`featureFlags.mediaGenerationEnabled`, em `PlatformSettingsService`). A mudança é auditada (`PLATFORM_MEDIA_GENERATION_TOGGLED`, com `from`/`to`).

- **API (autoritativo):** com a chave desligada, `ImageGenerationService.generateDirectImage` e `VideoGenerationService.generateDirectVideo` recusam com `MEDIA_GENERATION_DISABLED` (403) antes de qualquer consulta ou cobrança; `quick-create` tipo `IMAGE` responde 403; `available-models` de imagem e vídeo devolvem `enabled: false`. A leitura da flag tem cache de 15 s.
- **Interface:** o navegador lê `/api/features` (`FeatureFlagsProvider`, hook `useMediaGeneration()`); sem resposta, a mídia fica oculta. Somem: modos Imagem/Vídeo/Galeria da aba Prompts e botões "Gerar Imagem/Vídeo", cartões e ações do dashboard e da barra de criação, retratos/botões de imagem em personagens, ambientes e cenas, nós de imagem/vídeo e ações do Board, miniaturas e colagens de imagens geradas, selo do provedor e menções nos planos/simulação (`media-visibility.ts`).
- **Continuam ativos:** geração de prompts (texto) de imagem/vídeo, Análise de imagem, telas de configuração do admin (com aviso "desligada") e os dados já gerados (voltam ao religar).
