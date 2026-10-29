# Módulo: Estúdio & Análise Cinematográfica Multimodal

O **Estúdio de Análise Cinematográfica** (`/studio` e `/cinematic-analysis`) é o módulo de inteligência artificial multimodal do Tomadix que decupa referências visuais em parâmetros técnicos cinematográficos, permitindo a fusão criativa de múltiplos atributos de imagem para enriquecer os projetos audiovisuais.

---

## 1. Fluxo de Trabalho no Estúdio

### 1.1. Seleção e Criação de Projeto de Destino (Contexto Prévio)
Para garantir que as análises geradas pertençam imediatamente ao contexto criativo correto:
- Ao acessar a página `/studio`, o usuário escolhe entre selecionar um projeto existente, criar um novo projeto rapidamente através do modal embutido, ou optar por "Nenhum projeto selecionado" (modo avulso).
- As ferramentas completas de upload e decupagem são exibidas somente após a definição do projeto de destino.

### 1.2. Upload Múltiplo de Imagens de Referência
- O componente de upload aceita uma ou várias imagens simultaneamente (JPEG, PNG, WebP).
- **Seleção da Imagem Principal:**
  - Ao carregar mais de uma imagem, o usuário define qual é a imagem **Principal** (destaque com badge verde "PRINCIPAL").
  - A imagem principal é a referência primária decupada na íntegra (enquadramento, estética geral, lente, atmosfera).
- **Atribuição Seletiva de Atributos Secundários:**
  - Para cada imagem auxiliar adicionada, o usuário escolhe qual parâmetro específico deseja herdar daquela foto (exemplo: *"Imagem 1 é a principal para estilo e enquadramento, Imagem 2 define a iluminação de recorte e Imagem 3 fornece o figurino do personagem"*).
  - O prompt de visão computacional envia a matriz de referências ao Gemini Multimodal com instruções explícitas de fusão criativa.

---

## 2. Histórico de Análises Cinematográficas

### 2.1. Exibição da Imagem Principal no Card
- Os cards do histórico de análises exibem de forma destacada a **imagem principal** submetida na análise.
- O card indica a contagem de referências utilizadas (ex: *"1 Principal + 1 Auxiliar"*).

### 2.2. Modal de Inspeção Completa de Referências
- Ao clicar em qualquer análise do histórico, o modal técnico permite visualizar **todas as imagens originais** enviadas naquela sessão, com miniaturas expansíveis e identificação dos papéis de cada imagem na composição final.

---

## 3. Otimizações de UX e Desempenho

### 3.1. Carregamento Acelerado do Dashboard (`/dashboard`)
- O carregamento da página `/dashboard` foi reestruturado com consultas paralelas assíncronas (`Promise.all`), eliminação de gargalos relacionais e carregamento sob demanda, reduzindo o tempo de carregamento de ~60 segundos para menos de 1 segundo.

### 3.2. Contextualização da Caixa de Criação Rápida de Ideias
- A caixa de digitação de ideias foi removida da visão global de workspaces (`/workspace`), onde criava ambiguidade de escopo.
- A ferramenta foi realocada para o interior dos projetos (`/projects/[id]`), onde personagens, ambientes e cenas são gerados instantaneamente e vinculados ao projeto ativo.

### 3.3. Deduplicação de Parâmetros Globais nos Projetos
- As telas de criação e edição de projetos (`/projects`) foram limpas, removendo seletores e campos duplicados e assegurando consistência com as definições cadastradas em Parâmetros Dinâmicos.

