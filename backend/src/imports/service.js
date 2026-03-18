import { previewBankImportRows } from '../services/import-service.js';

export function previewImportRows({ fileName, content, importType, memberId, fallbackMonth = new Date().toISOString().slice(0, 7), bankKeyHint, accountIdHint, accountLabelHint, referencePeriod }) {
  return previewBankImportRows({
    fileName,
    content,
    importType,
    memberId,
    fallbackMonth,
    bankKeyHint,
    accountIdHint,
    accountLabelHint,
    referencePeriod
  });
}
