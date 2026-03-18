export const APP_INSTITUTIONS = [
  { key: 'BB', name: 'Banco do Brasil' },
  { key: 'ITAU', name: 'Itaú' },
  { key: 'CEF', name: 'Caixa (CEF)' },
  { key: 'SANTANDER', name: 'Santander' },
  { key: 'NUBANK', name: 'Nubank' },
  { key: 'BRADESCO', name: 'Bradesco' }
];

export function isKnownInstitutionKey(key) {
  return APP_INSTITUTIONS.some((item) => item.key === key);
}

export function getInstitutionByKey(key) {
  return APP_INSTITUTIONS.find((item) => item.key === key) || null;
}
