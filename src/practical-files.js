function openFiles() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('metalwork-practical-files', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function withFiles(mode, action) {
  const database = await openFiles();
  try {
    return await new Promise((resolve, reject) => {
      const tx = database.transaction('files', mode);
      const request = action(tx.objectStore('files'));
      tx.oncomplete = () => resolve(request?.result);
      tx.onabort = () => reject(tx.error || new Error('文件写入中断'));
      tx.onerror = () => reject(tx.error);
    });
  } finally { database.close(); }
}

export async function keepFiles(profileId, tradeId, files) {
  if (!files.length) return [];
  const metadata = files.map(file => ({ id: crypto.randomUUID(), name: file.name, size: file.size, type: file.type }));
  await withFiles('readwrite', store => {
    for (const [index, file] of files.entries()) store.add(file, [profileId, tradeId, metadata[index].id]);
  });
  return metadata;
}

export function readFile(profileId, tradeId, fileId) {
  return withFiles('readonly', store => store.get([profileId, tradeId, fileId]));
}

export async function discardFiles(profileId, tradeId, metadata) {
  if (!metadata.length) return;
  await withFiles('readwrite', store => {
    for (const file of metadata) store.delete([profileId, tradeId, file.id]);
  });
}
