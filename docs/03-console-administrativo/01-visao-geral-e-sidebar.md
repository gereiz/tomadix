# Console Administrativo: Visão Geral e Navegação

O **Console Administrativo do Tomadix** é o painel de controle operacional, comercial e de infraestrutura da plataforma, projetado com interface SaaS moderna, alto contraste e eficiência de navegação.

---

## 1. Estrutura e Hierarquia de Navegação

A interface administrativa é dividida em:
1. **Sidebar Lateral Retrátil:** Navegação hierárquica por grupos funcionais.
2. **Header Administrativo:** Identificação de perfil, atalho rápido para o estúdio, status de conexão e breadcrumbs.
3. **Área de Conteúdo:** Cartões informativos, tabelas de alta densidade de dados com paginação e formulários modulares.

---

## 2. Grupos Funcionais da Sidebar

- **Visão Geral:**
  - `Dashboard`: Métricas de usuários, receita estimada, estúdios ativos, projetos criados e consumo de créditos de IA.
- **Gestão:**
  - `Usuários`: Consulta, suspensão/reativação, papéis (`USER`, `ADMIN`, `SUPER_ADMIN`), confirmação de e-mail e detalhamento.
  - `Projetos`: Auditoria de projetos de todos os estúdios e ferramenta de transferência entre usuários.
  - `Planos & Assinaturas`: Gestão comercial de assinaturas, catálogo de tiers e limites.
  - `Tabela de Créditos`: Configuração direta dos custos em créditos de cada tipo de criação (prompts, cenas, personagens, ambientes, análise multimodal e estúdio), com regras por plano e simulador ao vivo.
  - `Consumo & Custos IA`: Gráficos de tokens e telemetria de chamadas Gemini.
  - `Parâmetros Dinâmicos`: Catálogo de parâmetros cinematográficos do sistema e sincronização de defaults.
- **Plataforma:**
  - `Personalização`: Identidade visual, logotipo, paleta de cores e controle de badges.
  - `Configurações Gerais`: Modo de manutenção, comunicados e limpeza segura de dados de teste.
  - `Banco de Dados`: Testes de latência, troca de conexão e setup wizard de inicialização.
- **Sistema:**
  - `Biblioteca Visual`: Catálogo de referências visuais com imagens, comparações e notas técnicas.
  - `Auditoria & Logs`: Registro permanente de ações críticas com sanitização de segredos.

---

## 3. Recursos de UX da Sidebar

- **Recolhimento Desktop:** Permite recolher a barra para modo ícones compactos para liberar espaço em telas menores. A preferência é persistida automaticamente no navegador via `localStorage`.
- **Gaveta Mobile (Off-Canvas):** Em smartphones e tablets, a sidebar funciona como drawer acessível pelo botão de menu com backdrop blur.
- **Navegação por Teclado e Foco:** Suporte completo a navegação acessível.

