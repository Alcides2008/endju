# 03 · Rotas e permissões

## Proteção de rotas

1. O cliente autentica-se no Firebase Auth (email ou telemóvel + senha, ou Google) e envia o ID token para `POST /api/auth/session`. Sem SMS por agora: o registo pede email, telemóvel (único por conta, não verificado) e senha; o login por telemóvel confirma a senha no servidor e devolve um custom token.
2. O servidor valida o token, garante o documento `users/{uid}` (cria-o no primeiro login) e devolve um **cookie de sessão** `httpOnly`, `secure`, `sameSite=lax`, válido 14 dias.
3. `src/proxy.ts` faz a verificação otimista: sem cookie em `/conta` ou `/admin` → redireciona para `/entrar?voltar=…`.
4. Os layouts de `/conta` e `/admin` verificam o cookie com o Admin SDK e o papel (custom claim `role`). Cada Server Action volta a verificar `can(user, módulo, ação)` antes de escrever. A rota é só a primeira barreira; a permissão real está na ação.
5. Regras do Firestore: leitura por papel/propriedade; **escrita negada ao cliente** em quase tudo (as escritas vão pelo Admin SDK). Exceções: marcar notificação como lida e carregar ficheiros para o Storage no próprio caminho.

## Rotas públicas — site

| Rota | Página | Etapa |
|---|---|---|
| `/` | Home com hero 3D | 2 |
| `/servicos` | Lista de serviços | 3 |
| `/servicos/[slug]` | Detalhe: descrição, materiais, prazos, "a partir de", galeria, produtos | 3 |
| `/portfolio` | Grelha filtrável (categoria, setor) | 3 |
| `/portfolio/[slug]` | Projeto: antes/depois, desafio, solução, resultado | 3 |
| `/orcamento` | Escolher produto a configurar | 4 |
| `/orcamento/[produto]` | Configurador com pré-visualização 3D e preço em tempo real | 4 |
| `/orcamento/personalizado` | Pedido de orçamento fora do catálogo | 4 |
| `/carrinho` | Carrinho | 4 |
| `/checkout` | Entrega, cupão, pagamento (exige sessão) | 4 |
| `/checkout/sucesso?pedido=` | Confirmação com número do pedido | 4 |
| `/sobre` · `/contacto` · `/faq` | Institucionais | 3 |
| `/blog` · `/blog/[slug]` | Blog | 3 |
| `/privacidade` · `/termos` | Legais | 3 |
| `/entrar` · `/registar` · `/recuperar-senha` | Autenticação | 1 |
| `/convite/[token]` | Aceitar convite de equipa | 1 |
| `not-found` | 404 criativa | 3 |
| `/sitemap.xml` · `/robots.txt` · `/manifest.webmanifest` | SEO / PWA | 8 |

## Área do cliente — `/conta` (papel `cliente`)

| Rota | Página |
|---|---|
| `/conta` | Dashboard: pedidos ativos, orçamentos pendentes, provas por aprovar, pagamentos em falta |
| `/conta/pedidos` | Histórico com filtros |
| `/conta/pedidos/[numero]` | Detalhe com linha do tempo em tempo real, itens, ficheiros, "Repetir encomenda" |
| `/conta/orcamentos` · `/conta/orcamentos/[id]` | Propostas recebidas, aceitar/recusar, versões |
| `/conta/provas` · `/conta/provas/[id]` | Visualizador com zoom, comentários com pino, pedir alterações, aprovar |
| `/conta/pagamentos` · `/conta/pagamentos/[id]` | Pendentes e histórico; instruções, referência, upload de comprovativo |
| `/conta/faturas` | Faturas, recibos e pro-formas em PDF |
| `/conta/ficheiros` | Ficheiros enviados |
| `/conta/mensagens` · `/conta/mensagens/[id]` | Suporte |
| `/conta/perfil` · `/conta/moradas` · `/conta/notificacoes` | Dados, moradas, preferências |

## Painel — `/admin` (papéis de equipa)

| Rota | Módulo |
|---|---|
| `/admin` | 1 · Dashboard |
| `/admin/pedidos` (`?vista=kanban`) · `/admin/pedidos/novo` · `/admin/pedidos/[numero]` · `/admin/pedidos/[numero]/ordem-producao` | 2 · Pedidos |
| `/admin/orcamentos` · `/admin/orcamentos/[id]` | 3 · Orçamentos |
| `/admin/clientes` · `/admin/clientes/[id]` | 4 · Clientes (CRM) |
| `/admin/producao` (`?setor=` / `?maquina=`) · `/admin/producao/calendario` | 5 · Produção |
| `/admin/provas` · `/admin/provas/[id]` | 6 · Provas e design |
| `/admin/catalogo/servicos` · `/admin/catalogo/produtos` · `/admin/catalogo/produtos/[id]` · `/admin/catalogo/opcoes` | 7 · Catálogo e preços |
| `/admin/stock` · `/admin/stock/[id]` · `/admin/stock/movimentos` · `/admin/stock/inventario` | 8 · Stock |
| `/admin/compras/fornecedores` · `/admin/compras/fornecedores/[id]` · `/admin/compras/encomendas` · `/admin/compras/encomendas/[id]` | 9 · Fornecedores e compras |
| `/admin/financeiro` · `…/faturas` · `…/pagamentos` · `…/dividas` · `…/despesas` · `…/conciliacao` · `…/iva` | 10 · Financeiro |
| `/admin/portfolio` · `/admin/portfolio/[id]` | 11 · Portfólio |
| `/admin/conteudo/blog` · `…/blog/[id]` · `…/paginas` · `…/faq` · `…/testemunhos` · `…/banners` | 12 · Blog/CMS |
| `/admin/marketing/cupoes` · `…/campanhas` · `…/newsletter` · `…/popups` · `…/leads` | 13 · Marketing |
| `/admin/comunicacao/modelos` · `…/historico` · `…/mensagens` · `…/mensagens/[id]` | 14 · Comunicação |
| `/admin/equipa` · `/admin/equipa/papeis` | 15 · Equipa e permissões |
| `/admin/relatorios` | 16 · Relatórios |
| `/admin/auditoria` | 17 · Auditoria |
| `/admin/definicoes` (separadores: empresa, fiscal, pagamentos, entregas, horários, produção, integrações, dados) | 18 · Definições |

A sidebar só mostra módulos com `view`. Abrir um URL sem permissão mostra uma página "Sem acesso" (não um 404), para a equipa perceber o que pedir.

## API e jobs

| Endpoint | Método | Autenticação | Uso |
|---|---|---|---|
| `/api/auth/session` | POST / DELETE | ID token | Criar / terminar sessão |
| `/api/auth/register` | POST | público (rate limit na Etapa 8) | Criar conta com email + telemóvel únicos |
| `/api/auth/phone-login` | POST | público (rate limit na Etapa 8) | Telemóvel + senha → custom token |
| `/api/uploads/sign` | POST | sessão | Assinatura de upload direto para o Cloudinary (portfólio, blog, provas) |
| `/api/webhooks/mcx` | POST | assinatura do gateway | Confirmação Multicaixa Express |
| `/api/webhooks/referencias` | POST | assinatura do gateway | Pagamento por referência |
| `/api/webhooks/whatsapp` | GET / POST | verify token + assinatura Meta | Estado das mensagens, respostas de clientes |
| `/api/export/[recurso]` | GET | sessão + `export` | CSV / XLSX / PDF |
| `/api/pdf/[tipo]/[id]` | GET | sessão + dono ou `view` | Proposta, pro-forma, recibo, ordem de produção |

Mutações normais são Server Actions, não endpoints REST.

Cloud Functions: `onOrderWrite`, `onPaymentWrite`, `onProofWrite`, `onMaterialWrite`, `onStorageFinalize` (preflight), `scheduledDeadlines` (de hora a hora), `scheduledExpirations` (diário), `scheduledBackup` (diário, 02:00 Luanda).

---

## Matriz de permissões (papéis por omissão)

Legenda: **V** ver · **C** criar · **E** editar · **X** eliminar/arquivar · **A** ação especial (nota) · **⇩** exportar · **¹** só registos atribuídos ao próprio · — sem acesso.

O Administrador tem tudo e não pode ser editado; o sistema impede desativar o último Administrador ativo. Os outros papéis são editáveis em `/admin/equipa/papeis` (módulo × ação).

| Módulo | Administrador | Gestor | Designer | Operador | Financeiro | Atendimento | Cliente |
|---|---|---|---|---|---|---|---|
| 1 Dashboard | V | V | V¹ | V¹ | V (finanças) | V (vendas) | — |
| 2 Pedidos | VCEXA⇩ | VCEA⇩ | V¹ E¹ | V¹ E¹ | V⇩ | VCE | V¹ C A |
| 3 Orçamentos | VCEXA⇩ | VCEA⇩ | V | — | V | VCEA | V¹ C A |
| 4 Clientes | VCEX⇩ + importar | VCE⇩ | V (básico) | — | V E (fiscal) | VCE | V¹ E¹ |
| 5 Produção | VCEXA | VCEA | V¹ E¹ | V¹ E¹ | — | V (calendário) | — |
| 6 Provas | VCEXA | VCEA | VCE | V (aprovadas) | — | V C (comentar) | V¹ A |
| 7 Catálogo e preços | VCEX | VCE | V | V | V | V | — |
| 8 Stock | VCEXA⇩ | VCEA⇩ | — | V C (saídas) | V⇩ | — | — |
| 9 Fornecedores e compras | VCEXA⇩ | VCEA | — | V (receção) | VEA⇩ | — | — |
| 10 Financeiro | VCEXA⇩ | V⇩ | — | — | VCEA⇩ | V C (balcão) | V¹ C |
| 11 Portfólio | VCEX | VCEA | VCE | — | — | V | — |
| 12 Blog/CMS | VCEX | VCEA | VCE | — | — | VE (FAQ, testemunhos) | — |
| 13 Marketing | VCEX⇩ | VCE⇩ | — | — | V | VE (leads) | — |
| 14 Comunicação | VCEX | VCE | V¹ | — | — | VCE | V¹ C |
| 15 Equipa e permissões | VCEX | V | — | — | — | — | — |
| 16 Relatórios | V⇩ | V⇩ | — | — | V⇩ (financeiros) | — | — |
| 17 Auditoria | V⇩ | V | — | — | — | — | — |
| 18 Definições | VEA | V | — | — | VE (fiscal, pagamentos) | — | — |

### O que significa cada **A** (ação especial)

| Módulo | Quem | Ação |
|---|---|---|
| Pedidos | Administrador | Avançar para produção sem sinal pago; cancelar pedido já em produção |
| Pedidos | Gestor | Atribuir responsável, alterar prazo, aplicar desconto manual até 10 % |
| Pedidos | Cliente | Repetir encomenda; cancelar enquanto `recebido` e sem pagamentos |
| Pedidos | Designer / Operador (E¹) | Designer: `em_design ↔ em_aprovacao`. Operador: concluir tarefas, o que leva a `pronto` |
| Orçamentos | Gestor / Atendimento | Enviar proposta ao cliente; converter em pedido. Desconto acima de 10 % exige Gestor |
| Orçamentos | Cliente | Aceitar ou recusar proposta |
| Produção | Gestor | Atribuir tarefas, reordenar filas, mudar máquina |
| Provas | Cliente | Aprovar formalmente ou pedir alterações |
| Provas | Gestor | Libertar para produção sem aprovação do cliente (fica registado na auditoria) |
| Stock | Gestor | Fechar inventário (gera ajustes), ajustes manuais |
| Compras | Gestor / Financeiro | Gestor aprova a encomenda de compra; Financeiro regista o pagamento |
| Financeiro | Financeiro | Confirmar pagamentos manuais, anular documentos, conciliar extratos |
| Portfólio / CMS | Gestor | Publicar (o Designer só guarda rascunhos) |
| Definições | Administrador | Backups, exportação total de dados, integrações |

### Leitura nas regras do Firestore

As regras leem o papel do custom claim e as permissões de `roles/{role}` (um `get()` por avaliação). Resumo:

| Coleção | Cliente | Equipa |
|---|---|---|
| `orders`, `orders/*/items` | `customerId` = o seu | `orders.view` (¹ filtra por `assigneeId`) |
| `orders/*/events` | `customerId` = o seu **e** `visibility == 'cliente'` | `orders.view` |
| `proofs`, `proofs/*/comments` | `customerId` = o seu | `proofs.view` |
| `payments`, `invoices` | `customerId` = o seu | `finance.view` |
| `notifications` | `recipientId` = o seu (pode alterar só `read`) | idem |
| `threads`, `threads/*/messages` | `customerId` = o seu | `messaging.view` |
| `services`, `products`, `projects`, `posts`, `faqs`, `testimonials`, `banners`, `pages` | público, só ativos/publicados | `view` do módulo (inclui rascunhos) |
| `auditLogs` | — | `audit.view` |
| `settings` | só `company`, `delivery` (dados públicos) | `settings.view` |
| restantes | — | `view` do módulo correspondente |

Storage: `clientes/{customerId}/…` lê e escreve o próprio cliente (tamanho e tipo validados na regra) e a equipa com `orders.view`; `provas/…` e `faturas/…` só leitura para o cliente dono.
