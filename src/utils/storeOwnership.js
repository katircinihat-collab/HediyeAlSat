export function selectOwnedStoreId({ uidDocs = [], emailDocs = [], legacyDoc = null } = {}) {
  if (uidDocs.length > 0) return uidDocs[0].id;
  if (emailDocs.length > 0) return emailDocs[0].id;
  return legacyDoc?.exists?.() ? legacyDoc.id : null;
}
