import { hashRawTx } from './security.js';

const nowIso = () => new Date().toISOString();

const db = {
  bank_connections: [],
  bank_consents: [],
  bank_tokens: [],
  bank_accounts: [],
  bank_transactions: [],
  audit_logs: [],
  states: new Map()
};

function nextId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function addAudit(event, meta = {}) {
  db.audit_logs.push({ id: nextId('audit'), event, meta, created_at: nowIso() });
}

export function createConnection({ user_id, institution, institution_key, status, provider = 'mock', member = 'family', connector_id = null }) {
  const item = { id: nextId('conn'), user_id, institution, institution_key: institution_key || institution, status, provider, member, connector_id, item_id: null, created_at: nowIso(), updated_at: nowIso() };
  db.bank_connections.push(item);
  return item;
}

export function updateConnection(id, patch) {
  const current = db.bank_connections.find((x) => x.id === id);
  if (!current) return null;
  Object.assign(current, patch, { updated_at: nowIso() });
  return current;
}

export function listConnections(userId) {
  return db.bank_connections.filter((x) => x.user_id === userId);
}

export function createConsent({ connection_id, consent_id_externo, scopes, granted_at, expires_at, status }) {
  const item = { id: nextId('cons'), connection_id, consent_id_externo, scopes, granted_at, expires_at, revoked_at: null, status };
  db.bank_consents.push(item);
  return item;
}

export function getConsentByConnection(connectionId) {
  return db.bank_consents.find((x) => x.connection_id === connectionId && x.status !== 'revoked');
}

export function getConsentByExternal(consentRef) {
  return db.bank_consents.find((x) => x.consent_id_externo === consentRef);
}

export function revokeConsent(consentId) {
  const item = db.bank_consents.find((x) => x.id === consentId);
  if (!item) return null;
  item.status = 'revoked';
  item.revoked_at = nowIso();
  return item;
}

export function upsertToken({ consent_id, access_token_enc, refresh_token_enc, token_expires_at }) {
  const found = db.bank_tokens.find((x) => x.consent_id === consent_id);
  if (found) {
    Object.assign(found, { access_token_enc, refresh_token_enc, token_expires_at, rotated_at: nowIso() });
    return found;
  }
  const item = { id: nextId('tok'), consent_id, access_token_enc, refresh_token_enc, token_expires_at, rotated_at: null };
  db.bank_tokens.push(item);
  return item;
}

export function deleteTokensByConsent(consentId) {
  db.bank_tokens = db.bank_tokens.filter((x) => x.consent_id !== consentId);
}

export function upsertAccount({ connection_id, external_account_id, type, currency, masked_number, name }) {
  const found = db.bank_accounts.find((x) => x.connection_id === connection_id && x.external_account_id === external_account_id);
  if (found) {
    Object.assign(found, { type, currency, masked_number, name });
    return found;
  }
  const item = { id: nextId('acc'), connection_id, external_account_id, type, currency, masked_number, name, created_at: nowIso() };
  db.bank_accounts.push(item);
  return item;
}

export function listAccounts(userId) {
  const conns = db.bank_connections.filter((x) => x.user_id === userId).map((x) => x.id);
  return db.bank_accounts.filter((x) => conns.includes(x.connection_id));
}

export function upsertTransaction({ account_id, external_tx_id, booked_at, amount, currency, description, merchant, category, raw }) {
  const found = db.bank_transactions.find((x) => x.account_id === account_id && x.external_tx_id === external_tx_id);
  const raw_hash = hashRawTx(raw);
  if (found) {
    Object.assign(found, { booked_at, amount, currency, description, merchant, category, raw_hash });
    return { item: found, created: false };
  }

  const item = {
    id: nextId('tx'),
    account_id,
    external_tx_id,
    booked_at,
    amount,
    currency,
    description,
    merchant,
    category,
    raw_hash,
    created_at: nowIso()
  };
  db.bank_transactions.push(item);
  return { item, created: true };
}

export function listTransactionsByAccount(accountId, from, to) {
  return db.bank_transactions.filter((x) => {
    if (x.account_id !== accountId) return false;
    if (from && x.booked_at < from) return false;
    if (to && x.booked_at > to) return false;
    return true;
  });
}

export function getConnection(id) {
  return db.bank_connections.find((x) => x.id === id) || null;
}

export function saveState(state, payload) {
  db.states.set(state, { ...payload, created_at: nowIso() });
}

export function consumeState(state) {
  const data = db.states.get(state);
  db.states.delete(state);
  return data;
}

export function listActiveConsents() {
  return db.bank_consents.filter((x) => x.status === 'active' && (!x.expires_at || x.expires_at >= nowIso()));
}

export function purgeExpiredTokens() {
  const now = nowIso();
  const before = db.bank_tokens.length;
  db.bank_tokens = db.bank_tokens.filter((x) => x.token_expires_at > now);
  return before - db.bank_tokens.length;
}

export function purgeOldAuditLogs(days = 180) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const before = db.audit_logs.length;
  db.audit_logs = db.audit_logs.filter((x) => x.created_at >= cutoff);
  return before - db.audit_logs.length;
}

export function __resetOpenFinanceStore() {
  db.bank_connections = [];
  db.bank_consents = [];
  db.bank_tokens = [];
  db.bank_accounts = [];
  db.bank_transactions = [];
  db.audit_logs = [];
  db.states = new Map();
}

export { db };
