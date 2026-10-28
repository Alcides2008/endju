# 04 · Fluxos e estados

## Arquitetura

```mermaid
flowchart LR
  subgraph Browser
    Site[Site público + 3D]
    Conta[Área do cliente]
    Admin[Painel]
  end
  subgraph Vercel
    RSC[Server Components]
    SA[Server Actions]
    API[Route Handlers /api]
  end
  subgraph Firebase
    Auth[Auth]
    FS[(Firestore)]
    ST[(Storage)]
    FN[Cloud Functions]
  end
  CDN[Cloudinary]
  MCX[Gateway Multicaixa Express / referências]
  RES[Resend]
  WA[WhatsApp Cloud API]
  AGT[Software de faturação certificado AGT]

  Browser -->|login| Auth
  Browser -->|leituras em tempo real| FS
  Browser -->|upload de artes| ST
  Browser -->|imagens otimizadas| CDN
  Browser --> RSC
  Browser --> SA
  RSC -->|Admin SDK| FS
  SA -->|Admin SDK| FS
  API -->|Admin SDK| FS
  SA --> MCX
  MCX -->|webhook| API
  FS -->|triggers| FN
  ST -->|ficheiro carregado| FN
  FN --> RES
  FN --> WA
  FN --> AGT
```

---

## Estado do pedido

O pedido tem **dois eixos independentes**: `status` (produção, o que o cliente vê na linha do tempo) e `paymentStatus` (dinheiro). As guardas cruzam os dois.

```mermaid
stateDiagram-v2
  [*] --> recebido : checkout, balcão ou orçamento aceite
  recebido --> em_design : precisa de design ou correção da arte
  recebido --> em_aprovacao : arte do cliente OK, prova v1 enviada
  recebido --> em_producao : produto sem prova + sinal pago
  em_design --> em_aprovacao : prova enviada
  em_aprovacao --> em_design : cliente pede alterações
  em_aprovacao --> em_producao : provas aprovadas + sinal pago
  em_producao --> pronto : todas as tarefas concluídas
  pronto --> entregue : levantado ou entregue + pago
  recebido --> cancelado
  em_design --> cancelado
  em_aprovacao --> cancelado
  em_producao --> cancelado : só Administrador, com motivo
  entregue --> [*]
  cancelado --> [*]
```

| Transição | Quem | Guarda | Efeitos |
|---|---|---|---|
| → `recebido` | sistema | preço recalculado no servidor; cupão válido | número `EDJ-AAAA-NNNNN`, pagamento `pendente`, evento, email de confirmação |
| `recebido → em_design` | Gestor, Atendimento, Designer | item com `design = endju_cria` ou arte rejeitada no preflight | tarefa no setor `design` |
| `recebido → em_aprovacao` | Designer | prova v1 carregada | notifica o cliente |
| `recebido → em_producao` | sistema | `requiresProof = false` em todos os itens **e** `paid ≥ depositRequired` | cria tarefas, baixa de stock, recalcula `dueAt` |
| `em_design → em_aprovacao` | Designer | prova carregada para cada item que a exige | notifica o cliente |
| `em_aprovacao → em_design` | Cliente, Designer | — | `revisionCount++`; acima das revisões incluídas (3) avisa o Atendimento do custo extra |
| `em_aprovacao → em_producao` | sistema | todas as provas `aprovada` **e** `paid ≥ depositRequired` | igual a acima. Sem sinal: fica em `em_aprovacao` com o selo "Aprovado · a aguardar sinal" |
| `em_producao → pronto` | sistema / Operador | última tarefa `concluida` | notifica "pronto para levantamento" ou "a preparar envio" |
| `pronto → entregue` | Atendimento, Gestor | `paymentStatus = pago` (o restante pode ser registado no ato) | guarda `deliveredAt`, `receivedBy`; pede avaliação |
| `* → cancelado` | Cliente (só `recebido` sem pagamentos), Atendimento, Gestor | antes de `em_producao` | liberta cupão; reembolso conforme os Termos |
| `em_producao → cancelado` | Administrador | motivo obrigatório | o stock consumido não volta; fica na auditoria |

**Prazo (`dueAt`)**: estimado no checkout; recalculado ao entrar em produção = data de entrada + `leadTime.normalDays` (ou `urgentDays`) em dias úteis de `settings/production.workingDays` + `extraDays` da zona de entrega. Regra comunicada ao cliente: *o prazo conta a partir da aprovação da prova e do pagamento do sinal*.

**Atrasado** = `status ∈ {recebido, em_design, em_aprovacao, em_producao}` e `dueAt < agora`.

**Saída para entrega**: não é um estado próprio. A saída para entrega fica como evento na linha do tempo ("Saiu para entrega às 10:42 · estafeta Endju"), dentro de `pronto`.

## Estado do pagamento

```mermaid
stateDiagram-v2
  [*] --> pendente : MCX pedido / referência gerada / transferência escolhida
  pendente --> confirmado : webhook do gateway
  pendente --> aguarda_validacao : cliente envia comprovativo
  aguarda_validacao --> confirmado : Financeiro valida
  aguarda_validacao --> falhado : comprovativo rejeitado
  pendente --> falhado : recusado no telemóvel / tempo esgotado
  pendente --> expirado : referência expirou
  confirmado --> reembolsado
```

`order.paymentStatus` deriva da soma dos pagamentos `confirmado`: `0` → `pendente`; `< total` → `parcial`; `≥ total` → `pago`.
O sinal é `depositRequired = round(total × depositPct)`; clientes com `paymentTerms = 'a_30_dias'` têm sinal 0.

## Estado do orçamento

```mermaid
stateDiagram-v2
  [*] --> novo : formulário personalizado ou pedido do balcão
  novo --> em_analise : atribuído
  em_analise --> enviado : proposta PDF v1 enviada
  enviado --> em_analise : cliente pede ajuste → nova versão
  enviado --> aceite : cliente aceita
  enviado --> recusado : cliente recusa
  enviado --> expirado : passou validUntil
  aceite --> convertido : pedido criado com as linhas da versão aceite
  convertido --> [*]
  recusado --> [*]
  expirado --> [*]
```

Taxa de conversão = `convertido / (enviado + aceite + recusado + expirado + convertido)` no período.

---

## Checkout e pagamento Multicaixa Express

```mermaid
sequenceDiagram
  autonumber
  actor C as Cliente
  participant N as Next.js (Server Action)
  participant F as Firestore
  participant G as Gateway MCX
  participant T as App Multicaixa Express
  participant W as Webhook /api/webhooks/mcx
  participant FN as Cloud Functions

  C->>N: placeOrder(carrinho, entrega, cupão, método, telefone)
  N->>N: Zod + recalcula preço, IVA, entrega, cupão
  N->>F: transação: contador, pedido, itens, evento, pagamento pendente, auditoria
  N->>G: criar pagamento (sinal ou total)
  G->>T: pedido de pagamento no telemóvel
  N-->>C: /checkout/sucesso?pedido=EDJ-2026-00412 (escuta o pagamento em tempo real)
  C->>T: confirma com PIN
  G->>W: confirmação assinada
  W->>W: verifica assinatura e idempotência (transactionId)
  W->>F: pagamento confirmado, totais do pedido atualizados
  F->>FN: onPaymentWrite
  FN->>FN: recibo, notificações (painel, email, WhatsApp)
  F-->>C: ecrã muda para "Pagamento recebido"
```

- Referência: o passo 5 devolve entidade + referência + validade, mostradas no ecrã e enviadas por email/WhatsApp. O webhook chega quando o cliente paga num ATM ou no app.
- Transferência: o ecrã mostra o IBAN de `settings/company`; o cliente carrega o comprovativo → `aguarda_validacao` → o Financeiro valida.
- Rede de segurança: `scheduledDeadlines` consulta o gateway para pagamentos `pendente` há mais de 15 min (webhook perdido).

## Aprovação de prova

```mermaid
sequenceDiagram
  autonumber
  actor D as Designer
  participant N as Next.js
  participant F as Firestore
  participant FN as Functions
  actor C as Cliente

  D->>N: carregar prova (PDF de alta)
  N->>N: gera pré-visualização no Cloudinary
  N->>F: proof vN pendente, item enviada, pedido em_aprovacao, evento
  F->>FN: onProofWrite
  FN-->>C: email + WhatsApp + painel com link
  C->>N: abre /conta/provas/{id}, zoom, comentários com pino
  alt pede alterações
    C->>N: requestChanges(comentário)
    N->>F: alteracoes_pedidas, pedido em_design, revisionCount++
    FN-->>D: notificação
  else aprova
    C->>N: approveProof(aceito os termos)
    N->>F: decisão com hora do servidor, IP, user agent, versão dos termos
    N->>F: se todas aprovadas e sinal pago: em_producao + tarefas
  end
```

Texto de aceitação (versionado em `termsVersion`): *"Revi textos, ortografia, cores, dimensões e contactos. Autorizo a produção tal como está nesta prova."*

## Upload e preflight de ficheiros

```mermaid
flowchart TD
  A[Cliente larga o ficheiro] --> B{Browser: extensão e tamanho válidos?}
  B -- não --> X[Erro imediato com o motivo]
  B -- sim --> C[PNG/JPG: lê dimensões e calcula DPI no tamanho escolhido]
  C --> D[Upload resumível para Storage com barra de progresso]
  D --> E[Server Action regista files/id com preflight pendente]
  E --> F[Function onStorageFinalize]
  F --> G[raster: sharp · PDF/AI: pdf-lib caixas e páginas · PSD: cabeçalho]
  G --> H{Resultado}
  H -- ok --> I[Verde: pronto para prova]
  H -- avisos --> J[Amarelo: ex. 150 dpi, recomendado 300 — não bloqueia]
  H -- erro --> K[Vermelho: ficheiro corrompido ou ilegível — pede novo]
```

Avisos não bloqueiam a encomenda: o designer revê-os antes de enviar a prova. Ficheiros `.ai` sem compatibilidade PDF ficam "não analisado · revisão manual".

## Notificações

```mermaid
flowchart LR
  E[Mudança no Firestore] --> FN[Function do evento]
  FN --> R[Destinatários: cliente + papéis subscritos]
  R --> P{Preferências do utilizador}
  P --> IA[Painel: sempre]
  P --> EM[Email: Resend + modelo]
  P --> WA[WhatsApp: modelo aprovado pela Meta]
  EM --> L[(deliveries)]
  WA --> L
```

| Evento | Cliente | Equipa |
|---|---|---|
| `pedido.estado` | sim | responsável do pedido |
| `pagamento.pendente` (24 h antes de a referência expirar) | sim | — |
| `pagamento.comprovativo` | — | Financeiro |
| `pagamento.confirmado` | sim | Financeiro |
| `prova.enviada` | sim | — |
| `prova.decisao` | — | Designer, responsável |
| `prazo.a_expirar` (24 h) | — | responsável, Gestor |
| `orcamento.novo` | — | Atendimento, Gestor |
| `orcamento.enviado` | sim | — |
| `stock.baixo` | — | Gestor |
| `mensagem.nova` | sim (resposta da equipa) | Atendimento |
| `tarefa.atribuida` | — | operador atribuído |

## Consumo de stock

```mermaid
flowchart LR
  A[Pedido entra em em_producao] --> B[onOrderWrite]
  B --> C{stockConsumedAt já existe?}
  C -- sim --> Z[Ignora: trigger repetido]
  C -- não --> D[Para cada item: aplica product.consumption]
  D --> E[Transação: movimentos 'saida' + materials.qty + isLow + stockConsumedAt]
  E --> F{isLow passou a true?}
  F -- sim --> G[Notifica stock.baixo]
```

Todas as Functions são idempotentes: os triggers do Firestore podem disparar mais de uma vez.

## Autenticação e papéis

```mermaid
sequenceDiagram
  actor U as Utilizador
  participant A as Firebase Auth
  participant S as /api/auth/session
  participant F as Firestore
  U->>A: email + senha ou Google
  Note over U,A: Telemóvel + senha: /api/auth/phone-login confirma no servidor e devolve custom token
  A-->>U: ID token
  U->>S: POST token
  S->>F: cria users/{uid} se não existir (papel cliente + ficha customers)
  S-->>U: cookie de sessão httpOnly (14 dias)
  Note over U,S: Convite de equipa: /convite/{token} define o papel no custom claim
```
