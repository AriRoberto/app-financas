export function buildImporter(definition) {
  return {
    key: definition.key,
    label: definition.label,
    supports(context) {
      return definition.supports?.(context) || false;
    },
    extractAccountInfo(context) {
      return definition.extractAccountInfo?.(context) || {};
    },
    normalizeRow(context) {
      return definition.normalizeRow?.(context) || {};
    }
  };
}
