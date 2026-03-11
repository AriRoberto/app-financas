export function getEnvConfig() {
  return {
    aispBaseUrl: process.env.AISP_BASE_URL || 'http://localhost:3333/mock-aisp',
    aispClientId: process.env.AISP_CLIENT_ID || '',
    aispClientSecret: process.env.AISP_CLIENT_SECRET || '',
    aispRedirectUri: process.env.AISP_REDIRECT_URI || 'http://localhost:3333/api/banks/callback',
    aispWebhookSecret: process.env.AISP_WEBHOOK_SECRET || '',
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY || 'dev-only-token-encryption-key-32bytes',
    syncDefaultDays: Number(process.env.SYNC_DEFAULT_DAYS || 90),
    openFinanceMock: process.env.OPEN_FINANCE_MOCK !== 'false'
  };
}

export const ALLOWED_INSTITUTIONS = ['BB', 'ITAU', 'CEF', 'SANTANDER', 'NUBANK', 'BRADESCO'];
export const DEFAULT_SCOPES = ['accounts', 'transactions'];
