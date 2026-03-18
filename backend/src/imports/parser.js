import crypto from 'node:crypto';

const HEADER_ALIASES = {
  data: 'date',
  data_lancamento: 'date',
  data_movimentacao: 'date',
  data_movimento: 'date',
  data_transacao: 'date',
  data_operacao: 'date',
  booked_at: 'date',
  lancamento_data: 'date',
  transaction_date: 'date',

  descricao: 'description',
  descrição: 'description',
  historico: 'description',
  historico_lancamento: 'description',
  historico_do_lancamento: 'description',
  memo: 'description',
  detalhe: 'description',
  details: 'description',
  narrative: 'description',
  merchant_name: 'description',

  valor: 'amount',
  valor_movimentado: 'amount',
  valor_lancamento: 'amount',
  valor_transacao: 'amount',
  transaction_amount: 'amount',
  amount_brl: 'amount',
  quantia: 'amount',

  debito_credito: 'entry_direction',
  debito_ou_credito: 'entry_direction',
  credito_debito: 'entry_direction',
  natureza: 'entry_direction',
  tipo_movimento: 'entry_direction',
  dc: 'entry_direction',
  d_c: 'entry_direction',

  categoria_lancamento: 'category',
  classe: 'category',

  vencimento: 'due_date',
  data_vencimento: 'due_date'
};

function normalizeHeader(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return HEADER_ALIASES[normalized] || normalized;
}

function detectDelimiter(line) {
  let commas = 0;
  let semicolons = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === ',') commas += 1;
    if (!inQuotes && char === ';') semicolons += 1;
  }

  return semicolons > commas ? ';' : ',';
}

function parseCsvLine(line, delimiter) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(content) {
  const lines = String(content || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('CSV inválido: informe cabeçalho e ao menos uma linha.');
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);
  return lines.slice(1).map((line, index) => {
    const cols = parseCsvLine(line, delimiter);
    const row = { __line: index + 2, __delimiter: delimiter };
    headers.forEach((header, idx) => {
      row[header] = cols[idx] || '';
    });
    return row;
  });
}

function parseJson(content) {
  const parsed = JSON.parse(content);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.items)) return parsed.items;
  if (Array.isArray(parsed.transactions)) return parsed.transactions;
  throw new Error('JSON inválido: use um array de objetos.');
}

export function detectImportFormat(fileName, content) {
  const safeName = String(fileName || '').toLowerCase();
  if (safeName.endsWith('.csv')) return 'csv';
  if (safeName.endsWith('.json')) return 'json';
  if (safeName.endsWith('.ofx')) return 'ofx';

  const trimmed = String(content || '').trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.includes(',') || trimmed.includes(';')) return 'csv';
  return 'unknown';
}

export function parseImportContent({ fileName, content }) {
  const format = detectImportFormat(fileName, content);
  if (format === 'ofx') {
    throw new Error('OFX ainda não suportado nesta primeira entrega. Use CSV ou JSON.');
  }
  if (format === 'csv') return { format, rows: parseCsv(content) };
  if (format === 'json') return { format, rows: parseJson(content) };
  throw new Error('Formato de arquivo não suportado. Use CSV ou JSON.');
}

export function buildImportFingerprint(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
