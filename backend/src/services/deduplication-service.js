import crypto from 'node:crypto';

export function buildImportedFileFingerprint({ fileName, content, importerKey, memberId, accountId, referencePeriod }) {
  return crypto.createHash('sha256').update(JSON.stringify({
    fileName: String(fileName || '').trim().toLowerCase(),
    content: String(content || ''),
    importerKey,
    memberId,
    accountId,
    referencePeriod
  })).digest('hex');
}

export function findImportedFile(importRegistry, fileFingerprint) {
  return (importRegistry || []).find((item) => item.fileFingerprint === fileFingerprint) || null;
}

export function hasImportedFingerprint(transactions, fingerprint) {
  return (transactions || []).some((item) => item.importFingerprint === fingerprint);
}
