# E-mail transacional e modelos padrão

O Tomadix envia e-mails automáticos pelo servidor SMTP configurado em `Admin > Configurações > Servidor de E-mail` (`/admin/settings/email`). A conta padrão de envio é **georgie.a.reis@gmail.com** (Gmail).

## Configurar o Gmail
1. Na Conta Google, ative a **Verificação em duas etapas** e gere uma **Senha de app** (16 caracteres) em Segurança > Senhas de app. A senha normal da conta não funciona.
2. No console, escolha o provedor **Gmail / Google**, clique em **Preencher com georgie.a.reis@gmail.com**, cole a Senha de app, marque como ativo e **Salvar**.
3. Use **Testar conexão** e depois **Disparar e-mail de teste**.
4. A senha é criptografada (AES-256-GCM) e nunca volta ao navegador. Alternativa: variáveis `SMTP_USER` e `SMTP_PASSWORD` no servidor (usadas se não houver senha salva).
5. Os links dos e-mails usam `NEXT_PUBLIC_APP_URL` (ou a "URL pública" em Configurações Gerais).

Respostas: o `Reply-To` é o próprio Gmail, então quem responde um e-mail do Tomadix escreve direto na caixa de entrada do Gmail.

## Modelos padrão (`modules/email/email-templates.ts`)
| Modelo | Quando é enviado |
|---|---|
| Cadastro (boas-vindas + confirmação) | Ao criar a conta (`AuthService.register`) |
| Confirmação de e-mail | Reenvio do link de confirmação |
| Redefinição de senha | Em "Esqueci minha senha" (`requestPasswordReset`) |
| Senha alterada | Ao concluir a redefinição (`resetPassword`) |
| Convite de equipe | Ao convidar um membro (`InviteService.createInvite`) |
| Assinatura confirmada | Após o pagamento |
| Créditos adicionados / Créditos baixos | Recarga e saldo baixo |

A tela de e-mail tem o painel **Modelos de E-mail** com pré-visualização e envio de teste por modelo. Valores vindos de usuários (nome, estúdio) são escapados contra injeção de HTML.

## Regras de envio (`TransactionalEmailService`)
- Nunca derruba o fluxo de origem: falhas e o modo desativado viram log em "Disparos Recentes".
- Em testes automatizados (`NODE_ENV=test`) nada é enviado.
- Segurança: em **produção** as rotas de cadastro e de "Esqueci minha senha" **não devolvem mais o token** na resposta (ele vai somente por e-mail). Fora de produção o token continua na resposta para facilitar testes.

## Caixa de entrada (receber e responder)
`Admin > Servidor de E-mail > Abrir caixa de entrada` (`/admin/settings/email/inbox`) lê a caixa da conta configurada por **IMAP** (Gmail: `imap.gmail.com:993`, a mesma senha de app do envio) e permite responder.

- **Ative o IMAP no Gmail:** Configurações do Gmail > Encaminhamento e POP/IMAP > Ativar IMAP.
- **Sincronizar agora:** busca só mensagens novas (a primeira vez traz as 50 mais recentes) e guarda em `EmailMessage` (migração `20261109120000_add_email_inbox`). Não há leitura automática em segundo plano.
- **Abrir:** marca como lida (só no Tomadix; a marcação não volta ao Gmail). Texto por padrão; a formatação original abre em iframe isolado (`sandbox`), pois o conteúdo recebido não é confiável.
- **Responder:** envia pelo SMTP configurado para o remetente, mantendo o encadeamento (`In-Reply-To`/`References`).
- Código: `modules/email/inbox.service.ts` (`InboxService`, `imapFetcher`), rota `api/admin/email/inbox` (permissão `settings:manage`).
