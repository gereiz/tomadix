# 03 — Projetos, Bíblia Visual, Personagens e Ambientes

A **Biblioteca de Personagens, Ambientes e Projetos** do Tomadix é o pilar de consistência visual para narrativas audiovisuais geradas com Inteligência Artificial, prevenindo a deriva de estilo (*visual drift*) ao longo de múltiplas cenas.

---

## 1. Princípios de Consistência Visual

Em produções cinematográficas com IA, rostos, figurinos e arquiteturas tendem a variar a cada geração. O Tomadix resolve isso através da separação entre **atributos permanentes** e **condições momentâneas**:

1. **Atributos Permanentes (Biblioteca do Personagem / Ambiente)**:
   - Traços imutáveis gravados no perfil: fisiologia, formato facial, idade aparente, corte/cor de cabelo, figurino-base, paleta cromática, arquitetura, adereços mestres e iluminação recorrente.
   - Restrições explícitas de representação (*negative guidelines*).
2. **Condições Momentâneas da Cena (Vínculos - `SceneCharacter` / `SceneEnvironment`)**:
   - Ação pontual executada pelo personagem no take.
   - Mudança temporária de vestimenta (ex: "molhado pela chuva", "sem casaco").
   - Emoção momentânea, direção de olhar ou posicionamento espacial no plano.

---

## 2. Estrutura de Bíblias Visuais e Projetos

O modelo `Project` centraliza a narrativa do estúdio:
- **`configuration`**: Configurações de aspect ratio (16:9, 2.39:1 anamórfico, 9:16), FPS e formato do sensor.
- **`visualBible`**: Diretrizes estéticas mestras do projeto (estilo de direção de arte, paleta de cores dominante, regras de iluminação mestra).
- **Isolamento Multitenant**: Todo projeto pertence estritamente a um `workspaceId`. Tentativas de acesso entre workspaces são bloqueadas no servidor.

---

## 3. Endpoints da API de Projetos, Personagens e Ambientes

### Projetos (`/api/projects`)
- `GET /api/projects`: Lista projetos ativos do workspace atual.
- `POST /api/projects`: Criação de projeto validando os limites do plano contratado.
- `GET /api/projects/[id]`: Detalhes completos do projeto, incluindo bíblia visual e contagens.
- `PUT /api/projects/[id]`: Atualização de configurações e bíblia visual.
- `POST /api/projects/[id]/duplicate`: Clonagem completa com personagens e ambientes.
- `POST /api/projects/[id]/archive`: Arquivamento controlado sem exclusão destrutiva.

### Personagens (`/api/projects/[id]/characters`)
- `GET /api/projects/[id]/characters`: Lista personagens do projeto.
- `POST /api/projects/[id]/characters`: Cadastro de personagem com atributos permanentes.
- `PUT /api/projects/[id]/characters/[characterId]`: Atualização de dados físicos/estéticos.
- `POST /api/projects/[id]/characters/[characterId]/duplicate`: Duplicação de personagem.
- `POST /api/projects/[id]/characters/[characterId]/archive`: Arquivamento controlado.

### Ambientes (`/api/projects/[id]/environments`)
- `GET /api/projects/[id]/environments`: Lista cenários do projeto.
- `POST /api/projects/[id]/environments`: Cadastro de ambiente com atmosfera e iluminação.
- `PUT /api/projects/[id]/environments/[environmentId]`: Atualização do ambiente.
- `POST /api/projects/[id]/environments/[environmentId]/duplicate`: Duplicação de ambiente.
- `POST /api/projects/[id]/environments/[environmentId]/archive`: Arquivamento controlado.
