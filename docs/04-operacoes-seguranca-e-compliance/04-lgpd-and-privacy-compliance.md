# Tomadix - Relatório e Guia Técnico de Conformidade LGPD e Privacidade

Este documento consolida a arquitetura técnica, mapeamento de dados (ROPA - Record of Processing Activities), medidas de segurança e pontos de atenção jurídica implementados no **Tomadix**, em consonância com a Lei Geral de Proteção de Dados Pessoais (**Lei nº 13.709/2018 - LGPD**).

---

## 1. Inventário de Dados Pessoais e Bases Legais (Art. 7º da LGPD)

O Tomadix adota o princípio do **Privacy by Default** e da **Minimização da Coleta** (Art. 6º, III), limitando o tratamento aos dados estritamente indispensáveis para autenticação, prestação de serviço, cobrança e segurança técnica.

| Categoria de Dado | Dados Coletados | Finalidade do Tratamento | Base Legal (LGPD) | Período de Retenção |
| :--- | :--- | :--- | :--- | :--- |
| **Identificação e Acesso** | Nome, E-mail, Hash criptográfico da senha (bcrypt), Avatar (opcional) | Criação de conta, autenticação, controle de sessão e identificação em workspaces | Art. 7º, V (Execução de Contrato) | Enquanto a conta estiver ativa. Exclusão mediante solicitação, ressalvada retenção legal. |
| **Segurança e Auditoria Técnica** | Endereço IP (redigido nos logs gerais), User-Agent, carimbos de data/hora, Correlation ID | Prevenção a ataques de força bruta, rate limiting, rastreamento de acessos anômalos | Art. 7º, II c/c Marco Civil da Internet (Lei 12.965/14, Art. 15) | 6 meses (requisito legal do Marco Civil para logs de aplicação). |
| **Faturamento e Assinaturas** | Nome, Identificador do cliente no gateway (ex: `cus_xxx`), histórico de transações, faturas | Processamento de pagamentos, cobrança recorrente, emissão de faturas e reconciliação | Art. 7º, V (Contrato) e Art. 7º, II (Obrigação Legal - Art. 173 CTN) | **5 anos** a contar da emissão (prescrição tributária obrigatória). |
| **Conteúdo Criativo e Roteiros** | Títulos de projetos, sinopses, bíblias visuais, descrições de cenas e prompts | Geração e estruturação de prompts cinematográficos via IA | Art. 7º, V (Execução de Contrato) | Até a exclusão do projeto ou da conta pelo usuário. |
| **Gestão de Consentimento** | Tipo de termo (`TERMS_OF_SERVICE`, `PRIVACY_POLICY`, `MARKETING_COOKIES`), versão, IP, timestamp | Comprovação probatória de consentimento prévio e livre | Art. 7º, I (Consentimento) e Art. 7º, II (Cumprimento de obrigação) | Duração da conta + prazo prescricional civil. |

---

## 2. Compartilhamento de Dados com Operadores e Subprocessadores

O Tomadix opera com provedores de infraestrutura de classe mundial. Nenhum dado pessoal é comercializado ou compartilhado com terceiros para fins de monetização ou publicidade comportamental.

### 2.1 Google Cloud Platform (Google Gemini API)
- **Papel:** Operador de Inteligência Artificial para processamento e geração de prompts.
- **Dados transmitidos:** Conteúdo das solicitações (instruções de cena, parâmetros de câmera, estilos estéticos).
- **Salvaguardas:**
  - As chamadas não incluem e-mails, nomes ou identificadores de usuários.
  - Sob os termos da API corporativa do Google AI Studio/Vertex AI, os dados transmitidos **não** são utilizados para treinamento de modelos públicos da Google.
  - A comunicação ocorre estritamente via HTTPS (TLS 1.3).

### 2.2 Supabase Inc. (PostgreSQL Database)
- **Papel:** Provedor de Banco de Dados Relacional e Armazenamento em Nuvem.
- **Dados transmitidos:** Estrutura relacional do Tomadix, hashes de credenciais, projetos e metadados de contas.
- **Salvaguardas:**
  - Criptografia em repouso (AES-256).
  - Criptografia em trânsito (TLS obrigatório via pooling Supavisor).
  - Row Level Security (RLS) habilitável e controle restrito de credenciais via variáveis de ambiente confidenciais.

### 2.3 Gateways de Pagamento (Stripe / Mercado Pago)
- **Papel:** Processamento de pagamentos e assinaturas recorrentes.
- **Dados transmitidos:** Nome, e-mail e dados de cobrança.
- **Salvaguardas:**
  - Conformidade PCI-DSS Level 1.
  - O Tomadix **não** armazena, processa ou tem acesso a números completos de cartão de crédito ou códigos CVV.
  - Autenticação e integridade de webhooks garantidas por verificação de assinatura HMAC SHA-256.

---

## 3. Direitos dos Titulares de Dados (Art. 18 da LGPD)

A plataforma implementa interfaces e rotas de API para viabilizar os direitos previstos na lei:

### 3.1 Direito de Acesso e Portabilidade (Art. 18, II e V)
- **Implementação Técnica:** Endpoint autenticado `GET /api/users/export`.
- **Formato:** Arquivo JSON padronizado e legível contendo dados de perfil, workspaces pertencentes, histórico de assinaturas, histórico de transações e todos os projetos/prompts gerados.

### 3.2 Direito de Retificação (Art. 18, III)
- **Implementação Técnica:** Configurações de conta acessíveis via `PATCH /api/users/profile` para alteração de nome e senha, além do canal formal de DSR (`POST /api/users/dsr` com tipo `RECTIFICATION`).

### 3.3 Direito de Exclusão e Eliminação (Art. 18, VI)
- **Implementação Técnica:** O usuário pode solicitar a exclusão de conta via interface de privacidade ou via `POST /api/users/dsr` com tipo `DELETION`.
- **Tratamento de Exceções Legais (Art. 16, I da LGPD):**
  - Dados pessoais de projetos, roteiros, membros em workspaces pessoais e credenciais de login são purgados de forma permanente e irreversível.
  - **Faturas e Comprovantes Financeiros (`Invoice`):** Permanecem arquivados sob segregação de acesso pelo prazo legal de 5 anos (Art. 173 do Código Tributário Nacional).
  - **Registros de Logs de Acesso:** Preservados pelo prazo estipulado pelo Marco Civil da Internet (6 meses), após o qual sofrem rotação ou expiração automática.

### 3.4 Direito de Revogação de Consentimento (Art. 18, IX)
- **Implementação Técnica:** Gestão de preferências no banner de privacidade (`CookieConsentBanner`) e gravação auditável no modelo `ConsentRecord` via `POST /api/users/consent`.

---

## 4. Medidas Técnicas e Organizacionais de Segurança da Informação

Em cumprimento ao Art. 46 da LGPD, o Tomadix adota:

1. **Higienização e Anonimização de Logs:**
   - O módulo `src/lib/logger.ts` mascara automaticamente chaves como `password`, `token`, `secret`, `apiKey`, `cookie`, `credential`.
   - Nenhuma senha, token JWT ou segredo de gateway é gravado em stdout ou arquivos de log.
2. **Rate Limiting e Defesa em Profundidade:**
   - O middleware protege as rotas de autenticação (`/api/auth/login`, `/api/auth/register`) limitando a 10 requisições por minuto por IP, prevenindo ataques de enumeração e força bruta.
3. **Cabeçalhos de Segurança HTTP (HSTS, CSP, etc.):**
   - Injeção obrigatória via middleware de:
     - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 5. Pontos que Exigem Revisão e Homologação Jurídica

> [!WARNING]
> A implementação técnica dos módulos de privacidade, termos e DSRs atende aos requisitos operacionais da LGPD, mas **não substitui** o parecer de um advogado ou consultoria jurídica especializada.

Os seguintes pontos devem ser validados pelo departamento jurídico antes do lançamento comercial:

1. **Termo de Transferência Internacional de Dados (Art. 33):**
   - Como os data centers do Supabase e da Google Cloud API podem estar localizados nos Estados Unidos ou Europa, deve-se revisar se as Cláusulas Padrão Contratuais (Standard Contractual Clauses - SCC) ou garantias equivalentes de transferência internacional estão formalizadas nos termos com os fornecedores.
2. **Nomeação e Publicação do Encarregado pelo Tratamento de Dados Pessoais (DPO):**
   - Conforme Art. 41 da LGPD, a identidade e as informações de contato do Encarregado (DPO) devem ser divulgadas publicamente na página de Política de Privacidade (atualmente referenciado como `dpo@cineprompt.ai`).
3. **Validação das Cláusulas de Propriedade Intelectual nos Termos de Uso:**
   - Confirmar a redação sobre a titularidade dos roteiros gerados por IA, garantindo clareza quanto à ausência de reivindicação de direitos patrimoniais por parte do Tomadix sobre as obras criadas pelos usuários.
4. **Acordos de Processamento de Dados (DPA) para Clientes Enterprise:**
   - Para clientes corporativos com múltiplos membros de equipe, definir minuta padrão de DPA delimitando as responsabilidades de Controlador e Operador no ambiente de workspaces compartilhados.
