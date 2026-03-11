import { sanitizeForLog } from './security.js';
import { createPluggyConnectToken } from './providers/pluggy/pluggyConnect.js';
import { resolveConnectorForInstitution } from './providers/pluggy/connectorResolver.js';
import { fetchPluggyAccounts, fetchPluggyTransactions, disconnectPluggyItem } from './providers/pluggy/pluggyData.js';
import { mapPluggyAccount, mapPluggyTransaction } from './providers/pluggy/pluggyMapper.js';

async function withRetry(fn, attempts = 3, baseMs = 150) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, baseMs * (i + 1)));
    }
  }
  throw lastError;
}

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`AISP error ${response.status}: ${sanitizeForLog(data)}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export class AispClient {
  constructor(config) {
    this.config = config;
  }

  async resolve_institution(institution) {
    if (this.config.openFinanceMock) {
      return { status: 'SUPPORTED', connectorId: institution, connectorName: institution };
    }
    return resolveConnectorForInstitution({ config: this.config, institution });
  }

  async create_consent({ user_id, institution, scopes, from_date, to_date, state, connectorId }) {
    if (this.config.openFinanceMock) {
      return withRetry(() => requestJson(`${this.config.aispBaseUrl}/consents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, institution, scopes, from_date, to_date, redirect_uri: this.config.aispRedirectUri, state })
      }));
    }

    const token = await createPluggyConnectToken({
      config: this.config,
      connectorId,
      clientUserId: user_id
    });

    return {
      connect_token: token.connectToken,
      expires_at: token.expiresAt,
      state
    };
  }

  async exchange_code_for_token(code) {
    return withRetry(() => requestJson(`${this.config.aispBaseUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, client_id: this.config.aispClientId, client_secret: this.config.aispClientSecret })
    }));
  }

  async fetch_accounts(consent_ref) {
    if (this.config.openFinanceMock) {
      return withRetry(() => requestJson(`${this.config.aispBaseUrl}/accounts?consent_ref=${encodeURIComponent(consent_ref)}`));
    }

    const accounts = await fetchPluggyAccounts({ config: this.config, itemId: consent_ref });
    return { accounts: accounts.map(mapPluggyAccount) };
  }

  async fetch_transactions(account_external_id, from_date, to_date, consent_ref) {
    if (this.config.openFinanceMock) {
      const query = new URLSearchParams({ account_external_id, from_date, to_date, consent_ref }).toString();
      return withRetry(() => requestJson(`${this.config.aispBaseUrl}/transactions?${query}`));
    }

    const transactions = await fetchPluggyTransactions({
      config: this.config,
      accountId: account_external_id,
      fromDate: from_date,
      toDate: to_date
    });
    return { transactions: transactions.map(mapPluggyTransaction) };
  }

  async revoke_consent(consent_ref) {
    if (this.config.openFinanceMock) {
      return withRetry(() => requestJson(`${this.config.aispBaseUrl}/consents/${encodeURIComponent(consent_ref)}/revoke`, {
        method: 'POST'
      }));
    }

    await disconnectPluggyItem({ config: this.config, itemId: consent_ref });
    return { revoked: true };
  }
}
