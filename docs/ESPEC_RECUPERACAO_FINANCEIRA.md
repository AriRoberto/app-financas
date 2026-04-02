# Especificação funcional — Módulo de Plano de Recuperação Financeira

## 1) Objetivo e escopo

Criar um módulo que detecta sinais de dificuldade financeira e entrega um **plano de recuperação contextualizado**, com ações por horizonte de tempo (curto, médio e longo prazo), sem abordagem punitiva.

### Objetivos do módulo
- Detectar risco financeiro com base em dados reais (renda, despesas, dívidas, histórico transacional).
- Surfacear recomendações de forma inteligente (entry points passivo e ativo).
- Oferecer plano de ação escalonado e adaptado ao contexto do usuário.
- Permitir acompanhamento contínuo de progresso e recalibragem do plano.

### Fora de escopo (v1)
- Concessão de crédito.
- Renegociação automática com instituições financeiras.
- Consultoria humana síncrona.

---

## 2) Definições e conceitos

### 2.1. Horizonte do plano
- **Curto prazo (0–3 meses):** estabilização de caixa e mitigação de risco imediato.
- **Médio prazo (3–12 meses):** redução estrutural de endividamento e mudança de hábitos.
- **Longo prazo (12+ meses):** reconstrução de patrimônio, reserva e proteção.

### 2.2. Indicadores base
- **Renda líquida mensal (RLM):** média móvel da renda líquida (últimos 3 e 6 meses).
- **Despesa essencial mensal (DEM):** moradia, alimentação, saúde, transporte, contas básicas.
- **Despesa discricionária mensal (DDM):** lazer, assinaturas, compras não essenciais.
- **Comprometimento de renda com dívida (CRD):** (parcelas + mínimos + juros) / RLM.
- **Saldo de caixa projetado (SCP):** RLM – (DEM + DDM + serviço da dívida).
- **Atraso recorrente (AR):** quantidade de ciclos com atraso nos últimos N meses.
- **Volatilidade de renda (VR):** desvio padrão de entradas de renda / média.

### 2.3. Níveis de severidade
- **Nível 0 — Estável**
- **Nível 1 — Atenção**
- **Nível 2 — Risco**
- **Nível 3 — Crítico**

---

## 3) Requisitos funcionais

## RF-01 — Detecção de dificuldade financeira
O sistema deve recalcular severidade em rotina diária e em eventos relevantes (nova transação, atualização de dívida, alteração de orçamento).

### Regras mínimas (v1)
Avaliar janela de 90 dias + comparação com 6 meses anteriores:

1. **Pressão de caixa**
   - SCP < 0 por 2 meses consecutivos → +2 pontos
   - SCP < 0 por 1 mês → +1 ponto
2. **Endividamento**
   - CRD >= 0,45 → +3 pontos
   - 0,30 <= CRD < 0,45 → +2 pontos
   - 0,20 <= CRD < 0,30 → +1 ponto
3. **Atrasos**
   - AR >= 2 em 90 dias → +2 pontos
   - AR = 1 em 90 dias → +1 ponto
4. **Reserva/folga**
   - Reserva < 1 mês de DEM → +1 ponto
   - Reserva = 0 e SCP negativo → +2 pontos
5. **Volatilidade de renda**
   - VR >= 0,35 → +1 ponto

### Mapeamento de score para severidade
- 0–1: Nível 0 (Estável)
- 2–3: Nível 1 (Atenção)
- 4–6: Nível 2 (Risco)
- 7+: Nível 3 (Crítico)

## RF-02 — Entry points passivo e ativo

### Passivo (proativo)
- Exibir alerta contextual apenas quando:
  - severidade >= Nível 2 **ou**
  - mudança brusca (aumento >= 2 níveis em até 30 dias).
- Aplicar controle de fadiga:
  - cooldown de 14 dias para alertas equivalentes.
  - no máximo 1 alerta de recuperação por semana.
  - silenciar após 3 dismiss consecutivos (reativar quando houver piora de nível).

### Ativo (acessível)
- Botão persistente: **“Plano de Recuperação”** em área de planejamento/insights.
- Disponível para todos os usuários, mesmo sem alerta ativo.
- Se severidade Nível 0, exibir plano preventivo leve.

## RF-03 — Geração de plano por prazo
Cada plano deve conter:
- resumo diagnóstico (com linguagem empática),
- lista priorizada de ações,
- impacto estimado (R$/mês ou risco reduzido),
- esforço estimado,
- prazo sugerido.

### Curto prazo (0–3 meses)
Exemplos de ações elegíveis:
- congelar despesas discricionárias top-N por impacto,
- renegociar dívida de maior juros efetivos,
- ajustar vencimentos para reduzir desalinhamento de caixa,
- criar “orçamento de sobrevivência” por 30 dias,
- configurar alertas de vencimento automáticos.

### Médio prazo (3–12 meses)
- estratégia de pagamento (avalanche/snowball conforme perfil),
- revisão de contratos recorrentes (telefonia, streaming, seguros),
- plano de aumento de renda (freelas, horas extras, venda de ativos ociosos),
- meta de construção de reserva mínima (1–3 meses DEM).

### Longo prazo (12+ meses)
- política de poupança automática,
- rebalanceamento de objetivos financeiros,
- reserva de emergência completa (>= 6 meses DEM),
- proteção (seguros essenciais e planejamento de riscos).

## RF-04 — Adaptação contextual obrigatória
As recomendações devem variar por segmento de contexto:
- faixa de dívida total (ex.: <5k, 5k–20k, >20k),
- estabilidade de renda (estável vs volátil),
- dependência de crédito rotativo,
- composição de gasto (essencial vs discricionário),
- eventos de vida detectados (queda de renda, desemprego, aumento de dependentes).

### Regras de adaptação (mínimo)
- Dívida alta + juros altos: priorizar renegociação e avalanche.
- Renda volátil: priorizar colchão de liquidez e orçamento flexível semanal.
- Baixo gasto discricionário: evitar recomendação de “cortar supérfluos” como principal.
- Usuário adimplente com boa folga: sugerir trilha preventiva, não “modo crise”.

## RF-05 — Progressão e rastreamento de ações
- Usuário pode marcar ação como:
  - `nao_iniciada`, `em_andamento`, `concluida`, `dispensada`.
- Cada ação deve registrar:
  - data de sugestão,
  - data de início/conclusão,
  - evidência opcional (ex.: anotação do usuário),
  - impacto estimado vs observado.
- Replanejamento automático a cada 30 dias ou quando severidade variar >= 1 nível.

## RF-06 — Tom e UX de suporte
- Linguagem obrigatória:
  - empática, objetiva e sem julgamento.
- Evitar termos estigmatizantes (“falhou”, “irresponsável”).
- Microcopy orientado a ação: “próximo melhor passo”.

---

## 4) Arquitetura funcional e componentes

## 4.1. Serviços lógicos
1. **Financial Snapshot Service**
   - consolida métricas financeiras por janela temporal.
2. **Hardship Scoring Engine**
   - calcula score e severidade.
3. **Recommendation Engine**
   - seleciona e ranqueia ações por impacto x esforço x urgência.
4. **Plan Orchestrator**
   - monta plano por horizonte, versiona e persiste.
5. **Engagement Service**
   - controla alertas passivos, cooldown e fadiga.
6. **Progress Tracker**
   - registra evolução de ações e outcomes.

## 4.2. Pipeline de decisão
`transações/dívidas/renda -> snapshot -> score -> severidade -> recomendações -> plano versionado -> surface (passivo/ativo) -> tracking -> replanejamento`

---

## 5) Modelo de dados (produção-ready)

## 5.1. Entidades principais

### `financial_snapshots`
- `id` (uuid)
- `user_id` (uuid)
- `period_start` (date)
- `period_end` (date)
- `income_avg_3m` (decimal)
- `income_avg_6m` (decimal)
- `income_volatility` (decimal)
- `essential_expenses_avg_3m` (decimal)
- `discretionary_expenses_avg_3m` (decimal)
- `debt_service_avg_3m` (decimal)
- `debt_total` (decimal)
- `cash_buffer_months` (decimal)
- `late_events_90d` (int)
- `cashflow_projection` (decimal)
- `created_at` (timestamp)

### `hardship_assessments`
- `id` (uuid)
- `user_id` (uuid)
- `snapshot_id` (uuid)
- `score` (int)
- `severity_level` (smallint: 0..3)
- `drivers` (jsonb) // motivos explicáveis do score
- `model_version` (varchar)
- `assessed_at` (timestamp)

### `recovery_plans`
- `id` (uuid)
- `user_id` (uuid)
- `assessment_id` (uuid)
- `status` (enum: `ativo`, `concluido`, `substituido`)
- `current_severity_level` (smallint)
- `summary_message` (text)
- `version` (int)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### `recovery_plan_actions`
- `id` (uuid)
- `plan_id` (uuid)
- `horizon` (enum: `short`, `medium`, `long`)
- `title` (varchar)
- `description` (text)
- `priority` (int)
- `estimated_monthly_impact` (decimal)
- `effort_level` (enum: `baixo`, `medio`, `alto`)
- `status` (enum: `nao_iniciada`, `em_andamento`, `concluida`, `dispensada`)
- `recommended_at` (timestamp)
- `started_at` (timestamp, nullable)
- `completed_at` (timestamp, nullable)
- `observed_monthly_impact` (decimal, nullable)
- `notes` (text, nullable)

### `recovery_engagement_events`
- `id` (uuid)
- `user_id` (uuid)
- `plan_id` (uuid, nullable)
- `event_type` (enum: `alert_shown`, `alert_dismissed`, `cta_clicked`, `action_completed`, `plan_viewed`)
- `metadata` (jsonb)
- `created_at` (timestamp)

## 5.2. Índices recomendados
- `financial_snapshots (user_id, period_end desc)`
- `hardship_assessments (user_id, assessed_at desc)`
- `recovery_plans (user_id, status, updated_at desc)`
- `recovery_plan_actions (plan_id, horizon, priority)`
- `recovery_engagement_events (user_id, created_at desc, event_type)`

## 5.3. Persistência de progresso
- v1 pode usar atualização direta em `recovery_plan_actions.status`.
- versão futura: event sourcing para auditoria completa de transições de estado.

---

## 6) Fluxo UX detalhado

## 6.1. Jornada (passivo)
1. Motor detecta severidade N2+.
2. Engagement valida cooldown/fadiga.
3. App mostra card/alerta: “Identificamos pressão no seu caixa. Quer montar um plano de recuperação?”
4. Usuário abre plano.
5. Tela mostra:
   - diagnóstico curto,
   - 3 ações imediatas (short) no topo,
   - abas curto/médio/longo,
   - progresso geral.
6. Usuário marca ações e revisita semanalmente.

## 6.2. Jornada (ativo)
1. Usuário acessa “Plano de Recuperação” manualmente.
2. Se sem risco: trilha preventiva simplificada.
3. Se com risco: abrir último plano ativo ou gerar novo plano versionado.

## 6.3. Padrões de interação
- Priorização visual em ações de curto prazo.
- Progresso em etapas (checklist + percentual).
- Revisita simples (histórico de versões e comparativo de evolução).
- Sempre oferecer “Próximo passo recomendado” único (single best action).

---

## 7) API/contratos sugeridos (agnóstico de stack)

## 7.1. Endpoints
- `POST /recovery/assessments/recompute`
  - força recomputação (uso interno/admin/job)
- `GET /recovery/plan`
  - retorna plano ativo do usuário
- `POST /recovery/plan/generate`
  - gera novo plano a partir da avaliação mais recente
- `PATCH /recovery/actions/{actionId}`
  - atualiza status, notas, impacto observado
- `GET /recovery/insights`
  - retorna severidade atual, drivers e tendência
- `POST /recovery/engagement-events`
  - ingere eventos de interação

## 7.2. Exemplo de payload (`GET /recovery/plan`)
```json
{
  "severity": 2,
  "severityLabel": "Risco",
  "summary": "Você está com pressão de caixa e alto comprometimento com dívidas. Vamos focar em estabilizar os próximos 30 dias.",
  "drivers": [
    {"code": "NEGATIVE_CASHFLOW", "weight": 2, "value": -850},
    {"code": "HIGH_DEBT_SERVICE", "weight": 3, "value": 0.47}
  ],
  "horizons": {
    "short": [{"id":"...","title":"Renegociar cartão X","priority":1,"status":"nao_iniciada"}],
    "medium": [{"id":"...","title":"Plano avalanche","priority":1,"status":"nao_iniciada"}],
    "long": [{"id":"...","title":"Reserva de 6 meses","priority":2,"status":"nao_iniciada"}]
  },
  "nextBestAction": {"id":"...","title":"Renegociar cartão X"}
}
```

---

## 8) Métricas de sucesso (produto + impacto)

## 8.1. Adoção e engajamento
- `% usuários elegíveis que visualizaram plano`.
- `CTR de alertas passivos`.
- `% usuários com >=1 ação iniciada em 14 dias`.
- `% usuários com >=1 ação concluída em 30 dias`.

## 8.2. Resultado financeiro
- variação de SCP (pré vs pós 30/60/90 dias).
- redução de CRD em 90 dias.
- redução de eventos de atraso em 90 dias.
- aumento de reserva (meses de DEM) em 6 meses.

## 8.3. Qualidade de experiência
- taxa de dismiss por severidade.
- frequência de retorno ao plano.
- CSAT/NPS contextual do módulo.

### Guardrails
- limitar falso positivo de “modo crise” em usuários estáveis.
- monitorar fadiga: taxa de dismiss > limiar dispara ajuste de política de surfacing.

---

## 9) Estratégia de rollout

## Fase 1 (MVP)
- score heurístico v1 + plano determinístico por regras.
- entry point ativo + passivo com cooldown.
- checklist de ações + status básico.

## Fase 2
- personalização avançada (segmentação comportamental).
- experimento A/B de copy e ordenação de ações.
- previsão de risco (modelo supervisionado opcional).

## Fase 3
- integrações externas para renegociação (parcerias),
- automações financeiras (ajuste automático de orçamento com consentimento).

---

## 10) Requisitos não funcionais
- **Explicabilidade:** score e drivers auditáveis por usuário.
- **Privacidade:** aderência à LGPD; minimização de dados; trilha de consentimento.
- **Resiliência:** recomputação idempotente; tolerância a falhas em jobs.
- **Performance:** geração de plano < 500ms no p95 com snapshot pré-calculado.
- **Observabilidade:** logs estruturados por `user_id`, `assessment_id`, `plan_id`.

---

## 11) Prompt técnico produção-ready (para implementação)

Use o prompt abaixo para delegar implementação a outro dev sênior:

> Implemente o módulo **Plano de Recuperação Financeira** no app, com entry points **passivo** (alertas contextuais) e **ativo** (acesso manual persistente), usando os dados já existentes de transações, renda, orçamento e dívidas.
>
> ### Entregáveis obrigatórios
> 1. **Detecção de dificuldade financeira**
>    - Implementar scoring diário/event-driven com janela de 90 dias e baseline 6 meses.
>    - Calcular no mínimo: SCP, CRD, AR, VR, reserva em meses.
>    - Classificar severidade em 4 níveis (0–3) com drivers explicáveis.
> 2. **Geração de plano por horizonte**
>    - Criar plano com ações de curto (0–3m), médio (3–12m) e longo prazo (12m+).
>    - Ranquear ações por impacto x esforço x urgência.
>    - Garantir adaptação contextual por faixa de dívida, estabilidade de renda e composição de gastos.
> 3. **UX e surfacing**
>    - Passivo: alerta apenas para severidade >=2 ou deterioração brusca, com cooldown anti-fadiga.
>    - Ativo: botão/seção “Plano de Recuperação” sempre disponível.
>    - Linguagem empática, não punitiva, com foco em “próximo melhor passo”.
> 4. **Persistência e tracking**
>    - Persistir snapshots, assessments, planos versionados e ações.
>    - Permitir update de status de ações (`nao_iniciada`, `em_andamento`, `concluida`, `dispensada`).
>    - Registrar eventos de engajamento e impactos estimados/observados.
> 5. **Métricas e observabilidade**
>    - Expor métricas de adoção, conclusão de ações e melhora financeira.
>    - Instrumentar logs e eventos para análise de eficácia e fadiga de alerta.
>
> ### Critérios de aceitação
> - Usuário em risco recebe plano contextualizado com ações priorizadas em até 1 interação.
> - Usuário sem alerta ainda acessa plano preventivo via entry point ativo.
> - Mudança de severidade replaneja plano e versiona histórico sem perda de dados.
> - API retorna drivers claros do score para auditoria e transparência.
> - Testes cobrem: cálculo de score, política de surfacing, adaptação de recomendações e tracking de progresso.
>
> ### Restrições de implementação
> - Não usar aconselhamento genérico idêntico para todos os perfis.
> - Não usar linguagem culpabilizante.
> - Garantir idempotência em recomputações e geração de plano.

---

## 12) Checklist de implementação (DoD)
- [ ] Score e severidade calculados e persistidos.
- [ ] Plano gerado por 3 horizontes com priorização.
- [ ] Entry point ativo implementado.
- [ ] Entry point passivo com política de fadiga implementada.
- [ ] Status/progresso de ações persistente.
- [ ] Métricas de produto e impacto disponíveis.
- [ ] Testes automatizados cobrindo regras críticas.
- [ ] Documentação técnica e de produto atualizada.
