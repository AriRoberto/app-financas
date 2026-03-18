import { bbImporter } from './bb-importer.js';
import { itauImporter } from './itau-importer.js';

const importers = [bbImporter, itauImporter];

export function resolveImporter(context) {
  const bankHint = String(context.bankKeyHint || '').toUpperCase();
  const hinted = importers.find((item) => item.key === bankHint);
  if (hinted) return hinted;
  return importers.find((item) => item.supports(context)) || bbImporter;
}

export function listSupportedImporters() {
  return importers.map((item) => ({ key: item.key, label: item.label }));
}
