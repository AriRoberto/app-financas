import test from 'node:test';
import assert from 'node:assert/strict';

import { detectImportFormat, parseImportContent } from './parser.js';
import { previewImportRows } from './service.js';

test('detectImportFormat detecta JSON e CSV sem depender do nome do arquivo', () => {
  assert.equal(detectImportFormat('', '[{"amount":10}]'), 'json');
  assert.equal(detectImportFormat('', 'date,amount\n2026-03-01,10'), 'csv');
  assert.equal(detectImportFormat('', 'data;valor\n18/03/2026;10'), 'csv');
});

test('parseImportContent rejeita OFX nesta primeira entrega', () => {
  assert.throws(
    () => parseImportContent({ fileName: 'extrato.ofx', content: '<OFX></OFX>' }),
    /OFX ainda não suportado/
  );
});

test('previewImportRows normaliza CSV BB com metadados bancários', () => {
  const result = previewImportRows({
    fileName: 'extrato.csv',
    content: 'data,descricao,valor,categoria\n18/03/2026,Supermercado,"1.234,56",Mercado',
    importType: 'expense',
    memberId: 'wife',
    fallbackMonth: '2026-03'
  });

  assert.equal(result.format, 'csv');
  assert.equal(result.importer.key, 'BB');
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].type, 'expense');
  assert.equal(result.rows[0].category, 'Mercado');
  assert.equal(result.rows[0].description, 'Supermercado');
  assert.equal(result.rows[0].amount, 1234.56);
  assert.equal(result.rows[0].date, '2026-03-18');
  assert.equal(result.rows[0].bankKey, 'BB');
  assert.equal(result.rows[0].accountLabel, 'Conta Banco do Brasil');
  assert.match(result.rows[0].fingerprint, /^[a-f0-9]{64}$/);
});

test('previewImportRows suporta delimitador ponto e vírgula e cabeçalhos bancários flexíveis', () => {
  const result = previewImportRows({
    fileName: 'banco.csv',
    content: 'Data lançamento;Histórico;Valor movimentado;Débito/Crédito\n18/03/2026;PIX recebido;2500,00;Crédito',
    importType: 'transaction',
    memberId: 'husband',
    fallbackMonth: '2026-03'
  });

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].type, 'income');
  assert.equal(result.rows[0].description, 'PIX recebido');
  assert.equal(result.rows[0].amount, 2500);
  assert.equal(result.rows[0].date, '2026-03-18');
});

test('previewImportRows usa sinal negativo para inferir despesa quando importType é transaction', () => {
  const result = previewImportRows({
    fileName: 'extrato.csv',
    content: 'data movimentação;descrição;valor\n18/03/2026;Mercado;-125,45',
    importType: 'transaction',
    memberId: 'wife',
    fallbackMonth: '2026-03'
  });

  assert.equal(result.rows[0].type, 'expense');
  assert.equal(result.rows[0].amount, 125.45);
});

test('previewImportRows suporta cabeçalho CSV com quebra de linha em campo entre aspas', () => {
  const result = previewImportRows({
    fileName: 'extrato-bb.csv',
    content: '"Data","Lançamento","Detalhes","Nº documento","Valor","Tipo\nLançamento"\n"02/01/2026","Cobrança de Juros","Juros Saldo Devedor Conta","511058923","-86,70","Saída"',
    importType: 'transaction',
    memberId: 'husband',
    fallbackMonth: '2026-01'
  });

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].description, 'Cobrança de Juros');
  assert.equal(result.rows[0].amount, 86.7);
  assert.equal(result.rows[0].type, 'expense');
});

test('previewImportRows ignora linha de saldo anterior com valor zero', () => {
  const result = previewImportRows({
    fileName: 'extrato-bb.csv',
    content: '"Data","Lançamento","Detalhes","Nº documento","Valor","Tipo"\n"31/12/2025","Saldo Anterior","","","0,00","Saldo"\n"02/01/2026","BB Rende Fácil","Rende Fácil","9993","95,53","Entrada"',
    importType: 'transaction',
    memberId: 'husband',
    fallbackMonth: '2026-01'
  });

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].description, 'BB Rende Fácil');
  assert.equal(result.rows[0].amount, 95.53);
  assert.equal(result.rows[0].type, 'income');
});

test('previewImportRows suporta CSV do Itaú com agência/conta e hint automático do banco', () => {
  const result = previewImportRows({
    fileName: 'extrato-itau.csv',
    content: 'Data,Descrição lançamento,Valor R$,Tipo,Agência,Conta corrente\n18/03/2026,Pix recebido,"2.500,00",Entrada,1234,56789-0\n19/03/2026,Compra mercado,"-230,45",Saída,1234,56789-0',
    importType: 'transaction',
    memberId: 'wife',
    fallbackMonth: '2026-03'
  });

  assert.equal(result.importer.key, 'ITAU');
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].bankName, 'Itaú');
  assert.equal(result.rows[0].accountId, '1234-56789-0');
  assert.equal(result.rows[0].type, 'income');
  assert.equal(result.rows[1].type, 'expense');
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
      content: `data,descricao,valor\n18/03/2026,Supermercado,`,
      importType: 'expense',
      memberId: 'wife',
      fallbackMonth: '2026-03'
    }),
    /Erro na linha 2: Valor ausente no arquivo/
  );
});
