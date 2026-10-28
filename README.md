# ENDJU BUSINESS

Site, encomendas online, área do cliente e painel da ENDJU BUSINESS, gráfica e estúdio de design em Luanda.
Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Firebase (Auth + Firestore) · Cloudinary · Vercel.

- Planeamento técnico (dados, rotas, permissões, fluxos): [`docs/`](docs/README.md)
- Como usar o painel: [Guia do administrador](docs/guia-do-administrador.md)
- Antes de publicar: [Checklist de entrega](docs/checklist-de-entrega.md)

## Instalar

Requer Node.js 22 ou mais recente.

```bash
npm install
cp .env.example .env.local   # preencher (ver docs/05-variaveis-de-ambiente.md)
npm run dev                  # http://localhost:3000
```

Mínimo para arrancar: as variáveis `NEXT_PUBLIC_FIREBASE_*`, a conta de serviço (`FIREBASE_PROJECT_ID`,
`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) e `CLOUDINARY_URL`. As restantes ligam integrações (email,
pagamentos, WhatsApp) e, vazias, o sistema funciona sem elas.

Em redes onde o Node falha a ligar ao Firebase (IPv6), arrancar com:

```bash
NODE_OPTIONS="--no-network-family-autoselection --dns-result-order=ipv4first" npm run dev
```

Páginas úteis: `/` (Home com hero 3D), `/entrar`, `/registar`, `/conta`, `/admin`, `/design-system` (tokens e
componentes). Para forçar um nível do hero 3D: `/?cena=alta`, `/?cena=leve` ou `/?cena=estatica`.

## Comandos

| Comando                         | Faz                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`                   | Servidor de desenvolvimento                                                     |
| `npm run build` · `start`       | Build de produção e servidor de produção                                        |
| `npm run lint`                  | ESLint                                                                          |
| `npm run typecheck`             | TypeScript sem emitir                                                           |
| `npm test`                      | Testes (Vitest): preços, IVA, estados do pedido, pagamentos, provas, permissões |
| `npm run format`                | Prettier (ordena também as classes Tailwind)                                    |
| `npm run bootstrap-admin`       | Dá o papel de Administrador a `BOOTSTRAP_ADMIN_EMAIL`                           |
| `npm run rules:deploy`          | Publica `firestore.rules` no projeto do `.env.local` (usa a conta de serviço)   |
| `npm run seed:demo`             | Enche o painel com dados de demonstração (ver abaixo)                           |
| `npm run seed:demo -- --limpar` | Apaga só os dados de demonstração                                               |
| `npm run emulators`             | Emuladores do Firebase (projeto `demo-endju`, sem internet). Requer Java 11+    |

## Primeiro Administrador

1. Entrar no site uma vez com a conta que vai ser Administrador.
2. Pôr o email em `BOOTSTRAP_ADMIN_EMAIL` no `.env.local`.
3. `npm run bootstrap-admin`, sair e voltar a entrar: o login passa a abrir `/admin`.

As restantes pessoas da equipa entram por convite em **Painel → Equipa**.

## Dados de demonstração

`npm run seed:demo` cria 8 clientes, 15 pedidos em todos os estados (com pagamentos, eventos e tarefas da
oficina), 4 orçamentos, 6 leads e 5 despesas das últimas 8 semanas. Tudo leva `demo: true`, números
`EDJ-2026-9xxxx` / `ORC-2026-9xxxx` (fora da numeração real) e a etiqueta `demo` nos clientes. Correr de novo
substitui a demonstração; `npm run seed:demo -- --limpar` apaga-a. **Apagar antes de abrir ao público**, para não
entrar nos relatórios.

## Publicar na Vercel

1. **Projeto**: em vercel.com, _Add New → Project_, importar a pasta (repositório Git ou `npx vercel` na pasta).
   Framework: Next.js; os comandos por omissão servem.
2. **Variáveis de ambiente** (_Settings → Environment Variables_, ambiente Production): as mesmas do `.env.local`,
   com `NEXT_PUBLIC_SITE_URL=https://<domínio>`. A `FIREBASE_PRIVATE_KEY` cola-se com as quebras de linha `\n`
   tal como está no ficheiro. Gerar segredos novos para `CRON_SECRET` e `PAYMENT_WEBHOOK_SECRET`
   (por exemplo `openssl rand -hex 32`); não reutilizar os de desenvolvimento.
3. **Domínio** (_Settings → Domains_): acrescentar `endju.ao` e `www.endju.ao` e criar no registo do domínio os
   registos DNS que a Vercel indicar (A `76.76.21.21` para a raiz, CNAME `cname.vercel-dns.com` para `www`).
   O HTTPS ativa-se sozinho.
4. **Firebase**: em _Authentication → Settings → Authorized domains_, acrescentar o domínio. Publicar as regras:
   `npm run rules:deploy`. Em _Firestore → TTL_, criar a política em `rateLimits.expiresAt`.
5. **Cron**: o `vercel.json` corre `/api/cron/prazos` todos os dias às 06:00 UTC (07:00 em Luanda); a Vercel envia
   o `CRON_SECRET` sozinha.
6. **Pagamentos**: quando houver contrato com o gateway, apontar o webhook para
   `https://<domínio>/api/webhooks/pagamentos` e ligar o fornecedor em `src/lib/payments/provider.ts`.

### Monitorização de erros

Os erros do servidor saem em JSON nos logs da Vercel (`src/instrumentation.ts`: rota, método, mensagem, digest).
Ver em _Project → Logs_ (filtro `level:error`) e ligar alertas em _Settings → Notifications_ / _Observability_.
Para alertas por email com histórico, acrescentar o Sentry (`@sentry/nextjs`) com as variáveis `SENTRY_*` já
previstas.

## Onde mexer

- Cores, tipografia, espaçamentos, raios, sombras, animações: `src/app/globals.css` (tokens `--brand*`).
- Logótipo: `src/components/layout/logo.tsx` e `public/brand/`.
- Dados da empresa, catálogo, preços, conteúdos e modelos de mensagens: no painel (não no código).
- Componentes base: `src/components/ui/`. Regras de negócio puras (preço, IVA, estados): `src/lib/domain/`.
- Papéis e permissões por omissão: `src/lib/domain/permissions.ts` (editáveis em **Equipa → Papéis**).
- Fornecedor de pagamentos: `src/lib/payments/provider.ts` (hoje em modo de teste, nada é cobrado).
- Limites de pedidos por IP nos formulários públicos: `src/lib/rate-limit.ts`.
