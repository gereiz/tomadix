# Console Administrativo: Configurações Gerais e Limpeza Segura

O módulo de **Configurações Gerais** (`/admin/settings`) centraliza os parâmetros globais de operação da plataforma, modos de contingência e ferramentas de governança de dados.

---

## 1. Configurações Globais da Plataforma

- **Dados Institucionais:** Nome oficial, descrição de metadados, e-mail de contato e URL do portal de suporte.
- **Modo de Manutenção:** Quando ativado, exibe mensagem personalizada aos usuários finais, restringindo o acesso à plataforma durante janelas de manutenção técnica.
- **Banner de Comunicados:** Exibição condicional de barra de avisos no topo do dashboard com tipagem visual (informativo, aviso ou alerta).
- **Feature Flags Globais:** Ativação e desativação em tempo real de funcionalidades como registro público de novas contas, estúdio multimodal, biblioteca visual e parâmetros avançados.

---

## 2. Ferramenta de Limpeza Segura de Dados de Teste

Durante o desenvolvimento de funcionalidades e a execução de suítes de testes automatizados, diversos registros de teste (usuários com e-mails `@example.com` ou `@test.com`, estúdios temporários e gateways sandbox) são criados no banco de dados.

Para limpar a base de dados com segurança sem risco de perda de dados reais, foi criada a ferramenta de **Limpeza Cirúrgica de Dados de Teste**:

### 2.1. Lista de Proteção de Usuários Reais
O serviço `PlatformSettingsService` mantém uma lista explícita de contas reais que nunca podem ser removidas ou afetadas pela rotina de limpeza, além de filtrar domínios corporativos legítimos.

### 2.2. Fluxo em Duas Etapas com Confirmação Estrita

1. **Etapa 1 — Análise Prévia Sem Efeito Colateral:**
   - O administrador clica em *"Analisar Dados de Teste"*.
   - O backend inspeciona o banco e retorna uma contagem detalhada de registros que correspondem a padrões de teste:
     - Usuários de teste identificados
     - Estúdios/Workspaces de teste vinculados
     - Projetos de teste associados
     - Registros de webhook e gateways de teste
   - O relatório é exibido na tela antes de qualquer exclusão.

2. **Etapa 2 — Confirmação com Frase de Segurança:**
   - A exclusão exige que o administrador digite a frase exata:
     `EXCLUIR DADOS DE TESTE`
   - Se a frase estiver incorreta ou vazia, a requisição é rejeitada pelo servidor.

3. **Etapa 3 — Exclusão em Cascata Controlada e Auditoria:**
   - A exclusão remove os registros de forma ordenada respeitando as chaves estrangeiras relacionais.
   - A ação é registrada permanentemente na tabela `PlatformAuditLog` sob a ação `PLATFORM_TEST_DATA_CLEANUP`.

