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

  lancamento: 'description',

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

  tipo_lancamento: 'entry_direction',

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
  data_vencimento: 'due_date',

  agencia: 'agencia',
  agência: 'agencia',
  branch: 'agencia',
  conta_corrente: 'conta',
  numero_conta: 'conta',
  descricao_lancamento: 'description',
  valor_rs: 'amount',
  valor_r: 'amount',
  saldo_em_conta: 'balance'
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

function sanitizeCsvContent(content) {
  return String(content || '').replace(/^\uFEFF/, '');
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

function getFirstCsvRecord(content) {
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      return current;
    }

    current += char;
  }

  return current;
}

function parseCsvRows(content, delimiter) {
  const rows = [];
  let row = [];
  let current = '';
  let inQuotes = false;
  let line = 1;
  let rowStartLine = 1;

  function pushCell() {
    row.push(current.trim());
    current = '';
  }

  function pushRow() {
    const hasData = row.some((value) => value !== '');
    if (hasData) {
      rows.push({ values: row, line: rowStartLine });
    }
    row = [];
    rowStartLine = line;
  }

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === delimiter) {
      pushCell();
      continue;
    }

    if (!inQuotes && char === '\r') {
      pushCell();
      pushRow();
      if (next === '\n') i += 1;
      line += 1;
      rowStartLine = line;
      continue;
    }

    if (!inQuotes && char === '\n') {
      pushCell();
      pushRow();
      line += 1;
      rowStartLine = line;
      continue;
    }

    if (char === '\n') line += 1;
    current += char;
  }

  if (current !== '' || row.length) {
    pushCell();
    pushRow();
  }

  return rows;
}

function parseCsv(content) {
  const sanitized = sanitizeCsvContent(content);
  const firstRecord = getFirstCsvRecord(sanitized);
  const delimiter = detectDelimiter(firstRecord);
  const rows = parseCsvRows(sanitized, delimiter);

  if (rows.length < 2) {
    throw new Error('CSV inválido: informe cabeçalho e ao menos uma linha.');
  }

  const headers = rows[0].values.map(normalizeHeader);
  return rows.slice(1).map(({ values, line }) => {
    const row = { __line: line, __delimiter: delimiter };
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
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
