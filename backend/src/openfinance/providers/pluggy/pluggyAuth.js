const authCache = {
  apiKey: '',
  expiresAt: 0
};

async function fetchApiKey(config) {
  const response = await fetch(`${config.pluggyApiBaseUrl}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: config.aispClientId, clientSecret: config.aispClientSecret })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error('Falha ao autenticar no Pluggy.');
  }

  const expiresInSeconds = Number(data.expiresIn || 7200);
  authCache.apiKey = data.apiKey;
  authCache.expiresAt = Date.now() + Math.max(60, expiresInSeconds - 120) * 1000;
  return authCache.apiKey;
}

export async function getPluggyApiKey(config) {
  if (authCache.apiKey && Date.now() < authCache.expiresAt) {
    return authCache.apiKey;
  }
  return fetchApiKey(config);
}

export function __resetPluggyAuthCache() {
  authCache.apiKey = '';
  authCache.expiresAt = 0;
}
