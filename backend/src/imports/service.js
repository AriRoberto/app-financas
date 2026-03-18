import { buildImportFingerprint, parseImportContent } from './parser.js';

function parseAmount(raw) {
  if (typeof raw === 'number') return raw;
  const normalized = String(raw || '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const value = Number(normalized);
  if (Number.isNaN(value)) throw new Error('Valor inválido no arquivo.');
  return value;
}

function pickValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return '';
}

function normalizeType(rawType, importType) {
  const value = String(rawType || importType || 'transaction').toLowerCase();
  if (['receita', 'income', 'credit'].includes(value)) return 'income';
  if (['investimento', 'investment'].includes(value)) return 'investment';
  if (['despesa', 'expense', 'debit', 'transaction', 'transacao', 'transação'].includes(value)) return 'expense';
  return 'expense';
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

export function previewImportRows({ fileName, content, importType, memberId, fallbackMonth = new Date().toISOString().slice(0, 7) }) {
  const { format, rows } = parseImportContent({ fileName, content });
  const preview = rows.map((row, index) => {
    const type = normalizeType(pickValue(row, ['type', 'tipo', 'entry_type']), importType);
    const date = normalizeDate(pickValue(row, ['date', 'data', 'booked_at']), fallbackMonth);
    const category = pickValue(row, ['category', 'categoria']) || (type === 'income' ? 'Salário' : type === 'investment' ? 'Renda fixa' : 'Outros');
    const description = pickValue(row, ['description', 'descricao', 'descrição', 'merchant', 'historico', 'historico_lancamento']) || `Importação ${index + 1}`;
    const amount = parseAmount(pickValue(row, ['amount', 'valor', 'value']));
    const dueDate = normalizeDate(pickValue(row, ['due_date', 'vencimento']), normalizeMonth(date));

    return {
      importType,
      memberId,
      type,
      category,
      description,
      amount,
      date,
      month: normalizeMonth(date),
      dueDate,
      fingerprint: buildImportFingerprint({ memberId, type, category, description, amount, date })
    };
  });

  return { format, rows: preview };
}
