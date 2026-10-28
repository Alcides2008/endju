# 05 · Variáveis de ambiente

Regras:
- Só `NEXT_PUBLIC_*` chega ao browser. Nada secreto com esse prefixo.
- Segredos das Cloud Functions vão para o Firebase Secret Manager (`defineSecret`), não para ficheiros `.env`.
- Dados que o Administrador edita (contactos, IBAN, horários, zonas de entrega, taxa de IVA) vivem em `settings/*` no Firestore, não aqui.
- Na Vercel há três conjuntos: Development, Preview (gateway em modo teste) e Production.
- O ficheiro `.env.example` é criado na Etapa 1 a partir desta tabela.

## Next.js (Vercel)

| Variável | Visível no browser | Etapa | Descrição / exemplo |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | sim | 1 | `https://endju.ao` — URLs absolutos, Open Graph, sitemap |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | sim | 1 | Config web do Firebase (não é segredo; a proteção são as regras + App Check) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | sim | 1 | `endju-prod.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | sim | 1 | `endju-prod` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | sim | 1 | `endju-prod.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | sim | 1 | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | sim | 1 | |
| `FIREBASE_PROJECT_ID` | não | 1 | Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | não | 1 | Conta de serviço do Admin SDK |
| `FIREBASE_PRIVATE_KEY` | não | 1 | Chave da conta de serviço; na Vercel colar com `\n` literais (o código faz `replace(/\\n/g, '\n')`) |
| `CLOUDINARY_URL` | não | 1 | `cloudinary://API_KEY:API_SECRET@nuvem` (consola → API Keys) — assinaturas de upload e URLs das imagens, tudo no servidor |
| `RESEND_API_KEY` | não | 4 | Emails transacionais (domínio verificado por DNS) |
| `PAYMENT_WEBHOOK_SECRET` | não | 7 | Segredo HMAC do webhook de pagamentos (`/api/webhooks/pagamentos`, cabeçalho `x-endju-signature`). Obrigatório em produção: sem ele o webhook recusa tudo |
| `PAYMENT_TEST_MODE` | não | 7 | `on` liga o fornecedor de teste num ambiente publicado (pré-visualização). Nunca em produção |
| `CRON_SECRET` | não | 7 | A Vercel envia-o em `Authorization: Bearer` ao chamar `/api/cron/prazos` |
| `EMAIL_FROM` | não | 4 | `ENDJU BUSINESS <pedidos@endju.ao>` |
| `EMAIL_REPLY_TO` | não | 4 | `atendimento@endju.ao` |
| `MCX_GATEWAY_URL` | não | 7 | API do gateway Multicaixa Express (nomes finais dependem do fornecedor escolhido) |
| `MCX_GATEWAY_TOKEN` | não | 7 | Credencial do comerciante |
| `MCX_WEBHOOK_SECRET` | não | 7 | Validar a assinatura do webhook |
| `PAYREF_API_URL` | não | 7 | API de pagamento por referência |
| `PAYREF_API_KEY` | não | 7 | |
| `PAYREF_ENTITY_ID` | não | 7 | Entidade atribuída à Endju |
| `PAYREF_WEBHOOK_SECRET` | não | 7 | |
| `WHATSAPP_PHONE_NUMBER_ID` | não | 7 | WhatsApp Business Cloud API |
| `WHATSAPP_ACCESS_TOKEN` | não | 7 | Token permanente de utilizador de sistema |
| `WHATSAPP_APP_SECRET` | não | 7 | Validar assinatura `X-Hub-Signature-256` |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | não | 7 | Verificação inicial do webhook |
| `INVOICING_PROVIDER` | não | 6 | `none` até haver integração; depois o software certificado escolhido |
| `INVOICING_API_URL` | não | 6 | |
| `INVOICING_API_KEY` | não | 6 | |
| `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_KEY` | sim | 8 | Firebase App Check |
| `NEXT_PUBLIC_SENTRY_DSN` | sim | opcional | Monitorização de erros com Sentry; sem ele, os erros ficam nos logs da Vercel |
| `SENTRY_AUTH_TOKEN` | não | 9 | Só no build: envio de source maps |
| `SENTRY_ORG` · `SENTRY_PROJECT` | não | 9 | |

## Cloud Functions (Secret Manager)

| Segredo | Uso |
|---|---|
| `RESEND_API_KEY`, `EMAIL_FROM` | Emails disparados por triggers |
| `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` | Mensagens WhatsApp |
| `MCX_GATEWAY_URL`, `MCX_GATEWAY_TOKEN` | Verificação de pagamentos pendentes (webhook perdido) |
| `INVOICING_API_URL`, `INVOICING_API_KEY` | Sincronizar faturas com o software certificado |
| `SITE_URL` | Links nos emails |

As Functions usam a conta de serviço do próprio projeto para o Firestore/Storage: não precisam de chave privada.

## Só desenvolvimento local (emuladores)

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` | `127.0.0.1:9099`: o browser liga ao emulador de Auth |
| `FIREBASE_AUTH_EMULATOR_HOST` | Idem para o Admin SDK (lida pelo próprio SDK) |
| `FIRESTORE_EMULATOR_HOST` | `127.0.0.1:8080` para o Admin SDK |
| `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` | Idem para as leituras em tempo real do browser (área do cliente) |

Com o projeto `demo-endju` os emuladores funcionam sem projeto real nem internet (o Firestore precisa de Java 11+).

## Só scripts locais

| Variável | Uso |
|---|---|
| `BOOTSTRAP_ADMIN_EMAIL` | `scripts/bootstrap-admin.ts`: dá o papel de Administrador à primeira conta |
| `SEED_CONFIRM` | `scripts/seed`: tem de ser `yes` para escrever dados de demonstração (evita correr em produção por engano) |
