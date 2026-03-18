import test from 'node:test';
import assert from 'node:assert/strict';

import { detectImportFormat, parseImportContent } from './parser.js';
import { previewImportRows } from './service.js';

test('detectImportFormat detecta JSON e CSV sem depender do nome do arquivo', () => {
  assert.equal(detectImportFormat('', '[{"amount":10}]'), 'json');
  assert.equal(detectImportFormat('', 'date,amount\n2026-03-01,10'), 'csv');
});

test('parseImportContent rejeita OFX nesta primeira entrega', () => {
  assert.throws(
    () => parseImportContent({ fileName: 'extrato.ofx', content: '<OFX></OFX>' }),
    /OFX ainda não suportado/
  );
});

test('previewImportRows normaliza CSV com datas e valores BR', () => {
  const result = previewImportRows({
    fileName: 'extrato.csv',
    content: 'data,descricao,valor,categoria\n18/03/2026,Supermercado,"1.234,56",Mercado',
    importType: 'expense',
    memberId: 'wife',
    fallbackMonth: '2026-03'
  });

  assert.equal(result.format, 'csv');
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.rows[0], {
    importType: 'expense',
    memberId: 'wife',
    type: 'expense',
    category: 'Mercado',
    description: 'Supermercado',
    amount: 1234.56,
    date: '2026-03-18',
    month: '2026-03',
    dueDate: '2026-03-01',
    fingerprint: result.rows[0].fingerprint
  });
  assert.match(result.rows[0].fingerprint, /^[a-f0-9]{64}$/);
});

test('previewImportRows usa fallback quando conteúdo colado não tem filename', () => {
  const result = previewImportRows({
    fileName: '',
    content: JSON.stringify([{ amount: '2500', description: 'Salário', date: '2026-03-05', type: 'income' }]),
    importType: 'income',
    memberId: 'husband',
    fallbackMonth: '2026-03'
  });

  assert.equal(result.format, 'json');
  assert.equal(result.rows[0].type, 'income');
  assert.equal(result.rows[0].category, 'Salário');
  assert.equal(result.rows[0].month, '2026-03');
});


test('previewImportRows falha com valor ausente no CSV', () => {
  assert.throws(
    () => previewImportRows({
      fileName: 'extrato.csv',
      content: `data,descricao,valor
18/03/2026,Supermercado,`,
      importType: 'expense',
      memberId: 'wife',
      fallbackMonth: '2026-03'
    }),
    /Erro na linha 2: Valor ausente no arquivo/
  );
});
