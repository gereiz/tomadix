# 09 — Segurança para Produção, LGPD, Privacidade e Confiabilidade

Este módulo consolida as salvaguardas técnicas, arquiteturais e legais para a operação comercial do **Tomadix** em ambiente de produção, com foco na Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).

---

## 1. Conformidade com a LGPD e Direitos dos Titulares (DSR)

O sistema implementa mecanismos técnicos automatizados para atender às solicitações dos titulares de dados:

1. **Gestão de Consentimento e Termos de Uso**:
   - Registro formal de consentimento em `UserConsent` para Termos de Uso, Política de Privacidade e comunicações comerciais, armazenando timestamp, IP e versão documental.
2. **Direito de Acesso e Portabilidade (DSR Export)**:
   - Rota `/api/users/export-data` gera um pacote estruturado em JSON com todos os dados pessoais do titular: perfil, histórico de sessões, consentimentos, workspaces criados e prompts gerados.
3. **Direito de Retificação e Exclusão (DSR Erase / Anonimização)**:
   - Rota `/api/users/delete-account` aplica a exclusão definitiva ou anonimização irreversível:
     - Dados pessoais diretos (e-mail, nome, telefone) são expurgados.
     - Transações contábeis (`Invoice`, `CreditLedger`) são preservadas por 5 anos com hash anônimo para cumprimento de obrigações tributárias legais (art. 16, I da LGPD).
     - Relações de autoria em projetos colaborativos são anonimizadas ("Usuário Desativado").
4. **Painel de Atendimento a DSR para o DPO/Admin**:
   - Rotas em `/api/admin/dsr` permitem ao Encarregado de Dados (DPO) auditar, aprovar ou despachar solicitações de titulares dentro dos prazos legais.

---

## 2. Hardening e Segurança de Infraestrutura

- **Row Level Security (RLS) e Isolamento Lógico**: Consultas ao PostgreSQL vinculam o predicado de workspace em todas as queries (`WHERE workspaceId = ...`), impedindo vazamento de dados entre clientes.
- **Rate Limiting em Camadas**: Proteção contra ataques de força bruta e negação de serviço (DoS) via sliding window em endpoints públicos e autenticados.
- **Sanitização e Validação de Entradas**: Todos os dados recebidos via REST API são validados com schemas `zod` e higienizados contra ataques de injeção e XSS.
- **Criptografia em Repouso e em Trânsito**: Conexões com o banco de dados exigem TLS/SSL (`sslmode=require`). Segredos de pagamento e credenciais de provedores utilizam envelope criptográfico AES-256-GCM.

---

## 3. Endpoints da API de Privacidade e DSR

- `POST /api/users/consent`: Registro de aceite dos termos e políticas.
- `GET /api/users/dsr`: Consulta de solicitações de privacidade abertas pelo titular.
- `POST /api/users/export-data`: Solicitação de portabilidade e download de arquivo de dados pessoais.
- `POST /api/users/delete-account`: Solicitação formal de exclusão e anonimização da conta.
- `GET /api/admin/dsr`: Listagem de solicitações DSR sob supervisão do DPO (requer `audit:read`).
- `POST /api/admin/dsr/[id]/process`: Despacho e conclusão operacional de solicitação LGPD.
