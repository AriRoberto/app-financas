import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTerm, app } from './server.js';

async function withServer(run) {
  const server = app.listen(0);
  const port = await new Promise((resolve) => server.on('listening', () => resolve(server.address().port)));
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

test('classifyTerm classifica short/medium/long corretamente', () => {
  const now = new Date();
  const endYear = `${now.getUTCFullYear()}-12-31`;
  const mediumDate = `${now.getUTCFullYear() + 1}-06-15`;
  const longDate = `${now.getUTCFullYear() + 3}-01-10`;

  assert.equal(classifyTerm(endYear), 'short');
  assert.equal(classifyTerm(mediumDate), 'medium');
  assert.equal(classifyTerm(longDate), 'long');
});

test('filtro por membro não vaza transações de outros membros', async () => {
  await withServer(async (baseUrl) => {
    await fetch(`${baseUrl}/api/transactions/seed`, { method: 'POST' });
    const response = await fetch(`${baseUrl}/api/transactions?member=husband`);
    const data = await response.json();

    assert.ok(data.transactions.length > 0);
    assert.ok(data.transactions.every((item) => item.memberId === 'husband'));
  });
});

test('reserva para investir cria investimento espelhado', async () => {
  await withServer(async (baseUrl) => {
    await fetch(`${baseUrl}/api/transactions/seed`, { method: 'POST' });

    const createResponse = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: 'wife',
        type: 'expense',
        category: 'Reserva para investir',
        description: 'Teste reserva',
        amount: 321,
        month: '2026-04',
        date: '2026-04-10',
        dueDate: '2027-03-10',
        isInvestmentReserve: true
      })
    });

    assert.equal(createResponse.status, 201);

    const investmentsResponse = await fetch(`${baseUrl}/api/investments?member=wife`);
    const investmentsData = await investmentsResponse.json();
    assert.ok(investmentsData.investments.some((item) => item.amount === 321));
  });
});

test('agregação de categorias soma corretamente', async () => {
  await withServer(async (baseUrl) => {
    await fetch(`${baseUrl}/api/transactions/seed`, { method: 'POST' });

    const response = await fetch(`${baseUrl}/reports/expenses-by-category?member=all&from=2026-01-01&to=2026-01-31`);
    const data = await response.json();
    const sumCategories = data.categories.reduce((sum, item) => sum + item.total, 0);

    assert.equal(sumCategories, data.totalExpenses);
  });
});


test('tipo investment é aceito e entra no relatório de investimentos', async () => {
  await withServer(async (baseUrl) => {
    await fetch(`${baseUrl}/api/transactions/seed`, { method: 'POST' });

    const createResponse = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: 'husband',
        type: 'investment',
        category: 'Renda fixa',
        description: 'Aporte extra CDB',
        amount: 777,
        month: '2026-04',
        date: '2026-04-12'
      })
    });

    assert.equal(createResponse.status, 201);

    const investmentsResponse = await fetch(`${baseUrl}/api/investments?member=husband`);
    const investmentsData = await investmentsResponse.json();
    assert.ok(investmentsData.investments.some((item) => item.amount === 777 && item.type === 'direct'));
  });
});
