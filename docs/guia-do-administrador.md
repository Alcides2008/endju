# Guia do administrador

O painel abre em `/admin` para quem tem um papel da equipa. Cada pessoa vê só os módulos que o seu papel permite
(menu lateral, ou **Ctrl K** para procurar um pedido, cliente ou página). O sino mostra os avisos em tempo real.

## O dia a dia de um pedido

```
Recebido → Em design → Em aprovação → Em produção → Pronto → Entregue
                                   (sinal pago + todas as provas aprovadas)
```

1. **Recebido**: o pedido chega pelo site (ou cria-se no painel a partir de um orçamento aceite). Aparece no
   Dashboard e em **Pedidos**. O cliente pode cancelar sozinho enquanto está em Recebido e sem pagamentos.
2. **Em design**: o designer prepara a arte. Mudar o estado na página do pedido.
3. **Em aprovação**: em **Provas**, ou na página do pedido, carregar a prova (PDF ou imagem). O cliente recebe
   aviso, vê a prova com zoom, comenta com pinos e aprova ou pede alterações. A partir da 4.ª revisão o
   Atendimento é avisado para cobrar.
4. **Em produção**: entra sozinho quando todas as provas estão aprovadas **e** o sinal (50 % por omissão) está
   pago. As tarefas da oficina criam-se pelo percurso de cada produto e o material sai do stock.
5. **Pronto**: quando a última tarefa da oficina fecha. O cliente recebe aviso para levantar ou receber.
6. **Entregue**: só com o pedido pago na totalidade.

Para cancelar é preciso indicar o motivo. Todas as mudanças ficam na linha do tempo do pedido e na Auditoria.

## Pagamentos

- **Multicaixa Express e referência**: o cliente paga na área de cliente e a confirmação chega sozinha (webhook).
  Hoje o fornecedor está em **modo de teste**: nada é cobrado e aparece o botão "Simular".
- **Transferência**: o cliente envia o comprovativo. Em **Financeiro → Pagamentos → Transferências por validar**,
  abrir o comprovativo, ver se o dinheiro entrou no banco e **Confirmar** (ou **Recusar** com o motivo).
- **Ao balcão** (numerário, TPA): na página do pedido, **Registar pagamento**.
- Cada pagamento confirmado tem **Recibo** em PDF (interno, sem valor fiscal).
- As faturas legais saem do software certificado pela AGT; em **Financeiro** regista-se o número da fatura emitida.

## Módulos

| Módulo | Para quê |
|---|---|
| Dashboard | Recebido hoje e na semana, pedidos por estado, atrasos e tarefas |
| Pedidos | Tabela e quadro (Kanban), detalhe, pagamentos, mensagem ao cliente, ordem de produção para imprimir |
| Provas | Provas por enviar e à espera do cliente |
| Orçamentos | Pedidos de orçamento personalizado → proposta (PDF) → pedido |
| Clientes | Ficha, histórico, saldo em dívida, condições (ex.: empresas a 30 dias sem sinal) |
| Mensagens | Conversas com clientes da área de cliente |
| Produção | Fila por setor (impressão, corte, acabamento); começar, pausar e concluir tarefas |
| Stock | Materiais, movimentos, contagens e alertas de stock baixo |
| Compras | Fornecedores e encomendas de material |
| Catálogo | Produtos, opções, preços por escalão, percurso de produção e consumo de material |
| Portfólio · Conteúdo | Projetos, blog, FAQ, testemunhos, banners e imagens do site (Cloudinary) |
| Financeiro | Pagamentos, dívidas, despesas (com recorrência), faturas, reconciliação do extrato, IVA |
| Marketing | Leads (funil), cupões, campanhas, newsletter, pop-ups |
| Comunicação | Modelos de email e WhatsApp e histórico de envios |
| Relatórios | Vendas, produtos, clientes e prazos, com exportação CSV |
| Equipa | Membros, convites e **Papéis** (matriz módulo × ação, editável) |
| Auditoria | Quem fez o quê e quando, com exportação |
| Definições | Dados da empresa (aparecem no site e nos PDFs), IBAN, sinal, zonas de entrega e pontos de levantamento |

## Equipa e permissões

- **Convidar**: Equipa → Convidar, com o email e o papel. A pessoa abre o link do convite, entra e fica com o papel.
- **Papéis**: Administrador (tudo, não editável), Gestor, Designer, Operador, Financeiro, Atendimento. Em
  Equipa → Papéis muda-se o que cada um pode ver, criar, editar, eliminar, aprovar e exportar. Vale de imediato.
- **Desativar** um membro corta-lhe o acesso; o sistema não deixa desativar o último Administrador.

## Avisos automáticos

- Todos os dias às 07:00 (Luanda): pedidos que vencem nas próximas 24 h ou estão atrasados (Atendimento e
  Operador) e referências de pagamento expiradas.
- Ao cliente, pelo painel e por email (quando o Resend estiver ligado): prova enviada, sinal em falta,
  pagamento recebido e pedido pronto. Os textos editam-se em **Comunicação → Modelos**.

## Segurança

- Formulários públicos com limite de pedidos por IP e campo anti-robô; uploads só nos formatos aceites.
- Os comprovativos de transferência ficam privados no Cloudinary e só abrem com link assinado pelo servidor.
- Nunca partilhar o `.env.local` nem a chave da conta de serviço do Firebase.
