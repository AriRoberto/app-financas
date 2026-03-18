import crypto from 'node:crypto';

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsvLine(line) {
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

    if (char === ',' && !inQuotes) {
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

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  return lines.slice(1).map((line, index) => {
    const cols = parseCsvLine(line);
    const row = { __line: index + 2 };
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
  if (trimmed.includes(',')) return 'csv';
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
