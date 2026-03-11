import {
  addAudit,
  getConnection,
  getConsentByConnection,
  listActiveConsents,
  listAccounts,
  upsertAccount,
  upsertTransaction
} from './store.js';

export async function syncConnection({ aispClient, connection, consent, fromDate, toDate }) {
  addAudit('sync_started', { connection_id: connection.id, consent_id: consent.id });

  const accountsPayload = await aispClient.fetch_accounts(consent.consent_id_externo);
  const accounts = accountsPayload.accounts || [];

  let inserted = 0;
  for (const account of accounts) {
    const normalizedAccount = upsertAccount({
      connection_id: connection.id,
      external_account_id: account.external_account_id,
      type: account.type,
      currency: account.currency || 'BRL',
      masked_number: account.masked_number,
      name: account.name
    });

    const txPayload = await aispClient.fetch_transactions(
      account.external_account_id,
      fromDate,
      toDate,
      consent.consent_id_externo
    );

    for (const tx of txPayload.transactions || []) {
      const { created } = upsertTransaction({
        account_id: normalizedAccount.id,
        external_tx_id: tx.external_tx_id,
        booked_at: tx.booked_at,
        amount: tx.amount,
        currency: tx.currency || 'BRL',
        description: tx.description,
        merchant: tx.merchant,
        category: tx.category,
        raw: tx
      });
      if (created) inserted += 1;
    }
  }

  addAudit('sync_finished', { connection_id: connection.id, inserted });
  return {
    accountsImported: accounts.length,
    transactionsImported: inserted,
    from: fromDate,
    to: toDate
  };
}

export async function syncByConnectionId({ connectionId, aispClient, fromDate, toDate }) {
  const connection = getConnection(connectionId);
  if (!connection) throw new Error('connection_not_found');
  if (!connection.item_id) throw new Error('connection_not_authorized');
  const consent = getConsentByConnection(connectionId);
  if (!consent || consent.status !== 'active') throw new Error('consent_inactive');
  return syncConnection({ aispClient, connection, consent, fromDate, toDate });
}

export function startPeriodicSync({ intervalMs, aispClient }) {
  return setInterval(async () => {
    const active = listActiveConsents();
    const now = new Date();
    const toDate = now.toISOString().slice(0, 10);
    const fromDate = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);

    for (const consent of active) {
      try {
        const account = listAccounts('demo-user').find((x) => x.connection_id === consent.connection_id);
        const connection = getConnection(consent.connection_id);
        if (!connection || connection.status !== 'active') continue;
        await syncConnection({ aispClient, connection, consent, fromDate: account?.last_booked_at || fromDate, toDate });
      } catch {
        // no sensitive logging
      }
    }
  }, intervalMs);
}
