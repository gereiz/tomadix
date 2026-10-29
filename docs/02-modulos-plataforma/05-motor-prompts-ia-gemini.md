# 05 — Motor de Prompts Cinematográficos e Integração Gemini AI

O **Motor de Engenharia de Prompts** do Tomadix transforma a decupagem técnica, os parâmetros dinâmicos e as bíblias visuais em instruções otimizadas para geradores de imagem e vídeo de ponta, integrando diretamente com a API do Google Gemini.

---

## 1. Templates Cinematográficos Especializados

O motor disponibiliza 7 templates cinematográficos de engenharia de prompt:
1. **`CHARACTER_PORTRAIT`**: Retratos dramáticos com iluminação e textura facial consistente.
2. **`ENVIRONMENT_ESTABLISHING`**: Planos gerais de ambientação com profundidade e arquitetura.
3. **`KEY_SCENE_ACTION`**: Ação e tensão dramática entre personagens com composição cinematográfica.
4. **`LIGHTING_MOOD`**: Estudos de atmosfera, chiaroscuro, volumetria e névoa.
5. **`CINEMATOGRAPHY_SHOT`**: Decupagem formal com especificação de lentes anamórficas, sensor e grão de película.
6. **`STORYBOARD_PANEL`**: Esboço estruturado para pré-visualização de planos sequenciais.
7. **`FULL_SEQUENCE_DECOUPAGE`**: Roteiro visual completo decupado cena a cena.

---

## 2. Pipeline de Compilação de Prompts

O pipeline de geração segue um fluxo determinístico de enriquecimento:

```text
[1. Resolução de Parâmetros Dinâmicos e Hierarquia]
       │
       ▼
[2. Injeção de Diretrizes da Bíblia Visual do Projeto]
       │
       ▼
[3. Compilação dos Traços Permanentes de Personagens/Ambientes]
       │
       ▼
[4. Aplicação das Condições Momentâneas do Take/Cena]
       │
       ▼
[5. Formatação do Prompt Positivo e Negativo para o Modelo]
       │
       ▼
[6. Envio Assíncrono para o Modelo Gemini via Google Gen AI SDK]
```

---

## 3. Gestão Assíncrona de Jobs e Dedução de Créditos

- **`GenerationJob`**: Criação de registro em fila com status `PENDING`, `PROCESSING`, `COMPLETED` ou `FAILED`.
- **Reserva e Dedução de Créditos**: Validação prévia de saldo de créditos no workspace antes de iniciar o job. Em caso de falha ou timeout da IA, o sistema realiza estorno imediato no `CreditLedger`.
- **Versionamento de Prompts**: Cada renderização gera um registro imutável com número de versão sequencial, permitindo comparar variações no tempo (`/api/projects/[id]/prompts/compare`).

---

## 4. Endpoints da API do Motor de Prompts (`/api/projects/[id]/prompts`)

- `GET /api/projects/[id]/prompts/templates`: Lista os templates disponíveis com base no plano.
- `POST /api/projects/[id]/prompts/generate`: Disparo de geração com template selecionado e dedução de créditos.
- `GET /api/projects/[id]/prompts/history`: Histórico de versões geradas com filtros por cena.
- `GET /api/projects/[id]/prompts/jobs/[jobId]`: Consulta de status do processamento assíncrono.
- `POST /api/projects/[id]/prompts/compare`: Comparação lado a lado entre duas versões geradas.
- `GET /api/projects/[id]/prompts/export-sequence`: Exportação da sequência decupada em TXT ou JSON.
