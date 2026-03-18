function parseSignedAmount(raw) {
  if (typeof raw === 'number') {
    if (Number.isNaN(raw)) throw new Error('Valor inválido no arquivo.');
    return raw;
  }

  const rawValue = String(raw ?? '').trim();
  if (rawValue === '') throw new Error('Valor ausente no arquivo.');

  const negative = rawValue.startsWith('-') || rawValue.endsWith('-') || /^\(.+\)$/.test(rawValue);
  const cleaned = rawValue
    .replace(/[()]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')
    .replace(/-$/g, '');

  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') {
    throw new Error('Valor inválido no arquivo.');
  }

  const value = Number(cleaned);
  if (Number.isNaN(value)) throw new Error('Valor inválido no arquivo.');
  return negative ? -Math.abs(value) : value;
}

function pickValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return '';
}

function normalizeDirection(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (['credito', 'crédito', 'credit', 'c', 'entrada', 'recebimento'].includes(value)) return 'credit';
  if (['debito', 'débito', 'debit', 'd', 'saida', 'saída', 'pagamento'].includes(value)) return 'debit';
  return '';
}

function normalizeType(rawType, importType, signedAmount) {
  const explicit = String(rawType || '').toLowerCase();
  if (['receita', 'income', 'credit', 'entrada'].includes(explicit)) return 'income';
  if (['investimento', 'investment', 'aplicacao', 'aplicação'].includes(explicit)) return 'investment';
  if (['despesa', 'expense', 'debit', 'transaction', 'transacao', 'transação', 'saida', 'saída'].includes(explicit)) return 'expense';

  const forced = String(importType || 'transaction').toLowerCase();
  if (forced === 'income') return 'income';
  if (forced === 'expense') return 'expense';
  if (forced === 'investment') return 'investment';

  return signedAmount < 0 ? 'expense' : 'income';
}

function normalizeDate(raw, fallbackMonth) {
  const value = String(raw || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  return `${fallbackMonth}-01`;
}

function normalizeMonth(date) {
  return String(date).slice(0, 7);
}

function shouldIgnoreRow({ amount, description, row }) {
  const normalizedDescription = String(description || '').trim().toLowerCase();
  const normalizedType = String(pickValue(row, ['type', 'tipo', 'entry_type']) || '').trim().toLowerCase();

  if (amount !== 0) return false;
  if (['saldo anterior', 'saldo final', 'saldo bloqueado', 'saldo disponivel', 'saldo disponível', 'saldo em conta'].some((item) => normalizedDescription.includes(item))) {
    return true;
  }
  return ['saldo', 'balance'].includes(normalizedType);
}

export function normalizeImportedRow({ row, importer, importType, memberId, fallbackMonth, accountIdHint, accountLabelHint, fileName, referencePeriod }) {
  const overrides = importer.normalizeRow({ row, fileName, accountIdHint, accountLabelHint, referencePeriod });
  const rawAmount = pickValue(row, ['amount', 'valor', 'value', 'valor_movimentado', 'valor_lancamento', 'valor_rs', 'valor_r']) || row.amount;
  const signedAmount = parseSignedAmount(rawAmount);
  const direction = normalizeDirection(overrides.entryDirection || pickValue(row, ['entry_direction', 'debito_credito', 'debito_ou_credito', 'natureza', 'dc', 'tipo_lancamento', 'tipo']));
  const explicitType = pickValue(row, ['type', 'tipo', 'entry_type']);

  let normalizedSignedAmount = signedAmount;
  if (direction === 'debit') normalizedSignedAmount = -Math.abs(signedAmount);
  if (direction === 'credit') normalizedSignedAmount = Math.abs(signedAmount);

  const type = normalizeType(direction || explicitType, importType, normalizedSignedAmount);
  const date = normalizeDate(pickValue(row, ['date', 'data', 'booked_at', 'data_lancamento', 'data_movimentacao', 'data_movimento', 'transaction_date']), fallbackMonth);
  const description = overrides.description || pickValue(row, ['description', 'descricao', 'descrição', 'descricao_lancamento', 'merchant', 'historico', 'historico_lancamento', 'detalhe', 'memo']) || 'Importação';
  const category = pickValue(row, ['category', 'categoria', 'categoria_lancamento']) || (type === 'income' ? 'Salário' : type === 'investment' ? 'Renda fixa' : 'Outros');
  const dueDate = normalizeDate(pickValue(row, ['due_date', 'vencimento', 'data_vencimento']), normalizeMonth(date));
  const accountInfo = importer.extractAccountInfo({ row, fileName, accountIdHint, accountLabelHint, referencePeriod });

  if (shouldIgnoreRow({ amount: Math.abs(normalizedSignedAmount), description, row })) {
    return null;
  }

  return {
    memberId,
    type,
    category,
    description,
    amount: Math.abs(normalizedSignedAmount),
    date,
    month: normalizeMonth(date),
    dueDate,
    bankKey: overrides.bankKey || importer.key,
    bankName: overrides.bankName || importer.label,
    accountId: accountInfo.accountId || `${importer.key.toLowerCase()}-conta-principal`,
    accountLabel: accountInfo.accountLabel || `Conta ${importer.label}`,
    referencePeriod: referencePeriod || normalizeMonth(date)
  };
}
