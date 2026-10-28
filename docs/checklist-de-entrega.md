# Checklist de entrega

Marcar cada ponto antes de abrir o site ao público.

## Conteúdo e marca

- [ ] Dados da empresa completos em **Definições → Empresa**: NIF, morada, email, horário confirmado, IBAN.
- [ ] Coordenadas da loja (mapa do Contacto) em `src/content/company.ts`.
- [ ] Preços reais revistos no **Catálogo** (os iniciais são de referência de mercado).
- [ ] Testemunhos de exemplo substituídos por reais (ou desativados) em **Conteúdo**.
- [ ] Textos de Privacidade e Termos revistos por quem responde legalmente pela Endju.
- [ ] Modelos de mensagens revistos em **Comunicação → Modelos**.

## Dados

- [ ] `npm run seed:demo -- --limpar` (apaga a demonstração).
- [ ] Pedidos, pagamentos e dados de teste antigos (prefixo "TESTE ·", pedidos EDJ-2026-TESTE1 e EDJ-2026-00002)
      apagados ou cancelados.
- [ ] Contas de teste removidas em **Equipa** e no Firebase Authentication.

## Infraestrutura

- [ ] Projeto na Vercel com todas as variáveis de Production (ver README · Publicar na Vercel).
- [ ] `NEXT_PUBLIC_SITE_URL` com o domínio final (sitemap, links dos emails, Open Graph).
- [ ] `CRON_SECRET` e `PAYMENT_WEBHOOK_SECRET` novos, diferentes dos de desenvolvimento.
- [ ] Domínio e `www` a apontar para a Vercel, HTTPS ativo.
- [ ] Domínio nos _Authorized domains_ do Firebase Authentication.
- [ ] `npm run rules:deploy` corrido; política TTL em `rateLimits.expiresAt`.
- [ ] Cloudinary em plano/ambiente de produção (o atual é o _Test environment_).
- [ ] Alertas de erro ligados na Vercel (ou Sentry).

## Integrações (cada uma desbloqueia uma função)

- [ ] **Gateway de pagamentos** (EMIS GPO ou agregador): contrato, chaves no ambiente, fornecedor ligado em
      `src/lib/payments/provider.ts`, webhook apontado. Até lá, o modo de teste não cobra nada: **desligar o
      pagamento online ou avisar os clientes**.
- [ ] **Resend**: `RESEND_API_KEY`, `EMAIL_FROM` com domínio verificado (SPF/DKIM). Sem ele não sai nenhum email.
- [ ] **WhatsApp Business Cloud API**: número verificado e modelos aprovados pela Meta. Até lá a mensagem ao
      cliente abre o WhatsApp com o texto preenchido.
- [ ] **Software de faturação certificado (AGT)**: indicar qual, para ligar o adaptador.
- [ ] **Firebase Storage (plano Blaze)**: para os clientes carregarem as artes no site (hoje vão por WhatsApp).

## Verificação final (no domínio)

- [ ] Encomenda completa com uma conta de cliente nova: carrinho, checkout, prova, aprovação, pagamento, pronto.
- [ ] Orçamento personalizado e formulário de contacto chegam a **Marketing → Leads**.
- [ ] Login por email e por telemóvel; recuperar senha.
- [ ] Cada papel da equipa só vê os seus módulos.
- [ ] `https://<domínio>/sitemap.xml` e `/robots.txt` respondem; partilhar um link no WhatsApp mostra a imagem.
- [ ] Lighthouse no telemóvel: LCP < 2,5 s, acessibilidade sem erros.
- [ ] `npm test` e `npm run build` sem erros.
