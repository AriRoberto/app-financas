import { sanitizeForLog } from './security.js';

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

  async create_consent({ user_id, institution, scopes, from_date, to_date, state }) {
    return withRetry(() => requestJson(`${this.config.aispBaseUrl}/consents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, institution, scopes, from_date, to_date, redirect_uri: this.config.aispRedirectUri, state })
    }));
  }

  async exchange_code_for_token(code) {
    return withRetry(() => requestJson(`${this.config.aispBaseUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, client_id: this.config.aispClientId, client_secret: this.config.aispClientSecret })
    }));
  }

  async fetch_accounts(consent_ref) {
    return withRetry(() => requestJson(`${this.config.aispBaseUrl}/accounts?consent_ref=${encodeURIComponent(consent_ref)}`));
  }

  async fetch_transactions(account_external_id, from_date, to_date, consent_ref) {
    const query = new URLSearchParams({ account_external_id, from_date, to_date, consent_ref }).toString();
    return withRetry(() => requestJson(`${this.config.aispBaseUrl}/transactions?${query}`));
  }

  async revoke_consent(consent_ref) {
    return withRetry(() => requestJson(`${this.config.aispBaseUrl}/consents/${encodeURIComponent(consent_ref)}/revoke`, {
      method: 'POST'
    }));
  }
}
