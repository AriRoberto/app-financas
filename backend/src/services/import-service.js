import { buildImportFingerprint, parseImportContent } from '../imports/parser.js';
import { resolveImporter } from '../importers/registry.js';
import { normalizeImportedRow } from '../normalizers/transaction-normalizer.js';

export function previewBankImportRows({ fileName, content, importType, memberId, fallbackMonth, bankKeyHint, accountIdHint, accountLabelHint, referencePeriod, categoriesByType }) {
  const parsed = parseImportContent({ fileName, content });
  const { format, rows } = parsed;
  const importer = resolveImporter({ fileName, rows, bankKeyHint, format, parserLayout: parsed.layout });

  const previewRows = rows.flatMap((row, index) => {
    try {
      const normalized = normalizeImportedRow({
        row,
        importer,
        importType,
        memberId,
        fallbackMonth,
        accountIdHint,
        accountLabelHint,
        fileName,
        referencePeriod,
        categoriesByType
      });

      if (!normalized) return [];

      return [{
        ...normalized,
        importType,
        origin: 'manual-file',
        sourceFileName: fileName,
        fingerprint: buildImportFingerprint({
          memberId,
          bankKey: normalized.bankKey,
          accountId: normalized.accountId,
          type: normalized.type,
          category: normalized.category,
          description: normalized.description,
          amount: normalized.amount,
          date: normalized.date,
          sourceFileName: fileName
        })
      }];
    } catch (error) {
      const line = row.__line || index + 2;
      throw new Error(`Erro na linha ${line}: ${error.message}`);
    }
  });

  return {
    format,
    parserLayout: parsed.layout || `${importer.key.toLowerCase()}-${format}`,
    extractedTextPreview: parsed.text ? parsed.text.split(/\n+/).slice(0, 8) : [],
    importer: { key: importer.key, label: importer.label },
    rows: previewRows
  };
}
