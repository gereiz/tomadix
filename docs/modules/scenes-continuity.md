# Módulo: Editor de Cenas e Continuidade Cinematográfica

O módulo de **Editor de Cenas e Continuidade Cinematográfica** permite aos realizadores audiovisuais estruturar projetos narrativos em sequências de tomadas (*takes*) detalhadas, com controle preciso de ações, movimentos de câmera, fotografia, iluminação, áudio, diálogos e verificação algorítmica de consistência narrativa.

---

## 1. Princípios Arquiteturais e Estrutura da Cena

Cada cena opera como uma unidade dramática e visual na linha do tempo do projeto. Suas configurações incluem:

- **Identificação & Sequenciamento**: Título, descrição narrativa e índice de ordem sequencial (`order`), com reordenação atômica transacional.
- **Intenção de Duração**: O campo `durationSeconds` é tratado estritamente como **intenção de planejamento de roteiro/decupagem**, não como garantia de que o motor generativo de IA (Google Flow, Nano Banana, Runway, Sora) produzirá o tempo exato em segundos.
- **Vínculos com a Biblioteca**: Associação direta a `Character` e `Environment`, preservando os traços visuais permanentes e aplicando sobrescritas temporárias da cena em `SceneCharacter.configuration` e `SceneEnvironment.configuration`.
- **Ação e Continuidade**:
  - `mainAction`: Ação física essencial da tomada.
  - `initialState`: Estado dos personagens/objetos no início do plano.
  - `finalState`: Estado resultante no corte do plano.
  - `characterMovement`: Deslocamento no quadro e linha de ação.
- **Direção de Câmera e Fotografia**:
  - `framing`: Enquadramentos clássicos (*Plano Geral*, *Plano Médio*, *Close-Up*, *Plano Americano*, etc.).
  - `cameraMovement`: Movimentos de câmera (*Estática*, *Pan*, *Tilt*, *Dolly/Travelling*, *Handheld*, *Grua*, *Orbital*).
  - `focusDepth`: Profundidade de campo (foco raso f/1.8 com bokeh vs. foco profundo).
  - `lighting`: Esquema de iluminação pontual.
  - `transitionIn` e `transitionOut`: Transições (*Corte Direto*, *Fade in*, *Dissolve*, *Match cut*).
- **Desenho de Som, Diálogos e Trilha**:
  - `ambientSound`: Textura sonora do ambiente.
  - `dialogue`: Flag `enabled`, linhas de diálogo e idioma configurado.
  - `music`: Flag `enabled` e descrição da instrumentação e tom musical.
- **Restrições Específicas**: Regras negativas para orientar a geração de IA.

---

## 2. Motor de Análise de Continuidade (`ContinuityService`)

O Tomadix implementa um motor algorítmico sequencial que analisa as cenas consecutivas ($Cena_i \to Cena_{i+1}$) e aponta inconsistências antes do envio para geração:

1. **Continuidade de Ação e Estados Físicos**:
   - Compara o `finalState` da cena anterior com o `initialState` da cena seguinte.
   - Detecta saltos bruscos sem transição temporal (ex: personagem que terminou a tomada "ferido no chão" e inicia a próxima tomada "correndo em pé ileso" sem corte elíptico ou *fade to black*).
2. **Continuidade Espacial e Transposição de Ambiente**:
   - Detecta mudanças abruptas de locação em que personagens se deslocam instantaneamente entre ambientes distintos sem corte ou plano de estabelecimento.
3. **Continuidade de Iluminação e Horário do Dia**:
   - Valida se o mesmo ambiente sofre variações incoerentes de luz (ex: tomada noturna sucedida imediatamente por luz solar intensa do meio-dia no mesmo cenário).
4. **Linha de Ação e Eixo de 180 Graus**:
   - Alerta para possíveis quebras de continuidade direcional (personagem correndo para a esquerda seguido por tomada em plano contraposto sem justificativa de câmera).
5. **Consistência de Som e Idioma**:
   - Valida se diálogos ativados em projetos destinados ao português do Brasil (`pt-BR`) estão devidamente redigidos no idioma, alertando para incongruências sem bloquear a liberdade artística do realizador.
   - Fornece avisos caso diálogos e trilha estejam desativados, transmitindo restrições claras ao motor de prompts.

> **Importante**: O motor de continuidade atua exclusivamente de forma consultiva e explicável. Nenhuma cena ou dado do usuário é alterado silenciosamente.

---

## 3. Endpoints da API REST

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/projects/[id]/scenes` | Listar todas as cenas do projeto em ordem sequencial com personagens e ambientes vinculados |
| `POST` | `/api/projects/[id]/scenes` | Criar nova cena na sequência |
| `GET` | `/api/projects/[id]/scenes/[sceneId]` | Obter detalhes e vínculos de uma cena |
| `PATCH` | `/api/projects/[id]/scenes/[sceneId]` | Atualizar especificações cinematográficas, metadados e vínculos |
| `DELETE` | `/api/projects/[id]/scenes/[sceneId]` | Excluir cena e recompactar numeração sequencial das restantes |
| `POST` | `/api/projects/[id]/scenes/[sceneId]/duplicate` | Duplicar cena inserindo a cópia imediatamente na sequência |
| `POST` | `/api/projects/[id]/scenes/reorder` | Reordenar atomicamente a sequência de cenas |
| `GET` | `/api/projects/[id]/scenes/continuity` | Gerar relatório de análise de continuidade sequencial |

---

## 4. Exemplos de Payloads

### Criação de Cena com Especificações Cinematográficas (`POST .../scenes`)

```json
{
  "title": "Cena 1 - Infiltração Silenciosa",
  "description": "Clara invade o galpão através de uma claraboia quebrada.",
  "durationSeconds": 5,
  "characterIds": ["cuid_clara_vance_1"],
  "environmentIds": ["cuid_galpao_porto_2"],
  "configuration": {
    "mainAction": "Clara desce de rapel segurando uma lanterna tática.",
    "initialState": "Presa ao teto de vigas metálicas",
    "finalState": "Pousa agachada sobre caixas de madeira",
    "characterMovement": "Descida vertical suave com desaceleração",
    "framing": "Plano Médio (Medium Shot)",
    "cameraMovement": "Tilt vertical descendente acompanhando o movimento",
    "focusDepth": "Profundidade de campo rasa f/2.0 focada no rosto",
    "lighting": "Contraste chiaroscuro com feixes de lanterna cortando poeira",
    "visualStyle": "Estética Neo-noir anamórfica 35mm",
    "transitionIn": "Fade in suave",
    "transitionOut": "Corte Direto (Cut)",
    "ambientSound": "Goteiras ao fundo e rangido sutil de metal sob vento",
    "dialogue": {
      "enabled": true,
      "language": "pt-BR",
      "lines": "CLARA: 'Ponto de entrada seguro.'"
    },
    "music": {
      "enabled": true,
      "description": "Tensão crescente com cordas sintetizadas graves"
    },
    "restrictions": "Sem iluminação frontal estourada, sem cortes rápidos"
  }
}
```

### Relatório de Análise de Continuidade (`GET .../scenes/continuity`)

```json
{
  "projectId": "cuid_projeto_123",
  "analyzedScenesCount": 3,
  "status": "critical",
  "summary": {
    "critical": 1,
    "warning": 1,
    "info": 0
  },
  "warnings": [
    {
      "type": "action_continuity",
      "severity": "critical",
      "sceneIdA": "cuid_scene_1",
      "sceneOrderA": 1,
      "sceneTitleA": "Cena 1 - Infiltração Silenciosa",
      "sceneIdB": "cuid_scene_2",
      "sceneOrderB": 2,
      "sceneTitleB": "Cena 2 - Perseguição na Passarela",
      "title": "Possível salto de continuidade física entre Cenas 1 e 2",
      "message": "O estado final da Cena 1 indica 'Pousa ferida no chão', enquanto o estado inicial da Cena 2 indica 'Em pé correndo veloz', sem uma transição de passagem de tempo.",
      "suggestion": "Adicione uma transição elíptica (ex: Fade to Black, Dissolve) ou descreva a recuperação na ação intermediária."
    }
  ]
}
```
