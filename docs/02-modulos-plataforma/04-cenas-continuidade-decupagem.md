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

## 3. Endpoints da API de Cenas (`/api/projects/[id]/scenes`)

- `GET /api/projects/[id]/scenes`: Lista todas as cenas ordenadas por `order` ascendente.
- `POST /api/projects/[id]/scenes`: Criação de cena com decupagem e vínculos de entidades.
- `GET /api/projects/[id]/scenes/[sceneId]`: Detalhes completos da cena e seus vínculos.
- `PUT /api/projects/[id]/scenes/[sceneId]`: Atualização técnica da decupagem.
- `POST /api/projects/[id]/scenes/[sceneId]/duplicate`: Duplicação de cena com preservação de vínculos.
- `POST /api/projects/[id]/scenes/reorder`: Reordenação em lote da linha do tempo.
- `GET /api/projects/[id]/scenes/continuity`: Diagnóstico de continuidade técnica entre todas as tomadas.
