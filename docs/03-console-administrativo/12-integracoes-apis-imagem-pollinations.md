# Console Administrativo: Integrações de APIs de Imagem (Pollinations.ai & Arquitetura de Provedores)

## 1. Visão Geral

O módulo **Integrações de APIs de Imagem** gerencia os provedores de inteligência artificial generativa de imagens do Tomadix. Ele oferece governança centralizada de credenciais seguras, catálogo dinâmico de modelos, testes de conexão em tempo real sem custo de créditos e parametrização comercial independente.

A primeira implementação concreta suporta o provedor **Pollinations.ai**, com arquitetura abstrata desacoplada preparada para a adição futura de outros provedores (como OpenAI DALL-E, Stability AI, Replicate, Midjourney) sem impacto nas regras de negócio ou no sistema de planos.

---

## 2. Rota e Localização no Console

- **Caminho no Menu:** Plataforma > APIs de Imagem (IA)
- **URL Administrativa:** `/admin/settings/image-providers`
- **Permissão RBAC Exigida:** `settings:manage` (Platform Admin ou Super Admin)

---

## 3. Arquitetura de Integração & Provedores

### 3.1 Camada de Abstração (`ImageGenerationProvider`)
A camada de abstração padroniza o ciclo de vida de qualquer gerador de imagem:
- `id`: Identificador único (ex: `"pollinations"`).
- `name`: Nome público amigável (`"Pollinations.ai"`).
- `getCapabilities()`: Consulta capacidades estruturais (resoluções, proporções, suporte a imagem de referência, prompt negativo).
- `listModels(apiKey, baseUrl)`: Consulta dinâmica ao catálogo oficial do provedor.
- `testConnection(apiKey, baseUrl)`: Validação de credenciais e conectividade sem consumo financeiro nem geração de imagem.
- `generateImage(options, apiKey, baseUrl)`: Envio do prompt estruturado e recebimento do asset visual.

### 3.2 Provedor Pollinations (`PollinationsImageProvider`)
- **Base URL:** `https://gen.pollinations.ai` (customizável por ambiente)
- **Autenticação:** Cabeçalho `Authorization: Bearer sk_...`
- **Endpoint de Geração (OpenAI Compatible):** `POST /v1/images/generations`
- **Payload Padrão:**
  ```json
  {
    "prompt": "Cinematic portrait in neo-noir rain",
    "model": "flux",
    "n": 1,
    "size": "1280x720",
    "response_format": "b64_json"
  }
  ```
- **Endpoints de Catálogo:** `GET /image/models` com fallback automático para `GET /models`.

---

## 4. Segurança e Mascaramento de Chaves de API

- **Armazenamento Seguro:** As chaves de API (`apiKey`) são salvas exclusivamente no banco de dados e lidas unicamente em tempo de execução no backend.
- **Mascaramento:** A API administrativa nunca retorna a chave integral. Retorna apenas a versão mascarada (`maskedKey`, ex: `sk_l...8831`).
- **Sem Vazamento em Logs:** O payload de requisição e erros registrados no `ImageOperationLog` e `PlatformAuditLog` são sanitizados, impedindo o registro de Bearer tokens.

---

## 5. Como Operar o Console de Provedores

### 5.1 Cadastrar ou Atualizar a API Key
1. Acesse `/admin/settings/image-providers`.
2. No painel esquerdo, localize o campo **API Key Secreta**.
3. Insira a nova chave fornecida pela Pollinations (iniciada com `sk_`).
4. Clique em **Salvar Configurações**. O status da conexão mudará para `PENDENTE` até que um novo teste seja executado.

### 5.2 Testar a Conexão
1. Clique no botão **Testar Conexão** no canto superior direito.
2. O sistema realiza uma chamada de verificação de autenticação e consulta de modelos elegíveis.
3. **Feedbacks Possíveis:**
   - **CONECTADO:** Chave válida e modelos encontrados.
   - **INVALID_KEY:** A chave foi rejeitada com status 401 pela Pollinations.
   - **INSUFFICIENT_BALANCE:** A conta da Pollinations está sem saldo de Pollen (HTTP 402).
   - **UNREACHABLE / TIMEOUT:** API da Pollinations inacessível no momento.
4. O teste não consome créditos nem gera imagem.

### 5.3 Sincronizar o Catálogo de Modelos
1. Clique em **Sincronizar Modelos**.
2. O sistema consulta a API da Pollinations e atualiza os modelos disponíveis na tabela `ImageModelConfig`.
3. **Preservação:** Switches de ativação definidos pelo administrador e custos customizados são integralmente preservados. Modelos removidos da API são marcados como `isAvailable = false`, sem deletar o histórico de imagens geradas.

### 5.4 Ativar, Desativar e Definir Modelo Padrão
- **Toggle Ativo/Inativo:** Clique no botão de status de qualquer modelo para liberá-lo ou bloqueá-lo para os usuários.
- **Modelo Padrão Bidirecional:** Pode ser definido de duas maneiras complementares:
  1. No dropdown **Modelo Padrão da Plataforma** (painel esquerdo), com nomes limpos e publishers identificados. Ao selecionar, o modelo é salvo e sincronizado na hora.
  2. Na tabela de modelos (painel direito), clicando no botão **Tornar Padrão**. O modelo atualmente ativo recebe o badge dourado `★ PADRÃO`.
- **Custo Customizado (Créditos):** Digite um valor numérico na coluna *Custo (cr)*. Se deixado em branco (`Auto`), o modelo utilizará o custo padrão do plano do usuário (10 créditos).

---

## 6. Governança por Planos e Limites

Para liberar o acesso a geração de imagem nos planos:
1. Acesse `/admin/billing` > Aba **Planos**.
2. Clique em **Configurar** no plano desejado (ex: *Tomadix Pro*).
3. Na seção **Geração direta de imagens com IA**:
   - Ative o switch **Recurso Habilitado**.
   - Defina o **Custo Padrão (Créditos)** (ex: 10 créditos).
   - Configure o **Limite Diário** (ex: 25 imagens/dia) e **Limite Mensal** (ex: 250 imagens/mês). Deixe vazio para ilimitado.
4. Salve as alterações.

