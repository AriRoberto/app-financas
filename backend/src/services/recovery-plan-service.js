function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildRecoveryPlanFromAnalysis(analysis) {
  const totals = analysis.totals || { income: 0, expenses: 0, investments: 0, balance: 0, transactionCount: 0 };
  const topCategories = analysis.topCategories || [];
  const expenseCategories = topCategories.filter((item) => item.type === 'expense');
  const byMember = analysis.byMember || [];
  const periods = analysis.byPeriod || [];
  const recurringSignals = expenseCategories
    .filter((category) => category.transactionCount >= 2)
    .map((category) => ({
      category: category.label,
      amount: category.amount,
      monthlyAverage: Number((category.amount / Math.max(periods.length, 1)).toFixed(2))
    }));

  const majorCauses = [
    totals.balance < 0 ? { code: 'NEGATIVE_BALANCE', label: 'Saldo consolidado negativo', impact: Math.abs(totals.balance) } : null,
    expenseCategories[0] ? { code: 'TOP_EXPENSE_CATEGORY', label: `Maior categoria de despesa: ${expenseCategories[0].label}`, impact: expenseCategories[0].amount } : null,
    byMember[0] ? { code: 'TOP_SPENDER', label: `Maior pressão por membro: ${byMember[0].label}`, impact: byMember[0].expenses } : null
  ].filter(Boolean);

  const reducibleCategories = expenseCategories.slice(0, 4).map((item) => ({
    category: item.label,
    amount: item.amount,
    estimatedSavings: Number((item.amount * (['Lazer', 'Assinaturas', 'Alimentação', 'Transporte'].includes(item.label) ? 0.2 : 0.08)).toFixed(2))
  }));

  const discretionaryPool = reducibleCategories.reduce((sum, item) => sum + item.estimatedSavings, 0);
  const memberPressure = byMember.map((member) => ({
    memberId: member.id,
    member: member.label,
    expenses: member.expenses,
    balance: member.balance,
    topCategory: member.topCategories?.[0]?.label || '-'
  }));

  const severityScore = [
    totals.balance < 0 ? 2 : 0,
    totals.expenses > totals.income ? 2 : 0,
    recurringSignals.length >= 3 ? 1 : 0,
    byMember.some((member) => member.balance < 0) ? 1 : 0
  ].reduce((sum, value) => sum + value, 0);

  const severity = severityScore >= 4 ? 'Crítico' : severityScore >= 2 ? 'Atenção' : 'Controlado';
  const monthlyExpenses = periods.map((period) => period.expenses);
  const monthlyAverageExpense = average(monthlyExpenses);

  return {
    generatedAt: new Date().toISOString(),
    severity,
    summary: {
      income: totals.income,
      expenses: totals.expenses,
      investments: totals.investments,
      balance: totals.balance,
      transactionCount: totals.transactionCount,
      monthlyAverageExpense: Number(monthlyAverageExpense.toFixed(2)),
      estimatedSavingsPotential: Number(discretionaryPool.toFixed(2))
    },
    causes: majorCauses,
    criticalCategories: reducibleCategories,
    byMember: memberPressure,
    recurringSignals,
    recommendations: {
      immediate: [
        { title: 'Congelar despesas discricionárias recorrentes', impact: Number((discretionaryPool * 0.45).toFixed(2)) },
        { title: 'Revisar maiores lançamentos do período consolidado', impact: Number((Math.abs(totals.balance) * 0.2).toFixed(2)) }
      ],
      shortTerm: [
        { title: 'Redefinir teto por categoria crítica', focus: reducibleCategories.map((item) => item.category).join(', ') || 'Sem foco definido' },
        { title: 'Redistribuir responsabilidade financeira por membro', focus: memberPressure.map((item) => `${item.member}: ${item.topCategory}`).join(' · ') }
      ],
      mediumTerm: [
        { title: 'Criar rotina mensal de consolidação por arquivo e período', focus: `${analysis.totals?.files?.length || 0} arquivo(s) analisado(s)` },
        { title: 'Automatizar aportes e reserva', focus: 'Usar saldo recuperado para estabilização e reserva de emergência' }
      ]
    }
  };
}
