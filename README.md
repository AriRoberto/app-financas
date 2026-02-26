# App de Finanças Pessoal e Familiar

## Objetivo
Criar um aplicativo de controle financeiro **pessoal e familiar**, acessível em:
- **Web** (desktop/notebook)
- **Mobile** (Android e iOS)

Com foco em:
1. Registrar e classificar gastos/receitas.
2. Exibir dashboards claros sobre para onde o dinheiro está indo.
3. Oferecer sugestões práticas para reduzir desperdícios e melhorar metas financeiras.

---

## Público-alvo
- Pessoas que controlam o próprio orçamento.
- Famílias com orçamento compartilhado (casal, filhos, dependentes).
- Usuários sem experiência com planilhas complexas.

---

## Funcionalidades essenciais (MVP)

### 1) Gestão financeira básica
- Cadastro de **receitas** e **despesas**.
- Categorias (moradia, alimentação, transporte, saúde, lazer etc.).
- Subcategorias e tags (ex.: "mercado", "combustível", "assinaturas").
- Contas e carteiras (conta corrente, cartão, dinheiro, poupança).
- Lançamentos parcelados e recorrentes.
- Importação de extrato (CSV/OFX) para facilitar adoção.

### 2) Modo família
- Criação de um **grupo familiar** com múltiplos membros.
- Permissões por perfil:
  - Admin (gerencia tudo)
  - Colaborador (lança e edita próprios gastos)
  - Visualizador (somente leitura)
- Consolidação automática por pessoa e por família.
- Centro de custos por membro (ex.: filhos, pets, casa).

### 3) Orçamento e metas
- Definição de orçamento mensal por categoria.
- Metas (reserva de emergência, viagem, escola, quitar dívida).
- Alertas de estouro de orçamento (push/e-mail).
- Projeção de saldo até o fim do mês.

### 4) Dashboards explicativos
- **Visão geral mensal**: receitas, despesas, saldo, taxa de poupança.
- **Onde o dinheiro está indo**: ranking de categorias e evolução histórica.
- **Comparativo mês a mês**: tendência de alta/queda.
- **Gastos fixos x variáveis**.
- **Top 10 despesas** e assinaturas ativas.
- **Saúde financeira familiar** (score simples e explicável).

### 5) Sugestões inteligentes de economia
- Identificação de categorias acima da média dos últimos meses.
- Detecção de assinaturas possivelmente esquecidas.
- Avisos de concentração excessiva de gasto (ex.: >35% em moradia).
- Sugestões práticas, por exemplo:
  - "Você gastou 22% a mais em delivery do que a média dos últimos 3 meses."
  - "Se reduzir R$ 300/mês em lazer, atinge a meta de emergência 2 meses antes."
- Recomendação de teto semanal por categoria para manter meta mensal.

---

## Experiência de uso

### Mobile
- Captura rápida de gasto (menos de 10 segundos).
- Botão de atalho para "adicionar despesa".
- Notificações de lembrete e alertas de orçamento.

### Web
- Painel analítico mais completo.
- Filtros avançados por período, membro da família e categoria.
- Exportação PDF/CSV para prestação de contas e planejamento.

---

## Arquitetura sugerida
- **Frontend web**: Next.js + TypeScript.
- **Mobile**: React Native (Expo), reaproveitando regras de negócio.
- **Backend**: Node.js (NestJS) ou Python (FastAPI).
- **Banco**: PostgreSQL.
- **Autenticação**: JWT + refresh token + login social opcional.
- **Infra**: Docker + deploy em cloud (Vercel para web e API em Railway/Fly/AWS).

> Alternativa para acelerar: usar Supabase (Auth + Postgres + Storage + Realtime).

---

## Modelo de dados inicial (resumo)
- `users`
- `families`
- `family_members`
- `accounts`
- `categories`
- `transactions`
- `budgets`
- `goals`
- `suggestions`
- `notifications`

---

## Roadmap recomendado

### Fase 1 (2–4 semanas)
- Onboarding + autenticação.
- CRUD de receitas/despesas.
- Categorias e dashboard básico.

### Fase 2 (3–5 semanas)
- Modo família + permissões.
- Orçamentos e alertas.
- Importação de extratos.

### Fase 3 (3–6 semanas)
- Sugestões inteligentes baseadas em regras.
- Dashboard avançado com tendências.
- Metas e projeções.

### Fase 4
- IA para classificação automática de gastos.
- Benchmark anônimo por perfil de família.
- Planejamento preditivo (cenários).

---

## KPIs para validar o produto
- % de usuários que registram ao menos 3 gastos por semana.
- Retenção em 30 dias.
- % de famílias com orçamento ativo.
- Redução média de gastos variáveis após 60 dias.
- % de metas concluídas no prazo.

---

## Próximos passos imediatos
1. Definir stack final (Supabase x backend próprio).
2. Detalhar wireframes das 5 telas principais:
   - Login/onboarding
   - Adicionar transação
   - Dashboard geral
   - Orçamento por categoria
   - Sugestões
3. Construir MVP com foco em registro fácil + dashboard claro.
4. Validar com 5–10 famílias e iterar.
