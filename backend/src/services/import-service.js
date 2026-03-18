import { buildImportFingerprint, parseImportContent } from '../imports/parser.js';
import { resolveImporter } from '../importers/registry.js';
import { normalizeImportedRow } from '../normalizers/transaction-normalizer.js';

export function previewBankImportRows({ fileName, content, importType, memberId, fallbackMonth, bankKeyHint, accountIdHint, accountLabelHint, referencePeriod }) {
  const { format, rows } = parseImportContent({ fileName, content });
  const importer = resolveImporter({ fileName, rows, bankKeyHint });

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
        referencePeriod
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
          date: normalized.date
        })
      }];
    } catch (error) {
      const line = row.__line || index + 2;
      throw new Error(`Erro na linha ${line}: ${error.message}`);
    }
  });

  return {
    format,
    importer: { key: importer.key, label: importer.label },
    rows: previewRows
  };
}
