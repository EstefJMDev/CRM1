type DocumentLike = {
  id: string;
  url: string;
};

export function withProtectedDocumentUrl<T extends DocumentLike>(document: T): T {
  return {
    ...document,
    url: `/api/documents/${document.id}`,
  };
}

export function withProtectedDocumentUrls<T extends { documents?: DocumentLike[] }>(entity: T): T {
  if (!entity.documents) {
    return entity;
  }

  return {
    ...entity,
    documents: entity.documents.map(withProtectedDocumentUrl),
  };
}
