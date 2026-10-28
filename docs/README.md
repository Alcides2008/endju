# ENDJU BUSINESS · Plano técnico (Etapa 0)

| Documento | Conteúdo |
|---|---|
| [01 · Estrutura de pastas](01-estrutura-de-pastas.md) | Árvore do projeto, onde corre cada camada, dependências extra |
| [02 · Modelo de dados](02-modelo-de-dados.md) | Coleções Firestore, campos, relações, índices |
| [03 · Rotas e permissões](03-rotas-e-permissoes.md) | Mapa de rotas, proteção, matriz RBAC, regras de leitura |
| [04 · Fluxos e estados](04-fluxos.md) | Máquinas de estado (pedido, pagamento, orçamento) e diagramas dos fluxos principais |
| [05 · Variáveis de ambiente](05-variaveis-de-ambiente.md) | Lista completa por camada e etapa |

Os diagramas estão em Mermaid (abrem no GitHub e no VS Code com a extensão Markdown Preview Mermaid).

## Decisões de arquitetura

1. **Escritas só pelo servidor.** Server Actions com Admin SDK validam (Zod), verificam permissões, escrevem em transação e registam auditoria no mesmo batch. O browser só lê do Firestore em tempo real. Regras de segurança curtas, validação num único sítio.
2. **Regras de negócio como funções puras partilhadas** (`src/lib/domain/`): preço, IVA, máquina de estados, permissões. O configurador mostra a estimativa com o mesmo código que o servidor usa para cobrar.
3. **Dinheiro em cêntimos inteiros**, IVA de 14 % por linha, snapshots em pedidos/faturas.
4. **Estado do pedido e estado do pagamento separados.** As guardas cruzam os dois ("só entra em produção com prova aprovada e sinal pago").
5. **Ficheiros**: artes, provas originais, comprovativos e faturas no Firebase Storage (privado, regras por cliente). Imagens públicas e pré-visualizações de provas com zoom no Cloudinary.
6. **Cloud Functions só para efeitos secundários e tarefas agendadas** (notificações, stock, preflight, lembretes, backups). Tudo o que o utilizador dispara corre na Vercel.
7. **Faturação fiscal fora do sistema.** As faturas legais saem de software certificado pela AGT, através de um adaptador. Até haver integração, o sistema emite pro-formas e recibos internos e guarda o número da fatura emitida no software certificado.
8. **Sem pré-agregados nem motor de pesquisa externo para já.** O volume de uma gráfica cabe em consultas diretas + `count()`/`sum()`. A pesquisa usa tokens de prefixo. Os dois pontos estão marcados para revisão.
9. **Email só com Resend** (Nodemailer fica de fora: duas bibliotecas para a mesma coisa).

## Decisões que preciso que confirmes

| # | Pergunta | Proposta |
|---|---|---|
| 1 | Preços públicos ("a partir de", configurador) com IVA incluído? | **Sim** para o público; o checkout e as faturas mostram base + IVA 14 % |
| 2 | O checkout exige conta? | **Sim**, com login rápido por telefone (SMS) ou Google no próprio checkout. As provas e os pagamentos precisam de identidade |
| 3 | Carrinho guardado entre aparelhos? | **Não**: carrinho no browser, validado no servidor no checkout |
| 4 | Gateway Multicaixa Express e referências: EMIS (GPO) direto ou agregador? | Decidir já: o contrato de comerciante demora semanas e bloqueia a Etapa 7 |
| 5 | Software de faturação certificado já usado pela Endju? | Indica qual (ou se ainda não existe) para preparar o adaptador |
| 6 | WhatsApp Business Cloud API (Meta) | Requer empresa verificada e modelos aprovados; o número não pode estar em uso no WhatsApp normal |
| 7 | Sinal de 50 % para todos os clientes? | Sim por omissão; clientes empresa "a 30 dias" sem sinal (configurável na ficha) |
| 8 | Revisões de prova incluídas no preço | 3; a partir da 4.ª o Atendimento é avisado para cobrar |

## O que preciso para a Etapa 1

- Logótipo da Endju em vetor (SVG, AI ou PDF) e, se existir, manual de marca.
- Dados da empresa: NIF, morada, telefones/WhatsApp, email, horário, coordenadas da loja.
- Domínio pretendido (ex.: `endju.ao`).
- Projeto Firebase criado (ou autorização para o criar) e conta Cloudinary.
- Preços reais de referência, se já existirem (senão uso valores de mercado de Luanda, marcados para revisão).
