# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar com o código deste repositório.

## Projeto

Tomadix (antigo "CinePrompt Studio AI") é um SaaS brasileiro para criar, organizar e versionar prompts cinematográficos de IA (saída em JSON para Google Flow, Nano Banana etc.). Stack: Next.js 15 (App Router), React 19, TypeScript, Prisma + PostgreSQL (Supabase), Zod, Tailwind v4 e Gemini via `@google/genai`. Textos da interface, documentação e contexto de commits são em português do Brasil.

## Idioma

Responda sempre em português do Brasil e crie arquivos de documentação (como este `CLAUDE.md`) no mesmo idioma.

## Comandos

```bash
npm run dev            # next dev (http://localhost:3000, health: /api/health)
npm run build          # next build
npm run lint           # eslint src tests
npm run typecheck      # tsc --noEmit
npm test               # vitest run (todos os testes)
npx vitest run tests/prompt-engine.test.ts          # um único arquivo de teste
npx vitest run -t "trecho do nome"                  # um único teste pelo nome
npm run prisma:generate
npm run prisma:migrate # prisma migrate dev
npm run db:clean-tests # remove dados residuais de testes (scripts/clean-test-data.ts)
```

- Exige `.env` com `DATABASE_URL` (pooled, pgbouncer) e `DIRECT_URL` (conexão direta, usada nas migrações) — veja `.env.example`.
- **Os testes em `tests/` rodam contra o banco de dados real** (criam workspaces/projetos pelos serviços, sem mock de banco; apenas o provedor Gemini é mockado com `vi.spyOn`). Timeout de 30s. Rode `npm run db:clean-tests` se sobrarem dados. O alias `@` aponta para `src`.
- O build do Docker executa `npx prisma generate && npm run build` (Node 22 alpine).

## Arquitetura

Monólito modular. A separação em camadas é rígida e deve ser seguida em novas funcionalidades:

- `src/modules/<domínio>/` — regras de negócio: `*.service.ts` (todas as regras e acesso ao banco via Prisma) e `*.schema.ts` (validação Zod). Domínios: `auth`, `workspaces`, `projects`, `characters`, `environments`, `scenes`, `parameters`, `prompt-engine`, `ai`, `billing`, `admin`, `cinematic-analysis`, `cinematic-creation`, `image-generation`, `pollinations`, `video-generation`, `visual-library`, `privacy`, `onboarding`, `email`.
- `src/app/api/**/route.ts` — handlers REST enxutos: validam com Zod, autorizam e delegam aos serviços. `src/app/admin/**` é o console administrativo da plataforma (APIs em `api/admin`); as demais páginas (`dashboard`, `projects`, `studio`, `workspace`, `parameters`...) são voltadas ao usuário.
- `src/lib/` — itens transversais: `db.ts` (cliente Prisma), `auth.ts`/`session.ts` (cookie `cineprompt_session`, tokens com hash SHA-256), `permissions.ts` (RBAC de workspace: OWNER/ADMIN/MEMBER/VIEWER), `admin-permissions.ts` (matriz de PlatformRole), `encryption.ts` (AES-256-GCM para credenciais de gateways/APIs), `rate-limiter.ts`, `logger.ts`.
- `src/middleware.ts` — lista de rotas públicas, bloqueio por cookie de sessão, rate limiting, headers de segurança e `x-correlation-id`. Novas rotas públicas precisam ser adicionadas a `PUBLIC_PATHS`.
- `src/components/<área>/` — componentes React agrupados por área funcional.

Conceitos que atravessam vários arquivos:

- **Multi-tenancy**: todo recurso pertence a um Workspace (pessoal ou de equipe); os serviços devem verificar a participação/papel no workspace antes de ler ou gravar. Cadeia de integridade: Projeto → Personagens/Ambientes/Cenas → Versões de prompt.
- **Parâmetros dinâmicos**: 10 tipos, 5 escopos, resolvidos de forma hierárquica e determinística (`modules/parameters`, veja `tests/parameter-resolver.test.ts`). Valores de parâmetros são apenas dados — nunca execute conteúdo configurável pelo usuário.
- **Motor de prompts** (`modules/prompt-engine`): compõe templates versionados + parâmetros resolvidos + continuidade em chamadas ao Gemini; jobs são assíncronos e os créditos são estornados em caso de falha. O acesso ao Gemini passa por `modules/ai` (gerenciador multi-chave com failover e classificação de erros; as chaves ficam criptografadas e são geridas na UI admin — nunca exponha ao cliente).
- **Billing** (`modules/billing`): planos/políticas com snapshots versionados (grandfathering), lotes de créditos com ordem de consumo configurável e ledger, jobs diários de renovação/manutenção (`api/cron`), gateways multiprovedor (Stripe, Mercado Pago, Sandbox) com webhooks idempotentes e verificação de entitlements (inclusive política de geração de imagens por plano). Operações que consomem créditos passam por `credit-execution.service.ts`.
- **Schema Prisma** é grande (`prisma/schema.prisma`); migrações em `prisma/migrations`. Mudanças de schema exigem migração; evite migrações destrutivas sem autorização.

## Convenções (de `.agents/rules/cineprompt-rules.md`)

- Inspecione o código existente antes de alterar; reaproveite componentes/serviços; não recrie nem troque dependências; não mexa em funcionalidades fora da tarefa.
- Sem dados simulados permanentes — a persistência usa o banco real; use transações em operações atômicas de múltiplas etapas; valide toda entrada de API no servidor com Zod; centralize regras de negócio nos serviços.
- Sem `any`/casts inseguros para esconder erros; sem engolir exceções silenciosamente. Na UI, trate estados de carregamento, sucesso, erro, vazio e confirmação.
- Uma funcionalidade só está pronta quando testes, typecheck e build passam.
- Documentação: as regras pedem documentação por módulo, mas `docs/modules/` não existe — a documentação real fica em pastas numeradas dentro de `docs/` (`02-modulos-plataforma/` com `detalhes-tecnicos/`, `03-console-administrativo/`, `04-operacoes-seguranca-e-compliance/`, `05-historico-de-entregas/`), indexadas em `docs/README.md`. Atualize o arquivo correspondente ao evoluir um módulo. (Os links do `README.md` raiz para `docs/NN-*.md` estão desatualizados.)

## Frontend e desempenho

- **Sem `backdrop-blur` e sem brilhos `blur-2xl/3xl`**: foram removidos de todo o sistema por custo de GPU. Não reintroduza em overlays de modal (use `bg-black/80`) nem em elementos decorativos. Também não duplique imagens só para criar fundo borrado.
- **Ícones**: use `<Icon name="..." />` de `src/components/ui/icon.tsx` (SVG inline). A fonte Material Symbols foi removida do layout; para um ícone novo, adicione-o ao mapa `ICONS` (o `name` é tipado).
- **Carregamento**: use `<Spinner />` (`src/components/ui/spinner.tsx`) em vez de montar `animate-spin` à mão. `src/app/loading.tsx` e `src/app/error.tsx` cobrem a navegação e os erros de todas as rotas.
- **Imagens**: `<img>` de conteúdo gerado/do usuário (tamanho desconhecido) deve ter `loading="lazy" decoding="async"`.
- **Código sob demanda**: componentes pesados e modais usados só após interação entram via `next/dynamic` (veja `src/components/projects/list/helpers.ts` e o canvas em `projects/detail`).
- **Página inicial**: componentes em `src/components/home/` e textos em `src/config/home-content.ts`; é Server Component, sem JS de cliente. Mantenha os tokens de cor do tema (`bg-surface`, `text-on-surface`, `bg-primary`...), pois o admin personaliza a marca por eles.

## Responsividade (celulares 360–430px e tablets 768–1024px)

Mobile-first: escreva a classe base para o celular e acrescente `sm:`/`md:`/`lg:` para telas maiores. `tests/responsive-audit.test.ts` lê o código-fonte e falha se algum destes padrões voltar.

- **Altura**: nunca `h-screen`, `min-h-screen`, `100vh` nem `Nvh`; use `dvh` (`min-h-dvh`, `max-h-[90dvh]`), que respeita a barra de endereço do celular. A navbar tem `--navbar-h` (CSS) para barras sticky e sidebars abaixo dela.
- **Modais**: preferir `<Modal>` (`src/components/ui/modal.tsx`, bottom sheet no celular, ESC, foco, rolagem interna) e `<Drawer>` para painéis laterais. Overlays escritos à mão devem ter `fixed inset-0 overflow-y-auto … items-center-safe` (o `-safe` evita cortar o topo de painéis altos) e `p-3 sm:p-4`.
- **Tabelas**: toda `<table>` fica dentro de `overflow-x-auto` e declara `min-w-[Npx]`; `<TableScroll>` (`ui/table-scroll.tsx`) faz isso para código novo.
- **Grades**: grids de 3+ colunas começam com `grid-cols-1` ou `-2` (`grid-cols-1 sm:grid-cols-3`); formulários com dois campos lado a lado também (`grid-cols-1 sm:grid-cols-2`).
- **Toque**: controles principais com ≥ 40–44px (`<TouchIconButton>` ou `min-h-11`). Botões pequenos ganham área de toque extra via CSS em `@media (pointer: coarse)` (`globals.css`), mas não conte só com isso em ações importantes.
- **Área segura**: `viewportFit: "cover"` está ligado; use `safe-bottom`/`safe-top` em elementos fixos (toasts, barras, banners).
- **Navbar**: o menu completo só aparece a partir de `xl` (1280px); abaixo disso (inclusive tablets) é o painel do hambúrguer. A conta (Equipe, Assinatura, Perfil, Sair) fica em `UserMenu`.
- **Board de Spaces**: toolbar horizontal rolável no celular, biblioteca como bottom sheet e zoom escondido (use pinça) até `sm`.
- **Verificação visual**: o navegador embutido emula tamanhos com `resize_window` (360×740, 768×1024). Páginas autenticadas precisam de login; sem sessão elas mostram só o shell vazio.
- **Cache em dev**: `next.config.ts` só aplica cache imutável em `/_next/static` em produção; em dev os chunks não têm hash e o navegador serviria código antigo.

## Reescrita por módulos (em andamento)

A reescrita do frontend segue módulo a módulo: **spaces** (feito) → **projetos** (feito) → **responsividade global** (feito) → admin → demais. Para cada módulo: separar em componentes/hooks, otimizar, rodar typecheck + lint + build + testes e só então seguir.

- **spaces** (`src/components/spaces/`): `space-board-canvas.tsx` guarda só o estado e a lógica do board (React Flow). Os nós ficam em `nodes/` (`BOARD_NODE_TYPES` é constante de módulo), a UI do board em `board/` (barra, toolbar, biblioteca, menu de contexto, modais), o compartilhamento em `share/` (`useSpaceSharing` + `VisibilityOptions` + `MemberPicker`) e os tipos em `types.ts`. As rotas `/spaces` são apenas aliases das páginas de `/projects`.
- **projetos**: as rotas `src/app/projects/page.tsx` e `[id]/page.tsx` só reexportam `src/components/projects/list/projects-list.tsx` e `detail/project-detail.tsx`. Padrão usado nas abas grandes (`scenes/`, `prompts/`, `projects/list`, `projects/detail`): um hook `use-*.ts(x)` com todo o estado e a lógica, `types.ts`/`helpers.ts` e um componente por bloco de JSX que recebe o retorno do hook em `s` (`const { ... } = s`). Para continuar a dividir, extraia mais blocos para componentes com props explícitas em vez de passar `s`.
- **personagens e ambientes** compartilham `src/components/entities/`: `useEntityLibrary` (lista, filtros, duplicar, arquivar, excluir, prompt JSON), `useEntityForm` (criar/editar + parâmetros dinâmicos), `useEntityAi` (geração com IA) e `EntityToolbar`, `DeleteEntityModal`, `PromptJsonModal`. Cada tipo só mantém `types.ts`, grade de cards, formulário e modal de IA. Um recurso novo parecido (ex.: figurinos) deve reutilizar esses hooks.
- **Modo avançado** dos formulários de cena, personagem e ambiente: `useAdvancedMode()` e `AdvancedModeToggle` (`src/components/entities/`), preferência em `localStorage["tomadix_advanced_mode"]`, desligada por padrão. No modo simples ficam só os campos essenciais; câmera, iluminação, granulação, estados inicial/final, som ambiente e parâmetros dinâmicos só aparecem no avançado (os valores já salvos são preservados e o toggle avisa quantos estão preenchidos). Novos campos técnicos devem entrar dentro do bloco `advanced`.
- **Tela "Criar"** (`src/components/dashboard/create-hub.tsx`, no dashboard): cartões de uma ação (imagem, vídeo, prompt de vídeo/imagem, personagem, cena) que chamam `/api/studio/quick-create` sem exigir projeto (usa o mais recente ou cria "Estúdio Principal"). O quick-create aceita `targetTool`, `aspectRatio` e `outputFormat` (padrões: google_flow, 16:9, json). `QuickCreationBar` também aparece em `/projects`, e a aba Prompts clássica gera vídeo direto via `DirectVideoModal`.
- **Receitas** (`modules/recipes`, `api/recipes`, `prompts/recipes-bar.tsx`): combinações salvas (tipo de conteúdo + ferramenta + estilo de captura + formato + diretrizes), pessoais, em `User.preferences.recipes` (máx. 20, sem migração). **Board** do projeto é camada avançada: o projeto abre em Prompts e a aba Board só aparece com o modo avançado (interruptor "Avançado" na barra do projeto). **Biblioteca** = `/workspace` (`StudioGallery`, filtros por tipo e projeto). **Onboarding** é uma tela só (escolher modelo e gerar).
- Os testes `tests/visual-redesign.test.ts` e `workspace-and-analysis-separation.test.ts` leem o código-fonte e conferem textos: ao mover ou renomear componentes, atualize-os.
- Testes em `tests/workspace-and-analysis-separation.test.ts` falham desde antes (checam textos que não existem mais em `navbar.tsx`, `cinematic-studio-workflow.tsx` e `workspace/page.tsx`); não são regressão de frontend.
- `.claude/launch.json` define o servidor de dev (`tomadix-dev`). Páginas autenticadas exigem login, então a verificação visual precisa de uma conta de teste.

## Diversos

- `scripts/` contém ferramentas pontuais de manutenção (conversão para WebP, geração de assets visuais, diagnóstico/índices de banco); `scratch/` é descartável (benchmarks); `stitch_tomadix_modern_nextjs_redesign/` é referência de design, não código da aplicação.
- Imagens são servidas em WebP (veja `next.config.ts` para headers de cache e otimização).
