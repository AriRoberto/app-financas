let sdkModulePromise;

export async function getPluggySdkModule() {
  if (!sdkModulePromise) {
    sdkModulePromise = import('pluggy-sdk').catch(() => null);
  }
  return sdkModulePromise;
}

export async function createPluggyClient(config) {
  const sdk = await getPluggySdkModule();
  if (sdk?.PluggyClient) {
    return new sdk.PluggyClient({
      clientId: config.aispClientId,
      clientSecret: config.aispClientSecret,
      baseURL: config.pluggyApiBaseUrl
    });
  }
  return null;
}
