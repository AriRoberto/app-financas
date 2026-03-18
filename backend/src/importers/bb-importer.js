import { buildImporter } from './base-importer.js';

function includesAny(text, values) {
  return values.some((value) => text.includes(value));
}

export const bbImporter = buildImporter({
  key: 'BB',
  label: 'Banco do Brasil',
  supports({ fileName, rows }) {
    const sample = JSON.stringify(rows[0] || {}).toLowerCase();
    const safeName = String(fileName || '').toLowerCase();
    return includesAny(safeName, ['bb', 'banco do brasil', 'extrato conta corrente'])
      || includesAny(sample, ['tipo_lancamento', 'lancamento', 'saldo anterior', 'rende facil', 'rende fácil']);
  },
  extractAccountInfo({ fileName, row, accountIdHint, accountLabelHint }) {
    const explicit = accountIdHint || row.account_id || row.conta || row.numero_conta || '';
    const normalizedId = String(explicit || fileName || 'bb-conta-principal')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    return {
      accountId: normalizedId || 'bb-conta-principal',
      accountLabel: accountLabelHint || row.conta || row.numero_conta || 'Conta Banco do Brasil'
    };
  },
  normalizeRow({ row }) {
    return {
      bankKey: 'BB',
      bankName: 'Banco do Brasil',
      description: row.description || row.lancamento || row.historico || row.details || '',
      entryDirection: row.entry_direction || row.tipo_lancamento || row.tipo || ''
    };
  }
});
