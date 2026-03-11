import { getPluggyApiKey } from './pluggyAuth.js';

export async function fetchPluggyAccounts({ config, itemId }) {
  const apiKey = await getPluggyApiKey(config);
  const response = await fetch(`${config.pluggyApiBaseUrl}/accounts?itemId=${encodeURIComponent(itemId)}`, {
    headers: { 'X-API-KEY': apiKey }
  });
  const data = await response.json();
  if (!response.ok) throw new Error('Falha ao buscar contas no Pluggy.');
  return data.results || data.accounts || [];
}

export async function fetchPluggyTransactions({ config, accountId, fromDate, toDate }) {
  const apiKey = await getPluggyApiKey(config);
  const query = new URLSearchParams({ accountId, from: fromDate, to: toDate, pageSize: '500' }).toString();
  const response = await fetch(`${config.pluggyApiBaseUrl}/transactions?${query}`, {
    headers: { 'X-API-KEY': apiKey }
  });
  const data = await response.json();
  if (!response.ok) throw new Error('Falha ao buscar transações no Pluggy.');
  return data.results || data.transactions || [];
}

export async function disconnectPluggyItem({ config, itemId }) {
  const apiKey = await getPluggyApiKey(config);
  const response = await fetch(`${config.pluggyApiBaseUrl}/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers: { 'X-API-KEY': apiKey }
  });
  if (!response.ok && response.status !== 404) {
    throw new Error('Falha ao desconectar item no Pluggy.');
  }
}
