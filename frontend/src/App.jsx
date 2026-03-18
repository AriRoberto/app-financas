const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR');

const defaultTransactionForm = {
  memberId: 'husband',
  type: 'expense',
  category: '',
  description: '',
  amount: '',
  month: new Date().toISOString().slice(0, 7),
  date: '',
  dueDate: '',
  bankKey: 'MANUAL',
  accountId: '',
  accountLabel: '',
  referencePeriod: new Date().toISOString().slice(0, 7),
  isInvestmentReserve: false
};

const defaultImportForm = {
  memberId: 'husband',
  importType: 'transaction',
  month: new Date().toISOString().slice(0, 7),
  bankKey: 'AUTO',
  accountId: '',
  accountLabel: '',
  referencePeriod: new Date().toISOString().slice(0, 7),
  fileName: '',
  content: ''
};

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function memberLabel(memberId) {
  return {
    husband: 'Marido',
    wife: 'Esposa',
    family: 'Família',
    all: 'Todos'
  }[memberId] || memberId;
}

function typeLabel(type) {
  return {
    income: 'Receita',
    expense: 'Despesa',
    investment: 'Investimento',
    transaction: 'Transação'
  }[type] || type;
}

async function parseJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'Falha na comunicação com a API.');
  }
  return payload;
}

async function readImportFile(file) {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const buffer = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return `data:application/pdf;base64,${btoa(binary)}`;
  }
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('latin1').decode(buffer);
  }
}

function buildPieSegments(items) {
  const total = items.reduce((sum, item) => sum + item.amount, 0) || 1;
  let current = 0;
  return items.map((item, index) => {
    const ratio = item.amount / total;
    const start = current;
    const end = current + ratio;
    current = end;
    return {
      ...item,
      color: ['#2563eb', '#7c3aed', '#ea580c', '#059669', '#dc2626', '#0891b2', '#ca8a04', '#4f46e5'][index % 8],
      startAngle: start * Math.PI * 2 - Math.PI / 2,
      endAngle: end * Math.PI * 2 - Math.PI / 2,
      percentage: Number((ratio * 100).toFixed(1))
    };
  });
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = {
    x: cx + radius * Math.cos(startAngle),
    y: cy + radius * Math.sin(startAngle)
  };
  const end = {
    x: cx + radius * Math.cos(endAngle),
    y: cy + radius * Math.sin(endAngle)
  };
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

export function createApp({ root, apiUrl }) {
  const state = {
    loading: true,
    sectionLoading: '',
    error: '',
    success: '',
    members: [],
    expenseCategories: [],
    incomeCategories: [],
    investmentCategories: [],
    months: [],
    banks: [],
    accounts: [],
    files: [],
    categorizationRules: [],
    dashboard: null,
    consolidatedAnalysis: null,
    transactions: [],
    investments: { total: 0, investments: [] },
    recoveryPlan: null,
    importHistory: [],
    importPreview: null,
    expandedTransactionId: '',
    transactionsCollapsed: false,
    selectedChartCategory: '',
    transactionForm: { ...defaultTransactionForm },
    importForm: { ...defaultImportForm },
    filters: {
      member: 'all',
      bank: 'all',
      accountId: 'all',
      fileName: 'all',
      month: new Date().toISOString().slice(0, 7),
      from: '',
      to: '',
      type: 'all',
      category: 'all',
      search: ''
    }
  };

  function setBanner(type, message) {
    if (type === 'error') {
      state.error = message;
      state.success = '';
    } else {
      state.success = message;
      state.error = '';
    }
    render();
  }

  async function request(path, options) {
    return parseJson(await fetch(`${apiUrl}${path}`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
      ...options
    }));
  }

  function currentTransactionCategories() {
    if (state.transactionForm.type === 'income') return state.incomeCategories;
    if (state.transactionForm.type === 'investment') return state.investmentCategories;
    return state.expenseCategories;
  }

  function allCategories() {
    return [...state.expenseCategories, ...state.incomeCategories, ...state.investmentCategories];
  }

  function buildDashboardParams() {
    const params = new URLSearchParams({
      member: state.filters.member,
      bank: state.filters.bank,
      accountId: state.filters.accountId,
      fileName: state.filters.fileName,
      type: state.filters.type,
      category: state.selectedChartCategory || state.filters.category,
      search: state.filters.search
    });

    if (state.filters.month) {
      params.set('month', state.filters.month);
      params.set('from', state.filters.from || `${state.filters.month}-01`);
      params.set('to', state.filters.to || `${state.filters.month}-31`);
    } else {
      if (state.filters.from) params.set('from', state.filters.from);
      if (state.filters.to) params.set('to', state.filters.to);
    }

    return params.toString();
  }

  async function loadStaticData() {
    const [membersData, categoriesData, monthsData, banksData, accountsData, filesData] = await Promise.all([
      request('/api/members'),
      request('/api/categories'),
      request('/api/months?member=all'),
      request('/api/banks'),
      request('/api/accounts'),
      request('/api/files')
    ]);

    state.members = membersData.members || [];
    state.expenseCategories = categoriesData.expenseCategories || [];
    state.incomeCategories = categoriesData.incomeCategories || [];
    state.investmentCategories = categoriesData.investmentCategories || [];
    state.months = monthsData.months || [];
    state.categorizationRules = categoriesData.categorizationRules || [];
    state.banks = [{ key: 'all', name: 'Todos os bancos' }, ...(banksData.banks || [])];
    state.accounts = [{ id: 'all', label: 'Todas as contas' }, ...(accountsData.accounts || [])];
    state.files = [{ id: 'all', label: 'Todos os arquivos' }, ...(filesData.files || [])];

    const firstMember = state.members[0]?.id || 'husband';
    const firstMonth = state.months[state.months.length - 1] || state.filters.month;

    state.filters.month = firstMonth;
    state.transactionForm.memberId = firstMember;
    state.transactionForm.category = currentTransactionCategories()[0] || '';
    state.importForm.memberId = firstMember;
    state.transactionForm.referencePeriod = firstMonth;
    state.importForm.referencePeriod = firstMonth;
    state.importForm.month = firstMonth;
  }

  async function loadDashboardData() {
    const query = buildDashboardParams();
    const [dashboard, transactions, investments, recoveryPlan, importHistory, consolidatedAnalysis, filesData] = await Promise.all([
      request(`/api/dashboard?${query}`),
      request(`/api/transactions?${query}`),
      request(`/api/investments?${query}`),
      request(`/api/recovery/plan?${query}`),
      request('/api/imports/history'),
      request(`/api/analysis/consolidated?${query}`),
      request('/api/files')
    ]);

    state.dashboard = dashboard;
    state.transactions = transactions.transactions || [];
    state.investments = investments;
    state.recoveryPlan = recoveryPlan;
    state.importHistory = importHistory.imports || [];
    state.consolidatedAnalysis = consolidatedAnalysis;

    const dynamicBanks = [{ key: 'all', name: 'Todos os bancos' }, ...((dashboard.byBank || []).map((item) => ({ key: item.id, name: item.label })))];
    const dynamicAccounts = [{ id: 'all', label: 'Todas as contas' }, ...((dashboard.byAccount || []).map((item) => ({ id: item.id, label: item.label })))];
    state.banks = dynamicBanks;
    state.accounts = dynamicAccounts;
    state.files = [{ id: 'all', label: 'Todos os arquivos' }, ...(filesData.files || [])];
  }

  async function boot() {
    try {
      await loadStaticData();
      await loadDashboardData();
      state.loading = false;
      render();
    } catch (error) {
      state.loading = false;
      setBanner('error', error.message);
    }
  }

  async function runAction(section, task, successMessage) {
    state.sectionLoading = section;
    render();
    try {
      const result = await task();
      await loadDashboardData();
      state.sectionLoading = '';
      if (successMessage) setBanner('success', successMessage);
      render();
      return result;
    } catch (error) {
      state.sectionLoading = '';
      setBanner('error', error.message);
      throw error;
    }
  }

  function renderSummary() {
    const dashboard = state.dashboard || {};
    return `
      <section class="summary-grid">
        <article class="card metric-card income">
          <span>Receitas</span>
          <strong>${currency.format(dashboard.income || 0)}</strong>
          <small>${dashboard.transactionCount || 0} lançamento(s) filtrados</small>
        </article>
        <article class="card metric-card expense">
          <span>Despesas</span>
          <strong>${currency.format(dashboard.expenses || 0)}</strong>
          <small>Inclui saídas importadas e lançamentos manuais</small>
        </article>
        <article class="card metric-card investment">
          <span>Investimentos</span>
          <strong>${currency.format(dashboard.investments || 0)}</strong>
          <small>Diretos + reservas espelhadas</small>
        </article>
        <article class="card metric-card balance ${dashboard.balance >= 0 ? 'positive' : 'negative'}">
          <span>Saldo</span>
          <strong>${currency.format(dashboard.balance || 0)}</strong>
          <small>${dashboard.empty ? 'Sem dados no período.' : 'Saldo considerando os filtros ativos.'}</small>
        </article>
      </section>
    `;
  }

  function renderSelectOptions(items, selected, keyField, labelField) {
    return items.map((item) => `<option value="${esc(item[keyField])}" ${String(item[keyField]) === String(selected) ? 'selected' : ''}>${esc(item[labelField])}</option>`).join('');
  }

  function renderFilters() {
    return `
      <section class="card filters-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Filtros</p>
            <h2>Visão consolidada por membro, banco e conta</h2>
          </div>
          <button data-action="refresh-dashboard">${state.sectionLoading === 'refresh' ? 'Atualizando...' : 'Atualizar dashboards'}</button>
        </div>
        <div class="filters-grid">
          <label><span>Membro</span><select name="filter-member">${renderSelectOptions([{ id: 'all', name: 'Todos os membros' }, ...state.members], state.filters.member, 'id', 'name')}</select></label>
          <label><span>Banco</span><select name="filter-bank">${renderSelectOptions(state.banks, state.filters.bank, 'key', 'name')}</select></label>
          <label><span>Conta</span><select name="filter-accountId">${renderSelectOptions(state.accounts, state.filters.accountId, 'id', 'label')}</select></label>
          <label><span>Arquivo</span><select name="filter-fileName">${renderSelectOptions(state.files, state.filters.fileName, 'id', 'label')}</select></label>
          <label><span>Mês</span><select name="filter-month"><option value="">Período livre</option>${state.months.map((month) => `<option value="${month}" ${month === state.filters.month ? 'selected' : ''}>${month}</option>`).join('')}</select></label>
          <label><span>De</span><input name="filter-from" type="date" value="${esc(state.filters.from)}" /></label>
          <label><span>Até</span><input name="filter-to" type="date" value="${esc(state.filters.to)}" /></label>
          <label><span>Tipo</span><select name="filter-type"><option value="all">Todos</option><option value="expense" ${state.filters.type === 'expense' ? 'selected' : ''}>Despesa</option><option value="income" ${state.filters.type === 'income' ? 'selected' : ''}>Receita</option><option value="investment" ${state.filters.type === 'investment' ? 'selected' : ''}>Investimento</option></select></label>
          <label><span>Categoria</span><select name="filter-category"><option value="all">Todas</option>${allCategories().map((category) => `<option value="${esc(category)}" ${category === state.filters.category ? 'selected' : ''}>${esc(category)}</option>`).join('')}</select></label>
          <label class="span-2"><span>Buscar</span><input name="filter-search" placeholder="Descrição, conta, banco..." value="${esc(state.filters.search)}" /></label>
        </div>
      </section>
    `;
  }

  function renderPieChart() {
    const items = (state.dashboard?.categoryHighlights || []).filter((item) => item.amount > 0);
    if (!items.length) {
      return '<div class="empty-state boxed">Nenhuma categoria encontrada para os filtros atuais.</div>';
    }

    const segments = buildPieSegments(items);
    return `
      <div class="category-layout">
        <div class="chart-wrap">
          <svg viewBox="0 0 240 240" class="pie-chart" aria-label="Gráfico por categoria">
            ${segments.map((segment) => `
              <path
                d="${describeArc(120, 120, state.selectedChartCategory === segment.label ? 96 : 88, segment.startAngle, segment.endAngle)}"
                fill="${segment.color}"
                class="pie-slice ${state.selectedChartCategory === segment.label ? 'active' : ''}"
                data-action="toggle-category"
                data-category="${esc(segment.label)}"
              ></path>
            `).join('')}
            <circle cx="120" cy="120" r="46" fill="#fff"></circle>
            <text x="120" y="112" text-anchor="middle" class="pie-total-label">Total</text>
            <text x="120" y="134" text-anchor="middle" class="pie-total-value">${currency.format(items.reduce((sum, item) => sum + item.amount, 0))}</text>
          </svg>
        </div>
        <div class="legend-list">
          ${segments.map((segment) => `
            <button class="legend-item ${state.selectedChartCategory === segment.label ? 'active' : ''}" data-action="toggle-category" data-category="${esc(segment.label)}">
              <span class="legend-color" style="background:${segment.color}"></span>
              <span>
                <strong>${esc(segment.label)}</strong>
                <small>${typeLabel(segment.type)} · ${segment.percentage}% · ${currency.format(segment.amount)}</small>
              </span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderSummaryTables(title, rows) {
    return `
      <article class="card compact-card">
        <h3>${title}</h3>
        ${rows.length ? `
          <ul class="stat-list">
            ${rows.map((item) => `
              <li>
                <div>
                  <strong>${esc(item.label)}</strong>
                  <small>${item.transactionCount} lançamento(s)</small>
                </div>
                <div class="stat-values">
                  <span>R ${item.income.toFixed(2)}</span>
                  <span>D ${item.expenses.toFixed(2)}</span>
                  <span>I ${item.investments.toFixed(2)}</span>
                </div>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="empty-state">Sem dados agregados.</p>'}
      </article>
    `;
  }

  function renderDashboards() {
    return `
      <section class="dashboard-grid">
        <article class="card dashboard-card">
          <div class="panel-heading compact">
            <div>
              <p class="eyebrow">Dashboard obrigatório</p>
              <h2>Quadro e gráfico por categoria</h2>
            </div>
            ${state.selectedChartCategory ? `<button class="ghost-button" data-action="clear-category-filter">Limpar destaque</button>` : ''}
          </div>
          ${renderPieChart()}
        </article>
        ${renderSummaryTables('Resumo por banco', state.dashboard?.byBank || [])}
        ${renderSummaryTables('Resumo por conta', state.dashboard?.byAccount || [])}
        ${renderSummaryTables('Resumo por membro', state.dashboard?.byMember || [])}
      </section>
    `;
  }

  function renderRecoveryPlan() {
    const plan = state.recoveryPlan;
    if (!plan) return '<p class="empty-state">Plano de recuperação indisponível.</p>';
    return `
      <div class="stack-sm">
        <div class="badge-row">
          <span class="severity-pill">${esc(plan.severity || '-')}</span>
          <span class="muted">Economia potencial: ${currency.format(plan.summary?.estimatedSavingsPotential || 0)}</span>
        </div>
        <p>Saldo consolidado: <strong>${currency.format(plan.summary?.balance || 0)}</strong> · Despesas: <strong>${currency.format(plan.summary?.expenses || 0)}</strong></p>
        <ul class="simple-list">
          ${(plan.recommendations?.immediate || []).map((action) => `<li><strong>${esc(action.title)}</strong> — impacto estimado ${currency.format(action.impact || 0)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  function renderTransactions() {
    if (!state.transactions.length) {
      return '<div class="empty-state boxed">Nenhum lançamento encontrado. Ajuste os filtros ou importe novos dados.</div>';
    }

    return `
      <div class="transaction-list">
        ${state.transactions.map((item) => `
          <article class="transaction-card ${state.expandedTransactionId === item.id ? 'expanded' : ''}">
            <button class="transaction-summary" data-action="toggle-transaction" data-id="${esc(item.id)}">
              <div>
                <strong>${esc(item.description)}</strong>
                <span>${esc(typeLabel(item.type))} · ${esc(item.category)} · ${esc(item.date)}</span>
              </div>
              <div class="summary-right">
                <span>${esc(memberLabel(item.memberId))}</span>
                <strong>${currency.format(item.amount)}</strong>
              </div>
            </button>
            ${state.expandedTransactionId === item.id ? `
              <div class="transaction-details">
                <dl>
                  <div><dt>Banco</dt><dd>${esc(item.bankName || item.bankKey || '-')}</dd></div>
                  <div><dt>Conta</dt><dd>${esc(item.accountLabel || item.accountId || '-')}</dd></div>
                  <div><dt>Membro</dt><dd>${esc(memberLabel(item.memberId))}</dd></div>
                  <div><dt>Categoria</dt><dd>${esc(item.category)}</dd></div>
                  <div><dt>Tipo</dt><dd>${esc(typeLabel(item.type))}</dd></div>
                  <div><dt>Origem</dt><dd>${esc(item.importOrigin || '-')}</dd></div>
                  <div><dt>Arquivo</dt><dd>${esc(item.sourceFileName || '-')}</dd></div>
                  <div><dt>Período</dt><dd>${esc(item.referencePeriod || '-')}</dd></div>
                </dl>
                <div class="inline-actions">
                  <button class="ghost-button" data-action="delete-transaction" data-id="${esc(item.id)}">Excluir</button>
                </div>
              </div>
            ` : ''}
          </article>
        `).join('')}
      </div>
    `;
  }

  function renderInvestments() {
    const items = state.investments?.investments || [];
    return `
      <article class="card compact-card">
        <h3>Investimentos</h3>
        <p><strong>Total:</strong> ${currency.format(state.investments?.total || 0)}</p>
        ${items.length ? `<ul class="simple-list">${items.map((item) => `<li>${esc(item.bankName || item.bankKey || '-')} · ${esc(item.accountLabel || item.accountId || '-')} · ${currency.format(item.amount)}</li>`).join('')}</ul>` : '<p class="empty-state">Nenhum investimento para os filtros atuais.</p>'}
      </article>
    `;
  }

  function renderImportPreview() {
    if (!state.importPreview) {
      return '<div class="empty-state boxed">Envie um CSV do BB ou do Itaú para gerar a pré-visualização.</div>';
    }

    return `
      <div class="stack-sm import-preview">
        <p><strong>Banco detectado:</strong> ${esc(state.importPreview.bank?.label || '-')} · <strong>Formato:</strong> ${esc((state.importPreview.format || '').toUpperCase())} · <strong>Layout:</strong> ${esc(state.importPreview.parserLayout || '-')} · <strong>Linhas válidas:</strong> ${esc(state.importPreview.summary?.totalRows || 0)} · <strong>Duplicadas:</strong> ${esc(state.importPreview.summary?.duplicates || 0)} · <strong>Categorizadas:</strong> ${esc(state.importPreview.summary?.categorizedAutomatically || 0)}</p>
        ${state.importPreview.duplicateFile ? `<div class="inline-warning">${esc(state.importPreview.duplicateFileMessage)}</div>` : ''}
        ${state.importPreview.extractedTextPreview?.length ? `<div class="boxed"><strong>Trecho extraído do PDF:</strong><br />${state.importPreview.extractedTextPreview.map((line) => esc(line)).join('<br />')}</div>` : ''}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Banco</th>
                <th>Conta</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${(state.importPreview.rows || []).slice(0, 20).map((row) => `
                <tr>
                  <td>${esc(row.date)}</td>
                  <td>${esc(row.bankName)}</td>
                  <td>${esc(row.accountLabel)}</td>
                  <td>${esc(row.description)}</td>
                  <td>${esc(typeLabel(row.type))}</td>
                  <td>${esc(row.category)}<br /><small>${esc(row.categorization?.matchedBy === 'keyword' ? `auto: ${row.categorization.rule}` : 'fallback')}</small></td>
                  <td>${currency.format(row.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderImportHistory() {
    if (!state.importHistory.length) {
      return '<div class="empty-state boxed">Nenhuma importação registrada ainda.</div>';
    }

    return `
      <div class="history-list">
        ${state.importHistory.map((item) => `
          <article class="history-card">
            <strong>${esc(item.fileName)}</strong>
            <span>${esc(item.bankName || item.bankKey || '-')} · ${esc(memberLabel(item.memberId))}</span>
            <span>${esc(item.accountLabel || item.accountId || '-')}</span>
            <small>${esc((item.importedMonths || []).join(', ') || '-')} · ${esc(new Date(item.createdAt).toLocaleString('pt-BR'))}</small>
            <small>${item.importedRows} importados / ${item.duplicateRows} duplicados</small>
          </article>
        `).join('')}
      </div>
    `;
  }


  function renderConsolidatedAnalysis() {
    const analysis = state.consolidatedAnalysis;
    if (!analysis) return '<div class="empty-state boxed">Análise consolidada indisponível.</div>';

    const memberCards = (analysis.byMember || []).map((item) => `
      <article class="mini-stat-card">
        <strong>${esc(memberLabel(item.id))}</strong>
        <span>Despesas: ${currency.format(item.expenses || 0)}</span>
        <small>Categoria dominante: ${esc(item.topCategories?.[0]?.label || '-')}</small>
      </article>
    `).join('');

    const fileRows = (analysis.byFile || []).map((item) => `
      <tr>
        <td>${esc(item.label)}</td>
        <td>${item.transactionCount}</td>
        <td>${currency.format(item.expenses || 0)}</td>
        <td>${esc(item.topCategories?.[0]?.label || '-')}</td>
      </tr>
    `).join('');

    return `
      <section class="analysis-grid">
        <article class="card compact-card">
          <h3>Leitura consolidada do período</h3>
          <p><strong>Arquivos:</strong> ${esc((analysis.totals?.files || []).join(', ') || 'Somente lançamentos manuais')}</p>
          <p><strong>Maiores categorias:</strong> ${(analysis.topCategories || []).slice(0, 3).map((item) => `${esc(item.label)} (${currency.format(item.amount)})`).join(' · ') || 'Sem dados'}</p>
        </article>
        <article class="card compact-card">
          <h3>Análise por membro</h3>
          <div class="mini-stat-grid">${memberCards || '<p class="empty-state">Sem dados por membro.</p>'}</div>
        </article>
        <article class="card compact-card">
          <h3>Análise por arquivo</h3>
          ${fileRows ? `<div class="table-wrap"><table><thead><tr><th>Arquivo</th><th>Lanç.</th><th>Despesas</th><th>Categoria dominante</th></tr></thead><tbody>${fileRows}</tbody></table></div>` : '<p class="empty-state">Nenhum arquivo importado no filtro atual.</p>'}
        </article>
      </section>
    `;
  }

  function renderCategorizationPanel() {
    return `
      <article class="card compact-card">
        <h3>Categorização automática</h3>
        <p class="muted">As regras atuais vinculam descrições importadas às categorias já existentes no app.</p>
        <div class="rule-chip-list">
          ${(state.categorizationRules || []).slice(0, 10).map((rule) => `<span class="rule-chip">${esc(typeLabel(rule.type))}: ${esc(rule.category)}</span>`).join('')}
        </div>
      </article>
    `;
  }

  function renderForms() {
    return `
      <section class="workspace-grid">
        <article class="card form-card">
          <div class="panel-heading compact">
            <div>
              <p class="eyebrow">Lançamento manual</p>
              <h2>Novo lançamento financeiro</h2>
            </div>
          </div>
          <div class="form-grid">
            <label><span>Membro</span><select name="tx-memberId">${renderSelectOptions(state.members, state.transactionForm.memberId, 'id', 'name')}</select></label>
            <label><span>Banco</span><select name="tx-bankKey"><option value="MANUAL">Manual</option>${state.banks.filter((item) => item.key !== 'all').map((bank) => `<option value="${esc(bank.key)}" ${state.transactionForm.bankKey === bank.key ? 'selected' : ''}>${esc(bank.name)}</option>`).join('')}</select></label>
            <label><span>Conta</span><input name="tx-accountLabel" value="${esc(state.transactionForm.accountLabel)}" placeholder="Ex.: Conta principal" /></label>
            <label><span>Tipo</span><select name="tx-type"><option value="expense" ${state.transactionForm.type === 'expense' ? 'selected' : ''}>Despesa</option><option value="income" ${state.transactionForm.type === 'income' ? 'selected' : ''}>Receita</option><option value="investment" ${state.transactionForm.type === 'investment' ? 'selected' : ''}>Investimento</option></select></label>
            <label><span>Categoria</span><select name="tx-category">${currentTransactionCategories().map((category) => `<option value="${esc(category)}" ${category === state.transactionForm.category ? 'selected' : ''}>${esc(category)}</option>`).join('')}</select></label>
            <label><span>Descrição</span><input name="tx-description" value="${esc(state.transactionForm.description)}" /></label>
            <label><span>Valor</span><input name="tx-amount" type="number" step="0.01" value="${esc(state.transactionForm.amount)}" /></label>
            <label><span>Data</span><input name="tx-date" type="date" value="${esc(state.transactionForm.date)}" /></label>
            <label><span>Mês</span><input name="tx-month" type="month" value="${esc(state.transactionForm.month)}" /></label>
            <label><span>Período de referência</span><input name="tx-referencePeriod" type="month" value="${esc(state.transactionForm.referencePeriod)}" /></label>
          </div>
          <label class="checkbox-row"><input name="tx-isInvestmentReserve" type="checkbox" ${state.transactionForm.isInvestmentReserve ? 'checked' : ''} /> Reserva para investir</label>
          <div class="inline-actions">
            <button data-action="save-transaction">${state.sectionLoading === 'transaction' ? 'Salvando...' : 'Salvar lançamento'}</button>
            <button class="ghost-button" data-action="seed-data">Restaurar dados de exemplo</button>
            <button class="ghost-button danger" data-action="clear-data">Limpar base</button>
          </div>
        </article>

        <article class="card form-card">
          <div class="panel-heading compact">
            <div>
              <p class="eyebrow">Importação multi-banco</p>
              <h2>BB e Itaú</h2>
            </div>
            <span class="muted">Fluxo: detectar CSV/PDF → extrair → normalizar → categorizar → associar membro/conta → persistir → recalcular dashboards e análises.</span>
          </div>
          <div class="form-grid">
            <label><span>Membro</span><select name="import-memberId">${renderSelectOptions(state.members, state.importForm.memberId, 'id', 'name')}</select></label>
            <label><span>Banco</span><select name="import-bankKey"><option value="AUTO" ${state.importForm.bankKey === 'AUTO' ? 'selected' : ''}>Auto-detectar</option>${state.banks.filter((item) => item.key !== 'all').map((bank) => `<option value="${esc(bank.key)}" ${state.importForm.bankKey === bank.key ? 'selected' : ''}>${esc(bank.name)}</option>`).join('')}</select></label>
            <label><span>Conta</span><input name="import-accountLabel" value="${esc(state.importForm.accountLabel)}" placeholder="Ex.: Itaú salário" /></label>
            <label><span>Período</span><input name="import-referencePeriod" type="month" value="${esc(state.importForm.referencePeriod)}" /></label>
            <label class="span-2"><span>Arquivo CSV/PDF</span><input name="import-file" type="file" accept=".csv,.json,.txt,.pdf,application/pdf" /></label>
            <label class="span-2"><span>Conteúdo</span><textarea name="import-content" rows="8">${esc(state.importForm.content)}</textarea></label>
          </div>
          <div class="inline-actions">
            <button data-action="preview-import">${state.sectionLoading === 'preview-import' ? 'Processando...' : 'Pré-visualizar'}</button>
            <button class="ghost-button" data-action="commit-import">${state.sectionLoading === 'commit-import' ? 'Importando...' : 'Importar e atualizar dashboards'}</button>
          </div>
          ${renderImportPreview()}
        </article>
      </section>
    `;
  }

  function render() {
    root.innerHTML = `
      <div class="app-shell wide">
        <header class="hero card">
          <div>
            <p class="eyebrow">Arquitetura multi-banco</p>
            <h1>Painel financeiro familiar</h1>
            <p class="muted">Base preparada para CSV + PDF, categorização automática, consolidação multi-banco/multi-arquivo e plano de recuperação orientado por análise.</p>
          </div>
          <div class="hero-side">
            <strong>${state.dashboard?.empty ? 'Sem dados nos filtros' : `${state.dashboard?.transactionCount || 0} lançamentos ativos`}</strong>
            <small>Categoria destacada: ${esc(state.selectedChartCategory || 'nenhuma')}</small>
          </div>
        </header>

        ${state.error ? `<div class="banner error">${esc(state.error)}</div>` : ''}
        ${state.success ? `<div class="banner success">${esc(state.success)}</div>` : ''}

        ${state.loading ? '<div class="card loading-card">Carregando estrutura do app...</div>' : `
          ${renderFilters()}
          ${renderSummary()}
          ${renderDashboards()}
          ${renderConsolidatedAnalysis()}
          <section class="workspace-grid secondary">
            <article class="card">
              <div class="panel-heading compact"><div><p class="eyebrow">Lançamentos</p><h2>Lista com expand/collapse</h2><small>${state.transactions.length} registro(s) no filtro atual</small></div><div class="inline-actions"><button class="ghost-button" data-action="toggle-transactions-section">${state.transactionsCollapsed ? 'Expandir lista' : 'Recolher lista'}</button></div></div>
              ${state.transactionsCollapsed ? '<div class="collapsed-placeholder">A lista completa está recolhida para priorizar os dashboards e o resumo. Expanda quando quiser analisar os detalhes.</div>' : `<div class="transaction-section-body">${renderTransactions()}</div>`}
            </article>
            <article class="card compact-side">
              <div class="panel-heading compact"><div><p class="eyebrow">Análises auxiliares</p><h2>Investimentos e recuperação</h2></div></div>
              ${renderInvestments()}
              <article class="card inner-card"><h3>Plano de recuperação</h3>${renderRecoveryPlan()}</article>
            </article>
          </section>
          <section class="workspace-grid secondary">${renderCategorizationPanel()}</section>
          ${renderForms()}
          <section class="workspace-grid secondary">
            <article class="card"><div class="panel-heading compact"><div><p class="eyebrow">Histórico</p><h2>Importações realizadas</h2></div><div class="inline-actions"><button class="ghost-button" data-action="clear-history">Limpar histórico</button><button class="ghost-button danger" data-action="clear-history-and-data">Limpar histórico e dados</button></div></div>${renderImportHistory()}</article>
          </section>
        `}
      </div>
    `;
    bindEvents();
  }

  function updateFilter(name, value) {
    state.filters[name] = value;
    if (name === 'month' && value) {
      state.filters.from = '';
      state.filters.to = '';
    }
  }

  async function handleAction(action, element) {
    if (action === 'refresh-dashboard') {
      await runAction('refresh', () => loadDashboardData());
      return;
    }
    if (action === 'clear-category-filter') {
      state.selectedChartCategory = '';
      await runAction('refresh', () => loadDashboardData());
      return;
    }
    if (action === 'toggle-category') {
      state.selectedChartCategory = state.selectedChartCategory === element.dataset.category ? '' : element.dataset.category;
      await runAction('refresh', () => loadDashboardData());
      return;
    }
    if (action === 'toggle-transaction') {
      state.expandedTransactionId = state.expandedTransactionId === element.dataset.id ? '' : element.dataset.id;
      render();
      return;
    }
    if (action === 'toggle-transactions-section') {
      state.transactionsCollapsed = !state.transactionsCollapsed;
      render();
      return;
    }
    if (action === 'clear-history') {
      if (!window.confirm('Deseja limpar apenas o histórico visual? Os dados importados e a proteção contra duplicidade serão preservados.')) return;
      await runAction('clear-history', () => request('/api/imports/history', { method: 'DELETE' }), 'Histórico visual limpo com sucesso.');
      return;
    }
    if (action === 'clear-history-and-data') {
      if (!window.confirm('Deseja remover o histórico e também todos os dados importados por arquivos? Lançamentos manuais serão preservados.')) return;
      await runAction('clear-history-and-data', () => request('/api/imports/history-and-data', { method: 'DELETE' }), 'Histórico e dados importados removidos com sucesso.');
      state.importPreview = null;
      return;
    }
    if (action === 'delete-transaction') {
      await runAction('transaction', () => request(`/api/transactions/${element.dataset.id}`, { method: 'DELETE' }), 'Lançamento removido com sucesso.');
      return;
    }
    if (action === 'seed-data') {
      await runAction('seed', () => request('/api/transactions/seed', { method: 'POST', body: '{}' }), 'Dados de exemplo restaurados.');
      return;
    }
    if (action === 'clear-data') {
      await runAction('clear', () => request('/api/transactions', { method: 'DELETE' }), 'Base limpa com sucesso.');
      state.importPreview = null;
      return;
    }
    if (action === 'save-transaction') {
      const payload = {
        ...state.transactionForm,
        amount: Number(state.transactionForm.amount),
        accountId: state.transactionForm.accountId || `${state.transactionForm.bankKey.toLowerCase()}-${state.transactionForm.memberId}-manual`
      };
      await runAction('transaction', () => request('/api/transactions', { method: 'POST', body: JSON.stringify(payload) }), 'Lançamento salvo com sucesso.');
      state.transactionForm = { ...defaultTransactionForm, memberId: state.transactionForm.memberId, month: state.filters.month || defaultTransactionForm.month, referencePeriod: state.filters.month || defaultTransactionForm.referencePeriod, category: currentTransactionCategories()[0] || '' };
      return;
    }
    if (action === 'preview-import') {
      const payload = {
        ...state.importForm,
        bankKey: state.importForm.bankKey === 'AUTO' ? '' : state.importForm.bankKey,
        accountId: state.importForm.accountId || '',
        accountLabel: state.importForm.accountLabel || ''
      };
      const preview = await runAction('preview-import', () => request('/api/imports/preview', { method: 'POST', body: JSON.stringify(payload) }));
      state.importPreview = preview;
      state.success = 'Pré-visualização gerada com sucesso.';
      render();
      return;
    }
    if (action === 'commit-import') {
      const payload = {
        ...state.importForm,
        bankKey: state.importForm.bankKey === 'AUTO' ? '' : state.importForm.bankKey,
        accountId: state.importForm.accountId || '',
        accountLabel: state.importForm.accountLabel || ''
      };
      if (state.importPreview?.duplicateFile) {
        setBanner('error', state.importPreview.duplicateFileMessage || 'Este arquivo já foi processado anteriormente.');
        return;
      }
      const result = await runAction('commit-import', () => request('/api/imports/commit', { method: 'POST', body: JSON.stringify(payload) }));
      state.importPreview = null;
      setBanner('success', result.message || 'Importação concluída com sucesso.');
    }
  }

  function bindEvents() {
    root.querySelectorAll('[data-action]').forEach((element) => {
      element.addEventListener('click', () => { handleAction(element.dataset.action, element).catch(() => {}); });
    });

    root.querySelectorAll('[name^="filter-"]').forEach((input) => {
      input.addEventListener('change', async (event) => {
        updateFilter(event.target.name.replace('filter-', ''), event.target.value);
        await runAction('refresh', () => loadDashboardData());
      });
    });

    root.querySelectorAll('[name^="tx-"]').forEach((input) => {
      input.addEventListener('change', (event) => {
        const field = event.target.name.replace('tx-', '');
        state.transactionForm[field] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        if (field === 'type') {
          state.transactionForm.category = currentTransactionCategories()[0] || '';
          render();
        }
      });
    });

    root.querySelectorAll('[name^="import-"]').forEach((input) => {
      input.addEventListener('change', (event) => {
        const field = event.target.name.replace('import-', '');
        state.importForm[field] = event.target.value;
      });
    });

    const searchInput = root.querySelector('input[name="filter-search"]');
    if (searchInput) {
      searchInput.addEventListener('keyup', async (event) => {
        state.filters.search = event.target.value;
        await runAction('refresh', () => loadDashboardData());
      });
    }

    const fileInput = root.querySelector('input[name="import-file"]');
    if (fileInput) {
      fileInput.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        state.importForm.fileName = file.name;
        state.importForm.content = await readImportFile(file);
        state.importPreview = null;
        render();
      });
    }
  }

  render();
  boot();
}
