import { buildImporter } from './base-importer.js';

function includesAny(text, values) {
  return values.some((value) => text.includes(value));
}

export const itauImporter = buildImporter({
  key: 'ITAU',
  label: 'Itaú',
  supports({ fileName, rows, format, parserLayout }) {
    const safeName = String(fileName || '').toLowerCase();
    const sample = JSON.stringify(rows[0] || {}).toLowerCase();
    return includesAny(safeName, ['itau', 'itaú'])
      || format === 'pdf'
      || String(parserLayout || '').includes('itau')
      || includesAny(sample, ['agencia', 'agência', 'conta_corrente', 'saldo_em_conta', 'lancamento_futuro', 'descricao_lancamento']);
  },
  extractAccountInfo({ row, accountIdHint, accountLabelHint }) {
    const agency = row.agencia || row.agência || row.branch || '';
    const account = row.conta || row.conta_corrente || row.account || row.numero_conta || '';
    const composite = [agency, account].filter(Boolean).join('-');
    const normalizedId = String(accountIdHint || composite || 'itau-conta-principal')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    return {
      accountId: normalizedId || 'itau-conta-principal',
      accountLabel: accountLabelHint || [agency && `Ag ${agency}`, account && `Cc ${account}`].filter(Boolean).join(' · ') || 'Conta Itaú'
    };
  },
  normalizeRow({ row }) {
    return {
      bankKey: 'ITAU',
      bankName: 'Itaú',
      description: row.description || row.descricao_lancamento || row.historico || row.details || '',
      entryDirection: row.entry_direction || row.tipo || row.natureza || ''
    };
  }
});
