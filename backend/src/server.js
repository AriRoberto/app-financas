import cors from 'cors';
import express from 'express';
import { AispClient } from './openfinance/aisp-client.js';
import { getEnvConfig, ALLOWED_INSTITUTIONS, DEFAULT_SCOPES, APP_SUPPORTED_INSTITUTIONS } from './openfinance/config.js';
import { decryptToken, encryptToken, randomState } from './openfinance/security.js';
import {
  __resetOpenFinanceStore,
  addAudit,
  consumeState,
  createConnection,
  createConsent,
  deleteTokensByConsent,
  getConsentByConnection,
  listAccounts,
  listConnections,
  listTransactionsByAccount,
  purgeExpiredTokens,
  purgeOldAuditLogs,
  revokeConsent,
  saveState,
  updateConnection,
  upsertToken
} from './openfinance/store.js';
import { registerMockAispRoutes } from './openfinance/mock-aisp.js';
import { startPeriodicSync, syncByConnectionId } from './openfinance/sync-service.js';
import { getInstitutionByKey } from './openfinance/institutions.js';
import { previewImportRows } from './imports/service.js';
import { buildFinancialDashboard, filterFinancialTransactions, listAvailableAccounts, listAvailableBanks } from './services/aggregation-service.js';
import { createJsonFinanceRepository } from './persistence/local-store.js';

const app = express();
const PORT = process.env.PORT || 3333;
const ofConfig = getEnvConfig();
const aispClient = new AispClient(ofConfig);
const financeRepository = createJsonFinanceRepository();
const rateLimitSync = new Map();

function getRequestScopedAispClient(req) {
  if (!ofConfig.openFinanceMock) return aispClient;
  const host = req.headers.host || `localhost:${PORT}`;
  const origin = `http://${host}`;
  return new AispClient({
    ...ofConfig,
    aispBaseUrl: `${origin}/mock-aisp`,
    aispRedirectUri: `${origin}/api/banks/callback`
  });
}

app.use(cors());
app.use(express.json());

app.disable('etag');

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
  }
  next();
});

if (ofConfig.openFinanceMock) {
  registerMockAispRoutes(app);
}

const members = [
  { id: 'husband', name: 'marido', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'wife', name: 'esposa', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'family', name: 'familia', createdAt: '2026-01-01T00:00:00.000Z' }
];

const expenseCategories = [
  'Moradia',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Assinaturas',
  'Reserva para investir',
  'Outros'
];

const incomeCategories = ['Salário', 'Renda extra', 'Freelance', 'Bônus'];
const investmentCategories = ['Reserva de emergência', 'Renda fixa', 'Fundos', 'Ações', 'Previdência', 'Cripto', 'Outros investimentos'];

const descriptionTemplatesByCategory = {
  Moradia: ['Aluguel', 'Condomínio', 'Conta de luz', 'Conta de água'],
  Alimentação: ['Supermercado', 'Feira', 'Padaria', 'Delivery'],
  Transporte: ['Combustível', 'Uber/99', 'Ônibus/Metrô', 'Manutenção do carro'],
  Saúde: ['Plano de saúde', 'Farmácia', 'Consulta médica'],
  Educação: ['Escola', 'Curso', 'Material escolar'],
  Lazer: ['Passeio família', 'Cinema', 'Restaurante'],
  Assinaturas: ['Streaming', 'Aplicativo', 'Internet'],
  'Reserva para investir': ['Aporte separado para investimento'],
  'Reserva de emergência': ['Aporte na reserva', 'Transferência para reserva'],
  'Renda fixa': ['Tesouro Selic', 'CDB', 'LCI/LCA'],
  Fundos: ['Fundo multimercado', 'Fundo imobiliário'],
  Ações: ['Compra de ações', 'ETF'],
  Previdência: ['Aporte previdência privada'],
  Cripto: ['Compra de Bitcoin', 'Compra de Ethereum'],
  'Outros investimentos': ['Aporte em investimento alternativo']
};

const sampleTransactions = [
  { id: 't1', memberId: 'husband', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 9200, month: '2026-01', date: '2026-01-05' },
  { id: 't2', memberId: 'wife', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 5400, month: '2026-01', date: '2026-01-05' },
  { id: 't3', memberId: 'family', type: 'expense', category: 'Moradia', description: 'Aluguel', amount: 3100, month: '2026-01', date: '2026-01-06', dueDate: '2026-01-06' },
  { id: 't4', memberId: 'wife', type: 'expense', category: 'Alimentação', description: 'Supermercado', amount: 1500, month: '2026-01', date: '2026-01-08', dueDate: '2026-01-08' },
  { id: 't5', memberId: 'husband', type: 'expense', category: 'Reserva para investir', description: 'Reserva mensal', amount: 800, month: '2026-01', date: '2026-01-15', dueDate: '2027-06-01', isInvestmentReserve: true },
  { id: 't6', memberId: 'husband', type: 'investment', category: 'Renda fixa', description: 'CDB mensal', amount: 650, month: '2026-01', date: '2026-01-20' },
  { id: 't7', memberId: 'wife', type: 'investment', category: 'Previdência', description: 'Aporte previdência', amount: 420, month: '2026-01', date: '2026-01-22' },

  { id: 't8', memberId: 'husband', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 9200, month: '2026-02', date: '2026-02-05' },
  { id: 't9', memberId: 'wife', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 5400, month: '2026-02', date: '2026-02-05' },
  { id: 't10', memberId: 'family', type: 'income', category: 'Renda extra', description: 'Venda ocasional', amount: 900, month: '2026-02', date: '2026-02-03' },
  { id: 't11', memberId: 'husband', type: 'expense', category: 'Transporte', description: 'Combustível', amount: 620, month: '2026-02', date: '2026-02-09', dueDate: '2026-02-09' },
  { id: 't12', memberId: 'wife', type: 'expense', category: 'Saúde', description: 'Farmácia', amount: 320, month: '2026-02', date: '2026-02-10', dueDate: '2028-05-10' },
  { id: 't13', memberId: 'husband', type: 'expense', category: 'Alimentação', description: 'Feira semanal', amount: 460, month: '2026-02', date: '2026-02-11', dueDate: '2026-02-11' },
  { id: 't14', memberId: 'wife', type: 'expense', category: 'Lazer', description: 'Cinema', amount: 220, month: '2026-02', date: '2026-02-14', dueDate: '2026-02-14' },
  { id: 't15', memberId: 'husband', type: 'investment', category: 'Ações', description: 'Compra ETF', amount: 500, month: '2026-02', date: '2026-02-18' },
  { id: 't16', memberId: 'wife', type: 'investment', category: 'Renda fixa', description: 'Tesouro Selic', amount: 380, month: '2026-02', date: '2026-02-21' },

  { id: 't17', memberId: 'husband', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 9200, month: '2026-03', date: '2026-03-05' },
  { id: 't18', memberId: 'wife', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 5400, month: '2026-03', date: '2026-03-05' },
  { id: 't19', memberId: 'family', type: 'expense', category: 'Educação', description: 'Curso da família', amount: 900, month: '2026-03', date: '2026-03-11', dueDate: '2026-11-30' },
  { id: 't20', memberId: 'husband', type: 'expense', category: 'Assinaturas', description: 'Streaming', amount: 89, month: '2026-03', date: '2026-03-12', dueDate: '2026-03-12' },
  { id: 't21', memberId: 'wife', type: 'expense', category: 'Alimentação', description: 'Supermercado', amount: 1320, month: '2026-03', date: '2026-03-13', dueDate: '2026-03-13' },
  { id: 't22', memberId: 'husband', type: 'investment', category: 'Fundos', description: 'FII mensal', amount: 300, month: '2026-03', date: '2026-03-20' },
  { id: 't23', memberId: 'wife', type: 'investment', category: 'Cripto', description: 'Compra BTC', amount: 250, month: '2026-03', date: '2026-03-23' }
];

function normalizeMemberId(value) {
  if (!value) return 'family';
  if (value === 'you') return 'husband';
  if (value === 'marido') return 'husband';
  if (value === 'wife' || value === 'esposa') return 'wife';
  if (value === 'familia' || value === 'family') return 'family';
  if (value === 'all') return 'all';
  return value;
}


function normalizeBankKey(value) {
  const safe = String(value || 'MANUAL').trim().toUpperCase();
  if (!safe) return 'MANUAL';
  return safe;
}

function enrichTransaction(item) {
  const memberId = normalizeMemberId(item.memberId);
  const bankKey = normalizeBankKey(item.bankKey || item.bank || 'MANUAL');
  const bankName = item.bankName || ({ BB: 'Banco do Brasil', ITAU: 'Itaú', MANUAL: 'Lançamento manual' }[bankKey] || bankKey);
  const accountId = String(item.accountId || `${bankKey.toLowerCase()}-${memberId}-principal`).replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  const accountLabel = item.accountLabel || `Conta ${bankName}`;
  const date = item.date || `${item.month || new Date().toISOString().slice(0, 7)}-01`;
  const month = isValidMonth(item.month) ? item.month : getMonthFromDate(date);
  return {
    ...item,
    memberId,
    bankKey,
    bankName,
    accountId,
    accountLabel,
    sourceFileName: item.sourceFileName || item.fileName || '',
    importOrigin: item.importOrigin || item.importSource || 'manual-entry',
    referencePeriod: item.referencePeriod || month,
    month,
    term: item.type === 'expense' ? classifyTerm(item.dueDate || date) : null,
    isInvestmentReserve: item.type === 'expense' ? Boolean(item.isInvestmentReserve || item.category === 'Reserva para investir') : false
  };
}

function cloneSampleTransactions() {
  return sampleTransactions.map((item, index) => enrichTransaction({
    ...item,
    bankKey: index % 2 === 0 ? 'BB' : 'ITAU',
    bankName: index % 2 === 0 ? 'Banco do Brasil' : 'Itaú',
    accountId: index % 2 === 0 ? 'bb-conta-familia' : 'itau-conta-familia',
    accountLabel: index % 2 === 0 ? 'Conta BB Família' : 'Conta Itaú Família',
    sourceFileName: 'seed-data',
    importOrigin: 'seed',
    referencePeriod: item.month
  }));
}

const defaultFinanceState = {
  transactions: cloneSampleTransactions(),
  importHistory: []
};

const persistedFinanceState = financeRepository.loadSnapshot(defaultFinanceState);

let transactions = persistedFinanceState.transactions.map((item) => enrichTransaction(item));
let investments = [];
let importHistory = persistedFinanceState.importHistory || [];

function endOfCurrentYear() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59));
}

function addMonths(dateInput, months) {
  const date = new Date(dateInput);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 23, 59, 59));
}

export function classifyTerm(dueDate) {
  if (!dueDate) return 'short';
  const target = new Date(`${dueDate}T00:00:00Z`);
  if (target <= endOfCurrentYear()) return 'short';
  if (target <= addMonths(new Date(), 24)) return 'medium';
  return 'long';
}

function seedInvestmentsFromTransactions() {
  const mirrored = transactions
    .filter((item) => item.type === 'investment' || (item.type === 'expense' && item.isInvestmentReserve))
    .map((item) => ({
      id: `inv-${item.id}`,
      memberId: item.memberId,
      date: item.date,
      amount: item.amount,
      type: item.type === 'investment' ? 'direct' : 'reserve',
      sourceTransactionId: item.id,
      createdAt: new Date().toISOString()
    }));
  investments = mirrored;
}

seedInvestmentsFromTransactions();

function isValidMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function getMonthFromDate(date) {
  return date.slice(0, 7);
}

function getAvailableMonths(filteredTransactions = transactions) {
  return [...new Set(filteredTransactions.map((item) => item.month))].sort();
}

function isMemberMatch(transaction, member) {
  const safe = normalizeMemberId(member || 'all');
  if (safe === 'all') return true;
  return normalizeMemberId(transaction.memberId) === safe;
}

function inPeriod(transaction, from, to) {
  if (!from && !to) return true;
  const txDate = new Date(`${transaction.date}T00:00:00Z`);
  const fromDate = from ? new Date(`${from}T00:00:00Z`) : null;
  const toDate = to ? new Date(`${to}T00:00:00Z`) : null;
  if (fromDate && txDate < fromDate) return false;
  if (toDate && txDate > toDate) return false;
  return true;
}

function filterTransactions(filters = {}) {
  return filterFinancialTransactions(transactions, {
    month: filters.month,
    member: normalizeMemberId(filters.member || 'all'),
    bank: filters.bank || 'all',
    accountId: filters.accountId || 'all',
    type: filters.type || 'all',
    category: filters.category || 'all',
    term: filters.term || 'all',
    from: filters.from,
    to: filters.to,
    search: filters.search || ''
  });
}

function calculateSummary(filteredTransactions) {
  const income = filteredTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expenses = filteredTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  const investmentsFromReserves = filteredTransactions.filter((item) => item.type === 'expense' && item.isInvestmentReserve).reduce((sum, item) => sum + item.amount, 0);
  const directInvestments = filteredTransactions.filter((item) => item.type === 'investment').reduce((sum, item) => sum + item.amount, 0);
  const investmentsTotal = directInvestments + investmentsFromReserves;
  const outflow = expenses + directInvestments;
  return { income, expenses, investmentsTotal, outflow, balance: income - outflow };
}

function buildDashboard({ month, member = 'all', bank = 'all', accountId = 'all', from, to, term = 'all', type = 'all', category = 'all', search = '' }) {
  return buildFinancialDashboard({
    transactions,
    members,
    filters: {
      month,
      member: normalizeMemberId(member),
      bank,
      accountId,
      from,
      to,
      term,
      type,
      category,
      search
    }
  });
}

function buildSuggestions(dashboard) {
  const topCategory = dashboard.categories[0];
  return {
    suggestions: [
      topCategory ? `Maior categoria de saída: ${topCategory.label}.` : 'Cadastre despesas para gerar sugestões.',
      `Saldo atual filtrado: ${dashboard.balance.toFixed(2)}.`
    ]
  };
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stddev(values) {
  if (values.length < 2) return 0;
  const avg = average(values);
  const variance = average(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

function mapSeverity(score) {
  if (score >= 7) return 3;
  if (score >= 4) return 2;
  if (score >= 2) return 1;
  return 0;
}

function severityLabel(severity) {
  return ['Estável', 'Atenção', 'Risco', 'Crítico'][severity] || 'Estável';
}

function buildRecoveryPlan({ month, member = 'all', from, to }) {
  const filtered = filterTransactions({ month, member, from, to });
  const monthlyHistory = getAvailableMonths(filtered).map((monthItem) => {
    const rows = filtered.filter((item) => item.month === monthItem);
    const income = rows.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expenses = rows.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    return { month: monthItem, income, expenses, rows };
  });

  const recent = monthlyHistory.slice(-3);
  const incomeAvg = average(recent.map((item) => item.income));
  const incomeVolatility = incomeAvg > 0 ? stddev(recent.map((item) => item.income)) / incomeAvg : 0;

  const essentialCategories = new Set(['Moradia', 'Alimentação', 'Saúde', 'Transporte', 'Educação']);
  const essentialExpenses = recent
    .flatMap((item) => item.rows)
    .filter((item) => item.type === 'expense' && essentialCategories.has(item.category))
    .reduce((sum, item) => sum + item.amount, 0) / Math.max(recent.length, 1);

  const discretionaryExpenses = recent
    .flatMap((item) => item.rows)
    .filter((item) => item.type === 'expense' && !essentialCategories.has(item.category))
    .reduce((sum, item) => sum + item.amount, 0) / Math.max(recent.length, 1);

  const debtService = recent
    .flatMap((item) => item.rows)
    .filter((item) => item.type === 'expense' && (item.term === 'medium' || item.term === 'long'))
    .reduce((sum, item) => sum + item.amount, 0) / Math.max(recent.length, 1);

  const investmentReserve = investments
    .filter((item) => isMemberMatch(item, member))
    .reduce((sum, item) => sum + item.amount, 0);

  const crd = incomeAvg > 0 ? debtService / incomeAvg : 0;
  const scp = incomeAvg - (essentialExpenses + discretionaryExpenses + debtService);
  const cashBufferMonths = essentialExpenses > 0 ? investmentReserve / essentialExpenses : 0;

  const drivers = [];
  let score = 0;
  if (scp < 0) {
    score += 2;
    drivers.push({ code: 'PRESSAO_CAIXA', weight: 2, value: Number(scp.toFixed(2)) });
  }
  if (crd >= 0.45) {
    score += 3;
    drivers.push({ code: 'DIVIDA_ALTA', weight: 3, value: Number(crd.toFixed(2)) });
  } else if (crd >= 0.3) {
    score += 2;
    drivers.push({ code: 'DIVIDA_MODERADA', weight: 2, value: Number(crd.toFixed(2)) });
  }
  if (cashBufferMonths < 1) {
    score += 1;
    drivers.push({ code: 'RESERVA_BAIXA', weight: 1, value: Number(cashBufferMonths.toFixed(2)) });
  }
  if (incomeVolatility >= 0.35) {
    score += 1;
    drivers.push({ code: 'RENDA_VOLATIL', weight: 1, value: Number(incomeVolatility.toFixed(2)) });
  }

  const severity = mapSeverity(score);
  const debtBand = debtService >= 5000 ? 'alta' : debtService >= 1000 ? 'media' : 'baixa';
  const highVolatility = incomeVolatility >= 0.35;

  const shortActions = [
    {
      id: 'short-1',
      horizon: 'short',
      title: 'Mapear e congelar gastos não essenciais por 30 dias',
      description: 'Concentre o corte em lazer e assinaturas para gerar alívio imediato de caixa.',
      priority: 1,
      status: 'nao_iniciada',
      estimatedMonthlyImpact: Number((discretionaryExpenses * 0.25).toFixed(2))
    },
    {
      id: 'short-2',
      horizon: 'short',
      title: debtBand === 'alta' ? 'Renegociar dívida com maior juros nesta semana' : 'Revisar parcelamentos ativos e datas de vencimento',
      description: 'Priorize reduzir juros e alinhar vencimentos próximos da data de recebimento.',
      priority: 2,
      status: 'nao_iniciada',
      estimatedMonthlyImpact: Number((debtService * 0.15).toFixed(2))
    }
  ];

  const mediumActions = [
    {
      id: 'medium-1',
      horizon: 'medium',
      title: 'Adotar plano de quitação (avalanche)',
      description: 'Direcione sobra mensal para dívidas com maior custo efetivo até reduzir o comprometimento da renda.',
      priority: 1,
      status: 'nao_iniciada',
      estimatedMonthlyImpact: Number((debtService * 0.2).toFixed(2))
    },
    {
      id: 'medium-2',
      horizon: 'medium',
      title: highVolatility ? 'Criar orçamento semanal flexível para renda variável' : 'Definir teto fixo por categoria e revisão quinzenal',
      description: highVolatility
        ? 'Divida o orçamento em envelopes semanais para reduzir risco de falta de caixa no fim do mês.'
        : 'Ajuste hábitos com metas simples de gasto por categoria.',
      priority: 2,
      status: 'nao_iniciada',
      estimatedMonthlyImpact: Number((discretionaryExpenses * 0.15).toFixed(2))
    }
  ];

  const longActions = [
    {
      id: 'long-1',
      horizon: 'long',
      title: 'Construir reserva de emergência até 6 meses de despesas essenciais',
      description: 'Após estabilização, automatize aportes para formar proteção financeira consistente.',
      priority: 1,
      status: 'nao_iniciada',
      estimatedMonthlyImpact: Number((essentialExpenses * 0.1).toFixed(2))
    },
    {
      id: 'long-2',
      horizon: 'long',
      title: 'Revisar metas patrimoniais e proteção financeira anual',
      description: 'Consolide disciplina financeira com metas anuais e revisão de riscos.',
      priority: 2,
      status: 'nao_iniciada',
      estimatedMonthlyImpact: 0
    }
  ];

  const summary = severity >= 2
    ? 'Percebemos sinais de pressão financeira. Vamos priorizar ações práticas para recuperar o equilíbrio com segurança.'
    : 'Seu cenário está sob controle, mas há oportunidades de fortalecer sua segurança financeira.';

  return {
    generatedAt: new Date().toISOString(),
    severity,
    severityLabel: severityLabel(severity),
    score,
    summary,
    metrics: {
      rendaMedia: Number(incomeAvg.toFixed(2)),
      despesasEssenciais: Number(essentialExpenses.toFixed(2)),
      despesasDiscricionarias: Number(discretionaryExpenses.toFixed(2)),
      comprometimentoRendaDivida: Number(crd.toFixed(2)),
      saldoCaixaProjetado: Number(scp.toFixed(2)),
      reservaMeses: Number(cashBufferMonths.toFixed(2)),
      volatilidadeRenda: Number(incomeVolatility.toFixed(2))
    },
    drivers,
    entryPoints: {
      passive: {
        shouldSurface: severity >= 2,
        message: severity >= 2 ? 'Detectamos um momento de aperto. Abra seu plano de recuperação e foque nas ações de curto prazo.' : ''
      },
      active: {
        title: 'Plano de Recuperação',
        available: true
      }
    },
    horizons: {
      short: shortActions,
      medium: mediumActions,
      long: longActions
    },
    nextBestAction: shortActions[0]
  };
}

function getCategoryTemplates(type, category) {
  if (category && descriptionTemplatesByCategory[category]) return descriptionTemplatesByCategory[category];
  if (type === 'expense') return expenseCategories.flatMap((item) => descriptionTemplatesByCategory[item] || []);
  if (type === 'investment') return investmentCategories.flatMap((item) => descriptionTemplatesByCategory[item] || []);
  if (type === 'income') return ['Salário mensal', 'Renda extra', 'Freelance', 'Bônus'];
  return ['Aporte em investimento'];
}

function validateMember(memberId) {
  return members.some((item) => item.id === normalizeMemberId(memberId));
}

function upsertInvestmentFromReserve(transaction) {
  const shouldMirror = transaction.type === 'investment' || (transaction.type === 'expense' && transaction.isInvestmentReserve);

  if (!shouldMirror) {
    investments = investments.filter((item) => item.sourceTransactionId !== transaction.id);
    return;
  }

  const existing = investments.find((item) => item.sourceTransactionId === transaction.id);
  const next = {
    id: existing?.id || `inv-${transaction.id}`,
    memberId: transaction.memberId,
    bankKey: transaction.bankKey,
    bankName: transaction.bankName,
    accountId: transaction.accountId,
    accountLabel: transaction.accountLabel,
    date: transaction.date,
    amount: transaction.amount,
    sourceTransactionId: transaction.id,
    type: transaction.type === 'investment' ? 'direct' : 'reserve',
    createdAt: existing?.createdAt || new Date().toISOString()
  };

  if (existing) {
    investments = investments.map((item) => (item.sourceTransactionId === transaction.id ? next : item));
  } else {
    investments = [next, ...investments];
  }
}

function hasImportedFingerprint(fingerprint) {
  return transactions.some((item) => item.importFingerprint === fingerprint);
}

function buildImportedTransaction(previewItem) {
  return enrichTransaction({
    id: `imp-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    memberId: previewItem.memberId,
    type: previewItem.type,
    category: previewItem.category,
    description: previewItem.description,
    amount: previewItem.amount,
    month: previewItem.month,
    date: previewItem.date,
    dueDate: previewItem.dueDate,
    bankKey: previewItem.bankKey,
    bankName: previewItem.bankName,
    accountId: previewItem.accountId,
    accountLabel: previewItem.accountLabel,
    sourceFileName: previewItem.sourceFileName,
    referencePeriod: previewItem.referencePeriod,
    importFingerprint: previewItem.fingerprint,
    importOrigin: previewItem.origin || 'manual-file'
  });
}

function persistFinanceSnapshot(reason, extra = {}) {
  financeRepository.saveSnapshot({ transactions, importHistory });
  console.info('[finance-store] snapshot saved', { reason, ...extra, transactions: transactions.length, importHistory: importHistory.length });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'backend', timestamp: new Date().toISOString() });
});

app.get('/api/members', (_req, res) => {
  res.json({ members });
});

app.get('/api/family-members', (_req, res) => {
  res.json({ members });
});

app.get('/api/categories', (_req, res) => {
  res.json({ categories: expenseCategories, expenseCategories, incomeCategories, investmentCategories });
});

app.get('/api/description-templates', (req, res) => {
  res.json({ templates: getCategoryTemplates(req.query.type, req.query.category) });
});

app.get('/api/persistence/info', (_req, res) => {
  res.json({ repository: financeRepository.describe() });
});

app.get('/api/banks', (_req, res) => {
  res.json({ banks: listAvailableBanks(transactions) });
});

app.get('/api/months', (req, res) => {
  const filtered = filterTransactions({ member: req.query.member || 'all', bank: req.query.bank || 'all', accountId: req.query.accountId || 'all' });
  res.json({ months: getAvailableMonths(filtered) });
});

app.get('/api/accounts', (_req, res) => {
  res.json({ accounts: listAvailableAccounts(transactions) });
});

app.get('/api/transactions', (req, res) => {
  const filtered = filterTransactions({
    month: req.query.month,
    member: req.query.member || 'all',
    bank: req.query.bank || 'all',
    accountId: req.query.accountId || 'all',
    type: req.query.type || 'all',
    category: req.query.category || 'all',
    from: req.query.from,
    to: req.query.to,
    term: req.query.term || 'all',
    search: req.query.search || ''
  });
  const ordered = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ transactions: ordered });
});

app.delete('/api/transactions', (_req, res) => {
  transactions = [];
  investments = [];
  importHistory = [];
  persistFinanceSnapshot('transactions_cleared');
  res.json({ message: 'Todos os lançamentos removidos.', transactionsCount: 0 });
});

app.post('/api/transactions/seed', (_req, res) => {
  const resetState = financeRepository.resetSnapshot(defaultFinanceState);
  transactions = resetState.transactions.map((item) => enrichTransaction(item));
  importHistory = resetState.importHistory;
  seedInvestmentsFromTransactions();
  console.info('[imports] sample data restored', { transactions: transactions.length });
  res.json({ message: 'Dados de exemplo restaurados.', transactionsCount: transactions.length });
});

app.get('/api/imports/history', (_req, res) => {
  res.json({ imports: importHistory.slice().reverse() });
});

app.post('/api/imports/preview', (req, res) => {
  try {
    const { fileName, content, importType = 'transaction', memberId, month, bankKey, accountId, accountLabel, referencePeriod } = req.body;
    const normalizedMemberId = normalizeMemberId(memberId);

    if (!validateMember(normalizedMemberId)) {
      return res.status(400).json({ message: 'Membro inválido para importação.' });
    }

    if (!content) {
      return res.status(400).json({ message: 'Informe o conteúdo do arquivo.' });
    }

    const safeFileName = fileName || 'clipboard-import.csv';

    console.info('[imports] preview requested', { fileName: safeFileName, importType, memberId: normalizedMemberId });

    const preview = previewImportRows({
      fileName: safeFileName,
      content,
      importType,
      memberId: normalizedMemberId,
      fallbackMonth: isValidMonth(month || '') ? month : new Date().toISOString().slice(0, 7),
      bankKeyHint: bankKey,
      accountIdHint: accountId,
      accountLabelHint: accountLabel,
      referencePeriod
    });

    return res.json({
      fileName: safeFileName,
      format: preview.format,
      importType,
      memberId: normalizedMemberId,
      bank: preview.importer,
      rows: preview.rows,
      summary: {
        totalRows: preview.rows.length,
        duplicates: preview.rows.filter((item) => hasImportedFingerprint(item.fingerprint)).length
      }
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Falha ao pré-visualizar arquivo.' });
  }
});

app.post('/api/imports/commit', (req, res) => {
  try {
    const { fileName, content, importType = 'transaction', memberId, month, bankKey, accountId, accountLabel, referencePeriod } = req.body;
    const normalizedMemberId = normalizeMemberId(memberId);

    if (!validateMember(normalizedMemberId)) {
      return res.status(400).json({ message: 'Membro inválido para importação.' });
    }

    if (!content) {
      return res.status(400).json({ message: 'Informe o conteúdo do arquivo.' });
    }

    const safeFileName = fileName || 'clipboard-import.csv';

    console.info('[imports] commit requested', { fileName: safeFileName, importType, memberId: normalizedMemberId });

    const preview = previewImportRows({
      fileName: safeFileName,
      content,
      importType,
      memberId: normalizedMemberId,
      fallbackMonth: isValidMonth(month || '') ? month : new Date().toISOString().slice(0, 7),
      bankKeyHint: bankKey,
      accountIdHint: accountId,
      accountLabelHint: accountLabel,
      referencePeriod
    });

    let imported = 0;
    let duplicates = 0;
    const importedMonths = new Set();

    for (const row of preview.rows) {
      if (hasImportedFingerprint(row.fingerprint)) {
        duplicates += 1;
        continue;
      }

      const transaction = buildImportedTransaction(row);
      transactions = [transaction, ...transactions];
      upsertInvestmentFromReserve(transaction);
      importedMonths.add(transaction.month);
      imported += 1;
    }

    importHistory = [
      {
        id: `import-${Date.now()}`,
        fileName: safeFileName,
        format: preview.format,
        importType,
        memberId: normalizedMemberId,
        bankKey: preview.importer.key,
        bankName: preview.importer.label,
        importedRows: imported,
        duplicateRows: duplicates,
        importedMonths: [...importedMonths].sort(),
        createdAt: new Date().toISOString(),
        source: 'manual-file'
      },
      ...importHistory
    ];

    persistFinanceSnapshot('import_commit', { fileName: safeFileName, importedRows: imported, duplicateRows: duplicates });
    console.info('[imports] commit finished', { fileName: safeFileName, importedRows: imported, duplicateRows: duplicates, importedMonths: [...importedMonths] });

    return res.json({
      message: imported ? `Importação concluída com sucesso. ${imported} registro(s) salvo(s).` : 'Nenhum novo registro foi importado.',
      importedRows: imported,
      duplicateRows: duplicates,
      totalRows: preview.rows.length,
      importedMonths: [...importedMonths].sort(),
      imports: importHistory.slice(0, 5)
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Falha ao importar arquivo.' });
  }
});

app.post('/api/transactions', (req, res) => {
  const {
    memberId,
    type,
    category,
    description,
    amount,
    month,
    date,
    dueDate,
    isInvestmentReserve,
    bankKey,
    accountId,
    accountLabel,
    referencePeriod
  } = req.body;

  const normalizedMemberId = normalizeMemberId(memberId);

  if (!normalizedMemberId || !type || !category || !description || !amount || !month) {
    return res.status(400).json({ message: 'Preencha membro, tipo, categoria, descrição, valor e mês.' });
  }

  if (!validateMember(normalizedMemberId)) {
    return res.status(400).json({ message: 'Membro inválido.' });
  }

  if (!['income', 'expense', 'investment'].includes(type)) {
    return res.status(400).json({ message: 'Tipo inválido. Use income, expense ou investment.' });
  }

  if (type === 'expense' && !expenseCategories.includes(category)) {
    return res.status(400).json({ message: 'Categoria de despesa inválida.' });
  }

  if (type === 'investment' && !investmentCategories.includes(category)) {
    return res.status(400).json({ message: 'Categoria de investimento inválida.' });
  }

  if (type === 'income' && !incomeCategories.includes(category)) {
    return res.status(400).json({ message: 'Categoria de receita inválida.' });
  }

  const parsedAmount = Number(amount);
  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ message: 'Valor inválido.' });
  }

  const safeDate = date || `${month}-01`;
  const safeDueDate = dueDate || safeDate;

  const transaction = enrichTransaction({
    id: `t${Date.now()}`,
    memberId: normalizedMemberId,
    type,
    category,
    description,
    amount: parsedAmount,
    month: isValidMonth(month) ? month : getMonthFromDate(safeDate),
    date: safeDate,
    dueDate: safeDueDate,
    isInvestmentReserve: type === 'expense' ? Boolean(isInvestmentReserve || category === 'Reserva para investir') : false,
    bankKey,
    accountId,
    accountLabel,
    referencePeriod,
    importOrigin: 'manual-entry'
  });

  transactions = [transaction, ...transactions];
  upsertInvestmentFromReserve(transaction);
  persistFinanceSnapshot('transaction_created', { transactionId: transaction.id });
  res.status(201).json({ transaction });
});

app.patch('/api/transactions/:id', (req, res) => {
  const target = transactions.find((item) => item.id === req.params.id);
  if (!target) return res.status(404).json({ message: 'Lançamento não encontrado.' });

  const next = enrichTransaction({
    ...target,
    ...req.body,
    memberId: normalizeMemberId(req.body.memberId || target.memberId)
  });

  transactions = transactions.map((item) => (item.id === target.id ? next : item));
  upsertInvestmentFromReserve(next);
  persistFinanceSnapshot('transaction_updated', { transactionId: next.id });
  return res.json({ transaction: next });
});

app.delete('/api/transactions/:id', (req, res) => {
  const exists = transactions.some((item) => item.id === req.params.id);
  if (!exists) return res.status(404).json({ message: 'Lançamento não encontrado.' });
  transactions = transactions.filter((item) => item.id !== req.params.id);
  investments = investments.filter((item) => item.sourceTransactionId !== req.params.id);
  persistFinanceSnapshot('transaction_deleted', { transactionId: req.params.id });
  return res.status(204).send();
});

app.get('/api/dashboard', (req, res) => {
  res.json(buildDashboard({
    month: req.query.month,
    member: req.query.member || 'all',
    bank: req.query.bank || 'all',
    accountId: req.query.accountId || 'all',
    type: req.query.type || 'all',
    category: req.query.category || 'all',
    search: req.query.search || '',
    from: req.query.from,
    to: req.query.to,
    term: req.query.term || 'all'
  }));
});

app.get('/api/suggestions', (req, res) => {
  const dashboard = buildDashboard({
    month: req.query.month,
    member: req.query.member || 'all',
    bank: req.query.bank || 'all',
    accountId: req.query.accountId || 'all',
    type: req.query.type || 'all',
    category: req.query.category || 'all',
    search: req.query.search || '',
    from: req.query.from,
    to: req.query.to,
    term: req.query.term || 'all'
  });
  res.json(buildSuggestions(dashboard));
});

app.get('/api/recovery/plan', (req, res) => {
  const month = isValidMonth(req.query.month || '') ? req.query.month : undefined;
  const member = req.query.member || 'all';
  const from = req.query.from || '';
  const to = req.query.to || '';
  const plan = buildRecoveryPlan({ month, member, from, to });
  res.json(plan);
});

app.get('/api/investments', (req, res) => {
  const member = req.query.member || 'all';
  const from = req.query.from;
  const to = req.query.to;
  const bank = req.query.bank || 'all';
  const accountId = req.query.accountId || 'all';
  const filtered = investments.filter((item) => {
    if (!isMemberMatch(item, member)) return false;
    if (bank !== 'all' && item.bankKey !== bank) return false;
    if (accountId !== 'all' && item.accountId !== accountId) return false;
    return inPeriod({ date: item.date }, from, to);
  });

  res.json({
    total: filtered.reduce((sum, item) => sum + item.amount, 0),
    investments: filtered
  });
});

app.get('/reports/expenses-by-category', (req, res) => {
  const member = req.query.member || 'all';
  const from = req.query.from;
  const to = req.query.to;

  const filtered = filterTransactions({ member, from, to }).filter((item) => item.type === 'expense');
  const totalExpenses = filtered.reduce((sum, item) => sum + item.amount, 0);

  const rows = Object.entries(filtered.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {})).map(([category, total]) => ({
    category,
    total,
    percentage: totalExpenses > 0 ? Number(((total / totalExpenses) * 100).toFixed(2)) : 0
  })).sort((a, b) => b.total - a.total);

  res.json({ member: normalizeMemberId(member), from, to, totalExpenses, categories: rows });
});

app.get('/api/banks/institutions', (_req, res) => {
  res.json({ institutions: APP_SUPPORTED_INSTITUTIONS });
});

function ensureSyncRateLimit(connectionId) {
  const now = Date.now();
  const key = `${connectionId}`;
  const last = rateLimitSync.get(key) || 0;
  if (now - last < 5_000) return false;
  rateLimitSync.set(key, now);
  return true;
}

app.post('/api/banks/connect', async (req, res) => {
  try {
    const user_id = 'demo-user';
    const member = normalizeMemberId(req.body.member || 'family');
    const institution_key = req.body.institution_key || req.body.institution;
    const scopes = req.body.scopes?.length ? req.body.scopes : DEFAULT_SCOPES;
    const days = Number(req.body.days || ofConfig.syncDefaultDays);

    if (!ALLOWED_INSTITUTIONS.includes(institution_key)) {
      return res.status(400).json({ message: 'Instituição inválida para conexão.' });
    }

    const institution = getInstitutionByKey(institution_key);
    const requestAispClient = getRequestScopedAispClient(req);
    const connectorResolution = await requestAispClient.resolve_institution(institution);

    const connection = createConnection({
      user_id,
      member,
      institution: institution.name,
      institution_key,
      status: connectorResolution.status === 'SUPPORTED' ? 'pending' : 'unsupported',
      provider: ofConfig.openFinanceMock ? 'mock' : 'pluggy',
      connector_id: connectorResolution.connectorId
    });

    if (connectorResolution.status !== 'SUPPORTED') {
      addAudit('institution_unsupported', { connection_id: connection.id, institution_key });
      return res.json({
        status: 'UNSUPPORTED',
        connectionId: connection.id,
        message: `Instituição ${institution.name} ainda não está suportada pelo provedor Pluggy.`
      });
    }

    const toDate = new Date().toISOString().slice(0, 10);
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const state = randomState();
    saveState(state, { connection_id: connection.id, user_id, institution_key, scopes, fromDate, toDate });

    const consent = await requestAispClient.create_consent({
      user_id,
      institution,
      scopes,
      from_date: fromDate,
      to_date: toDate,
      state,
      connectorId: connectorResolution.connectorId
    });

    addAudit('consent_created', { connection_id: connection.id, institution_key, scopes_count: scopes.length });

    if (ofConfig.openFinanceMock) {
      return res.json({ status: 'PENDING', connectionId: connection.id, redirectUrl: consent.redirect_url });
    }

    return res.json({
      status: 'PENDING',
      connectionId: connection.id,
      state,
      connectToken: consent.connect_token,
      connectWidgetUrl: 'https://connect.pluggy.ai'
    });
  } catch {
    return res.status(500).json({ message: 'Erro ao iniciar conexão bancária.' });
  }
});

app.get('/api/banks/callback', async (req, res) => {
  try {
    const { code, state, itemId } = req.query;
    const pending = consumeState(state);
    if (!pending) {
      return res.status(400).json({ message: 'state inválido ou expirado.' });
    }

    let externalConsentRef = itemId;
    let expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    if (ofConfig.openFinanceMock) {
      const requestAispClient = getRequestScopedAispClient(req);
      const tokenPayload = await requestAispClient.exchange_code_for_token(code);
      externalConsentRef = tokenPayload.consent_ref;
      expiresAt = tokenPayload.expires_at;

      const consent = createConsent({
        connection_id: pending.connection_id,
        consent_id_externo: externalConsentRef,
        scopes: pending.scopes,
        granted_at: new Date().toISOString(),
        expires_at: expiresAt,
        status: 'active'
      });

      upsertToken({
        consent_id: consent.id,
        access_token_enc: encryptToken(tokenPayload.access_token, ofConfig.tokenEncryptionKey),
        refresh_token_enc: encryptToken(tokenPayload.refresh_token, ofConfig.tokenEncryptionKey),
        token_expires_at: tokenPayload.expires_at
      });
    } else {
      if (!externalConsentRef) {
        return res.status(400).json({ message: 'itemId ausente para finalizar conexão.' });
      }

      createConsent({
        connection_id: pending.connection_id,
        consent_id_externo: externalConsentRef,
        scopes: pending.scopes,
        granted_at: new Date().toISOString(),
        expires_at: expiresAt,
        status: 'active'
      });
    }

    updateConnection(pending.connection_id, { status: 'active', item_id: externalConsentRef });
    addAudit('callback_completed', { connection_id: pending.connection_id, scopes_count: pending.scopes.length });

    syncByConnectionId({
      connectionId: pending.connection_id,
      aispClient: getRequestScopedAispClient(req),
      fromDate: pending.fromDate,
      toDate: pending.toDate
    }).catch(() => {});

    return res.json({ connected: true, connectionId: pending.connection_id });
  } catch {
    return res.status(500).json({ message: 'Erro ao concluir callback de consentimento.' });
  }
});

app.get('/api/banks/connections', (_req, res) => {
  const user_id = 'demo-user';
  const rows = listConnections(user_id).map((connection) => {
    const consent = getConsentByConnection(connection.id);
    return {
      ...connection,
      consent: consent
        ? {
          status: consent.status,
          scopes: consent.scopes,
          granted_at: consent.granted_at,
          expires_at: consent.expires_at,
          revoked_at: consent.revoked_at
        }
        : null
    };
  });
  res.json({ connections: rows });
});

app.post('/api/banks/:connectionId/sync', async (req, res) => {
  const { connectionId } = req.params;
  if (!ensureSyncRateLimit(connectionId)) {
    return res.status(429).json({ message: 'Muitas sincronizações em sequência. Aguarde alguns segundos.' });
  }

  try {
    const now = new Date();
    const toDate = req.body.to || now.toISOString().slice(0, 10);
    const fromDate = req.body.from || new Date(now.getTime() - ofConfig.syncDefaultDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const data = await syncByConnectionId({ connectionId, aispClient: getRequestScopedAispClient(req), fromDate, toDate });
    return res.json(data);
  } catch (err) {
    if (err?.message === 'connection_not_authorized') {
      return res.status(400).json({ message: 'Conexão não autorizada: finalize o consentimento antes de sincronizar.' });
    }
    if (err?.message === 'connection_not_found') {
      return res.status(404).json({ message: 'Conexão bancária não encontrada.' });
    }
    return res.status(400).json({ message: 'Não foi possível sincronizar a conexão.' });
  }
});

app.post('/api/banks/:connectionId/revoke', async (req, res) => {
  const { connectionId } = req.params;
  const consent = getConsentByConnection(connectionId);
  if (!consent) return res.status(404).json({ message: 'Consentimento não encontrado.' });

  try {
    await getRequestScopedAispClient(req).revoke_consent(consent.consent_id_externo);
  } catch {
    // best-effort revoke
  }

  revokeConsent(consent.id);
  deleteTokensByConsent(consent.id);
  updateConnection(connectionId, { status: 'revoked' });
  addAudit('consent_revoked', { connection_id: connectionId });
  return res.json({ revoked: true });
});

app.get('/api/banks/accounts', (_req, res) => {
  const rows = listAccounts('demo-user');
  res.json({ accounts: rows });
});

app.get('/api/banks/accounts/:id/transactions', (req, res) => {
  const rows = listTransactionsByAccount(req.params.id, req.query.from, req.query.to);
  res.json({ transactions: rows });
});

app.post('/api/banks/maintenance/purge', (_req, res) => {
  const deletedTokens = purgeExpiredTokens();
  const deletedLogs = purgeOldAuditLogs();
  res.json({ deletedTokens, deletedLogs });
});

export {
  app,
  buildDashboard,
  buildRecoveryPlan,
  filterTransactions,
  seedInvestmentsFromTransactions,
  upsertInvestmentFromReserve,
  encryptToken,
  decryptToken,
  __resetOpenFinanceStore,
  persistFinanceSnapshot
};

if (process.env.NODE_ENV !== 'test') {
  startPeriodicSync({ intervalMs: 5 * 60 * 1000, aispClient });
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}
