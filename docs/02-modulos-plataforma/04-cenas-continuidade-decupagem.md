# 04 — Cenas, Decupagem Técnica e Verificação de Continuidade

O módulo de **Cenas e Decupagem Técnica** permite sequenciar a narrativa visual do projeto cinematográfico em planos/takes, vincular personagens e ambientes com ações pontuais e verificar automaticamente inconsistências narrativas antes da renderização de prompts de IA.

---

## 1. Estrutura de Decupagem de Cena (`Scene`)

Cada cena registra dados técnicos e dramáticos essenciais:
- **`order`**: Índice de ordenação sequencial na linha do tempo da produção.
- **`timeOfDay`**: Horário cinematográfico (ex: `GOLDEN_HOUR`, `NIGHT`, `DAWN`, `HIGH_NOON`).
- **`weather`**: Condições climáticas da tomada (ex: `RAIN`, `FOG`, `CLEAR`, `OVERCAST`).
- **`camera`**: Lente, movimento de câmera (Travelling, Pan, Tilt, Dolly-in) e ângulo de visão (Close-up, Wide, Over-the-shoulder).
- **`lighting`**: Iluminação pontual da cena (Key light, Rim light, Práticas acesas).
- **Vínculos Dinâmicos**: Relacionamentos `SceneCharacter` e `SceneEnvironment` com atributos pontuais de cena.

---

## 2. Motor de Análise de Continuidade (`ContinuityService`)

O `ContinuityService` inspeciona a sequência cronológica de cenas do projeto e detecta conflitos estéticos ou físicos entre tomadas consecutivas:

1. **Continuidade Temporal**: Alerta de quebra caso uma cena seguinte mude drasticamente de horário (ex: de `MIDDAY` para `MIDNIGHT`) sem indicação de elipse temporal explícita.
2. **Continuidade Climática**: Detecta alterações súbitas de clima no mesmo ambiente (ex: chuva torrencial em uma cena e sol límpido na tomada seguinte).
3. **Consistência de Figurino e Props**: Identifica quando um personagem surge em cena com figurino conflitante com a tomada anterior sem justificativa de roteiro.
4. **Relatório de Diagnóstico**: Gera avisos severos (`ERROR`) ou alertas consultivos (`WARNING`) para apoiar a revisão do diretor.

---

## 3. Criação e Decupagem Cinematográfica com Inteligência Artificial

A plataforma conta com funcionalidades nativas de IA que atuam diretamente no módulo de cenas, debitando créditos conforme a tabela configurável de operações:

### 3.1. Expansão de Cena (`EXPAND_SCENE`)
Disponível no card de cada cena na lista (`ScenesTab`), permite que o diretor desdobre uma cena base em 2 a 4 sub-planos cinematográficos ou variações de ângulo:
- **Sub-Planos Clássicos (`SUB_SHOTS`)**: Progressão de Plano Geral (estabelecimento) para Plano Médio e Plano Próximo/Reação.
- **Variações de Ângulo (`CAMERA_ANGLES`)**: Desdobramento em contra-campos, eixos alternativos, plongée e contra-plongée.
- **Planos Detalhe e Inserts (`DETAIL_SHOTS`)**: Planos fechados focados em objetos dramáticos, mãos, reações sutis ou iluminação.
- **Micro-Ações (`MICRO_ACTIONS`)**: Decomposição temporal de batidas cênicas consecutivas.
- As novas cenas são inseridas imediatamente após a cena pai na linha do tempo, com reordenação atômica transacional no banco e herança dos personagens e ambientes vinculados.

### 3.2. Geração de Sequência Contínua de Cenas (`GEN_SCENE_SEQUENCE`)
Acessível na barra superior de cenas através do botão **"✨ Sequência com IA"**:
- O diretor informa a premissa dramática da sequência, o número de cenas desejadas (2 a 8), o ritmo cinematográfico (*Equilibrado*, *Ação Intensa*, *Slow Burn*, *Acelerado*) e os personagens/ambientes a serem vinculados.
- O motor Gemini concebe a sequência inteira encadeada com continuidade dramática, ações físicas e transições de corte, inserindo as cenas automaticamente na produção.

### 3.3. Geração de Roteiro Cinematográfico Completo (`GEN_SCRIPT`)
Acessível na barra superior através do botão **"🎬 Roteiro com IA"**:
- Converte a premissa em um roteiro profissional no padrão internacional *Master Scene Format* (Sluglines INT./EXT., rubricas de direção e diálogos com subtexto).
- Disponibiliza visualizador com syntax de roteiro e botão de cópia rápida.
- Com a opção "Instanciar automaticamente", extrai cada cena do roteiro e as cadastra como tomadas sequenciais no projeto.

---

## 4. Endpoints da API de Cenas e Criação Cinematográfica

- `GET /api/projects/[id]/scenes`: Lista todas as cenas ordenadas por `order` ascendente.
- `POST /api/projects/[id]/scenes`: Criação manual de cena com decupagem e vínculos.
- `POST /api/projects/[id]/scenes/[sceneId]/expand`: Expansão da cena com IA (`EXPAND_SCENE`).
- `POST /api/projects/[id]/scenes/generate-sequence`: Geração de sequência encadeada de cenas com IA (`GEN_SCENE_SEQUENCE`).
- `POST /api/projects/[id]/script/generate`: Geração de roteiro cinematográfico completo com IA (`GEN_SCRIPT`).
- `GET /api/projects/[id]/scenes/[sceneId]`: Detalhes completos da cena e seus vínculos.
- `PUT /api/projects/[id]/scenes/[sceneId]`: Atualização técnica da decupagem.
- `POST /api/projects/[id]/scenes/[sceneId]/duplicate`: Duplicação de cena com preservação de vínculos.
- `POST /api/projects/[id]/scenes/reorder`: Reordenação em lote da linha do tempo.
- `GET /api/projects/[id]/scenes/continuity`: Diagnóstico de continuidade técnica entre todas as tomadas.
