# 01 · Estrutura de pastas

Monorepo simples: uma app Next.js (site + área do cliente + admin) e uma pasta `functions/` para Cloud Functions. Sem Turborepo/pnpm workspaces: só há um pacote partilhado (tipos e esquemas Zod), que as Functions importam por caminho relativo no build.

## Princípios

- **Código em inglês, interface em português de Angola.** Identificadores, coleções e ficheiros em inglês; textos, rotas públicas e mensagens em pt-AO.
- **Organização por domínio** em `src/features/<domínio>/`. Cada domínio tem a mesma forma: `schema.ts` (Zod + tipos), `server.ts` (leitura/escrita com Admin SDK), `actions.ts` (Server Actions), `hooks.ts` (subscrições em tempo real no cliente) e `components/`.
- **Escritas passam todas pelo servidor** (Server Actions / Route Handlers com Admin SDK). O cliente só lê do Firestore (tempo real) e carrega ficheiros para o Storage. Isto mantém as regras de segurança curtas e a validação num só sítio.
- **Uma só fonte de verdade para regras de negócio**: cálculo de preço, IVA, transições de estado e permissões vivem em `src/lib/domain/` como funções puras, usadas no cliente (estimativa), no servidor (validação) e nas Functions.

## Árvore

```
endju/
├─ docs/                              # planeamento, guias (admin, instalação), checklist de entrega
├─ public/
│  ├─ fonts/                          # fontes locais (display + texto), servidas via next/font/local
│  ├─ models/                         # .glb comprimidos (Draco/Meshopt) + texturas KTX2 do hero 3D
│  ├─ hero-fallback/                  # poster AVIF/WebP e vídeo curto para aparelhos fracos
│  └─ icons/                          # favicon, ícones PWA
├─ src/
│  ├─ app/
│  │  ├─ (site)/                      # site público (layout com Lenis, cursor, header/footer)
│  │  │  ├─ layout.tsx
│  │  │  ├─ page.tsx                  # Home com hero 3D
│  │  │  ├─ servicos/page.tsx
│  │  │  ├─ servicos/[slug]/page.tsx
│  │  │  ├─ portfolio/page.tsx
│  │  │  ├─ portfolio/[slug]/page.tsx
│  │  │  ├─ orcamento/page.tsx                 # escolher produto
│  │  │  ├─ orcamento/[produto]/page.tsx       # configurador com pré-visualização 3D
│  │  │  ├─ orcamento/personalizado/page.tsx   # trabalhos fora do catálogo
│  │  │  ├─ carrinho/page.tsx
│  │  │  ├─ checkout/page.tsx
│  │  │  ├─ checkout/sucesso/page.tsx  (?pedido=EDJ-AAAA-NNNNN)
│  │  │  ├─ sobre/ contacto/ faq/ privacidade/ termos/
│  │  │  └─ blog/page.tsx · blog/[slug]/page.tsx
│  │  ├─ (auth)/                      # entrar, registar, recuperar-senha, convite/[token]
│  │  ├─ conta/                       # área do cliente (layout protegido: papel "cliente")
│  │  ├─ admin/                       # painel (layout protegido: papéis de equipa)
│  │  ├─ api/
│  │  │  ├─ auth/session/route.ts     # cria/apaga cookie de sessão
│  │  │  ├─ uploads/sign/route.ts     # assinatura de upload Cloudinary
│  │  │  ├─ webhooks/mcx/route.ts     # Multicaixa Express (gateway)
│  │  │  ├─ webhooks/referencias/route.ts
│  │  │  ├─ webhooks/whatsapp/route.ts
│  │  │  ├─ export/[recurso]/route.ts # CSV / XLSX / PDF
│  │  │  └─ pdf/[tipo]/[id]/route.ts  # proposta, pro-forma, recibo, ordem de produção
│  │  ├─ not-found.tsx                # 404 criativa
│  │  ├─ error.tsx · global-error.tsx
│  │  ├─ sitemap.ts · robots.ts · manifest.ts
│  │  └─ layout.tsx                   # html lang="pt-AO", fontes, tema, toasts
│  ├─ components/
│  │  ├─ ui/                          # design system: Button, Input, Select, Modal, Drawer, Toast,
│  │  │                               # Table, Tabs, Badge, StatusBadge, Skeleton, Tooltip, Dropzone…
│  │  ├─ layout/                      # Header, Footer, AdminShell, Sidebar, Topbar, CommandPalette
│  │  ├─ motion/                      # SmoothScroll (Lenis), PageTransition, Cursor, Reveal
│  │  └─ three/                       # HeroScene, objetos (Paper, BusinessCard, BannerRoll,
│  │                                  # CmykFan, Box), Preview3D do configurador, deteção de GPU
│  ├─ features/
│  │  ├─ auth/  users/  customers/  catalog/  pricing/  cart/  orders/  quotes/
│  │  ├─ proofs/  payments/  invoices/  production/  stock/  purchasing/  expenses/
│  │  ├─ portfolio/  cms/  marketing/  messaging/  notifications/  team/  reports/
│  │  └─ audit/  settings/  files/
│  │     └─ (cada um) schema.ts · server.ts · actions.ts · hooks.ts · components/
│  ├─ lib/
│  │  ├─ firebase/client.ts           # SDK web (Auth, Firestore, Storage, App Check)
│  │  ├─ firebase/admin.ts            # Admin SDK (só servidor)
│  │  ├─ auth/session.ts              # verificação do cookie, getCurrentUser()
│  │  ├─ auth/rbac.ts                 # can(user, módulo, ação)
│  │  ├─ domain/                      # funções puras partilhadas
│  │  │  ├─ money.ts                  # cêntimos, formatação Kz, arredondamentos
│  │  │  ├─ tax.ts                    # IVA 14 %, isenções
│  │  │  ├─ pricing.ts                # motor de preço do configurador
│  │  │  ├─ order-status.ts           # máquina de estados + guardas
│  │  │  └─ permissions.ts            # lista de módulos/ações e papéis por omissão
│  │  ├─ audit.ts                     # writeAudit() dentro do mesmo batch da mutação
│  │  ├─ rate-limit.ts                # limite por IP/utilizador (contador no Firestore)
│  │  ├─ cloudinary.ts · email.ts · whatsapp.ts · pdf/
│  │  └─ search.ts                    # tokens de pesquisa por prefixo
│  ├─ styles/globals.css              # tokens CSS (claro/escuro) + Tailwind
│  └─ proxy.ts                        # proteção otimista de /conta e /admin (Next 16; antigo middleware.ts)
├─ functions/
│  ├─ src/
│  │  ├─ triggers/                    # onOrderWrite, onPaymentWrite, onProofWrite, onFileUpload (preflight)…
│  │  ├─ scheduled/                   # prazos a expirar, orçamentos expirados, backup diário
│  │  └─ index.ts
│  └─ package.json
├─ scripts/
│  ├─ seed/                           # dados de demonstração realistas
│  └─ bootstrap-admin.ts              # atribui o primeiro Administrador
├─ tests/
│  ├─ unit/                           # Vitest: pricing, tax, order-status, rbac
│  └─ e2e/                            # Playwright: encomenda, pagamento, prova, permissões
├─ firestore.rules · firestore.indexes.json · storage.rules · firebase.json
├─ .env.example
└─ package.json · tsconfig.json · next.config.ts · eslint.config.mjs · .prettierrc
```

## Onde corre cada coisa

| Camada | Corre em | Responsabilidade |
|---|---|---|
| React Server Components | Vercel | Páginas, leitura inicial de dados (Admin SDK), SEO |
| Server Actions | Vercel | Todas as mutações: validação Zod, permissões, transação, auditoria |
| Route Handlers `/api` | Vercel | Sessão, webhooks de pagamento/WhatsApp, exportações, PDFs |
| Client Components | Browser | 3D, animação, formulários, listeners em tempo real (linha do tempo, Kanban, notificações) |
| Cloud Functions (triggers) | Firebase | Efeitos secundários: notificações, consumo de stock, estatísticas do cliente, preflight de ficheiros |
| Cloud Functions (agendadas) | Firebase | Lembretes de prazo, expiração de orçamentos/referências, backup diário do Firestore |

## Dependências além da stack pedida

Cada uma substitui código que não vale a pena escrever à mão:

| Pacote | Para quê |
|---|---|
| Radix UI (primitives) | Modal, Select, Tabs, Tooltip, Dropdown acessíveis (teclado, foco, aria) |
| `next-themes` | Tema claro/escuro sem piscar no carregamento |
| `sonner` | Toasts (estilizados com os tokens da Endju) |
| `cmdk` | Pesquisa global Ctrl+K |
| `@dnd-kit/core` | Kanban de pedidos e ordenação no catálogo/portfólio |
| `@react-pdf/renderer` | Propostas, pro-formas, recibos, ordens de produção |
| `@tiptap/react` | Editor rico do blog |
| `exceljs` | Exportação XLSX (CSV é nativo) |
| `sharp`, `pdf-lib` (Functions) | Preflight de ficheiros: dimensões, DPI, caixas de corte |
| `date-fns` (locale `pt`) | Prazos em dias úteis, calendário de produção |
| Vitest, Playwright | Testes |
| `@sentry/nextjs` | Monitorização de erros |
