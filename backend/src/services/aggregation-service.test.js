import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFinancialDashboard, filterFinancialTransactions } from './aggregation-service.js';

const members = [
  { id: 'husband', name: 'marido' },
  { id: 'wife', name: 'esposa' }
];

const transactions = [
  { id: '1', memberId: 'husband', bankKey: 'BB', bankName: 'Banco do Brasil', accountId: 'bb-1', accountLabel: 'Conta BB', type: 'income', category: 'Salário', description: 'Salário', amount: 5000, date: '2026-03-05', month: '2026-03' },
  { id: '2', memberId: 'husband', bankKey: 'BB', bankName: 'Banco do Brasil', accountId: 'bb-1', accountLabel: 'Conta BB', type: 'expense', category: 'Alimentação', description: 'Mercado', amount: 800, date: '2026-03-10', month: '2026-03' },
  { id: '3', memberId: 'wife', bankKey: 'ITAU', bankName: 'Itaú', accountId: 'itau-1', accountLabel: 'Conta Itaú', type: 'investment', category: 'Renda fixa', description: 'CDB', amount: 600, date: '2026-03-11', month: '2026-03' }
];

test('filterFinancialTransactions suporta filtros por banco, conta, tipo e categoria', () => {
  const filtered = filterFinancialTransactions(transactions, { bank: 'BB', accountId: 'bb-1', type: 'expense', category: 'Alimentação' });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, '2');
});

test('buildFinancialDashboard agrega por banco, conta e membro', () => {
  const dashboard = buildFinancialDashboard({ transactions, members, filters: { month: '2026-03', member: 'all', bank: 'all', accountId: 'all', type: 'all', category: 'all', from: '2026-03-01', to: '2026-03-31', term: 'all', search: '' } });
  assert.equal(dashboard.income, 5000);
  assert.equal(dashboard.expenses, 800);
  assert.equal(dashboard.investments, 600);
  assert.equal(dashboard.byBank.length, 2);
  assert.equal(dashboard.byAccount.length, 2);
  assert.equal(dashboard.byMember.length, 2);
  assert.equal(dashboard.categoryHighlights[0].label, 'Salário');
});
