import zlib from 'node:zlib';

function decodePdfSource(content) {
  const safe = String(content || '');
  if (safe.startsWith('data:application/pdf;base64,')) {
    return Buffer.from(safe.split(',')[1], 'base64');
  }
  if (safe.startsWith('%PDF')) {
    return Buffer.from(safe, 'binary');
  }
  return null;
}

function extractStreams(buffer) {
  const binary = buffer.toString('binary');
  const streams = [];
  let index = 0;
  while ((index = binary.indexOf('stream', index)) !== -1) {
    let start = index + 6;
    if (binary[start] === '\r' && binary[start + 1] === '\n') start += 2;
    else if (binary[start] === '\n') start += 1;
    const end = binary.indexOf('endstream', start);
    if (end === -1) break;
    streams.push(buffer.subarray(start, end));
    index = end + 9;
  }
  return streams;
}

function decodeStream(stream) {
  try {
    return zlib.inflateSync(stream).toString('latin1');
  } catch {
    return stream.toString('latin1');
  }
}

function decodePdfString(value) {
  return value
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\([0-7]{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
}

export function extractPdfText(content) {
  const buffer = decodePdfSource(content);
  if (!buffer) throw new Error('PDF inválido ou não codificado em base64.');
  const pieces = extractStreams(buffer)
    .map(decodeStream)
    .flatMap((stream) => {
      const matches = [...stream.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj|\[(.*?)\]\s*TJ/gs)];
      return matches.flatMap((match) => {
        if (match[0].includes(' Tj')) return [decodePdfString(match[0].replace(/\)\s*Tj$/, '').replace(/^\(/, ''))];
        return [...match[1].matchAll(/\((?:\\.|[^\\)])*\)/g)].map((inner) => decodePdfString(inner[0].slice(1, -1)));
      });
    });
  return pieces.join('\n').replace(/\u0000/g, ' ').replace(/\s+\n/g, '\n').trim();
}

export function parseItauPdfRows(content) {
  const text = extractPdfText(content);
  const normalizedLines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const accountMatch = text.match(/Ag[êe]ncia\s*(\d+)\s*Conta\s*(\d+[\-\d]*)/i);
  const rows = [];

  for (const line of normalizedLines) {
    const match = line.match(/(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})$/);
    if (!match) continue;
    rows.push({
      date: match[1],
      description: match[2],
      amount: match[3],
      balance: match[4],
      agencia: accountMatch?.[1] || '',
      conta_corrente: accountMatch?.[2] || ''
    });
  }

  if (!rows.length) {
    throw new Error('Não foi possível extrair lançamentos do PDF. Layout esperado: linhas com data, descrição, valor e saldo final.');
  }

  return {
    format: 'pdf',
    layout: 'itau-extrato-textual-v1',
    text,
    rows
  };
}
