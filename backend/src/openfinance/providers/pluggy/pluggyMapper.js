export function mapPluggyAccount(account) {
  return {
    external_account_id: String(account.id),
    type: account.type || account.subtype || 'CHECKING',
    currency: account.currencyCode || account.currency || 'BRL',
    masked_number: account.number ? `****${String(account.number).slice(-4)}` : '****',
    name: account.name || account.marketingName || 'Conta'
  };
}

export function mapPluggyTransaction(tx) {
  return {
    external_tx_id: String(tx.id),
    booked_at: (tx.date || tx.paymentDate || '').slice(0, 10),
    amount: Number(tx.amount || 0),
    currency: tx.currencyCode || tx.currency || 'BRL',
    description: tx.description || tx.operationType || 'Transação',
    merchant: tx.merchant?.businessName || tx.merchant?.name || tx.paymentData?.receiver || '',
    category: tx.category || tx.personalFinanceCategory || 'Outros',
    raw: tx
  };
}
