import { getPluggyApiKey } from './pluggyAuth.js';

export async function createPluggyConnectToken({ config, connectorId, clientUserId }) {
  const apiKey = await getPluggyApiKey(config);
  const response = await fetch(`${config.pluggyApiBaseUrl}/connect_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey
    },
    body: JSON.stringify({
      connectorId,
      clientUserId,
      includeSandbox: true,
      language: 'pt',
      products: ['ACCOUNTS', 'TRANSACTIONS'],
      redirectUri: config.aispRedirectUri
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error('Falha ao criar connect token no Pluggy.');

  return {
    connectToken: data.accessToken || data.connectToken || '',
    expiresAt: data.expiresAt || null
  };
}
